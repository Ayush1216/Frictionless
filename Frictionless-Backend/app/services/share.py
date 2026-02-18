"""Tokenized share link management."""
import logging, secrets
from datetime import datetime, timezone, timedelta
from supabase import Client

log = logging.getLogger(__name__)

def create_share_link(supabase: Client, org_id: str, share_type: str, created_by: str | None = None, scope: dict | None = None, expires_in_days: int = 30, watermark: str | None = None) -> dict | None:
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    expires_at = (now + timedelta(days=expires_in_days)).isoformat()
    row = {
        "token": token,
        "org_id": org_id,
        "share_type": share_type,
        "created_by": created_by,
        "scope": scope or {},
        "permissions": scope or {},
        "expires_at": expires_at,
        "watermark": watermark,
        "view_count": 0,
        "created_at": now.isoformat(),
    }
    try:
        r = supabase.table("share_links").insert(row).execute()
        return (r.data or [{}])[0] if r.data else None
    except Exception as e:
        log.warning("share_links insert failed: %s", e)
        return None

def validate_share_link(supabase: Client, token: str) -> dict | None:
    try:
        r = (supabase.table("share_links")
             .select("*")
             .eq("token", token)
             .execute())
        rows = r.data or []
        if not rows:
            return None
        link = rows[0]
        now = datetime.now(timezone.utc).isoformat()
        if link.get("expires_at") and link["expires_at"] < now:
            return None
        # Increment view count
        try:
            supabase.table("share_links").update({"view_count": (link.get("view_count") or 0) + 1, "last_viewed_at": now}).eq("id", link["id"]).execute()
        except Exception:
            pass
        return link
    except Exception as e:
        log.warning("share_links validate failed: %s", e)
        return None

def revoke_share_link(supabase: Client, link_id: str) -> bool:
    try:
        supabase.table("share_links").delete().eq("id", link_id).execute()
        return True
    except Exception as e:
        log.warning("share_links revoke failed: %s", e)
        return False

def get_share_links(supabase: Client, org_id: str) -> list[dict]:
    try:
        r = (supabase.table("share_links")
             .select("*")
             .eq("org_id", org_id)
             .order("created_at", desc=True)
             .execute())
        return r.data or []
    except Exception as e:
        log.warning("share_links list failed: %s", e)
        return []
