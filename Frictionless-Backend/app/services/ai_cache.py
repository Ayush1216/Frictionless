"""AI analysis cache — avoids duplicate expensive LLM calls for unchanged inputs."""
import hashlib, json, logging
from datetime import datetime, timezone
from supabase import Client

log = logging.getLogger(__name__)

def _hash_input(data: dict) -> str:
    return hashlib.sha256(json.dumps(data, sort_keys=True, default=str).encode()).hexdigest()

def get_cached_analysis(supabase: Client, org_id: str, analysis_type: str, input_data: dict) -> dict | None:
    input_hash = _hash_input(input_data)
    try:
        r = (supabase.table("ai_analysis_cache")
             .select("result_jsonb, created_at")
             .eq("org_id", org_id)
             .eq("analysis_type", analysis_type)
             .eq("input_hash", input_hash)
             .order("created_at", desc=True)
             .limit(1)
             .execute())
        rows = r.data or []
        if rows:
            return rows[0].get("result_jsonb")
    except Exception as e:
        log.warning("ai_analysis_cache read failed: %s", e)
    return None

def set_cached_analysis(supabase: Client, org_id: str, analysis_type: str, input_data: dict, result: dict, model: str = "unknown", cost_cents: float = 0) -> None:
    input_hash = _hash_input(input_data)
    now = datetime.now(timezone.utc).isoformat()
    row = {
        "org_id": org_id,
        "analysis_type": analysis_type,
        "input_hash": input_hash,
        "model_version": model,
        "result_jsonb": result,
        "created_at": now,
    }
    try:
        supabase.table("ai_analysis_cache").insert(row).execute()
    except Exception as e:
        log.warning("ai_analysis_cache write failed: %s", e)

def invalidate_cache(supabase: Client, org_id: str, analysis_type: str | None = None) -> None:
    try:
        q = supabase.table("ai_analysis_cache").delete().eq("org_id", org_id)
        if analysis_type:
            q = q.eq("analysis_type", analysis_type)
        q.execute()
    except Exception as e:
        log.warning("ai_analysis_cache invalidation failed: %s", e)
