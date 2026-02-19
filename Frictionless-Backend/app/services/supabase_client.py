"""Supabase client for backend operations (uses service role)."""
import logging
import os

log = logging.getLogger(__name__)
from datetime import datetime, timezone
from supabase import Client, create_client


BUCKET = "org-assets"
SIGNED_URL_EXPIRES = 3600  # 1 hour


def upsert_person_provenance(
    supabase: Client,
    org_id: str,
    identity_key: str,
    person_jsonb: dict,
    confidence_score: float | None = None,
    evidence_links: list | None = None,
    source: str = "linkedin",
) -> None:
    """Upsert person_provenance for canonical record and audit."""
    now = datetime.now(timezone.utc).isoformat()
    row = {
        "org_id": org_id,
        "identity_key": identity_key,
        "person_jsonb": person_jsonb,
        "confidence_score": confidence_score,
        "evidence_links": evidence_links or [],
        "evidence_snippets": [],
        "source": source,
        "created_at": now,
    }
    try:
        supabase.table("person_provenance").upsert(
            row,
            on_conflict="org_id,identity_key",
        ).execute()
    except Exception as e:
        log.warning("upsert_person_provenance failed (table may not exist): %s", e)
        raise


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
    """Get readiness result (scored_rubric, score_summary, updated_at, initial_pending_task_count) or None."""
    try:
        r = supabase.table("startup_readiness_results").select(
            "scored_rubric, score_summary, updated_at, initial_pending_task_count"
        ).eq("org_id", org_id).execute()
    except Exception:
        r = supabase.table("startup_readiness_results").select(
            "scored_rubric, score_summary, updated_at"
        ).eq("org_id", org_id).execute()
    rows = r.data or []
    if not rows:
        return None
    row = rows[0] if isinstance(rows[0], dict) else None
    if row and "initial_pending_task_count" not in row:
        row["initial_pending_task_count"] = None
    return row


def set_initial_pending_task_count(supabase: Client, org_id: str, count: int) -> None:
    """Set initial_pending_task_count once (only if currently null)."""
    try:
        now = datetime.now(timezone.utc).isoformat()
        supabase.table("startup_readiness_results").update({
            "initial_pending_task_count": count,
            "updated_at": now,
        }).eq("org_id", org_id).is_("initial_pending_task_count", "null").execute()
    except Exception as e:
        log.warning("Could not set initial_pending_task_count: %s", e)


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


def append_readiness_history(
    supabase: Client,
    startup_org_id: str,
    score: float,
    update_source: str = "manual",
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


# ---------------------------------------------------------------------------
# Startup tasks (rubric-based, org-scoped)
# ---------------------------------------------------------------------------


def _supabase_retry(fn, retries: int = 3, backoff: float = 0.5):
    """Execute a Supabase call with retry + exponential backoff for transient errors."""
    import time as _time
    for attempt in range(retries):
        try:
            return fn()
        except Exception as e:
            err_str = str(e)
            is_transient = (
                "500" in err_str
                or "cloudflare" in err_str.lower()
                or "JSON could not be generated" in err_str
                or "502" in err_str
                or "503" in err_str
            )
            if is_transient and attempt < retries - 1:
                wait = backoff * (2 ** attempt)
                log.warning("Supabase transient error (attempt %d/%d), retrying in %.1fs: %s",
                            attempt + 1, retries, wait, err_str[:120])
                _time.sleep(wait)
            else:
                raise


def replace_org_tasks(
    supabase: Client,
    org_id: str,
    groups_data: list[dict],
) -> list[dict]:
    """
    Merge task_groups and tasks for an org with the given groups_data (pending only).
    Reuses existing groups/tasks when category_key and subcategory_name match so
    task IDs (and thus task_ai_chat_messages) are preserved.
    Completed tasks are never deleted: we only upsert pending ones.

    Uses batch upserts instead of individual PATCH requests to avoid Cloudflare
    rate-limiting (HTTP 500) on Supabase.
    """
    import time as _time
    now = datetime.now(timezone.utc).isoformat()
    r = (
        supabase.table("task_groups")
        .select("id, category_key, category_name, title, impact, sort_order, created_at, updated_at")
        .eq("org_id", org_id)
        .execute()
    )
    existing_groups = r.data or []
    by_cat_key = {g["category_key"]: g for g in existing_groups}
    current_cat_keys = {g.get("category_key") for g in groups_data if g.get("category_key")}

    # Fetch all existing tasks for this org in one query (instead of one per group)
    group_ids = [g["id"] for g in existing_groups]
    tasks_by_group: dict = {}
    if group_ids:
        tr_all = (
            supabase.table("tasks")
            .select(
                "id, group_id, subcategory_name, title, description, status, potential_points, "
                "sort_order, created_at, updated_at, submitted_value"
            )
            .in_("group_id", group_ids)
            .execute()
        )
        for t in tr_all.data or []:
            gid = t.get("group_id")
            if gid:
                tasks_by_group.setdefault(gid, []).append(t)

    result_groups: list[dict] = []

    # Collect batch operations to reduce API calls
    groups_to_update: list[dict] = []  # existing groups that need updating
    groups_to_insert: list[dict] = []  # new groups to create
    # Map: index in groups_data → group_id (filled after inserts)
    group_id_map: dict[int, str] = {}

    for sort_order, g in enumerate(groups_data):
        cat_key = g.get("category_key", "")
        if not cat_key:
            continue
        existing = by_cat_key.get(cat_key)
        group_row = {
            "category_key": cat_key,
            "category_name": g.get("category_name", ""),
            "title": g.get("title") or g.get("category_name", ""),
            "impact": g.get("impact", "medium"),
            "sort_order": sort_order,
            "updated_at": now,
        }
        if existing:
            group_id = existing["id"]
            groups_to_update.append({**group_row, "id": group_id, "org_id": org_id, "created_at": existing.get("created_at", now)})
            group_id_map[sort_order] = group_id
        else:
            groups_to_insert.append({
                "org_id": org_id,
                **group_row,
                "created_at": now,
            })

    # Batch upsert existing groups (single call instead of N individual updates)
    if groups_to_update:
        try:
            _supabase_retry(lambda: supabase.table("task_groups").upsert(
                groups_to_update, on_conflict="id"
            ).execute())
        except Exception as e:
            log.warning("Batch group upsert failed, falling back to individual: %s", e)
            for gu in groups_to_update:
                gid = gu.pop("id", None)
                if gid:
                    try:
                        _supabase_retry(lambda _gid=gid, _gu=gu: supabase.table("task_groups").update(_gu).eq("id", _gid).execute())
                    except Exception as e2:
                        log.warning("Individual group update failed for %s: %s", gid, e2)

    # Insert new groups (batch)
    if groups_to_insert:
        try:
            ins = _supabase_retry(lambda: supabase.table("task_groups").insert(groups_to_insert).execute())
            for row in (ins.data or []):
                cat_key = row.get("category_key")
                gid = row.get("id")
                if cat_key and gid:
                    by_cat_key[cat_key] = row
        except Exception as e:
            log.warning("Batch group insert failed, falling back to individual: %s", e)
            for gi in groups_to_insert:
                try:
                    ins = _supabase_retry(lambda _gi=gi: supabase.table("task_groups").insert(_gi).execute())
                    if ins.data:
                        cat_key = ins.data[0].get("category_key")
                        gid = ins.data[0].get("id")
                        if cat_key and gid:
                            by_cat_key[cat_key] = ins.data[0]
                except Exception as e2:
                    log.warning("Individual group insert failed: %s", e2)

    # Now process tasks per group — collect batch updates and inserts
    tasks_to_upsert: list[dict] = []  # existing tasks to update
    tasks_to_insert: list[dict] = []  # new tasks to create

    for sort_order, g in enumerate(groups_data):
        cat_key = g.get("category_key", "")
        if not cat_key:
            continue
        group_entry = by_cat_key.get(cat_key)
        if not group_entry:
            continue
        group_id = group_entry.get("id") or group_id_map.get(sort_order)
        if not group_id:
            continue

        existing_tasks = tasks_by_group.get(group_id, [])
        by_sub = {t["subcategory_name"]: t for t in existing_tasks}
        task_rows_out = []

        for t_order, t in enumerate(g.get("tasks") or []):
            sub = t.get("subcategory_name", "")
            if not sub:
                continue
            task_payload = {
                "title": t.get("title", ""),
                "description": t.get("description", ""),
                "potential_points": int(t.get("potential_points", 0)),
                "sort_order": t_order,
                "updated_at": now,
            }
            ex = by_sub.get(sub)
            if ex:
                # Batch update: include id for upsert
                tasks_to_upsert.append({
                    **task_payload,
                    "id": ex["id"],
                    "group_id": group_id,
                    "subcategory_name": sub,
                    "status": ex.get("status", "todo"),
                    "created_at": ex.get("created_at", now),
                })
                task_rows_out.append({**ex, **task_payload})
            else:
                new_task = {
                    "group_id": group_id,
                    "subcategory_name": sub,
                    "status": "todo",
                    "created_at": now,
                    **task_payload,
                }
                tasks_to_insert.append(new_task)
                task_rows_out.append(new_task)

        group_out = {**group_entry, "id": group_id}
        result_groups.append({**group_out, "tasks": task_rows_out})

    # Batch upsert existing tasks (single call instead of N individual PATCHes)
    BATCH_SIZE = 30
    if tasks_to_upsert:
        for i in range(0, len(tasks_to_upsert), BATCH_SIZE):
            batch = tasks_to_upsert[i:i + BATCH_SIZE]
            try:
                _supabase_retry(lambda _b=batch: supabase.table("tasks").upsert(_b, on_conflict="id").execute())
            except Exception as e:
                log.warning("Batch task upsert failed (batch %d-%d): %s", i, i + len(batch), e)
                # Fallback: individual updates with small delay
                for tu in batch:
                    tid = tu.pop("id", None)
                    if tid:
                        try:
                            _supabase_retry(lambda _tid=tid, _tu=tu: supabase.table("tasks").update(_tu).eq("id", _tid).execute())
                        except Exception as e2:
                            log.warning("Individual task update failed for %s: %s", tid, e2)
                        _time.sleep(0.1)  # small delay to avoid rate limits

    # Batch insert new tasks
    if tasks_to_insert:
        for i in range(0, len(tasks_to_insert), BATCH_SIZE):
            batch = tasks_to_insert[i:i + BATCH_SIZE]
            try:
                ins_t = _supabase_retry(lambda _b=batch: supabase.table("tasks").insert(_b).execute())
                # Update result_groups with inserted IDs
                if ins_t.data:
                    for row in ins_t.data:
                        sub = row.get("subcategory_name")
                        gid = row.get("group_id")
                        for rg in result_groups:
                            if rg.get("id") == gid:
                                for t in rg.get("tasks", []):
                                    if t.get("subcategory_name") == sub and "id" not in t:
                                        t.update(row)
                                        break
            except Exception as e:
                log.warning("Batch task insert failed (batch %d-%d): %s", i, i + len(batch), e)
                for ti in batch:
                    try:
                        _supabase_retry(lambda _ti=ti: supabase.table("tasks").insert(_ti).execute())
                    except Exception as e2:
                        log.warning("Individual task insert failed: %s", e2)
                    _time.sleep(0.1)

    # Only remove groups that are no longer in the rubric at all
    # Completed tasks stay in DB for history.
    groups_to_remove = [eg for eg in existing_groups if eg.get("category_key") not in current_cat_keys]
    if groups_to_remove:
        remove_ids = [eg["id"] for eg in groups_to_remove]
        try:
            supabase.table("tasks").delete().in_("group_id", remove_ids).execute()
            supabase.table("task_groups").delete().in_("id", remove_ids).execute()
        except Exception as e:
            log.warning("Cleanup of removed groups failed: %s", e)

    return result_groups


def get_task_groups_with_tasks(supabase: Client, org_id: str) -> list[dict]:
    """Fetch task groups and their tasks for an org. Frontend expects group_id -> task_group_id."""
    r = (
        supabase.table("task_groups")
        .select("id, title, category_key, category_name, impact, sort_order, created_at, updated_at")
        .eq("org_id", org_id)
        .order("sort_order")
        .execute()
    )
    groups = r.data or []
    if not groups:
        return []
    group_ids = [g["id"] for g in groups]
    tr = (
        supabase.table("tasks")
        .select("id, group_id, title, description, status, potential_points, sort_order, completed_at, completed_by, created_at, updated_at, subcategory_name, submitted_value")
        .in_("group_id", group_ids)
        .order("sort_order")
        .execute()
    )
    tasks = tr.data or []
    task_map: dict = {gid: [] for gid in group_ids}
    for t in tasks:
        gid = t.get("group_id")
        if gid:
            t["requires_rescore"] = True
            # Ensure potential_points is int (from rubric: varies per task, e.g. 2, 5, 8)
            pt = t.get("potential_points")
            if pt is not None:
                try:
                    t["potential_points"] = int(pt)
                except (TypeError, ValueError):
                    t["potential_points"] = 0
            task_map.setdefault(gid, []).append(t)
    for g in groups:
        g["tasks"] = task_map.get(g["id"], [])
        g["category"] = g.get("category_name", g.get("title", ""))
        g["how_to_approach"] = ""
    return groups


def get_task_by_id(supabase: Client, task_id: str) -> dict | None:
    """Get full task row by id."""
    r = supabase.table("tasks").select("*").eq("id", task_id).execute()
    rows = r.data or []
    return rows[0] if rows else None


def get_task_and_org_id(supabase: Client, task_id: str) -> tuple[dict | None, str | None]:
    """Get task row and its org_id in a single query via foreign-key join.
    Returns (task_row, org_id) or (None, None).
    """
    r = supabase.table("tasks").select(
        "id, group_id, subcategory_name, title, status, submitted_value, task_groups(org_id)"
    ).eq("id", task_id).execute()
    rows = r.data or []
    if not rows:
        return None, None
    row = rows[0]
    # Extract nested join result (Supabase returns dict or list depending on relationship type)
    group_data = row.get("task_groups")
    if isinstance(group_data, dict):
        org_id = group_data.get("org_id")
    elif isinstance(group_data, list) and group_data:
        org_id = group_data[0].get("org_id")
    else:
        org_id = None
    # Return task dict without the nested join key
    task = {k: v for k, v in row.items() if k != "task_groups"}
    return task, org_id


def mark_task_done(supabase: Client, task_id: str, completed_by: str | None = None) -> dict | None:
    """Mark task as done. Returns updated row."""
    now = datetime.now(timezone.utc).isoformat()
    patch = {"status": "done", "updated_at": now, "completed_at": now}
    if completed_by:
        patch["completed_by"] = completed_by
    r = supabase.table("tasks").update(patch).eq("id", task_id).execute()
    rows = r.data or []
    return rows[0] if rows else None


def mark_tasks_done_by_subcategories(
    supabase: Client, org_id: str, subcategory_names: list[str]
) -> None:
    """Mark all tasks for this org with subcategory_name in the list as done (sync with rubric)."""
    if not subcategory_names:
        return
    r = (
        supabase.table("task_groups")
        .select("id")
        .eq("org_id", org_id)
        .execute()
    )
    group_ids = [g["id"] for g in (r.data or []) if g.get("id")]
    if not group_ids:
        return
    now = datetime.now(timezone.utc).isoformat()
    try:
        (
            supabase.table("tasks")
            .update({"status": "done", "updated_at": now, "completed_at": now})
            .in_("group_id", group_ids)
            .in_("subcategory_name", subcategory_names)
            .neq("status", "done")
            .execute()
        )
    except Exception as e:
        log.warning("mark_tasks_done_by_subcategories bulk update failed: %s", e)


def get_task_ai_chat_messages(supabase: Client, task_id: str) -> list[dict]:
    """Fetch task_ai_chat_messages for a task."""
    try:
        r = (
            supabase.table("task_ai_chat_messages")
            .select("id, role, content, created_at")
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
) -> dict | None:
    """Insert a task AI chat message. Returns created row or None."""
    try:
        r = supabase.table("task_ai_chat_messages").insert({
            "task_id": task_id,
            "role": role,
            "content": content,
        }).execute()
        return (r.data or [{}])[0] if r.data else None
    except Exception as e:
        log.warning("Could not insert task_ai_chat_message: %s", e)
        return None


def get_recent_activity(supabase: Client, org_id: str, limit: int = 30) -> list[dict]:
    """
    Return a unified recent-activity stream from readiness_score_history and completed tasks.
    Each item: { "id", "type", "title", "description", "timestamp" }.
    """
    out: list[dict] = []
    try:
        # Score history: id, score, updated_at, update_source
        r = (
            supabase.table("readiness_score_history")
            .select("id, score, updated_at, update_source")
            .eq("startup_org_id", org_id)
            .order("updated_at", desc=True)
            .limit(15)
            .execute()
        )
        for row in r.data or []:
            score = row.get("score")
            ts = row.get("updated_at") or ""
            src = (row.get("update_source") or "manual").replace("_", " ")
            out.append({
                "id": f"score-{row.get('id', ts)}",
                "type": "assessment_run" if src != "manual" else "score_change",
                "title": "Readiness score updated",
                "description": f"Score updated to {score}" if score is not None else "Readiness assessment run",
                "timestamp": ts,
            })
    except Exception as e:
        log.warning("get_recent_activity score_history: %s", e)

    try:
        gr = (
            supabase.table("task_groups")
            .select("id")
            .eq("org_id", org_id)
            .execute()
        )
        group_ids = [g["id"] for g in (gr.data or []) if g.get("id")]
        if group_ids:
            tr = (
                supabase.table("tasks")
                .select("id, title, completed_at")
                .in_("group_id", group_ids)
                .eq("status", "done")
                .order("completed_at", desc=True)
                .limit(20)
                .execute()
            )
            for row in tr.data or []:
                if not row.get("completed_at"):
                    continue
                ts = row.get("completed_at") or row.get("updated_at", "")
                title = (row.get("title") or "Task").strip()
                out.append({
                    "id": f"task-{row.get('id', ts)}",
                    "type": "task_completed",
                    "title": "Task completed",
                    "description": f'"{title}" marked as done',
                    "timestamp": ts,
                })
    except Exception as e:
        log.warning("get_recent_activity completed_tasks: %s", e)

    # Sort by timestamp desc and cap
    out.sort(key=lambda x: x.get("timestamp") or "", reverse=True)
    return out[:limit]
