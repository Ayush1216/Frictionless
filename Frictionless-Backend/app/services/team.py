"""Team invitations and RBAC membership management."""
import logging, secrets
from datetime import datetime, timezone, timedelta
from supabase import Client

log = logging.getLogger(__name__)

VALID_ROLES = ("owner", "admin", "editor", "viewer")

def invite_member(supabase: Client, org_id: str, email: str, role: str = "viewer", created_by: str | None = None, expires_in_days: int = 7) -> dict | None:
    if role not in VALID_ROLES:
        role = "viewer"
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    expires_at = (now + timedelta(days=expires_in_days)).isoformat()
    row = {
        "org_id": org_id,
        "email": email.lower().strip(),
        "role": role,
        "invite_token": token,
        "status": "pending",
        "created_by": created_by,
        "expires_at": expires_at,
        "created_at": now.isoformat(),
    }
    try:
        r = supabase.table("team_invites").insert(row).execute()
        return (r.data or [{}])[0] if r.data else None
    except Exception as e:
        log.warning("team_invites insert failed: %s", e)
        return None

def accept_invite(supabase: Client, invite_token: str, user_id: str) -> dict | None:
    try:
        r = (supabase.table("team_invites")
             .select("*")
             .eq("invite_token", invite_token)
             .eq("status", "pending")
             .execute())
        rows = r.data or []
        if not rows:
            return None
        invite = rows[0]
        now = datetime.now(timezone.utc).isoformat()
        if invite.get("expires_at") and invite["expires_at"] < now:
            return None
        supabase.table("team_invites").update({"status": "accepted", "accepted_at": now}).eq("id", invite["id"]).execute()
        # Create membership
        membership = {
            "org_id": invite["org_id"],
            "user_id": user_id,
            "role": invite.get("role", "viewer"),
            "created_at": now,
            "updated_at": now,
        }
        try:
            supabase.table("team_memberships").upsert(membership, on_conflict="org_id,user_id").execute()
        except Exception as e:
            log.warning("team_memberships upsert failed: %s", e)
        return invite
    except Exception as e:
        log.warning("accept_invite failed: %s", e)
        return None

def get_team_members(supabase: Client, org_id: str) -> list[dict]:
    try:
        r = (supabase.table("team_memberships")
             .select("*")
             .eq("org_id", org_id)
             .order("created_at")
             .execute())
        return r.data or []
    except Exception as e:
        log.warning("team_memberships read failed: %s", e)
        return []

def get_pending_invites(supabase: Client, org_id: str) -> list[dict]:
    try:
        r = (supabase.table("team_invites")
             .select("*")
             .eq("org_id", org_id)
             .eq("status", "pending")
             .order("created_at", desc=True)
             .execute())
        return r.data or []
    except Exception as e:
        log.warning("team_invites read failed: %s", e)
        return []

def update_member_role(supabase: Client, org_id: str, user_id: str, new_role: str) -> bool:
    if new_role not in VALID_ROLES:
        return False
    try:
        now = datetime.now(timezone.utc).isoformat()
        supabase.table("team_memberships").update({"role": new_role, "updated_at": now}).eq("org_id", org_id).eq("user_id", user_id).execute()
        return True
    except Exception as e:
        log.warning("update_member_role failed: %s", e)
        return False

def revoke_invite(supabase: Client, invite_id: str) -> bool:
    try:
        supabase.table("team_invites").update({"status": "revoked"}).eq("id", invite_id).execute()
        return True
    except Exception as e:
        log.warning("revoke_invite failed: %s", e)
        return False
