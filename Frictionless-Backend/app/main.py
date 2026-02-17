"""FastAPI backend for Frictionless: Apollo enrichment, extraction pipeline."""
import json
import logging
import os
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException

# Load .env from backend root (reliable when cwd differs under uvicorn --reload)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.services.apollo import enrich_organization
from app.services.extraction.pipeline import run_pipeline as run_extraction_pipeline
from app.services.readiness_scorer import run_readiness_scoring
from app.services.readiness_tasks import (
    apply_task_completion_to_rubric,
    compute_pending_tasks_from_rubric,
    compute_summary as readiness_compute_summary,
)
from app.services.supabase_client import (
    create_signed_pdf_url,
    download_ocr_text,
    get_apollo_data,
    get_extraction_data,
    get_latest_pitch_deck_path,
    get_questionnaire,
    get_readiness_result,
    get_supabase,
    set_initial_pending_task_count,
    get_task_ai_chat_messages,
    get_task_by_id,
    get_task_groups_with_tasks,
    get_task_and_org_id,
    insert_task_ai_chat_message,
    mark_task_done,
    replace_org_tasks,
    upload_ocr_text,
    upsert_apollo_enrichment,
    upsert_extraction_result,
    upsert_readiness_result,
)
from app.services.task_chat import get_task_chat_response
from app.utils.domain import extract_domain

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-5s │ %(name)s │ %(message)s",
)
log = logging.getLogger("main")


class EnrichRequest(BaseModel):
    org_id: str
    website: str


class RunExtractionRequest(BaseModel):
    org_id: str


class RunReadinessRequest(BaseModel):
    org_id: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # shutdown cleanup if needed


app = FastAPI(title="Frictionless Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/enrich-organization")
async def enrich_organization_endpoint(body: EnrichRequest):
    """Extract domain from website, call Apollo, store in Supabase."""
    log.info("POST /api/enrich-organization received org_id=%s website=%s", body.org_id, body.website)
    domain = extract_domain(body.website)
    if not domain:
        raise HTTPException(status_code=400, detail="Could not extract domain from website URL")

    api_key = os.getenv("APOLLO_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Apollo API key not configured")

    org_data = await enrich_organization(domain, api_key)
    if not org_data:
        raise HTTPException(
            status_code=502,
            detail="Apollo organization enrichment returned no data",
        )

    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    apollo_id = org_data.get("id") if isinstance(org_data, dict) else None
    upsert_apollo_enrichment(
        supabase,
        org_id=body.org_id,
        domain=domain,
        raw_data=org_data if isinstance(org_data, dict) else {"organization": org_data},
        apollo_org_id=str(apollo_id) if apollo_id else None,
    )
    log.info("Apollo enrichment saved for org_id=%s domain=%s", body.org_id, domain)
    return {"ok": True, "domain": domain}


def _run_extraction_task(org_id: str) -> None:
    """Run extraction pipeline and save to Supabase. Runs in background thread."""
    supabase = get_supabase()
    if not supabase:
        log.error("Supabase not configured")
        return
    storage_path = get_latest_pitch_deck_path(supabase, org_id)
    if not storage_path:
        log.warning("No pitch deck found for org %s", org_id)
        return
    pdf_url = create_signed_pdf_url(supabase, storage_path)
    if not pdf_url:
        log.error("Could not create signed URL for %s", storage_path)
        return
    apollo = get_apollo_data(supabase, org_id)
    company_linkedin = ""
    company_name = ""
    if apollo:
        company_linkedin = (apollo.get("linkedin_url") or "").strip()
        company_name = (apollo.get("name") or "").strip()

    with tempfile.TemporaryDirectory(prefix="frictionless_extract_") as tmp:
        out_dir = Path(tmp) / "out"
        ocr_dir = Path(tmp) / "ocr"
        try:
            merged_path = run_extraction_pipeline(
                pdf_url=pdf_url,
                out_dir=out_dir,
                ocr_dir=ocr_dir,
                company_linkedin=company_linkedin,
                company_name=company_name,
            )
            with open(merged_path, "r", encoding="utf-8") as f:
                extraction_data = json.load(f)
            ocr_file = extraction_data.get("ocr_file")
            if ocr_file:
                try:
                    with open(ocr_file, "r", encoding="utf-8", errors="ignore") as f:
                        ocr_text = f.read()
                    ocr_storage_path = upload_ocr_text(supabase, org_id, ocr_text)
                    if ocr_storage_path:
                        extraction_data["ocr_storage_path"] = ocr_storage_path
                        log.info("OCR uploaded to Storage: %s", ocr_storage_path)
                    else:
                        log.warning("Could not upload OCR to Storage")
                except Exception as e:
                    log.warning("Could not read/upload OCR file: %s", e)
            upsert_extraction_result(supabase, org_id, extraction_data)
            log.info("Extraction saved for org %s", org_id)
        except Exception as exc:
            log.exception("Extraction failed for org %s: %s", org_id, exc)


@app.post("/api/run-extraction-pipeline")
async def run_extraction_endpoint(body: RunExtractionRequest, background_tasks: BackgroundTasks):
    """Start extraction pipeline (OCR, founder, charts, KV). Runs in background."""
    log.info("POST /api/run-extraction-pipeline received for org_id=%s", body.org_id)
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    storage_path = get_latest_pitch_deck_path(supabase, body.org_id)
    if not storage_path:
        log.warning("No pitch deck found for org_id=%s", body.org_id)
        raise HTTPException(status_code=400, detail="No pitch deck found for this organization")
    log.info("Starting extraction pipeline in background (pitch deck: %s)", storage_path)
    background_tasks.add_task(_run_extraction_task, body.org_id)
    return {"ok": True, "message": "Extraction started"}


def _run_readiness_task(org_id: str, update_source: str = "scheduled") -> None:
    """Run readiness scoring and save to Supabase. Background thread."""
    supabase = get_supabase()
    if not supabase:
        log.error("Supabase not configured")
        return
    extraction = get_extraction_data(supabase, org_id)
    if not extraction:
        log.warning("No extraction data for org %s", org_id)
        return
    ocr_storage_path = extraction.get("ocr_storage_path")
    if not ocr_storage_path:
        log.warning("No OCR storage path for org %s", org_id)
        return
    ocr_text = download_ocr_text(supabase, ocr_storage_path)
    if not ocr_text:
        log.warning("Could not download OCR for org %s", org_id)
        return
    apollo = get_apollo_data(supabase, org_id)
    apollo_data = apollo if apollo else {}
    questionnaire = get_questionnaire(supabase, org_id)
    try:
        result = run_readiness_scoring(
            ocr_text=ocr_text,
            startup_data=extraction,
            apollo_data=apollo_data,
            questionnaire_data=questionnaire,
        )
        upsert_readiness_result(
            supabase, org_id, result["scored_rubric"], result["score_summary"], update_source
        )
        log.info("Readiness scored and saved for org %s", org_id)
    except Exception as exc:
        log.exception("Readiness scoring failed for org %s: %s", org_id, exc)


@app.post("/api/run-readiness-scoring")
async def run_readiness_endpoint(body: RunReadinessRequest, background_tasks: BackgroundTasks):
    """Start readiness scoring in background. Call after questionnaire complete."""
    log.info("POST /api/run-readiness-scoring received for org_id=%s", body.org_id)
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    extraction = get_extraction_data(supabase, body.org_id)
    if not extraction or not extraction.get("ocr_storage_path"):
        raise HTTPException(
            status_code=400,
            detail="Extraction or OCR not ready. Complete pitch deck upload and extraction first.",
        )
    background_tasks.add_task(_run_readiness_task, body.org_id)
    return {"ok": True, "message": "Readiness scoring started"}


@app.get("/api/extraction-data")
async def extraction_data_endpoint(org_id: str):
    """Return extraction_data from startup_extraction_results."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    extraction = get_extraction_data(supabase, org_id)
    if extraction:
        return {"status": "ready", "extraction_data": extraction}
    return {"status": "pending"}


@app.get("/api/readiness-status")
async def readiness_status_endpoint(org_id: str):
    """Return readiness result or pending status."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    result = get_readiness_result(supabase, org_id)
    if result:
        return {
            "status": "ready",
            "scored_rubric": result["scored_rubric"],
            "score_summary": result["score_summary"],
            "updated_at": result.get("updated_at"),
        }
    return {"status": "pending"}


# ---------------------------------------------------------------------------
# Startup tasks (rubric-based, computed from readiness)
# ---------------------------------------------------------------------------


@app.get("/api/startup-tasks")
async def startup_tasks_endpoint(org_id: str):
    """
    Return task groups and tasks for a startup org.
    Computes pending tasks by comparing current scored_rubric to rubric (items where points < max).
    Persists to task_groups/tasks and returns. No Claude call.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    result = get_readiness_result(supabase, org_id)
    if not result or not result.get("scored_rubric"):
        return {"task_groups": [], "tasks": []}
    scored_rubric = result["scored_rubric"]
    groups_data = compute_pending_tasks_from_rubric(scored_rubric)
    if not groups_data:
        return {"task_groups": [], "tasks": []}
    current_pending = sum(len(g.get("tasks") or []) for g in groups_data)
    allotted_total = result.get("initial_pending_task_count")
    if allotted_total is None:
        set_initial_pending_task_count(supabase, org_id, current_pending)
        allotted_total = current_pending
    # Map subcategory_name -> potential_points from rubric (so every task gets correct pts, not stale DB)
    potential_by_subcategory: dict[str, int] = {}
    for g in groups_data:
        for t in (g.get("tasks") or []):
            sc = t.get("subcategory_name") or ""
            if sc:
                potential_by_subcategory[sc] = int(t.get("potential_points", 0))
    replace_org_tasks(supabase, org_id, groups_data)
    groups = get_task_groups_with_tasks(supabase, org_id)
    by_cat_key = {g.get("category_key"): g for g in groups_data}
    for g in groups:
        gd = by_cat_key.get(g.get("category_key"))
        if gd:
            g["total_in_category"] = gd.get("total_in_category", 0)
            g["done_count"] = gd.get("done_count", 0)
        # Return only pending tasks so the UI shows the remaining layout; completed stay in DB for history
        all_tasks = g.get("tasks") or []
        g["tasks"] = [t for t in all_tasks if (t.get("status") or "todo") != "done"]
        for t in g["tasks"]:
            sc = t.get("subcategory_name") or ""
            if sc and sc in potential_by_subcategory:
                t["potential_points"] = potential_by_subcategory[sc]
    tasks_flat = [t for g in groups for t in g.get("tasks", [])]
    return {
        "task_groups": groups,
        "tasks": tasks_flat,
        "task_progress": {"allotted_total": allotted_total, "current_pending": current_pending},
    }


class TaskUpdateBody(BaseModel):
    status: str | None = None
    description: str | None = None
    due_at: str | None = None
    completed_by: str | None = None


class TaskCompleteBody(BaseModel):
    completed_by: str | None = None
    submitted_value: str | None = None


@app.post("/api/tasks/{task_id}/complete")
async def complete_task_endpoint(task_id: str, body: TaskCompleteBody | None = None):
    """
    Mark task as done and update readiness score: set that rubric item to max points
    (and store submitted_value in the rubric if the item has required_value). No Claude call.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    task, org_id = get_task_and_org_id(supabase, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not org_id:
        raise HTTPException(status_code=400, detail="Task has no org")
    if task.get("status") == "done":
        return {"ok": True, "task": get_task_by_id(supabase, task_id)}
    result = get_readiness_result(supabase, org_id)
    if not result or not result.get("scored_rubric"):
        raise HTTPException(status_code=400, detail="No readiness result to update")
    subcategory = (task.get("subcategory_name") or "").strip()
    if not subcategory:
        raise HTTPException(status_code=400, detail="Task has no subcategory")
    submitted_value = (body.submitted_value if body else None) or task.get("submitted_value")
    new_rubric = apply_task_completion_to_rubric(
        result["scored_rubric"], subcategory, submitted_value=submitted_value
    )
    summary = readiness_compute_summary(new_rubric)
    upsert_readiness_result(supabase, org_id, new_rubric, summary, update_source="task_complete")
    row = mark_task_done(supabase, task_id, completed_by=body.completed_by if body else None)
    return {"ok": True, "task": row}


class TaskChatBody(BaseModel):
    message: str
    history: list[dict[str, str]] | None = None
    author_user_id: str | None = None


@app.get("/api/tasks/{task_id}/chat-messages")
async def task_chat_messages_endpoint(task_id: str):
    """Get saved AI chat messages for a task."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    messages = get_task_ai_chat_messages(supabase, task_id)
    return {"messages": messages}


@app.post("/api/tasks/{task_id}/chat")
async def task_chat_endpoint(task_id: str, body: TaskChatBody):
    """
    Chat: collect the user's answer for this task. When they provide it, we store
    submitted_value and tell them to mark the task complete. No generic "how to" steps.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    task = get_task_by_id(supabase, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.get("status") == "done":
        return {"reply": "This task is already complete.", "suggest_complete": False, "submitted_value": None}
    history = body.history or []
    result = get_task_chat_response(
        task_title=task.get("title", ""),
        task_description=task.get("description") or "",
        subcategory_name=task.get("subcategory_name") or "",
        user_message=body.message,
        history=history,
    )
    insert_task_ai_chat_message(supabase, task_id, "user", body.message)
    insert_task_ai_chat_message(supabase, task_id, "assistant", result["reply"])
    if result.get("submitted_value"):
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        supabase.table("tasks").update({
            "submitted_value": result["submitted_value"],
            "updated_at": now,
        }).eq("id", task_id).execute()
    return {
        "reply": result["reply"],
        "suggest_complete": result.get("suggest_complete", False),
        "submitted_value": result.get("submitted_value"),
    }


@app.patch("/api/tasks/{task_id}")
async def update_task_endpoint(task_id: str, body: TaskUpdateBody):
    """Update task status (and optionally description/due_at)."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    task = get_task_by_id(supabase, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    updates = {}
    if body.status is not None and body.status in ("todo", "in_progress", "done"):
        updates["status"] = body.status
    if body.description is not None:
        updates["description"] = body.description
    if not updates:
        return {"ok": True, "task": task}
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    patch = {**updates, "updated_at": now}
    if updates.get("status") == "done":
        patch["completed_at"] = now
        if body.completed_by:
            patch["completed_by"] = body.completed_by
    r = supabase.table("tasks").update(patch).eq("id", task_id).execute()
    row = (r.data or [{}])[0] if r.data else task
    return {"ok": True, "task": row}


@app.get("/api/tasks/{task_id}/events")
async def task_events_endpoint(task_id: str):
    """Task events (stub)."""
    return {"events": []}


@app.get("/api/tasks/{task_id}/comments")
async def task_comments_endpoint(task_id: str):
    """Task comments (stub)."""
    return {"comments": []}


class TaskCommentBody(BaseModel):
    content: str
    author_user_id: str | None = None


@app.post("/api/tasks/{task_id}/comments")
async def add_task_comment_endpoint(task_id: str, body: TaskCommentBody):
    """Task comments (stub)."""
    return {"ok": True, "comment": {"id": "", "content": body.content, "author": "", "created_at": ""}}

