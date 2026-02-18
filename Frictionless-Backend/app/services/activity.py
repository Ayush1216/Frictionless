"""Activity event logging service."""
import logging
from datetime import datetime, timezone
from supabase import Client

log = logging.getLogger(__name__)

def log_activity(supabase: Client, org_id: str, event_type: str, resource_type: str = "", resource_id: str = "", actor_user_id: str | None = None, metadata: dict | None = None) -> None:
    now = datetime.now(timezone.utc).isoformat()
    row = {
        "org_id": org_id,
        "event_type": event_type,
        "actor_user_id": actor_user_id,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "metadata": metadata or {},
        "created_at": now,
    }
    try:
        supabase.table("activity_events").insert(row).execute()
    except Exception as e:
        log.warning("activity_events insert failed (table may not exist): %s", e)

def get_activity_events(supabase: Client, org_id: str, limit: int = 50, event_type: str | None = None, resource_type: str | None = None) -> list[dict]:
    try:
        q = (supabase.table("activity_events")
             .select("id, org_id, event_type, actor_user_id, resource_type, resource_id, metadata, created_at")
             .eq("org_id", org_id))
        if event_type:
            q = q.eq("event_type", event_type)
        if resource_type:
            q = q.eq("resource_type", resource_type)
        r = q.order("created_at", desc=True).limit(limit).execute()
        return r.data or []
    except Exception as e:
        log.warning("activity_events read failed: %s", e)
        return []
