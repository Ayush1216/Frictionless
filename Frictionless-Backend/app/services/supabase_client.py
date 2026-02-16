"""Supabase client for backend operations (uses service role)."""
import copy
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
    supabase: Client,
    org_id: str,
    scored_rubric: dict,
    score_summary: dict,
    update_source: str = "scheduled",
) -> None:
    """Insert or update startup_readiness_results and append to readiness_score_history."""
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

    # Append to readiness_score_history for score history graph
    overall = score_summary.get("_overall") if isinstance(score_summary, dict) else None
    raw_pct = overall.get("raw_percentage") if isinstance(overall, dict) else None
    if raw_pct is not None:
        try:
            score_val = float(raw_pct)
            history_row = {
                "startup_org_id": org_id,
                "score": round(score_val, 2),
                "updated_at": now,
                "update_source": update_source,
            }
            supabase.table("readiness_score_history").insert(history_row).execute()
        except (TypeError, ValueError) as e:
            log.warning("Could not append to readiness_score_history: %s", e)


def get_readiness_result(supabase: Client, org_id: str) -> dict | None:
    """Get readiness result (scored_rubric, score_summary, updated_at) or None."""
    r = supabase.table("startup_readiness_results").select("scored_rubric, score_summary, updated_at").eq("org_id", org_id).execute()
    rows = r.data or []
    if not rows:
        return None
    return rows[0] if isinstance(rows[0], dict) else None


def apply_targeted_task_points(
    supabase: Client,
    org_id: str,
    rubric_subcategory: str,
    potential_points: int,
) -> bool:
    """
    Apply potential_points to the specific rubric item matching rubric_subcategory.
    Only updates that item (capped at max), recomputes summary, saves.
    Returns True if applied, False if item not found or no readiness result.
    """
    from app.services.readiness_scorer import _compute_summary

    result = get_readiness_result(supabase, org_id)
    if not result or not result.get("scored_rubric"):
        return False
    scored_rubric = copy.deepcopy(result["scored_rubric"])
    target = (rubric_subcategory or "").strip().lower()
    if not target:
        return False

    found = False
    for cat_val in scored_rubric.values():
        if not isinstance(cat_val, dict):
            continue
        for sub_val in cat_val.values():
            if not isinstance(sub_val, list):
                continue
            for item in sub_val:
                if not isinstance(item, dict):
                    continue
                sc = (item.get("subcategory_name") or item.get("Subtopic_Name") or "").strip().lower()
                if sc == target:
                    opts = item.get("options") or {}
                    max_pts = max(opts.values(), default=0) if opts else 0
                    current = int(item.get("Points", 0))
                    new_pts = min(max_pts, current + potential_points)
                    item["Points"] = new_pts
                    item["Reasoning"] = (item.get("Reasoning") or "") + " [Task completed: +{0} pts]".format(
                        new_pts - current
                    )
                    found = True
                    break
            if found:
                break
        if found:
            break

    if not found:
        log.warning("Targeted task points: rubric item %r not found", rubric_subcategory)
        return False

    summary = _compute_summary(scored_rubric)
    upsert_readiness_result(supabase, org_id, scored_rubric, summary, update_source="task_complete")
    return True


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


# ---------------------------------------------------------------------------
# Tasks (task_groups + tasks)
# ---------------------------------------------------------------------------


def soft_delete_ai_task_groups(supabase: Client, startup_org_id: str, deleted_by: str | None = None) -> None:
    """Soft-delete existing AI-sourced task groups for the org (to replace with fresh ones)."""
    now = datetime.now(timezone.utc).isoformat()
    patch = {"deleted_at": now, "updated_at": now}
    if deleted_by:
        patch["deleted_by"] = deleted_by
    # Get AI groups first
    r = supabase.table("task_groups").select("id").eq("startup_org_id", startup_org_id).eq("source", "ai").is_("deleted_at", "null").execute()
    for row in (r.data or []):
        gid = row.get("id")
        if gid:
            supabase.table("task_groups").update(patch).eq("id", gid).execute()


def upsert_task_groups_and_tasks(
    supabase: Client,
    startup_org_id: str,
    task_groups_data: list[dict],
    created_by: str | None = None,
    replace_existing_ai: bool = True,
) -> list[dict]:
    """
    Insert task groups and their tasks from AI-generated structure.
    task_groups_data: [{title, category, impact, how_to_approach, tasks: [{title, description, requires_rescore}]}]
    If replace_existing_ai, soft-deletes existing AI groups first.
    Returns list of created task groups with tasks (full rows).
    """
    if replace_existing_ai:
        soft_delete_ai_task_groups(supabase, startup_org_id, created_by)
    now = datetime.now(timezone.utc).isoformat()
    result_groups: list[dict] = []
    for sort_order, group_data in enumerate(task_groups_data):
        title = group_data.get("title") or "Improvement Tasks"
        category = group_data.get("category") or ""
        impact = group_data.get("impact") or "medium"
        how_to_approach = group_data.get("how_to_approach") or ""
        tasks_data = group_data.get("tasks") or []

        group_row = {
            "startup_org_id": startup_org_id,
            "title": title,
            "category": category,
            "impact": impact,
            "how_to_approach": how_to_approach,
            "source": "ai",
            "sort_order": sort_order,
            "updated_at": now,
            "created_at": now,
        }
        if created_by:
            group_row["created_by"] = created_by

        r = supabase.table("task_groups").insert(group_row).execute()
        rows = r.data or []
        if not rows:
            log.warning("task_groups insert returned no data for %s", title)
            continue
        group_id = rows[0].get("id")
        if not group_id:
            continue

        task_rows = []
        for t_order, t in enumerate(tasks_data):
            pts = t.get("potential_points")
            task_row: dict = {
                "group_id": group_id,
                "title": t.get("title") or "Improvement task",
                "description": t.get("description") or "",
                "status": "todo",
                "sort_order": t_order,
                "requires_rescore": bool(t.get("requires_rescore", True)),
                "updated_at": now,
                "created_at": now,
            }
            if pts is not None:
                task_row["potential_points"] = int(pts) if isinstance(pts, (int, float)) else 0
            rubric_sub = t.get("rubric_subcategory")
            if isinstance(rubric_sub, str) and rubric_sub.strip():
                task_row["rubric_subcategory"] = rubric_sub.strip()
            if created_by:
                task_row["created_by"] = created_by
            tr = supabase.table("tasks").insert(task_row).execute()
            if tr.data:
                task_rows.extend(tr.data)
        result_groups.append({**rows[0], "tasks": task_rows})
    return result_groups


def get_task_groups_with_tasks(supabase: Client, startup_org_id: str) -> list[dict]:
    """Fetch task groups and their tasks for a startup (excludes soft-deleted)."""
    r = (
        supabase.table("task_groups")
        .select("id, title, category, impact, how_to_approach, source, sort_order, created_at, updated_at")
        .eq("startup_org_id", startup_org_id)
        .is_("deleted_at", "null")
        .order("sort_order")
        .execute()
    )
    groups = r.data or []
    if not groups:
        return []
    group_ids = [g["id"] for g in groups]
    tr = (
        supabase.table("tasks")
        .select("id, group_id, title, description, status, due_at, sort_order, requires_rescore, potential_points, completed_at, completed_by, created_at, updated_at")
        .in_("group_id", group_ids)
        .is_("deleted_at", "null")
        .order("sort_order")
        .execute()
    )
    tasks = tr.data or []
    task_map: dict[str, list] = {gid: [] for gid in group_ids}
    for t in tasks:
        gid = t.get("group_id")
        if gid:
            task_map.setdefault(gid, []).append(t)
    for g in groups:
        g["tasks"] = task_map.get(g["id"], [])
    return groups


def _create_task_event(
    supabase: Client,
    task_id: str,
    event_type: str,
    from_state: dict,
    to_state: dict,
    actor_user_id: str | None = None,
) -> None:
    """Create a task_event row. Skips if task_events table does not exist."""
    try:
        row = {
            "task_id": task_id,
            "event_type": event_type,
            "from_state": from_state,
            "to_state": to_state,
        }
        if actor_user_id:
            row["actor_user_id"] = actor_user_id
        supabase.table("task_events").insert(row).execute()
    except Exception as e:
        log.debug("Could not create task_event: %s", e)


def update_task(
    supabase: Client,
    task_id: str,
    updates: dict,
    completed_by: str | None = None,
    prev_task: dict | None = None,
) -> dict | None:
    """Update a task. If status=done, set completed_at and completed_by. Creates task_event."""
    now = datetime.now(timezone.utc).isoformat()
    patch = {**updates, "updated_at": now}
    if updates.get("status") == "done":
        patch["completed_at"] = now
        if completed_by:
            patch["completed_by"] = completed_by
    r = supabase.table("tasks").update(patch).eq("id", task_id).execute()
    rows = r.data or []
    updated = rows[0] if rows else None
    if updated and "status" in updates and prev_task:
        event_type = "complete" if updates["status"] == "done" else "status_change"
        _create_task_event(
            supabase,
            task_id,
            event_type,
            {"status": prev_task.get("status")},
            {"status": updates["status"]},
            completed_by,
        )
    return updated


def get_task_by_id(supabase: Client, task_id: str) -> dict | None:
    """Get full task row by id."""
    r = supabase.table("tasks").select("*").eq("id", task_id).execute()
    rows = r.data or []
    return rows[0] if rows else None


def get_task_and_startup_org_id(supabase: Client, task_id: str) -> tuple[dict | None, str | None]:
    """Get task row and its startup_org_id. Returns (task_row, startup_org_id) or (None, None)."""
    tr = supabase.table("tasks").select(
        "id, group_id, title, description, requires_rescore, rubric_subcategory, potential_points"
    ).eq("id", task_id).execute()
    rows = tr.data or []
    if not rows:
        return None, None
    task = rows[0]
    group_id = task.get("group_id")
    if not group_id:
        return task, None
    gr = supabase.table("task_groups").select("startup_org_id").eq("id", group_id).execute()
    g_rows = gr.data or []
    org_id = g_rows[0].get("startup_org_id") if g_rows else None
    return task, org_id


def complete_task(
    supabase: Client,
    task_id: str,
    completed_by: str | None = None,
    prev_status: str | None = None,
) -> dict | None:
    """Mark task as done, set completed_at/completed_by. Creates task_event. Returns updated row."""
    now = datetime.now(timezone.utc).isoformat()
    patch = {"status": "done", "completed_at": now, "updated_at": now}
    if completed_by:
        patch["completed_by"] = completed_by
    r = supabase.table("tasks").update(patch).eq("id", task_id).execute()
    rows = r.data or []
    updated = rows[0] if rows else None
    if updated:
        _create_task_event(
            supabase,
            task_id,
            "complete",
            {"status": prev_status or "todo"},
            {"status": "done"},
            completed_by,
        )
    return updated


def get_current_readiness_score(supabase: Client, org_id: str) -> float | None:
    """Get current raw_percentage from startup_readiness_results or None."""
    r = supabase.table("startup_readiness_results").select("score_summary").eq("org_id", org_id).execute()
    rows = r.data or []
    if not rows:
        return None
    summary = rows[0].get("score_summary")
    if not isinstance(summary, dict):
        return None
    overall = summary.get("_overall") or {}
    raw = overall.get("raw_percentage")
    if raw is None:
        return None
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None


def get_task_events(supabase: Client, task_id: str) -> list[dict]:
    """Fetch task_events for a task. Returns [] if table does not exist."""
    try:
        r = (
            supabase.table("task_events")
            .select("id, event_type, from_state, to_state, actor_user_id, created_at")
            .eq("task_id", task_id)
            .order("created_at", desc=False)
            .execute()
        )
        return r.data or []
    except Exception:
        return []


def get_task_comments(supabase: Client, task_id: str) -> list[dict]:
    """Fetch task_comments for a task. Returns [] if table does not exist."""
    try:
        r = (
            supabase.table("task_comments")
            .select("id, author_user_id, source, content, created_at")
            .eq("task_id", task_id)
            .order("created_at", desc=False)
            .execute()
        )
        return r.data or []
    except Exception:
        return []


def add_task_comment(
    supabase: Client,
    task_id: str,
    author_user_id: str,
    content: str,
    source: str = "human",
) -> dict | None:
    """Add a task comment. Returns created row or None."""
    try:
        r = supabase.table("task_comments").insert({
            "task_id": task_id,
            "author_user_id": author_user_id,
            "source": source,
            "content": content,
        }).execute()
        return (r.data or [{}])[0] if r.data else None
    except Exception as e:
        log.warning("Could not add task_comment: %s", e)
        return None


def get_task_ai_chat_messages(supabase: Client, task_id: str) -> list[dict]:
    """Fetch task_ai_chat_messages for a task. Returns [] if table does not exist."""
    try:
        r = (
            supabase.table("task_ai_chat_messages")
            .select("id, role, content, author_user_id, created_at")
            .eq("task_id", task_id)
            .order("created_at", desc=False)
            .execute()
        )
        return r.data or []
    except Exception:
        return []


def insert_task_ai_chat_message(
    supabase: Client,
    task_id: str,
    role: str,
    content: str,
    author_user_id: str | None = None,
) -> dict | None:
    """Insert a task AI chat message. Returns created row or None."""
    try:
        row = {"task_id": task_id, "role": role, "content": content}
        if author_user_id and role == "user":
            row["author_user_id"] = author_user_id
        r = supabase.table("task_ai_chat_messages").insert(row).execute()
        return (r.data or [{}])[0] if r.data else None
    except Exception as e:
        log.warning("Could not insert task_ai_chat_message: %s", e)
        return None


def append_readiness_history(
    supabase: Client,
    startup_org_id: str,
    score: float,
    update_source: str = "task_update",
    note: str | None = None,
) -> None:
    """Append readiness_score_history entry."""
    now = datetime.now(timezone.utc).isoformat()
    row = {
        "startup_org_id": startup_org_id,
        "score": round(min(100, max(0, score)), 2),
        "updated_at": now,
        "update_source": update_source,
        "note": note,
    }
    try:
        supabase.table("readiness_score_history").insert(row).execute()
    except Exception as e:
        log.warning("Could not append readiness_score_history: %s", e)
