"""Supabase client for backend operations (uses service role)."""
import logging
import os

log = logging.getLogger(__name__)
from datetime import datetime, timezone
from supabase import Client, create_client


BUCKET = "org-assets"
SIGNED_URL_EXPIRES = 3600  # 1 hour


def get_supabase() -> Client | None:
    """Create Supabase client with service role key (bypasses RLS)."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return None
    return create_client(url, key)


def upsert_apollo_enrichment(
    supabase: Client,
    org_id: str,
    domain: str,
    raw_data: dict,
    apollo_org_id: str | None = None,
) -> None:
    """Insert or update apollo_organization_enrichment row."""
    now = datetime.now(timezone.utc).isoformat()
    row = {
        "org_id": org_id,
        "domain": domain,
        "apollo_organization_id": apollo_org_id,
        "raw_data": raw_data,
        "updated_at": now,
    }
    supabase.table("apollo_organization_enrichment").upsert(
        row,
        on_conflict="org_id",
    ).execute()


def get_apollo_data(supabase: Client, org_id: str) -> dict | None:
    """Get Apollo enrichment for org. Returns raw_data dict or None."""
    r = supabase.table("apollo_organization_enrichment").select("raw_data").eq("org_id", org_id).execute()
    rows = r.data or []
    if not rows:
        return None
    raw = rows[0].get("raw_data")
    return raw if isinstance(raw, dict) else None


def get_latest_pitch_deck_path(supabase: Client, org_id: str) -> str | None:
    """Get storage_path of latest pitch deck for org."""
    r = (
        supabase.table("org_assets")
        .select("storage_path")
        .eq("org_id", org_id)
        .eq("category", "pitch_deck")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    rows = r.data or []
    if not rows:
        return None
    return rows[0].get("storage_path")


def upload_ocr_text(supabase: Client, org_id: str, ocr_text: str) -> str | None:
    """Upload OCR text to Storage as {org_id}/extraction/ocr.txt. Returns storage_path or None."""
    path = f"{org_id}/extraction/ocr.txt"
    try:
        data = ocr_text.encode("utf-8")
        supabase.storage.from_(BUCKET).upload(path, data, {"upsert": "true", "content-type": "text/plain"})
        return path
    except Exception as e:
        log.exception("upload_ocr_text failed for path=%s: %s", path, e)
        return None


def create_signed_pdf_url(supabase: Client, storage_path: str) -> str | None:
    """Create signed URL for a storage object. Returns URL or None."""
    try:
        result = supabase.storage.from_(BUCKET).create_signed_urls(
            [storage_path], SIGNED_URL_EXPIRES
        )
        # Response: list of dicts with signedURL or signed_url or path
        items = result if isinstance(result, list) else getattr(result, "data", []) or []
        if items and isinstance(items[0], dict):
            item = items[0]
            err = item.get("error")
            if err:
                return None
            return item.get("signedURL") or item.get("signed_url") or item.get("path")
    except Exception:
        pass
    return None


def get_extraction_data(supabase: Client, org_id: str) -> dict | None:
    """Get extraction_data from startup_extraction_results."""
    r = supabase.table("startup_extraction_results").select("extraction_data").eq("org_id", org_id).execute()
    rows = r.data or []
    if not rows:
        return None
    data = rows[0].get("extraction_data")
    return data if isinstance(data, dict) else None


def download_ocr_text(supabase: Client, storage_path: str) -> str | None:
    """Download OCR text from Storage. Returns content or None."""
    try:
        result = supabase.storage.from_(BUCKET).download(storage_path)
        data = result if isinstance(result, bytes) else getattr(result, "data", result)
        if data:
            return data.decode("utf-8", errors="ignore") if isinstance(data, bytes) else str(data)
    except Exception:
        pass
    return None


def get_questionnaire(supabase: Client, org_id: str) -> dict | None:
    """Get questionnaire answers for org."""
    r = supabase.table("startup_readiness_questionnaire").select("*").eq("org_id", org_id).execute()
    rows = r.data or []
    if not rows:
        return None
    return rows[0] if isinstance(rows[0], dict) else None


def upsert_readiness_result(
    supabase: Client, org_id: str, scored_rubric: dict, score_summary: dict
) -> None:
    """Insert or update startup_readiness_results."""
    now = datetime.now(timezone.utc).isoformat()
    row = {
        "org_id": org_id,
        "scored_rubric": scored_rubric,
        "score_summary": score_summary,
        "updated_at": now,
    }
    supabase.table("startup_readiness_results").upsert(
        row,
        on_conflict="org_id",
    ).execute()


def get_readiness_result(supabase: Client, org_id: str) -> dict | None:
    """Get readiness result (scored_rubric, score_summary, updated_at) or None."""
    r = supabase.table("startup_readiness_results").select("scored_rubric, score_summary, updated_at").eq("org_id", org_id).execute()
    rows = r.data or []
    if not rows:
        return None
    return rows[0] if isinstance(rows[0], dict) else None


def upsert_extraction_result(
    supabase: Client, org_id: str, extraction_data: dict
) -> None:
    """Insert or update startup_extraction_results."""
    now = datetime.now(timezone.utc).isoformat()
    row = {
        "org_id": org_id,
        "extraction_data": extraction_data,
        "updated_at": now,
    }
    supabase.table("startup_extraction_results").upsert(
        row,
        on_conflict="org_id",
    ).execute()
