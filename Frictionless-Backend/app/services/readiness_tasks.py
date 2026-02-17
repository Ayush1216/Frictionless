"""Compute pending readiness tasks from rubric vs current scored_rubric (no Claude)."""
from __future__ import annotations

import copy
import logging

from app.services.readiness_scorer import (
    _compute_summary,
    _extract_subtopics,
    _load_rubric,
)

log = logging.getLogger(__name__)


def _points_increase_to_impact(increase: int) -> str:
    """Impact from potential point increase (aim 5/5). High = 4–5 pts left, medium = 3, low = 1–2."""
    if increase >= 4:
        return "high"
    if increase >= 3:
        return "medium"
    return "low"


def get_done_subcategory_names(scored_rubric: dict) -> list[str]:
    """Return subcategory_name for each rubric item that is complete (Points >= maximum_points)."""
    rubric = _load_rubric()
    subtopics = _extract_subtopics(rubric)
    current_points: dict[str, int] = {}
    for cat_val in scored_rubric.values():
        if not isinstance(cat_val, dict):
            continue
        for sub_val in cat_val.values():
            if not isinstance(sub_val, list):
                continue
            for item in sub_val:
                if isinstance(item, dict) and "subcategory_name" in item:
                    sc = item.get("subcategory_name", "")
                    if sc:
                        current_points[sc] = int(item.get("Points", 0))
    done: list[str] = []
    for entry in subtopics:
        item = entry.get("item") or {}
        sc = (item.get("subcategory_name") or "").strip()
        if not sc:
            continue
        max_pts = int(item.get("maximum_points", 0))
        if max_pts <= 0:
            continue
        if current_points.get(sc, 0) >= max_pts:
            done.append(sc)
    return done


def compute_pending_tasks_from_rubric(scored_rubric: dict) -> list[dict]:
    """
    Compare scored_rubric to the full rubric. For each item where Points < maximum_points,
    add to pending. Group by category only (one section per category, e.g. one "Foundational Setup").
    Returns list of task groups: [{
        category_key, category_name, title, impact, sort_order,
        tasks: [{ subcategory_name, title, description, potential_points, sort_order }]
    }].
    """
    rubric = _load_rubric()
    subtopics = _extract_subtopics(rubric)
    # Build current points by subcategory from scored_rubric
    current_points: dict[str, int] = {}
    for cat_val in scored_rubric.values():
        if not isinstance(cat_val, dict):
            continue
        for sub_val in cat_val.values():
            if not isinstance(sub_val, list):
                continue
            for item in sub_val:
                if isinstance(item, dict) and "subcategory_name" in item:
                    sc = item.get("subcategory_name", "")
                    if sc:
                        current_points[sc] = int(item.get("Points", 0))

    # Per-category counts: total rubric items and how many are at max (done)
    cat_total: dict[str, int] = {}
    cat_done: dict[str, int] = {}
    for entry in subtopics:
        cat_key = entry["cat_key"]
        item = entry["item"]
        sc = item.get("subcategory_name", "")
        if not sc:
            continue
        cat_total[cat_key] = cat_total.get(cat_key, 0) + 1
        max_pts = int(item.get("maximum_points", 0))
        current = current_points.get(sc, 0)
        if current >= max_pts:
            cat_done[cat_key] = cat_done.get(cat_key, 0) + 1

    # Build pending items per category only (club all subtopics under one section per category)
    category_order: list[str] = []
    groups: dict[str, dict] = {}
    for entry in subtopics:
        cat_key = entry["cat_key"]
        item = entry["item"]
        sc = item.get("subcategory_name", "")
        if not sc:
            continue
        max_pts = int(item.get("maximum_points", 0))
        current = current_points.get(sc, 0)
        if current >= max_pts:
            continue
        if cat_key not in groups:
            cat_val = rubric.get(cat_key) or {}
            cat_name = cat_val.get("Category_Name", cat_key)
            category_order.append(cat_key)
            groups[cat_key] = {
                "category_key": cat_key,
                "category_name": cat_name,
                "title": cat_name,
                "impact": "low",  # set from subcategories below; categories have no impact of their own
                "sort_order": len(category_order) - 1,
                "tasks": [],
                "total_in_category": cat_total.get(cat_key, 0),
                "done_count": cat_done.get(cat_key, 0),
            }
        tasks_list = groups[cat_key]["tasks"]
        tasks_list.append({
            "subcategory_name": sc,
            "title": item.get("Question", sc),
            "description": item.get("Question", ""),
            "potential_points": max_pts - current,
            "maximum_points": max_pts,
            "sort_order": len(tasks_list),
        })

    # Derive group impact from max impact of its subcategories (point increase only)
    _impact_rank = {"low": 0, "medium": 1, "high": 2}
    for g in groups.values():
        tasks_list = g.get("tasks") or []
        if not tasks_list:
            continue
        best = max(
            (_points_increase_to_impact(t.get("potential_points", 0)) for t in tasks_list),
            key=lambda x: _impact_rank.get(x, 0),
        )
        g["impact"] = best

    return [groups[k] for k in category_order]


def apply_task_completion_to_rubric(
    scored_rubric: dict,
    subcategory_name: str,
    submitted_value: str | None = None,
) -> dict:
    """
    Set the rubric item for subcategory_name to the best option (max points).
    If the item has required_value and submitted_value is provided, set item["Value"] to it.
    Returns a new scored_rubric (does not mutate input).
    """
    rubric = _load_rubric()
    result = copy.deepcopy(scored_rubric)
    target = (subcategory_name or "").strip()
    if not target:
        return result

    for cat_val in result.values():
        if not isinstance(cat_val, dict):
            continue
        for sub_val in cat_val.values():
            if not isinstance(sub_val, list):
                continue
            for item in sub_val:
                if not isinstance(item, dict):
                    continue
                sc = (item.get("subcategory_name") or "").strip()
                if sc != target:
                    continue
                opts = item.get("options", {})
                if not opts:
                    return result
                best = max(opts.items(), key=lambda x: x[1])
                item["Answer"] = best[0]
                item["Points"] = best[1]
                if item.get("required_value") and submitted_value is not None and str(submitted_value).strip():
                    item["Value"] = str(submitted_value).strip()
                existing = (item.get("Reasoning") or "")
                if "[Task completed by user]" not in existing:
                    item["Reasoning"] = existing + " [Task completed by user]"
                return result
    log.warning("apply_task_completion: subcategory %r not found in rubric", subcategory_name)
    return result


def _get_extraction_value(extraction_data: dict, subcategory_name: str) -> str:
    """Get value from extraction_data for a rubric subcategory (e.g. fin.cash_on_hand_usd -> financial_data['cash_on_hand_usd'])."""
    if not extraction_data or not subcategory_name or "." not in subcategory_name:
        return ""
    key = subcategory_name.split(".", 1)[1]  # e.g. cash_on_hand_usd
    for section in ("financial_data", "initial_details", "founder_and_other_data"):
        section_data = extraction_data.get(section)
        if isinstance(section_data, dict):
            val = section_data.get(key)
            if val is not None and str(val).strip():
                return str(val).strip()
    return ""


def preserve_completions_from_rubric(updated_rubric: dict, fresh_rubric: dict) -> None:
    """
    In-place: for each item in updated_rubric, if the same subcategory in fresh_rubric
    is completed (Points >= maximum_points), copy Answer, Points, Value, Reasoning from
    fresh so we don't overwrite task completions that happened after we read the first copy.
    """
    # Index fresh by subcategory_name -> (points, max_pts, answer, value, reasoning)
    fresh_by_sc: dict[str, dict] = {}
    for cat_val in (fresh_rubric or {}).values():
        if not isinstance(cat_val, dict):
            continue
        for sub_val in cat_val.values():
            if not isinstance(sub_val, list):
                continue
            for item in sub_val:
                if not isinstance(item, dict):
                    continue
                sc = (item.get("subcategory_name") or "").strip()
                if not sc:
                    continue
                max_pts = int(item.get("maximum_points", 0))
                pts = int(item.get("Points", 0))
                if max_pts > 0 and pts >= max_pts:
                    fresh_by_sc[sc] = {
                        "Answer": item.get("Answer"),
                        "Points": pts,
                        "Value": item.get("Value"),
                        "Reasoning": (item.get("Reasoning") or ""),
                    }

    for cat_val in updated_rubric.values():
        if not isinstance(cat_val, dict):
            continue
        for sub_val in cat_val.values():
            if not isinstance(sub_val, list):
                continue
            for item in sub_val:
                if not isinstance(item, dict):
                    continue
                sc = (item.get("subcategory_name") or "").strip()
                if not sc or sc not in fresh_by_sc:
                    continue
                fresh = fresh_by_sc[sc]
                item["Answer"] = fresh.get("Answer")
                item["Points"] = fresh["Points"]
                if "Value" in fresh:
                    item["Value"] = fresh["Value"]
                item["Reasoning"] = fresh.get("Reasoning") or ""


def update_rubric_from_extraction(scored_rubric: dict, extraction_data: dict) -> dict:
    """
    Update scored_rubric from extraction_data without Claude: for each item, if the
    corresponding extraction value is non-empty, set to max points (same as task completion).
    Items with no extraction value are left unchanged so we don't overwrite existing scores.
    Returns a new dict (does not mutate input).
    """
    result = copy.deepcopy(scored_rubric)
    for cat_val in result.values():
        if not isinstance(cat_val, dict):
            continue
        for sub_val in cat_val.values():
            if not isinstance(sub_val, list):
                continue
            for item in sub_val:
                if not isinstance(item, dict):
                    continue
                opts = item.get("options", {})
                if not opts:
                    continue
                sc = (item.get("subcategory_name") or "").strip()
                value = _get_extraction_value(extraction_data, sc)
                if not value:
                    continue  # leave item unchanged
                best = max(opts.items(), key=lambda x: x[1])
                item["Answer"] = best[0]
                item["Points"] = best[1]
                if item.get("required_value"):
                    item["Value"] = value
                existing = (item.get("Reasoning") or "")
                if "[From extraction]" not in existing:
                    item["Reasoning"] = existing + " [From extraction]"
    return result


def compute_summary(scored_rubric: dict) -> dict:
    """Public wrapper for _compute_summary."""
    return _compute_summary(scored_rubric)
