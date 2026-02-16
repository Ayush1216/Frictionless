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
from app.services.supabase_client import (
    add_task_comment,
    apply_targeted_task_points,
    complete_task as db_complete_task,
    get_task_ai_chat_messages,
    insert_task_ai_chat_message,
    create_signed_pdf_url,
    download_ocr_text,
    get_apollo_data,
    get_extraction_data,
    get_task_by_id,
    get_task_comments,
    get_task_events,
    get_latest_pitch_deck_path,
    get_questionnaire,
    get_readiness_result,
    get_supabase,
    get_task_and_startup_org_id,
    get_task_groups_with_tasks,
    update_task as db_update_task,
    upload_ocr_text,
    upsert_apollo_enrichment,
    upsert_extraction_result,
    upsert_readiness_result,
    upsert_task_groups_and_tasks,
)
from app.services.task_chat import get_task_chat_response
from app.services.task_generator import generate_tasks_from_readiness
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
        # Generate improvement tasks from readiness and upsert to task_groups/tasks
        try:
            groups_data = generate_tasks_from_readiness(
                result["scored_rubric"], result["score_summary"]
            )
            if groups_data:
                upsert_task_groups_and_tasks(supabase, org_id, groups_data)
                log.info("Generated %d task groups for org %s", len(groups_data), org_id)
        except Exception as task_exc:
            log.warning("Task generation failed for org %s: %s", org_id, task_exc)
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
# Startup Tasks
# ---------------------------------------------------------------------------


@app.get("/api/startup-tasks")
async def startup_tasks_endpoint(org_id: str):
    """Return task groups with tasks for a startup org. Generates from readiness if none exist."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    groups = get_task_groups_with_tasks(supabase, org_id)
    # If no tasks and readiness exists, generate tasks from existing readiness
    if not groups:
        result = get_readiness_result(supabase, org_id)
        if result and result.get("scored_rubric") and result.get("score_summary"):
            try:
                groups_data = generate_tasks_from_readiness(
                    result["scored_rubric"], result["score_summary"]
                )
                if groups_data:
                    upsert_task_groups_and_tasks(supabase, org_id, groups_data)
                    groups = get_task_groups_with_tasks(supabase, org_id)
                    log.info("Generated %d task groups for org %s (on-demand)", len(groups_data), org_id)
            except Exception as task_exc:
                log.warning("On-demand task generation failed for org %s: %s", org_id, task_exc)
    return {"task_groups": groups, "tasks": [t for g in groups for t in g.get("tasks", [])]}


class TaskUpdateBody(BaseModel):
    status: str | None = None
    description: str | None = None
    due_at: str | None = None


@app.patch("/api/tasks/{task_id}")
async def update_task_endpoint(task_id: str, body: TaskUpdateBody):
    """Update a task (status, description, due_at)."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    updates = {}
    if body.status is not None:
        updates["status"] = body.status
    if body.description is not None:
        updates["description"] = body.description
    if body.due_at is not None:
        updates["due_at"] = body.due_at
    if not updates:
        return {"ok": False, "detail": "No updates provided"}
    prev_task = get_task_by_id(supabase, task_id) if "status" in updates else None
    row = db_update_task(supabase, task_id, updates, prev_task=prev_task)
    if not row:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"ok": True, "task": row}


class TaskCompleteBody(BaseModel):
    completed_by: str | None = None


@app.post("/api/tasks/{task_id}/complete")
async def complete_task_endpoint(
    task_id: str,
    background_tasks: BackgroundTasks,
    body: TaskCompleteBody | None = None,
):
    """Mark task as done. If requires_rescore, triggers readiness rescore in background."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    task_info, startup_org_id = get_task_and_startup_org_id(supabase, task_id)
    if not task_info:
        raise HTTPException(status_code=404, detail="Task not found")
    completed_by = (body.completed_by if body else None) or None
    prev_status = task_info.get("status")
    row = db_complete_task(supabase, task_id, completed_by, prev_status)
    if not row:
        raise HTTPException(status_code=500, detail="Failed to complete task")
    # If requires_rescore: use targeted point update when task has rubric_subcategory, else full rescore
    if task_info.get("requires_rescore") and startup_org_id:
        rubric_sub = (task_info.get("rubric_subcategory") or "").strip()
        potential_pts = task_info.get("potential_points")
        if rubric_sub and potential_pts is not None and int(potential_pts) > 0:
            applied = apply_targeted_task_points(
                supabase, startup_org_id, rubric_sub, int(potential_pts)
            )
            if applied:
                log.info("Applied targeted +%s pts for task %s (rubric: %s)", potential_pts, task_id, rubric_sub)
            else:
                log.warning("Targeted update failed for task %s, falling back to full rescore", task_id)
                background_tasks.add_task(_run_readiness_task, startup_org_id, "task_complete")
        else:
            background_tasks.add_task(_run_readiness_task, startup_org_id, "task_complete")
            log.info("Queued full rescore for org %s after task %s complete", startup_org_id, task_id)
    return {"ok": True, "task": row}


class TaskChatBody(BaseModel):
    message: str
    history: list[dict[str, str]] | None = None
    author_user_id: str | None = None


@app.get("/api/tasks/{task_id}/chat-messages")
async def task_chat_messages_endpoint(task_id: str):
    """Get saved AI chat conversation for a task."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    messages = get_task_ai_chat_messages(supabase, task_id)
    return {"messages": messages}


@app.post("/api/tasks/{task_id}/chat")
async def task_chat_endpoint(task_id: str, body: TaskChatBody):
    """Chat with AI to help complete a task. Saves conversation to DB. Returns reply and suggest_complete."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    task = get_task_by_id(supabase, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.get("status") == "done":
        return {"reply": "This task is already complete.", "suggest_complete": False}
    try:
        result = get_task_chat_response(
            task_title=task.get("title", ""),
            task_description=task.get("description") or "",
            user_message=body.message,
            history=body.history,
        )
        insert_task_ai_chat_message(
            supabase, task_id, "user", body.message,
            author_user_id=body.author_user_id,
        )
        insert_task_ai_chat_message(supabase, task_id, "assistant", result["reply"])
        return result
    except Exception as e:
        log.exception("Task chat failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tasks/{task_id}/events")
async def task_events_endpoint(task_id: str):
    """Get task events (activity history)."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    events = get_task_events(supabase, task_id)
    return {"events": events}


@app.get("/api/tasks/{task_id}/comments")
async def task_comments_endpoint(task_id: str):
    """Get task comments."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    comments = get_task_comments(supabase, task_id)
    return {"comments": comments}


class TaskCommentBody(BaseModel):
    content: str
    author_user_id: str


@app.post("/api/tasks/{task_id}/comments")
async def add_task_comment_endpoint(task_id: str, body: TaskCommentBody):
    """Add a task comment."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    comment = add_task_comment(
        supabase,
        task_id,
        body.author_user_id,
        body.content,
    )
    if not comment:
        raise HTTPException(status_code=500, detail="Failed to add comment")
    return {"ok": True, "comment": comment}
