"""FastAPI backend for Frictionless: Apollo enrichment, extraction pipeline."""
import collections
import json
import logging
import os
import sys
import tempfile
import threading
import time
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

# Load .env from backend root (reliable when cwd differs under uvicorn --reload)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.services.apollo import enrich_organization
from app.services.gemini_enrichment import enrich_with_gemini
from app.services.extraction import startup_kv_extractor
from app.services.extraction.mistral_ocr import run as run_mistral_ocr
from app.services.extraction.founder_linkedin import (
    run as run_founder_linkedin,
    run_person_profile as run_linkedin_person_profile,
    _sanitize_linkedin as sanitize_linkedin,
    _is_person_linkedin as is_person_linkedin,
)
from app.services.extraction.pipeline import run_pipeline as run_extraction_pipeline
from app.services.readiness_scorer import run_readiness_scoring, _inject_questionnaire
from app.services.readiness_tasks import (
    apply_task_completion_to_rubric,
    compute_pending_tasks_from_rubric,
    compute_summary as readiness_compute_summary,
    get_done_subcategory_names,
    preserve_completions_from_rubric,
    update_rubric_from_extraction,
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
    get_recent_activity,
    insert_task_ai_chat_message,
    mark_task_done,
    mark_tasks_done_by_subcategories,
    replace_org_tasks,
    upload_ocr_text,
    upsert_apollo_enrichment,
    upsert_extraction_result,
    upsert_person_provenance,
    upsert_readiness_result,
)
from app.services.task_chat import get_task_chat_response
from app.services.ai_cache import get_cached_analysis, set_cached_analysis
from app.services.activity import log_activity, get_activity_events
from app.services.share import create_share_link, validate_share_link, revoke_share_link, get_share_links
from app.services.team import invite_member, accept_invite, get_team_members, get_pending_invites, update_member_role, revoke_invite
from app.services.investor_matching import (
    add_custom_investor_match,
    generate_startup_thesis_profile,
    generate_match_reasonings,
    get_investor_matches,
    get_startup_thesis_profile,
    run_investor_matching,
    _LOG_FILE as INVESTOR_LOG_FILE,
    _file_logger as investor_file_logger,
)
from app.utils.domain import extract_domain
import stripe

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-5s │ %(name)s │ %(message)s",
)
log = logging.getLogger("main")


def _log(msg: str):
    """Write to both log file and stderr (guaranteed visible)."""
    investor_file_logger.info(msg)
    try:
        sys.stderr.write(msg + "\n")
        sys.stderr.flush()
    except Exception:
        pass

# ---------------------------------------------------------------------------
# In-memory investor pipeline status tracker
# Tracks whether thesis generation / matching is in progress per org_id
# ---------------------------------------------------------------------------
_pipeline_lock = threading.Lock()
_pipeline_status: dict[str, dict] = {}
# Example: {"org_123": {"status": "generating", "started_at": 1700000000}}

_PIPELINE_TIMEOUT_SECS = 300  # 5 min – treat as stale if stuck longer


def _get_pipeline_status(org_id: str) -> str | None:
    """Return current pipeline status for an org, clearing stale entries."""
    with _pipeline_lock:
        entry = _pipeline_status.get(org_id)
        if not entry:
            return None
        # Clear stale entries (stuck > 5 min)
        if time.time() - entry.get("started_at", 0) > _PIPELINE_TIMEOUT_SECS:
            _pipeline_status.pop(org_id, None)
            return None
        return entry.get("status")


def _set_pipeline_status(org_id: str, status: str):
    with _pipeline_lock:
        if status in ("ready", "error"):
            _pipeline_status.pop(org_id, None)
        else:
            _pipeline_status[org_id] = {"status": status, "started_at": time.time()}


class EnrichRequest(BaseModel):
    org_id: str
    website: str


class RunExtractionRequest(BaseModel):
    org_id: str


class RunReadinessRequest(BaseModel):
    org_id: str


class ProcessDataroomDocRequest(BaseModel):
    org_id: str
    storage_path: str


class UpdateExtractionPatch(BaseModel):
    org_id: str
    extraction_data_patch: dict


class LinkedInRescrapeRequest(BaseModel):
    org_id: str
    linkedin_url: str


class AddTeamFromLinkedInRequest(BaseModel):
    org_id: str
    linkedin_url: str
    role_type: str = "Other"  # Founder | Leadership | Other
    company_name_override: str | None = None


class ProfileImageRequest(BaseModel):
    org_id: str
    linkedin_url: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # shutdown cleanup if needed


app = FastAPI(title="Frictionless Backend", lifespan=lifespan)

_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://*.vercel.app",
]
# Allow additional origins via env (comma-separated)
_extra_origins = os.getenv("ALLOWED_ORIGINS", "")
if _extra_origins:
    _ALLOWED_ORIGINS.extend(o.strip() for o in _extra_origins.split(",") if o.strip())

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/enrich-organization")
async def enrich_organization_endpoint(body: EnrichRequest):
    """Extract domain from website, call Apollo, fall back to Gemini grounded search."""
    log.info("POST /api/enrich-organization received org_id=%s website=%s", body.org_id, body.website)
    domain = extract_domain(body.website)
    if not domain:
        raise HTTPException(status_code=400, detail="Could not extract domain from website URL")

    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    enrichment_source = "apollo"
    org_data = None

    # --- Try Apollo first ---
    api_key = os.getenv("APOLLO_API_KEY")
    if api_key:
        try:
            org_data = await enrich_organization(domain, api_key)
        except Exception as e:
            log.warning("Apollo enrichment error for %s: %s", domain, e)
    else:
        log.warning("APOLLO_API_KEY not set, skipping Apollo enrichment")

    # --- Fallback: Gemini grounded search + website scrape ---
    if not org_data:
        log.info("Apollo returned no data for %s, trying Gemini fallback", domain)
        org_data = await enrich_with_gemini(domain, body.website)
        if org_data:
            enrichment_source = "gemini"

    if not org_data:
        raise HTTPException(
            status_code=502,
            detail="Organization enrichment failed — both Apollo and Gemini returned no data",
        )

    apollo_id = org_data.get("id") if isinstance(org_data, dict) else None
    raw = org_data if isinstance(org_data, dict) else {"organization": org_data}
    raw["_enrichment_source"] = enrichment_source
    upsert_apollo_enrichment(
        supabase,
        org_id=body.org_id,
        domain=domain,
        raw_data=raw,
        apollo_org_id=str(apollo_id) if apollo_id else None,
    )
    log.info("%s enrichment saved for org_id=%s domain=%s", enrichment_source.capitalize(), body.org_id, domain)
    return {"ok": True, "domain": domain, "source": enrichment_source}


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


def _merge_kv_into_extraction(extraction_data: dict, new_kv: dict) -> None:
    """Merge new KV extraction (non-empty values) into existing extraction_data in place."""
    for section in ("initial_details", "financial_data", "founder_and_other_data"):
        existing = extraction_data.get(section)
        if not isinstance(existing, dict):
            existing = {}
        new_section = new_kv.get(section) or {}
        for k, v in new_section.items():
            if v is not None and str(v).strip():
                existing[k] = v
        extraction_data[section] = existing


def _run_dataroom_doc_task(org_id: str, storage_path: str) -> None:
    """OCR a data room document (PDF), run KV extraction, merge into extraction_data, then run readiness."""
    if not (storage_path or "").lower().endswith(".pdf"):
        log.info("Skipping KV/readiness for non-PDF data room doc: %s", storage_path)
        return
    supabase = get_supabase()
    if not supabase:
        log.error("Supabase not configured")
        return
    extraction = get_extraction_data(supabase, org_id)
    if not extraction:
        log.warning("No extraction data for org %s; run pitch deck extraction first", org_id)
        return
    pdf_url = create_signed_pdf_url(supabase, storage_path)
    if not pdf_url:
        log.error("Could not create signed URL for %s", storage_path)
        return
    with tempfile.TemporaryDirectory(prefix="frictionless_dataroom_") as tmp:
        ocr_dir = Path(tmp) / "ocr"
        ocr_dir.mkdir(parents=True, exist_ok=True)
        try:
            txt_path = run_mistral_ocr(pdf_url=pdf_url, out_dir=ocr_dir, model="mistral-ocr-latest")
        except Exception as exc:
            log.exception("OCR failed for dataroom doc %s: %s", storage_path, exc)
            return
        kv_out = Path(tmp) / "dataroom_kv.json"
        try:
            new_kv = startup_kv_extractor.run_pipeline(
                input_path=str(txt_path), output_path=str(kv_out)
            )
        except Exception as exc:
            log.exception("KV extraction failed for dataroom doc: %s", exc)
            return
        _merge_kv_into_extraction(extraction, new_kv)
        upsert_extraction_result(supabase, org_id, extraction)
        log.info("Merged dataroom doc KV for org %s", org_id)
    # Update readiness from extraction only (no Claude): same idea as task completion, math vs rubric
    result = get_readiness_result(supabase, org_id)
    if not result or not result.get("scored_rubric"):
        log.warning("No existing readiness result for org %s; run full scoring once first", org_id)
        return
    updated_rubric = update_rubric_from_extraction(result["scored_rubric"], extraction)
    # Re-read latest readiness and preserve any task completions that happened after our first read
    result2 = get_readiness_result(supabase, org_id)
    if result2 and result2.get("scored_rubric"):
        preserve_completions_from_rubric(updated_rubric, result2["scored_rubric"])
    questionnaire = get_questionnaire(supabase, org_id)
    if questionnaire:
        _inject_questionnaire(updated_rubric, questionnaire)
    summary = readiness_compute_summary(updated_rubric)
    upsert_readiness_result(supabase, org_id, updated_rubric, summary, update_source="dataroom_doc")
    _invalidate_dashboard_cache(org_id)
    log.info("Readiness updated from extraction for org %s (no Claude)", org_id)


def _run_readiness_task(org_id: str, update_source: str = "scheduled") -> None:
    """Run readiness scoring, then thesis profile + investor matching. Background thread.

    Sequence: readiness scoring → thesis profile → investor matching.
    Each step waits for the previous to complete before starting.
    """
    t0 = time.time()
    _log(f"{'=' * 60}")
    _log(f"FULL PIPELINE STARTED for org {org_id}")
    _log(f"Sequence: Readiness → Thesis Profile → Investor Matching")
    _log(f"{'=' * 60}")

    supabase = get_supabase()
    if not supabase:
        _log("ERROR: Supabase not configured!")
        log.error("Supabase not configured")
        return
    extraction = get_extraction_data(supabase, org_id)
    if not extraction:
        _log("ERROR: No extraction data found. Run pitch deck extraction first.")
        log.warning("No extraction data for org %s", org_id)
        return
    ocr_storage_path = extraction.get("ocr_storage_path")
    ocr_text = ""
    if ocr_storage_path:
        ocr_text = download_ocr_text(supabase, ocr_storage_path) or ""
    if not ocr_text:
        _log("WARNING: No OCR text — running readiness scoring with available extraction data only.")
        log.warning("No OCR text for org %s — proceeding without it", org_id)
    apollo = get_apollo_data(supabase, org_id)
    apollo_data = apollo if apollo else {}
    questionnaire = get_questionnaire(supabase, org_id)
    _log(f"Data loaded: extraction=YES, ocr={'YES' if ocr_text else 'NO (fallback)'}, apollo={'YES' if apollo else 'NO'}, questionnaire={'YES' if questionnaire else 'NO'}")

    # --- Step 1: Readiness scoring ---
    _log("[1/3] READINESS SCORING...")
    t1 = time.time()
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
        _invalidate_dashboard_cache(org_id)
        score = result.get("score_summary", {}).get("overall_score", "?")
        elapsed1 = time.time() - t1
        _log(f"  Readiness score: {score}")
        _log(f"  Completed in {elapsed1:.1f}s")
        log.info("Readiness scored and saved for org %s", org_id)
    except Exception as exc:
        _log(f"  FAILED: {exc}")
        log.exception("Readiness scoring failed for org %s: %s", org_id, exc)
        return

    # --- Step 2: Generate startup thesis profile ---
    _log("[2/3] THESIS PROFILE GENERATION...")
    t2 = time.time()
    try:
        _set_pipeline_status(org_id, "generating")
        generate_startup_thesis_profile(supabase, org_id, use_llm=True)
        elapsed2 = time.time() - t2
        _log(f"  Completed in {elapsed2:.1f}s")
        log.info("Thesis profile generated for org %s after readiness scoring", org_id)
    except Exception as thesis_exc:
        _log(f"  FAILED: {thesis_exc}")
        log.warning("Thesis profile generation failed for org %s: %s", org_id, thesis_exc)
        _set_pipeline_status(org_id, "error")
        return

    # --- Step 3: Run investor matching ---
    _log("[3/3] INVESTOR MATCHING...")
    t3 = time.time()
    try:
        _set_pipeline_status(org_id, "matching")
        run_investor_matching(supabase, org_id, max_matches=10)
        elapsed3 = time.time() - t3
        _log(f"  Completed in {elapsed3:.1f}s")
        log.info("Investor matching complete for org %s", org_id)
        _set_pipeline_status(org_id, "ready")
    except Exception as match_exc:
        _log(f"  FAILED: {match_exc}")
        log.warning("Investor matching failed for org %s: %s", org_id, match_exc)
        _set_pipeline_status(org_id, "error")

    total = time.time() - t0
    _log(f"{'=' * 60}")
    _log(f"FULL PIPELINE COMPLETE — Total time: {total:.1f}s")
    _log(f"{'=' * 60}")


@app.post("/api/run-readiness-scoring")
async def run_readiness_endpoint(body: RunReadinessRequest, background_tasks: BackgroundTasks):
    """Start readiness scoring in background. Call after questionnaire complete."""
    log.info("POST /api/run-readiness-scoring received for org_id=%s", body.org_id)
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    extraction = get_extraction_data(supabase, body.org_id)
    if not extraction:
        raise HTTPException(
            status_code=400,
            detail="Extraction data not ready. Complete pitch deck upload first.",
        )
    background_tasks.add_task(_run_readiness_task, body.org_id)
    return {"ok": True, "message": "Readiness scoring started"}


@app.post("/api/process-dataroom-doc")
async def process_dataroom_doc_endpoint(body: ProcessDataroomDocRequest, background_tasks: BackgroundTasks):
    """Process a document added to the data room: OCR, KV merge into extraction, then run readiness."""
    path_value = (getattr(body, "storage_path", None) or "").strip()
    if not path_value:
        raise HTTPException(status_code=400, detail="storage_path is required")
    log.info("POST /api/process-dataroom-doc org_id=%s path=%s", body.org_id, path_value)
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    extraction = get_extraction_data(supabase, body.org_id)
    if not extraction or not extraction.get("ocr_storage_path"):
        raise HTTPException(
            status_code=400,
            detail="Extraction not ready. Complete pitch deck upload and extraction first.",
        )
    background_tasks.add_task(_run_dataroom_doc_task, body.org_id, path_value)
    return {"ok": True, "message": "Data room document processing started"}


@app.get("/api/extraction-data")
async def extraction_data_endpoint(org_id: str):
    """Return extraction_data from startup_extraction_results."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    extraction = get_extraction_data(supabase, org_id)
    if extraction:
        return JSONResponse(
            content={"status": "ready", "extraction_data": extraction},
            headers={"Cache-Control": "private, max-age=300"},
        )
    return {"status": "pending"}


# In-memory cache for startup-dashboard (readiness + tasks in one). TTL seconds; invalidated on task complete / readiness update.
_DASHBOARD_CACHE_TTL = 60
_DASHBOARD_CACHE_MAX = 500
_dashboard_cache: collections.OrderedDict[str, tuple[float, dict]] = collections.OrderedDict()


def _invalidate_dashboard_cache(org_id: str) -> None:
    _dashboard_cache.pop(org_id, None)


def _build_startup_dashboard(supabase, org_id: str) -> dict:
    """Build combined readiness + tasks from one get_readiness_result call."""
    result = get_readiness_result(supabase, org_id)
    readiness = (
        {
            "status": "ready",
            "scored_rubric": result["scored_rubric"],
            "score_summary": result["score_summary"],
            "updated_at": result.get("updated_at"),
        }
        if result
        else {"status": "pending"}
    )
    if not result or not result.get("scored_rubric"):
        return {
            "readiness": readiness,
            "task_groups": [],
            "tasks": [],
            "task_progress": None,
        }
    scored_rubric = result["scored_rubric"]
    groups_data = compute_pending_tasks_from_rubric(scored_rubric)
    if not groups_data:
        return {
            "readiness": readiness,
            "task_groups": [],
            "tasks": [],
            "task_progress": None,
        }
    current_pending = sum(len(g.get("tasks") or []) for g in groups_data)
    allotted_total = result.get("initial_pending_task_count")
    if allotted_total is None:
        set_initial_pending_task_count(supabase, org_id, current_pending)
        allotted_total = current_pending
    allotted_total = max(allotted_total or 0, current_pending)
    potential_by_subcategory: dict[str, int] = {}
    for g in groups_data:
        for t in (g.get("tasks") or []):
            sc = t.get("subcategory_name") or ""
            if sc:
                potential_by_subcategory[sc] = int(t.get("potential_points", 0))
    replace_org_tasks(supabase, org_id, groups_data)
    done_subcategories = get_done_subcategory_names(scored_rubric)
    mark_tasks_done_by_subcategories(supabase, org_id, done_subcategories)
    groups = get_task_groups_with_tasks(supabase, org_id)
    by_cat_key = {g.get("category_key"): g for g in groups_data}
    completed_flat = []
    for g in groups:
        gd = by_cat_key.get(g.get("category_key"))
        if gd:
            g["total_in_category"] = gd.get("total_in_category", 0)
            g["done_count"] = gd.get("done_count", 0)
        all_tasks = g.get("tasks") or []
        completed_flat.extend(t for t in all_tasks if (t.get("status") or "todo") == "done")
        g["tasks"] = [t for t in all_tasks if (t.get("status") or "todo") != "done"]
        for t in g["tasks"]:
            sc = t.get("subcategory_name") or ""
            if sc and sc in potential_by_subcategory:
                t["potential_points"] = potential_by_subcategory[sc]
    for t in completed_flat:
        sc = t.get("subcategory_name") or ""
        if sc and sc in potential_by_subcategory:
            t["potential_points"] = potential_by_subcategory[sc]
    tasks_flat = [t for g in groups for t in g.get("tasks", [])]
    return {
        "readiness": readiness,
        "task_groups": groups,
        "tasks": tasks_flat,
        "completed_tasks": completed_flat,
        "task_progress": {"allotted_total": allotted_total, "current_pending": current_pending},
    }


@app.get("/api/startup-dashboard")
async def startup_dashboard_endpoint(org_id: str):
    """
    Single endpoint: readiness + task_groups + tasks + task_progress.
    Uses one get_readiness_result and caches response for _DASHBOARD_CACHE_TTL seconds.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    now = time.monotonic()
    entry = _dashboard_cache.get(org_id)
    if entry:
        expires_at, payload = entry
        if now < expires_at:
            _dashboard_cache.move_to_end(org_id)  # LRU: mark as recently used
            return JSONResponse(content=payload, headers={"Cache-Control": "private, max-age=30"})
    payload = _build_startup_dashboard(supabase, org_id)
    _dashboard_cache[org_id] = (now + _DASHBOARD_CACHE_TTL, payload)
    # Evict oldest entries if cache exceeds limit
    while len(_dashboard_cache) > _DASHBOARD_CACHE_MAX:
        _dashboard_cache.popitem(last=False)
    return JSONResponse(content=payload, headers={"Cache-Control": "private, max-age=30"})


@app.get("/api/startup-activity")
async def startup_activity_endpoint(org_id: str, limit: int = 30):
    """Return recent activity stream (score history + completed tasks) for dashboard."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    activities = get_recent_activity(supabase, org_id, limit=min(limit, 50))
    return JSONResponse(
        content={"activities": activities},
        headers={"Cache-Control": "private, max-age=30"},
    )


@app.get("/api/apollo-data")
async def apollo_data_endpoint(org_id: str):
    """Return raw_data from apollo_organization_enrichment for the org."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    raw_data = get_apollo_data(supabase, org_id)
    if raw_data is not None:
        return JSONResponse(
            content={"status": "ready", "raw_data": raw_data},
            headers={"Cache-Control": "private, max-age=3600"},
        )
    return {"status": "pending"}


def _deep_merge(base: dict, patch: dict) -> dict:
    """Deep merge patch into base. Patch values override base. Lists replaced, not merged."""
    result = dict(base)
    for k, v in patch.items():
        if k in result and isinstance(result[k], dict) and isinstance(v, dict):
            result[k] = _deep_merge(result[k], v)
        else:
            result[k] = v
    return result


@app.patch("/api/extraction-data")
async def update_extraction_endpoint(body: UpdateExtractionPatch):
    """Merge extraction_data_patch into existing extraction_data. Preserves ocr_storage_path and other fields."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    existing = get_extraction_data(supabase, body.org_id)
    if not existing:
        raise HTTPException(status_code=404, detail="No extraction data found for this organization")
    merged = _deep_merge(existing, body.extraction_data_patch)
    upsert_extraction_result(supabase, body.org_id, merged)
    log.info("Extraction data updated for org %s", body.org_id)
    return {"ok": True}


@app.post("/api/linkedin-rescrape")
async def linkedin_rescrape_endpoint(body: LinkedInRescrapeRequest):
    """Re-scrape founder/leadership data from a company LinkedIn URL and merge into extraction_data."""
    import re
    from urllib.parse import urlparse

    url = (body.linkedin_url or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="linkedin_url is required")
    if not re.match(r"^https?://", url, re.I):
        url = "https://" + url
    if "linkedin.com/company/" not in url.lower():
        raise HTTPException(
            status_code=400,
            detail="Please provide a company LinkedIn URL (e.g. https://linkedin.com/company/...). Person URLs are not supported for this flow yet.",
        )

    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    existing = get_extraction_data(supabase, body.org_id)
    if not existing:
        raise HTTPException(status_code=404, detail="No extraction data found. Complete onboarding first.")

    init = (existing.get("startup_kv") or {}).get("initial_details") or {}
    company_name = (existing.get("meta") or {}).get("company_name") or init.get("name", "")
    company_name = (company_name or "").strip() or "Company"

    now_iso = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
        out_path = f.name
    try:
        result = run_founder_linkedin(
            company_linkedin=url,
            company_name=company_name,
            output_path=out_path,
        )
    except Exception as exc:
        log.exception("LinkedIn re-scrape failed for org %s: %s", body.org_id, exc)
        merged = dict(existing)
        meta = dict(merged.get("meta") or {})
        meta["last_scraped_at"] = now_iso
        meta["linkedin_scrape_status"] = "failed"
        meta["linkedin_scrape_error"] = str(exc)
        merged["meta"] = meta
        upsert_extraction_result(supabase, body.org_id, merged)
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=200,
            content={"ok": False, "status": "failed", "error": str(exc), "extraction_data": merged},
        )
    finally:
        try:
            os.unlink(out_path)
        except Exception:
            pass

    existing_fl = existing.get("founder_linkedin") or {}
    merged_fl = _deep_merge(existing_fl, result)
    merged = dict(existing)
    merged["founder_linkedin"] = merged_fl
    meta = dict(merged.get("meta") or {})
    meta["last_scraped_at"] = now_iso
    meta["linkedin_scrape_status"] = "success"
    meta["company_linkedin"] = url
    merged["meta"] = meta
    upsert_extraction_result(supabase, body.org_id, merged)
    log.info("LinkedIn re-scrape saved for org %s", body.org_id)
    return {"ok": True, "status": "success", "extraction_data": merged}


@app.post("/api/profile-image")
async def profile_image_endpoint(body: ProfileImageRequest):
    """Fetch profile image URL for a LinkedIn person profile via Gemini+Search (used when direct fetch gets HTTP 999)."""
    url = (body.linkedin_url or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="linkedin_url is required")
    url = sanitize_linkedin(url)
    if not url or not is_person_linkedin(url):
        raise HTTPException(
            status_code=400,
            detail="Invalid URL: use a LinkedIn person profile (linkedin.com/in/...).",
        )
    try:
        result = run_linkedin_person_profile(url)
        person = result.get("person", result) if isinstance(result.get("person"), dict) else result
        profile_image_url = (person.get("profile_image_url") or "").strip()
        return {"profile_image_url": profile_image_url or None}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        log.exception("Profile image fetch failed for org %s: %s", body.org_id, e)
        raise HTTPException(
            status_code=502,
            detail="Could not fetch profile image. Try again later.",
        )


@app.post("/api/team/add-from-linkedin")
async def add_team_from_linkedin_endpoint(body: AddTeamFromLinkedInRequest):
    """Add a team member from a LinkedIn person profile URL. Validates URL, scrapes profile, merges into extraction_data."""
    from datetime import datetime, timezone

    log.info("add-from-linkedin: org_id=%s linkedin_url=%s role_type=%s", body.org_id, (body.linkedin_url or "")[:60], body.role_type or "Other")
    url = (body.linkedin_url or "").strip()
    if not url:
        log.warning("add-from-linkedin 400: linkedin_url is required")
        raise HTTPException(status_code=400, detail="linkedin_url is required")
    url = sanitize_linkedin(url)
    if not url or not is_person_linkedin(url):
        log.warning("add-from-linkedin 400: Invalid URL sanitized=%r original=%r", url, body.linkedin_url)
        raise HTTPException(
            status_code=400,
            detail="Invalid URL: use a LinkedIn person profile (linkedin.com/in/...). Company pages are not supported here.",
        )
    role_type = (body.role_type or "Other").strip()
    if role_type not in ("Founder", "Leadership", "Other"):
        role_type = "Other"

    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    existing = get_extraction_data(supabase, body.org_id)
    if not existing:
        raise HTTPException(status_code=404, detail="No extraction data found. Complete onboarding first.")

    fl = existing.get("founder_linkedin") or {}
    data = fl.get("data") or {}
    founders = list(data.get("founders") or [])
    leadership_team = list(data.get("leadership_team") or [])
    url_lower = url.lower()

    def find_existing():
        for p in founders + leadership_team:
            if isinstance(p, dict) and (p.get("linkedin_url") or "").strip().lower() == url_lower:
                return p
        return None

    existing_person = find_existing()
    if existing_person:
        log.info("Team member already exists for org %s: %s", body.org_id, url_lower)
        return {
            "ok": True,
            "status": "already_exists",
            "person": existing_person,
            "message": "This person is already in the team list.",
        }

    # Get company context for disambiguation
    company_domain = None
    company_name = None
    apollo = get_apollo_data(supabase, body.org_id)
    if apollo:
        website = apollo.get("website") or apollo.get("primary_domain") or ""
        if website:
            company_domain = extract_domain(website)
        company_name = (apollo.get("name") or existing.get("meta", {}).get("company_name") or "").strip() or None
    if not company_name and body.company_name_override:
        company_name = body.company_name_override.strip() or None
    if not company_domain and existing:
        meta = existing.get("meta") or {}
        website = meta.get("company_website") or ""
        if website:
            company_domain = extract_domain(website)

    try:
        result = run_linkedin_person_profile(
            body.linkedin_url,
            company_domain=company_domain or None,
            company_name=company_name,
        )
    except ValueError as e:
        log.warning("add-from-linkedin 400 (ValueError): %s", e)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        log.exception("Person profile scrape failed for org %s: %s", body.org_id, e)
        raise HTTPException(
            status_code=502,
            detail="Could not fetch profile. The page may be private or unavailable. Try again later.",
        )

    person = result.get("person", result)
    confidence_score = result.get("confidence_score", 0.9)
    evidence_links = result.get("evidence_links", [])
    identity_key = result.get("identity_key", "")

    CONFIDENCE_THRESHOLD = 0.75
    if confidence_score < CONFIDENCE_THRESHOLD:
        log.warning("Rejected low-confidence person org=%s url=%s score=%.2f", body.org_id, url_lower, confidence_score)
        return {
            "ok": False,
            "status": "rejected",
            "rejection_reason": "Profile could not be verified with sufficient confidence. Please verify the LinkedIn URL or add more company context.",
            "confidence_score": confidence_score,
        }

    now_iso = datetime.now(timezone.utc).isoformat()
    person["role_type"] = role_type
    person["source"] = "linkedin"
    person["scraped_at"] = now_iso
    person["scrape_status"] = "success"
    person["updated_by_source"] = "linkedin"
    person["confidence_score"] = confidence_score
    person["evidence_links"] = evidence_links
    person["identity_key"] = identity_key

    # Persist to person_provenance for canonical record
    try:
        upsert_person_provenance(
            supabase,
            body.org_id,
            identity_key,
            person,
            confidence_score=confidence_score,
            evidence_links=evidence_links,
            source="linkedin",
        )
    except Exception as e:
        log.warning("Could not persist person_provenance: %s", e)

    if role_type == "Founder":
        founders.append(person)
    elif role_type == "Leadership":
        leadership_team.append(person)
    else:
        leadership_team.append(person)

    new_data = {**data, "founders": founders, "leadership_team": leadership_team}
    merged_fl = {**fl, "data": new_data}
    merged = dict(existing)
    merged["founder_linkedin"] = merged_fl
    upsert_extraction_result(supabase, body.org_id, merged)
    log.info("Team member added for org %s: %s (%s)", body.org_id, person.get("full_name"), role_type)
    return {"ok": True, "status": "added", "person": person, "extraction_data": merged}


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
    # Never report total < current_pending so completed count stays non-negative
    allotted_total = max(allotted_total or 0, current_pending)
    # Map subcategory_name -> potential_points from rubric (so every task gets correct pts, not stale DB)
    potential_by_subcategory: dict[str, int] = {}
    for g in groups_data:
        for t in (g.get("tasks") or []):
            sc = t.get("subcategory_name") or ""
            if sc:
                potential_by_subcategory[sc] = int(t.get("potential_points", 0))
    replace_org_tasks(supabase, org_id, groups_data)
    # Mark as done any tasks whose rubric item is complete (e.g. from extraction) so they don't show as pending
    done_subcategories = get_done_subcategory_names(scored_rubric)
    mark_tasks_done_by_subcategories(supabase, org_id, done_subcategories)
    groups = get_task_groups_with_tasks(supabase, org_id)
    by_cat_key = {g.get("category_key"): g for g in groups_data}
    completed_flat = []
    for g in groups:
        gd = by_cat_key.get(g.get("category_key"))
        if gd:
            g["total_in_category"] = gd.get("total_in_category", 0)
            g["done_count"] = gd.get("done_count", 0)
        # Return only pending tasks so the UI shows the remaining layout; completed stay in DB for history
        all_tasks = g.get("tasks") or []
        completed_flat.extend(t for t in all_tasks if (t.get("status") or "todo") == "done")
        g["tasks"] = [t for t in all_tasks if (t.get("status") or "todo") != "done"]
        for t in g["tasks"]:
            sc = t.get("subcategory_name") or ""
            if sc and sc in potential_by_subcategory:
                t["potential_points"] = potential_by_subcategory[sc]
    for t in completed_flat:
        sc = t.get("subcategory_name") or ""
        if sc and sc in potential_by_subcategory:
            t["potential_points"] = potential_by_subcategory[sc]
    tasks_flat = [t for g in groups for t in g.get("tasks", [])]
    return {
        "task_groups": groups,
        "tasks": tasks_flat,
        "completed_tasks": completed_flat,
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


# Map rubric subcategory names to extraction initial_details keys
_SUBCATEGORY_TO_EXTRACTION_KEY: dict[str, str] = {
    "company.hq_jurisdiction": "hq_country",
    "company.entity_type": "entity_type",
    "company.legal_name": "legal_name",
    "company.board_of_directors": "board_of_directors",
    "company.full_time_founders": "founders_full_time",
    "overview.product_status": "product_stage",
    "overview.target_market": "target_market",
    "overview.business_model": "business_model",
    "overview.one_liner": "one_line_summary",
    "overview.problem": "problem",
    "overview.solution": "solution",
    "overview.unique_value_proposition": "unique_value_proposition",
    "overview.competitive_advantages": "competitive_advantages",
    "overview.traction": "traction",
    "fin.revenue_model": "revenue_model",
    "fin.monthly_revenue_usd": "monthly_revenue_usd",
    "fin.burn_rate": "burn_rate_usd_per_month",
    "fin.runway_months": "runway_months",
    "fin.total_funding_usd": "total_funding_usd",
    "biz.privacy_policy": "privacy_policy_url",
    "biz.terms_of_service": "terms_of_service_url",
}


def _update_extraction_from_task(supabase, org_id: str, subcategory: str, submitted_value: str):
    """Write the task's submitted value back into extraction data so the
    company profile stays in sync."""
    extraction_key = _SUBCATEGORY_TO_EXTRACTION_KEY.get(subcategory)
    if not extraction_key:
        return  # No mapping for this subcategory

    extraction = get_extraction_data(supabase, org_id)
    if not extraction:
        extraction = {}

    startup_kv = extraction.get("startup_kv") or {}
    initial_details = startup_kv.get("initial_details") or {}
    initial_details[extraction_key] = submitted_value
    startup_kv["initial_details"] = initial_details
    extraction["startup_kv"] = startup_kv

    upsert_extraction_result(supabase, org_id, extraction)
    log.info("Updated extraction key '%s' from task subcategory '%s' for org %s", extraction_key, subcategory, org_id)


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
    _invalidate_dashboard_cache(org_id)

    # Also update extraction data with the submitted value so the company
    # profile page reflects the new data.
    if submitted_value:
        try:
            _update_extraction_from_task(supabase, org_id, subcategory, submitted_value)
        except Exception as e:
            log.warning("Failed to update extraction from task %s: %s", task_id, e)

    row = mark_task_done(supabase, task_id, completed_by=body.completed_by if body else None)
    return {"ok": True, "task": row}


class TaskChatBody(BaseModel):
    message: str
    history: list[dict[str, str]] | None = None
    author_user_id: str | None = None


class TaskChatMessagesBody(BaseModel):
    """Body for appending messages to task chat history (e.g. after upload)."""
    messages: list[dict[str, str]]  # [{ "role": "user"|"assistant", "content": "..." }]


@app.get("/api/tasks/{task_id}/chat-messages")
async def task_chat_messages_endpoint(task_id: str):
    """Get saved AI chat messages for a task."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    messages = get_task_ai_chat_messages(supabase, task_id)
    return {"messages": messages}


@app.post("/api/tasks/{task_id}/chat-messages")
async def task_chat_messages_post_endpoint(task_id: str, body: TaskChatMessagesBody):
    """Append messages to task chat history (e.g. after proof upload so history persists)."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    task, _ = get_task_and_org_id(supabase, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    for m in body.messages or []:
        role = (m.get("role") or "user").strip().lower()
        if role not in ("user", "assistant"):
            role = "user"
        content = (m.get("content") or "").strip()
        if content:
            insert_task_ai_chat_message(supabase, task_id, role, content)
    return {"ok": True}


def _build_company_context_for_chat(supabase, org_id: str) -> dict:
    """Fetch company profile, founders, and team data for chat context."""
    ctx: dict = {}
    try:
        # Extraction data (company name, metrics, etc.)
        extraction = get_extraction_data(supabase, org_id)
        if extraction:
            for k in ["company_name", "name", "industry", "sector", "stage",
                       "business_model", "hq_city", "hq_country", "website",
                       "founded_year", "employee_count", "description"]:
                if extraction.get(k):
                    ctx[k] = extraction[k]
            # Metrics
            metrics = {}
            for k in ["arr_usd", "mrr_usd", "revenue_ttm_usd", "burn_monthly",
                       "runway_months", "customer_count", "headcount"]:
                if extraction.get(k):
                    metrics[k] = extraction[k]
            if metrics:
                ctx["metrics"] = metrics

        # Apollo data (richer company info)
        apollo = get_apollo_data(supabase, org_id)
        if apollo:
            if not ctx.get("company_name"):
                ctx["company_name"] = apollo.get("name") or apollo.get("organization_name")
            if not ctx.get("industry"):
                ctx["industry"] = apollo.get("industry")
            if not ctx.get("description"):
                ctx["description"] = apollo.get("short_description")

        # Founders and team from extraction_data.founder_linkedin
        if extraction:
            fl = extraction.get("founder_linkedin") or {}
            fl_data = (fl.get("data") or {}) if isinstance(fl, dict) else {}
            raw_founders = fl_data.get("founders") or []
            raw_leadership = fl_data.get("leadership_team") or []
            all_people = []
            for p in raw_founders:
                if isinstance(p, dict):
                    person = {
                        "full_name": p.get("full_name") or p.get("name") or "Unknown",
                        "title": p.get("title") or p.get("headline") or "",
                        "role_type": p.get("role_type") or "Founder",
                        "linkedin_url": p.get("linkedin_url") or "",
                        "skills": p.get("skills") or p.get("expertise") or "",
                    }
                    all_people.append(person)
            for p in raw_leadership:
                if isinstance(p, dict):
                    person = {
                        "full_name": p.get("full_name") or p.get("name") or "Unknown",
                        "title": p.get("title") or p.get("headline") or "",
                        "role_type": p.get("role_type") or "Leadership",
                        "linkedin_url": p.get("linkedin_url") or "",
                        "skills": p.get("skills") or p.get("expertise") or "",
                    }
                    all_people.append(person)
            if all_people:
                founders = [p for p in all_people if (p.get("role_type") or "").lower() in ("founder", "co-founder")]
                others = [p for p in all_people if p not in founders]
                if founders:
                    ctx["founders"] = founders
                if others:
                    ctx["team_members"] = others
                if not founders and not others:
                    ctx["founders"] = all_people

        # Fallback: try person_provenance table
        if not ctx.get("founders") and not ctx.get("team_members"):
            try:
                prov_resp = supabase.table("person_provenance").select(
                    "person_jsonb, source"
                ).eq("org_id", org_id).execute()
                prov_people = prov_resp.data or []
                if prov_people:
                    provenance_list = []
                    for row in prov_people:
                        pj = row.get("person_jsonb") or {}
                        if isinstance(pj, dict):
                            provenance_list.append({
                                "full_name": pj.get("full_name") or pj.get("name") or "Unknown",
                                "title": pj.get("title") or pj.get("headline") or "",
                                "role_type": pj.get("role_type") or "Team",
                                "linkedin_url": pj.get("linkedin_url") or "",
                                "skills": pj.get("skills") or "",
                            })
                    if provenance_list:
                        ctx["founders"] = provenance_list
            except Exception:
                pass  # person_provenance may not exist

        # Include completed tasks and their submitted values so the chatbot
        # knows what the user has already answered and won't re-ask.
        try:
            done_resp = supabase.table("tasks").select(
                "title, subcategory_name, submitted_value"
            ).eq("org_id", org_id).eq("status", "done").execute()
            done_tasks = done_resp.data or []
            completed_answers = []
            for t in done_tasks:
                sv = t.get("submitted_value")
                if sv:
                    completed_answers.append(f"  - {t.get('title', '')}: {sv}")
            if completed_answers:
                ctx["previously_completed_tasks"] = "\n".join(completed_answers)
        except Exception:
            pass  # tasks table query may fail

    except Exception as e:
        log.warning("Failed to build company context for org %s: %s", org_id, e)
    return ctx


@app.post("/api/tasks/{task_id}/chat")
async def task_chat_endpoint(task_id: str, body: TaskChatBody):
    """
    Chat: collect the user's answer for this task. When they provide it, we store
    submitted_value and tell them to mark the task complete.
    Uses real company data (founders, team, profile) for personalized responses.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    task = get_task_by_id(supabase, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.get("status") == "done":
        return {"reply": "This task is already complete.", "suggest_complete": False, "submitted_value": None}

    # Get org_id for company context
    _, org_id = get_task_and_org_id(supabase, task_id)
    company_context = _build_company_context_for_chat(supabase, org_id) if org_id else {}

    history = body.history or []
    result = get_task_chat_response(
        task_title=task.get("title", ""),
        task_description=task.get("description") or "",
        subcategory_name=task.get("subcategory_name") or "",
        user_message=body.message,
        history=history,
        company_context=company_context,
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


# ---------------------------------------------------------------------------
# Activity Events
# ---------------------------------------------------------------------------


@app.get("/api/activity-events")
async def activity_events_endpoint(org_id: str, limit: int = 50, event_type: str | None = None, resource_type: str | None = None):
    """Return filtered activity events for an org."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    events = get_activity_events(supabase, org_id, limit=min(limit, 100), event_type=event_type, resource_type=resource_type)
    return {"events": events}


# ---------------------------------------------------------------------------
# Share Links
# ---------------------------------------------------------------------------


class CreateShareLinkBody(BaseModel):
    org_id: str
    share_type: str = "data_room"
    scope: dict | None = None
    expires_in_days: int = 30
    watermark: str | None = None
    created_by: str | None = None


@app.post("/api/share-links")
async def create_share_link_endpoint(body: CreateShareLinkBody):
    """Create a tokenized, scoped share link."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    link = create_share_link(
        supabase, body.org_id, body.share_type,
        created_by=body.created_by, scope=body.scope,
        expires_in_days=body.expires_in_days, watermark=body.watermark,
    )
    if not link:
        raise HTTPException(status_code=500, detail="Could not create share link")
    log_activity(supabase, body.org_id, "share_link_created", "share_link", link.get("id", ""), actor_user_id=body.created_by)
    return {"ok": True, "link": link}


@app.get("/api/share-links/{token}")
async def validate_share_link_endpoint(token: str):
    """Validate a share link token and increment view count."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    link = validate_share_link(supabase, token)
    if not link:
        raise HTTPException(status_code=404, detail="Link not found or expired")
    return {"ok": True, "link": link}


@app.get("/api/share-links")
async def list_share_links_endpoint(org_id: str):
    """List all share links for an org."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    return {"links": get_share_links(supabase, org_id)}


@app.delete("/api/share-links/{link_id}")
async def revoke_share_link_endpoint(link_id: str):
    """Revoke (delete) a share link."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    ok = revoke_share_link(supabase, link_id)
    return {"ok": ok}


# ---------------------------------------------------------------------------
# Team Management & RBAC
# ---------------------------------------------------------------------------


class InviteMemberBody(BaseModel):
    org_id: str
    email: str
    role: str = "viewer"
    created_by: str | None = None


class AcceptInviteBody(BaseModel):
    user_id: str


class UpdateRoleBody(BaseModel):
    org_id: str
    user_id: str
    role: str


@app.post("/api/team/invite")
async def invite_member_endpoint(body: InviteMemberBody):
    """Send a team invite."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    invite = invite_member(supabase, body.org_id, body.email, body.role, created_by=body.created_by)
    if not invite:
        raise HTTPException(status_code=500, detail="Could not create invite")
    log_activity(supabase, body.org_id, "team_invite_sent", "team_invite", invite.get("id", ""), actor_user_id=body.created_by, metadata={"email": body.email, "role": body.role})
    return {"ok": True, "invite": invite}


@app.post("/api/team/invite/{invite_token}/accept")
async def accept_invite_endpoint(invite_token: str, body: AcceptInviteBody):
    """Accept a team invite."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    invite = accept_invite(supabase, invite_token, body.user_id)
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found, expired, or already accepted")
    log_activity(supabase, invite.get("org_id", ""), "team_invite_accepted", "team_invite", invite.get("id", ""), actor_user_id=body.user_id)
    return {"ok": True, "invite": invite}


@app.get("/api/team/members")
async def team_members_endpoint(org_id: str):
    """List team members for an org."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    return {"members": get_team_members(supabase, org_id), "invites": get_pending_invites(supabase, org_id)}


@app.patch("/api/team/role")
async def update_role_endpoint(body: UpdateRoleBody):
    """Update a team member's role."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    ok = update_member_role(supabase, body.org_id, body.user_id, body.role)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid role or member not found")
    log_activity(supabase, body.org_id, "team_role_changed", "team_membership", body.user_id, metadata={"new_role": body.role})
    return {"ok": True}


@app.delete("/api/team/invite/{invite_id}")
async def revoke_invite_endpoint(invite_id: str):
    """Revoke a pending invite."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    ok = revoke_invite(supabase, invite_id)
    return {"ok": ok}


# ---------------------------------------------------------------------------
# AI Analysis (cached)
# ---------------------------------------------------------------------------


class AIAnalysisRequest(BaseModel):
    org_id: str
    analysis_type: str = "readiness_strategic"
    input_data: dict = {}
    force: bool = False


@app.post("/api/ai-analysis")
async def ai_analysis_endpoint(body: AIAnalysisRequest):
    """Return cached AI analysis or generate new one. Currently returns placeholder structure."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    if not body.force:
        cached = get_cached_analysis(supabase, body.org_id, body.analysis_type, body.input_data)
        if cached:
            return {"ok": True, "cached": True, "result": cached}
    # For now return a structured placeholder. Real LLM call will be added when cost routing is in place.
    result = {
        "strengths": ["Readiness score is being tracked", "Data extraction pipeline complete"],
        "risks": ["Score below fundraise-ready threshold", "Missing key financial documentation"],
        "top_blockers": ["Complete financial projections", "Add team compensation details"],
        "plan_30_60_90": {
            "30_days": ["Complete all high-impact readiness tasks", "Upload missing documents"],
            "60_days": ["Reach score >70 for investor outreach", "Prepare pitch materials"],
            "90_days": ["Begin investor conversations", "Close readiness gaps"],
        },
        "investor_objections": [
            {"objection": "Incomplete financial model", "response": "Projections are being finalized with historical data backing"},
        ],
    }
    set_cached_analysis(supabase, body.org_id, body.analysis_type, body.input_data, result, model="placeholder")
    return {"ok": True, "cached": False, "result": result}


# ---------------------------------------------------------------------------
# Task Validation & Verdicts
# ---------------------------------------------------------------------------


class TaskVerdictBody(BaseModel):
    verdict: str  # approve, reject, request_changes
    verdict_by: str | None = None
    verdict_notes: str | None = None


@app.post("/api/tasks/{task_id}/verdicts")
async def add_task_verdict_endpoint(task_id: str, body: TaskVerdictBody):
    """Add a validation verdict for a task."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    task = get_task_by_id(supabase, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    row = {
        "task_id": task_id,
        "verdict": body.verdict,
        "verdict_by": body.verdict_by,
        "verdict_notes": body.verdict_notes,
        "created_at": now,
    }
    try:
        r = supabase.table("task_verdicts").insert(row).execute()
        verdict_row = (r.data or [{}])[0] if r.data else row
    except Exception as e:
        log.warning("task_verdicts insert failed: %s", e)
        verdict_row = row
    return {"ok": True, "verdict": verdict_row}


# ---------------------------------------------------------------------------
# AI Chat Threads (persistent conversations)
# ---------------------------------------------------------------------------


class CreateChatThreadBody(BaseModel):
    org_id: str
    title: str = "New Chat"
    created_by: str | None = None


class ChatMessageBody(BaseModel):
    role: str = "user"
    content: str
    metadata: dict | None = None


@app.post("/api/chat-threads")
async def create_chat_thread(body: CreateChatThreadBody):
    """Create a new AI chat thread."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    row = {
        "org_id": body.org_id,
        "title": body.title,
        "created_by": body.created_by,
        "message_count": 0,
        "pinned": False,
        "created_at": now,
        "updated_at": now,
    }
    try:
        r = supabase.table("ai_chat_threads").insert(row).execute()
        thread = (r.data or [{}])[0] if r.data else row
    except Exception as e:
        log.warning("chat thread insert failed: %s", e)
        thread = {**row, "id": f"thread-{now}"}
    return {"ok": True, "thread": thread}


@app.get("/api/chat-threads")
async def list_chat_threads(org_id: str, limit: int = 50):
    """List chat threads for an org, most recent first."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        r = (supabase.table("ai_chat_threads")
             .select("*")
             .eq("org_id", org_id)
             .order("updated_at", desc=True)
             .limit(min(limit, 100))
             .execute())
        return {"threads": r.data or []}
    except Exception as e:
        log.warning("chat threads list failed: %s", e)
        return {"threads": []}


@app.get("/api/chat-threads/{thread_id}/messages")
async def get_chat_thread_messages(thread_id: str, limit: int = 100):
    """Get messages for a chat thread."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        r = (supabase.table("ai_chat_messages")
             .select("*")
             .eq("thread_id", thread_id)
             .order("created_at", desc=False)
             .limit(min(limit, 500))
             .execute())
        return {"messages": r.data or []}
    except Exception as e:
        log.warning("chat messages fetch failed: %s", e)
        return {"messages": []}


@app.post("/api/chat-threads/{thread_id}/messages")
async def add_chat_thread_message(thread_id: str, body: ChatMessageBody):
    """Add a message to a chat thread."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    role = body.role.strip().lower()
    if role not in ("user", "assistant", "system"):
        role = "user"
    row = {
        "thread_id": thread_id,
        "role": role,
        "content": body.content,
        "metadata": body.metadata or {},
        "created_at": now,
    }
    try:
        r = supabase.table("ai_chat_messages").insert(row).execute()
        msg = (r.data or [{}])[0] if r.data else row
        # Update thread message count and timestamp
        supabase.table("ai_chat_threads").update({
            "message_count": supabase.table("ai_chat_messages").select("id", count="exact").eq("thread_id", thread_id).execute().count or 0,
            "updated_at": now,
        }).eq("id", thread_id).execute()
    except Exception as e:
        log.warning("chat message insert failed: %s", e)
        msg = row
    return {"ok": True, "message": msg}


@app.delete("/api/chat-threads/{thread_id}")
async def delete_chat_thread(thread_id: str):
    """Delete a chat thread and its messages."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        supabase.table("ai_chat_messages").delete().eq("thread_id", thread_id).execute()
        supabase.table("ai_chat_threads").delete().eq("id", thread_id).execute()
    except Exception as e:
        log.warning("chat thread delete failed: %s", e)
    return {"ok": True}


class PinThreadBody(BaseModel):
    pinned: bool


@app.patch("/api/chat-threads/{thread_id}/pin")
async def pin_chat_thread(thread_id: str, body: PinThreadBody):
    """Pin or unpin a chat thread."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        supabase.table("ai_chat_threads").update({"pinned": body.pinned}).eq("id", thread_id).execute()
    except Exception as e:
        log.warning("chat thread pin failed: %s", e)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Investor Matching Endpoints
# ---------------------------------------------------------------------------


class GenerateThesisRequest(BaseModel):
    org_id: str
    use_llm: bool = True


class TriggerMatchingRequest(BaseModel):
    org_id: str
    max_matches: int = 10


class AddCustomInvestorRequest(BaseModel):
    org_id: str
    investor_name: str
    investor_url: str


@app.post("/api/generate-thesis-profile")
async def generate_thesis_profile_endpoint(
    body: GenerateThesisRequest, background_tasks: BackgroundTasks
):
    """Generate startup thesis profile in background."""
    log.info("POST /api/generate-thesis-profile for org_id=%s", body.org_id)
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    # Don't re-trigger if already running
    current = _get_pipeline_status(body.org_id)
    if current in ("generating", "matching"):
        return {"ok": True, "status": current, "message": f"Already running: {current}"}

    _set_pipeline_status(body.org_id, "generating")

    def _task():
        import traceback
        t0 = time.time()
        _log(f"[Generate Thesis] Starting for org {body.org_id} (llm={'ON' if body.use_llm else 'OFF'})")
        try:
            sb = get_supabase()
            generate_startup_thesis_profile(sb, body.org_id, use_llm=body.use_llm)
            elapsed = time.time() - t0
            _log(f"[Generate Thesis] DONE for {body.org_id} in {elapsed:.1f}s")
            _set_pipeline_status(body.org_id, "ready")
        except Exception as exc:
            tb = traceback.format_exc()
            _log(f"[Generate Thesis] FAILED for {body.org_id}: {exc}\n{tb}")
            log.exception("Thesis profile generation failed for %s: %s", body.org_id, exc)
            _set_pipeline_status(body.org_id, "error")

    background_tasks.add_task(_task)
    return {"ok": True, "status": "generating", "message": "Thesis profile generation started"}


@app.get("/api/investor-matches")
async def investor_matches_endpoint(org_id: str):
    """Fetch stored investor matches + profiles for an org, sorted by score.

    Also reports in-memory pipeline status so the frontend knows if
    thesis generation or matching is currently running.
    """
    _log(f"[GET investor-matches] org={org_id}")
    log.info("GET /api/investor-matches for org_id=%s", org_id)
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    pipeline_status = _get_pipeline_status(org_id)
    _log(f"[GET investor-matches] pipeline_status={pipeline_status}")

    try:
        # Check if thesis profile exists
        profile = get_startup_thesis_profile(supabase, org_id)
        _log(f"[GET investor-matches] thesis_profile={'EXISTS' if profile else 'NONE'}")
        if not profile:
            if pipeline_status in ("generating", "matching"):
                _log(f"[GET investor-matches] → returning status={pipeline_status} (no profile, pipeline running)")
                return {"status": pipeline_status, "matches": []}
            _log("[GET investor-matches] → returning status=no_profile")
            return {"status": "no_profile", "matches": []}

        matches = get_investor_matches(supabase, org_id)
        _log(f"[GET investor-matches] found {len(matches)} matches in DB")

        # If matches are empty but pipeline is still running, report that
        if not matches and pipeline_status in ("generating", "matching"):
            _log(f"[GET investor-matches] → returning status={pipeline_status} (0 matches, pipeline running)")
            return {"status": pipeline_status, "matches": []}

        _log(f"[GET investor-matches] → returning status=ready with {len(matches)} matches")
        return JSONResponse(
            content={"status": "ready", "matches": matches, "match_count": len(matches)},
            headers={"Cache-Control": "private, max-age=60"},
        )
    except Exception as e:
        _log(f"[GET investor-matches] ERROR: {e}")
        log.warning("investor_matches_endpoint error for org %s: %s", org_id, e)
        if pipeline_status in ("generating", "matching"):
            return {"status": pipeline_status, "matches": []}
        return {"status": "no_profile", "matches": [], "error": str(e)}


@app.post("/api/trigger-investor-matching")
async def trigger_investor_matching_endpoint(
    body: TriggerMatchingRequest, background_tasks: BackgroundTasks
):
    """Run investor matching if fewer than max_matches exist."""
    log.info("POST /api/trigger-investor-matching for org_id=%s", body.org_id)
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    # Don't re-trigger if pipeline already running
    current = _get_pipeline_status(body.org_id)
    if current in ("generating", "matching"):
        return {"ok": True, "status": current, "message": f"Pipeline already running: {current}"}

    try:
        existing = get_investor_matches(supabase, body.org_id)
        if len(existing) >= body.max_matches:
            return {
                "ok": True,
                "message": f"Already have {len(existing)} matches",
                "match_count": len(existing),
            }
    except Exception as e:
        log.warning("Could not fetch existing matches for %s: %s", body.org_id, e)

    _set_pipeline_status(body.org_id, "matching")

    def _task():
        import traceback
        t0 = time.time()
        _log(f"[Trigger Matching] Starting for org {body.org_id} (max={body.max_matches})")
        try:
            sb = get_supabase()
            run_investor_matching(sb, body.org_id, max_matches=body.max_matches)
            elapsed = time.time() - t0
            _log(f"[Trigger Matching] DONE for {body.org_id} in {elapsed:.1f}s")
            _set_pipeline_status(body.org_id, "ready")
        except Exception as exc:
            tb = traceback.format_exc()
            _log(f"[Trigger Matching] FAILED for {body.org_id}: {exc}\n{tb}")
            log.exception("Investor matching failed for %s: %s", body.org_id, exc)
            _set_pipeline_status(body.org_id, "error")

    background_tasks.add_task(_task)
    return {"ok": True, "status": "matching", "message": "Investor matching started"}


@app.post("/api/run-investor-pipeline")
async def run_investor_pipeline_endpoint(
    body: TriggerMatchingRequest, background_tasks: BackgroundTasks
):
    """Combined pipeline: generate thesis profile (if missing) then run matching.

    This is the primary endpoint the frontend should call. It:
    1. Checks if the pipeline is already running (deduplication).
    2. Checks if we already have enough matches (skip if so).
    3. Runs a background task that generates thesis profile + matches.
    """
    org_id = body.org_id
    _log(f"[POST run-investor-pipeline] org={org_id}, max_matches={body.max_matches}")
    log.info("POST /api/run-investor-pipeline for org_id=%s", org_id)

    # Don't re-trigger if already running
    current = _get_pipeline_status(org_id)
    if current in ("generating", "matching"):
        _log(f"[POST run-investor-pipeline] Already running: {current}")
        return {"ok": True, "status": current, "message": f"Pipeline already running: {current}"}

    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    # Check if we already have enough matches
    try:
        existing = get_investor_matches(supabase, org_id)
        if len(existing) >= body.max_matches:
            return {
                "ok": True,
                "status": "ready",
                "message": f"Already have {len(existing)} matches",
                "match_count": len(existing),
            }
    except Exception:
        pass

    # Start the combined pipeline as a background task
    _set_pipeline_status(org_id, "generating")

    def _pipeline_task():
        import traceback
        t0 = time.time()
        _log(f"{'='*60}")
        _log(f"[Investor Pipeline] STARTED for {org_id}")
        _log(f"{'='*60}")
        try:
            sb = get_supabase()
            if not sb:
                _log("[Investor Pipeline] ERROR: Supabase not configured!")
                _set_pipeline_status(org_id, "error")
                return

            # Step 1: Generate thesis profile if it doesn't exist
            _log("[Investor Pipeline] Checking thesis profile...")
            profile = get_startup_thesis_profile(sb, org_id)
            if not profile:
                _log("[Investor Pipeline] No thesis profile — generating with OpenAI...")
                _set_pipeline_status(org_id, "generating")
                generate_startup_thesis_profile(sb, org_id, use_llm=True)
                _log("[Investor Pipeline] Thesis profile generated!")
            else:
                _log("[Investor Pipeline] Thesis profile already exists — skipping generation")

            # Step 2: Run investor matching
            _log(f"[Investor Pipeline] Starting investor matching (max={body.max_matches})...")
            _set_pipeline_status(org_id, "matching")
            run_investor_matching(sb, org_id, max_matches=body.max_matches)

            elapsed = time.time() - t0
            _log(f"{'='*60}")
            _log(f"[Investor Pipeline] DONE for {org_id} in {elapsed:.1f}s")
            _log(f"{'='*60}")
            _set_pipeline_status(org_id, "ready")
        except Exception as exc:
            elapsed = time.time() - t0
            tb = traceback.format_exc()
            _log(f"[Investor Pipeline] FAILED for {org_id} after {elapsed:.1f}s")
            _log(f"Error: {exc}")
            _log(f"Traceback:\n{tb}")
            log.exception("Investor pipeline failed for %s: %s", org_id, exc)
            _set_pipeline_status(org_id, "error")

    background_tasks.add_task(_pipeline_task)
    return {"ok": True, "status": "generating", "message": "Investor pipeline started"}


@app.post("/api/investors/add-custom")
async def add_custom_investor_endpoint(body: AddCustomInvestorRequest):
    """Add a custom investor by name + website URL.

    1. Fetches website content.
    2. Uses Gemini to infer investor thesis.
    3. Runs deterministic matching against startup thesis profile.
    4. Generates AI reasoning.
    5. Saves to startup_investor_matches.
    Returns the match result.
    """
    investor_name = (body.investor_name or "").strip()
    investor_url = (body.investor_url or "").strip()

    if not investor_name:
        raise HTTPException(status_code=400, detail="investor_name is required")
    if not investor_url:
        raise HTTPException(status_code=400, detail="investor_url is required")
    if not investor_url.startswith(("http://", "https://")):
        investor_url = "https://" + investor_url

    _log(f"[POST add-custom-investor] org={body.org_id} name={investor_name} url={investor_url}")

    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    # Check if startup has a thesis profile; if not, trigger generation first
    profile = get_startup_thesis_profile(supabase, body.org_id)
    if not profile:
        _log(f"[add-custom-investor] No thesis profile for {body.org_id} — generating...")
        try:
            generate_startup_thesis_profile(supabase, body.org_id, use_llm=True)
        except Exception as exc:
            _log(f"[add-custom-investor] Thesis generation failed: {exc}")
            raise HTTPException(
                status_code=500,
                detail="Could not generate startup thesis profile. Complete onboarding first.",
            )

    try:
        result = add_custom_investor_match(supabase, body.org_id, investor_name, investor_url)
    except Exception as exc:
        _log(f"[add-custom-investor] ERROR: {exc}")
        log.exception("add_custom_investor_match failed for org %s: %s", body.org_id, exc)
        raise HTTPException(status_code=500, detail=f"Investor matching failed: {exc}")

    if result is None:
        raise HTTPException(
            status_code=500,
            detail="Could not match investor. Check backend logs for details.",
        )

    return {"ok": True, "match": result}


# ---------------------------------------------------------------------------
# Diagnostic endpoint — test the pipeline components without running anything
# ---------------------------------------------------------------------------
@app.get("/api/investor-pipeline-diagnostics")
async def investor_pipeline_diagnostics(org_id: str = ""):
    """Check that all pipeline components are connected and working.
    Call: GET /api/investor-pipeline-diagnostics?org_id=...
    Returns status of each component so you can debug issues.
    """
    import traceback
    checks: dict = {}

    # 1. Supabase
    try:
        sb = get_supabase()
        checks["supabase"] = "OK" if sb else "FAIL: get_supabase() returned None"
    except Exception as e:
        checks["supabase"] = f"FAIL: {e}"

    # 2. OpenAI API key
    openai_key = os.getenv("OPENAI_API_KEY", "")
    # Strip quotes that dotenv may or may not have stripped
    openai_key_clean = openai_key.strip().strip('"').strip("'")
    checks["openai_api_key"] = f"{'OK' if openai_key_clean.startswith('sk-') else 'MISSING/INVALID'} (len={len(openai_key_clean)})"
    checks["openai_model"] = os.getenv("OPENAI_MODEL", "gpt-4o-mini (default)")

    # 3. Quick OpenAI test call
    try:
        import requests as _req
        resp = _req.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {openai_key_clean}", "Content-Type": "application/json"},
            json={
                "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                "messages": [{"role": "user", "content": "Say hello in JSON: {\"greeting\": \"...\"}"}],
                "max_tokens": 30,
                "response_format": {"type": "json_object"},
            },
            timeout=15,
        )
        if resp.status_code == 200:
            data = resp.json()
            reply = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            checks["openai_test_call"] = f"OK — response: {reply[:100]}"
        else:
            checks["openai_test_call"] = f"FAIL HTTP {resp.status_code}: {resp.text[:200]}"
    except Exception as e:
        checks["openai_test_call"] = f"FAIL: {e}"

    # 4. Investor table count
    if sb:
        try:
            resp = sb.table("investor_universal_profiles").select("id", count="exact").ilike("investor_active_status", "active").limit(1).execute()
            checks["investor_table_active_count"] = resp.count if resp.count is not None else f"query returned {len(resp.data or [])} rows (count unavailable)"
        except Exception as e:
            checks["investor_table_active_count"] = f"FAIL: {e}"

    # 5. Thesis profile for org
    if org_id and sb:
        try:
            profile = get_startup_thesis_profile(sb, org_id)
            if profile:
                startup = profile.get("startup", {})
                checks["thesis_profile"] = f"EXISTS — sector={startup.get('primary_sector','?')}, stage={startup.get('funding_stage','?')}, hq={startup.get('hq_city','?')}"
            else:
                checks["thesis_profile"] = "NOT FOUND — will be generated on first pipeline run"
        except Exception as e:
            checks["thesis_profile"] = f"FAIL: {e}"

        # 6. Existing matches
        try:
            matches = get_investor_matches(sb, org_id)
            checks["existing_matches"] = f"{len(matches)} matches found"
        except Exception as e:
            checks["existing_matches"] = f"FAIL: {e}"

    # 7. Pipeline status
    if org_id:
        status = _get_pipeline_status(org_id)
        checks["pipeline_status"] = status or "idle (not running)"

    # 8. Log file
    checks["log_file"] = INVESTOR_LOG_FILE
    try:
        if os.path.exists(INVESTOR_LOG_FILE):
            size = os.path.getsize(INVESTOR_LOG_FILE)
            checks["log_file_size"] = f"{size} bytes"
        else:
            checks["log_file_size"] = "not created yet (will be created on first pipeline run)"
    except Exception as e:
        checks["log_file_size"] = f"FAIL: {e}"

    _log(f"[Diagnostics] Ran for org={org_id}: {json.dumps(checks, default=str)}")
    return {"ok": True, "diagnostics": checks}


# ---------------------------------------------------------------------------
# Investor Profile + AI Insights (Gemini) — with caching
# ---------------------------------------------------------------------------

_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")

# In-memory cache for AI insights: investor_id → (expires_at, insights_dict)
_ai_insights_cache: collections.OrderedDict[str, tuple[float, dict]] = collections.OrderedDict()
_AI_INSIGHTS_TTL = 3600  # 1 hour
_AI_INSIGHTS_MAX = 200   # max cached investors
_ai_insights_generating: set[str] = set()  # track in-flight generation


def _generate_investor_insights_gemini(profile: dict) -> dict:
    """Call Gemini to generate AI-powered insights about an investor."""
    import google.generativeai as genai

    if not _GEMINI_API_KEY:
        return {"error": "Gemini API key not configured"}

    genai.configure(api_key=_GEMINI_API_KEY)
    model = genai.GenerativeModel(_GEMINI_MODEL)

    name = profile.get("investor_name", "Unknown")
    thesis = profile.get("investor_thesis_summary", "")
    sectors = profile.get("investor_sectors", [])
    stages = profile.get("investor_stages", [])
    portfolio = profile.get("investor_notable_portfolio", [])
    recent = profile.get("investor_recent_investments", [])
    aum = profile.get("investor_aum_usd")
    check_min = profile.get("investor_minimum_check_usd")
    check_max = profile.get("investor_maximum_check_usd")
    check_typ = profile.get("investor_typical_check_usd")
    lead = profile.get("investor_lead_or_follow", "")
    hq = f"{profile.get('investor_hq_city', '')}, {profile.get('investor_hq_state', '')}, {profile.get('investor_hq_country', '')}"
    founded = profile.get("investor_founded_year")
    portfolio_size = profile.get("investor_portfolio_size")
    ticket_style = profile.get("investor_ticket_style", "")

    prompt = f"""You are an expert VC analyst. Analyze this investor and return a JSON object with these exact keys:

1. "strategic_summary" - 2-3 sentence overview of their investment strategy and positioning
2. "approach_tips" - Array of 3-4 actionable tips for a startup approaching this investor (short strings)
3. "red_flags" - Array of 2-3 potential concerns or things to watch out for when pitching to this investor
4. "competitive_edge" - What makes this investor unique vs others in their space (1-2 sentences)
5. "ideal_startup_profile" - Description of the ideal startup for this investor (2-3 sentences)
6. "sector_trend_data" - Array of objects with {{"sector": str, "weight": number (0-100)}} for a chart showing their sector allocation focus (use the sectors and portfolio to infer weights, 4-6 items)
7. "investment_pace" - Estimated deals per year and investment pacing insight (1 sentence)
8. "portfolio_synergy_score" - Number 0-100 representing how synergistic their portfolio companies are

INVESTOR DATA:
- Name: {name}
- Thesis: {thesis}
- Sectors: {', '.join(sectors) if isinstance(sectors, list) else sectors}
- Stages: {', '.join(stages) if isinstance(stages, list) else stages}
- Notable Portfolio: {', '.join(portfolio) if isinstance(portfolio, list) else portfolio}
- Recent Investments: {', '.join(recent) if isinstance(recent, list) else recent}
- AUM: ${aum}
- Check Size: ${check_min} - ${check_max} (typical: ${check_typ})
- Lead/Follow: {lead}
- HQ: {hq}
- Founded: {founded}
- Portfolio Size: {portfolio_size}
- Ticket Style: {ticket_style}

Return ONLY valid JSON, no markdown fences or explanation."""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        if text.startswith("json"):
            text = text[4:]
        return json.loads(text.strip())
    except Exception as exc:
        log.warning("Gemini investor insights failed: %s", exc)
        return {"error": str(exc)}


def _get_cached_ai_insights(investor_id: str) -> dict | None:
    """Return cached AI insights if fresh, else None."""
    entry = _ai_insights_cache.get(investor_id)
    if not entry:
        return None
    expires_at, insights = entry
    if time.monotonic() > expires_at:
        _ai_insights_cache.pop(investor_id, None)
        return None
    _ai_insights_cache.move_to_end(investor_id)
    return insights


def _cache_ai_insights(investor_id: str, insights: dict):
    """Store AI insights in cache with TTL."""
    _ai_insights_cache[investor_id] = (time.monotonic() + _AI_INSIGHTS_TTL, insights)
    while len(_ai_insights_cache) > _AI_INSIGHTS_MAX:
        _ai_insights_cache.popitem(last=False)


def _background_generate_insights(investor_id: str, profile: dict):
    """Generate Gemini insights in background thread, caching result."""
    if investor_id in _ai_insights_generating:
        return
    _ai_insights_generating.add(investor_id)
    try:
        insights = _generate_investor_insights_gemini(profile)
        if not insights.get("error"):
            _cache_ai_insights(investor_id, insights)
    except Exception as exc:
        log.warning("Background AI insights failed for %s: %s", investor_id, exc)
    finally:
        _ai_insights_generating.discard(investor_id)


@app.get("/api/investor-profile")
async def get_investor_profile_endpoint(
    investor_id: str, background_tasks: BackgroundTasks
):
    """Fetch full investor profile. AI insights are returned from cache or generated in background.

    - First call: returns profile immediately + ai_insights=null, kicks off background Gemini call
    - Subsequent calls within 1hr: returns profile + cached ai_insights instantly
    """
    log.info("GET /api/investor-profile for investor_id=%s", investor_id)

    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    # Fetch the investor profile
    try:
        resp = (
            supabase.table("investor_universal_profiles")
            .select("*")
            .eq("id", investor_id)
            .limit(1)
            .execute()
        )
        rows = resp.data or []
    except Exception as exc:
        log.exception("Failed to fetch investor profile: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))

    if not rows:
        raise HTTPException(status_code=404, detail="Investor not found")

    profile = rows[0]

    # Parse JSON string fields
    for field in ("raw_profile_json", "normalized_thesis_json", "metadata_json"):
        val = profile.get(field)
        if isinstance(val, str):
            try:
                profile[field] = json.loads(val)
            except Exception:
                pass

    # Extract logo_url from metadata or raw_profile
    logo_url = None
    meta = profile.get("metadata_json") or {}
    if isinstance(meta, dict):
        logo_url = meta.get("logo_public_url")
    if not logo_url:
        raw = profile.get("raw_profile_json") or {}
        if isinstance(raw, dict):
            logo_url = raw.get("logo_url")
    profile["logo_url"] = logo_url

    # AI insights: check cache first, generate in background if miss
    ai_insights = _get_cached_ai_insights(investor_id)
    ai_status = "ready" if ai_insights else "generating"

    if not ai_insights and investor_id not in _ai_insights_generating:
        background_tasks.add_task(_background_generate_insights, investor_id, profile)

    return JSONResponse(
        content={
            "status": "ok",
            "profile": profile,
            "ai_insights": ai_insights,
            "ai_insights_status": ai_status,
        },
        headers={"Cache-Control": "private, max-age=60"},
    )


# ---------------------------------------------------------------------------
# Stripe Webhook
# ---------------------------------------------------------------------------

@app.post("/api/webhooks/stripe")
async def stripe_webhook(request: Request):
    """Handle incoming Stripe webhook events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not STRIPE_WEBHOOK_SECRET:
        log.error("STRIPE_WEBHOOK_SECRET not configured")
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except ValueError:
        log.warning("Stripe webhook: invalid payload")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.SignatureVerificationError:
        log.warning("Stripe webhook: invalid signature")
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event["type"]
    data = event["data"]["object"]
    log.info("Stripe webhook received: %s", event_type)

    supabase = get_supabase()

    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    # --- Checkout completed: activate subscription ---
    if event_type == "checkout.session.completed":
        org_id = data.get("client_reference_id")
        customer_id = data.get("customer")
        subscription_id = data.get("subscription")
        amount = data.get("amount_total")
        payment_intent = data.get("payment_intent")
        log.info("Checkout completed for org=%s (customer=%s, sub=%s)", org_id, customer_id, subscription_id)

        if supabase and org_id:
            supabase.table("subscriptions").upsert({
                "org_id": org_id,
                "stripe_customer_id": customer_id,
                "stripe_subscription_id": subscription_id,
                "stripe_payment_intent_id": payment_intent,
                "payment_status": "paid",
                "subscription_status": "active",
                "amount_paid": (amount or 0) / 100,
                "currency": data.get("currency", "usd").upper(),
                "subscription_start_date": now,
                "updated_at": now,
            }, on_conflict="org_id").execute()

    # --- Subscription updated ---
    elif event_type == "customer.subscription.updated":
        subscription_id = data.get("id")
        status = data.get("status")  # active, past_due, canceled, unpaid
        log.info("Subscription updated: %s → %s", subscription_id, status)

        if supabase:
            supabase.table("subscriptions").update({
                "subscription_status": status,
                "updated_at": now,
            }).eq("stripe_subscription_id", subscription_id).execute()

    # --- Subscription deleted (canceled) ---
    elif event_type == "customer.subscription.deleted":
        subscription_id = data.get("id")
        log.info("Subscription canceled: %s", subscription_id)

        if supabase:
            supabase.table("subscriptions").update({
                "subscription_status": "canceled",
                "updated_at": now,
            }).eq("stripe_subscription_id", subscription_id).execute()

    # --- Invoice paid ---
    elif event_type == "invoice.paid":
        subscription_id = data.get("subscription")
        amount = data.get("amount_paid")
        log.info("Invoice paid: sub=%s ($%s)", subscription_id, (amount or 0) / 100)

        if supabase and subscription_id:
            supabase.table("subscriptions").update({
                "payment_status": "paid",
                "amount_paid": (amount or 0) / 100,
                "updated_at": now,
            }).eq("stripe_subscription_id", subscription_id).execute()

    # --- Invoice payment failed ---
    elif event_type == "invoice.payment_failed":
        subscription_id = data.get("subscription")
        log.info("Payment failed for sub=%s", subscription_id)

        if supabase and subscription_id:
            supabase.table("subscriptions").update({
                "payment_status": "failed",
                "subscription_status": "past_due",
                "updated_at": now,
            }).eq("stripe_subscription_id", subscription_id).execute()

    else:
        log.info("Unhandled Stripe event: %s", event_type)

    return {"status": "ok"}
