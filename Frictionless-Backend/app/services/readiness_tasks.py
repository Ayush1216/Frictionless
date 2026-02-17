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
                item["Reasoning"] = (item.get("Reasoning") or "") + " [Task completed by user]"
                return result
    log.warning("apply_task_completion: subcategory %r not found in rubric", subcategory_name)
    return result


def compute_summary(scored_rubric: dict) -> dict:
    """Public wrapper for _compute_summary."""
    return _compute_summary(scored_rubric)
