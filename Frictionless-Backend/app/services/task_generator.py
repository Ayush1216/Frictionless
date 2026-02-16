"""Generate improvement tasks from readiness scoring using OpenAI."""
from __future__ import annotations

import json
import logging
import os
from typing import Any

from openai import OpenAI

log = logging.getLogger(__name__)

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")


def _extract_improvement_items(scored_rubric: dict, score_summary: dict) -> list[dict[str, Any]]:
    """Extract rubric items where points are below maximum (improvement opportunities)."""
    items: list[dict[str, Any]] = []
    for cat_key, cat_val in scored_rubric.items():
        if not isinstance(cat_val, dict):
            continue
        cat_name = cat_val.get("Category_Name", cat_key)
        for sub_key, sub_val in cat_val.items():
            if not isinstance(sub_val, list):
                continue
            for item in sub_val:
                if not isinstance(item, dict) or "options" not in item:
                    continue
                opts = item.get("options", {})
                max_pts = max(opts.values()) if opts else 0
                earned = item.get("Points", 0)
                if max_pts > 0 and earned < max_pts:
                    items.append({
                        "category": cat_name,
                        "subcategory": item.get("Subtopic_Name", sub_key),
                        "question": item.get("Question", ""),
                        "current_answer": item.get("Answer", ""),
                        "current_points": earned,
                        "max_points": max_pts,
                        "options": opts,
                        "reasoning": item.get("Reasoning", ""),
                    })
    return items


def _call_openai(improvement_items: list[dict], score_summary: dict) -> list[dict]:
    """Use OpenAI to generate structured task groups and tasks from improvement items."""
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise ValueError("OPENAI_API_KEY not set")

    overall = score_summary.get("_overall", {}) or {}
    raw_pct = overall.get("raw_percentage", 0)

    system_prompt = """You are a VC analyst helping startups improve their investment readiness.
Given rubric items where the startup scored below maximum, generate actionable improvement tasks.

Output a JSON object with this exact structure:
{
  "task_groups": [
    {
      "title": "Group title (e.g., Foundational Setup)",
      "category": "Short category label",
      "impact": "high|medium|low",
      "how_to_approach": "1-2 sentences on how to approach this group of improvements",
      "tasks": [
        {
          "title": "Specific actionable task title",
          "description": "Clear description of what to do, which rubric item it addresses, and why it matters",
          "potential_points": 5,
          "requires_rescore": true,
          "rubric_subcategory": "legal.cap_table_available"
        }
      ]
    }
  ]
}

Rules:
- Group tasks by category (e.g., Foundational Setup, Product, Metrics).
- Each task should map to one or more rubric improvement items.
- Title: actionable verb (Upload, Add, Document, Update, etc.).
- Description: specific, references the rubric question/option, explains impact.
- Set requires_rescore: true for tasks that would change the readiness score when completed.
- potential_points: integer = (max_points - current_points) from the rubric item(s) this task addresses. Sum if multiple items. Always include; minimum 1.
- rubric_subcategory: EXACT subcategory string from the improvement item (e.g. "legal.cap_table_available", "company.entity_type"). Use the "subcategory" field from the item this task addresses. Required.
- Limit to 5-8 task groups, 2-5 tasks per group. Prioritize highest-impact items.
- Impact: high = critical for investors, medium = helpful, low = nice-to-have."""

    items_str = json.dumps(improvement_items, indent=2)[:8000]
    user_prompt = f"""Current readiness score: {raw_pct}%
Overall: {json.dumps(overall, indent=1)[:500]}

Improvement items (scored below max):
{items_str}

Generate task groups and tasks. Return ONLY valid JSON, no markdown."""

    client = OpenAI(api_key=api_key)
    resp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.3,
    )
    text = (resp.choices[0].message.content or "").strip()
    # Strip markdown code blocks if present
    if text.startswith("```"):
        lines = text.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)
    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        log.warning("OpenAI task gen JSON parse error: %s", e)
        return []
    groups = data.get("task_groups") or []
    return groups if isinstance(groups, list) else []


def generate_tasks_from_readiness(
    scored_rubric: dict, score_summary: dict
) -> list[dict[str, Any]]:
    """
    Generate task groups with tasks from readiness scoring.
    Returns list of dicts: [{title, category, impact, how_to_approach, tasks: [{title, description, requires_rescore}]}]
    """
    items = _extract_improvement_items(scored_rubric, score_summary)
    if not items:
        log.info("No improvement items found; readiness is at max or empty")
        return []
    groups = _call_openai(items, score_summary)
    return groups
