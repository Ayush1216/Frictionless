"""Readiness scoring: port of Readiness_Generation.py for backend integration."""
from __future__ import annotations

import copy
import json
import logging
import os
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import anthropic

log = logging.getLogger(__name__)

RUBRIC_PATH = Path(__file__).resolve().parent.parent.parent.parent / "Readiness_Rubrics.json"
BATCH_SIZES = [23, 23, 20, 25]
MODEL = os.getenv("READINESS_CLAUDE_MODEL", "claude-opus-4-5")
MAX_CONTEXT_CHARS = 12000

# Questionnaire value -> rubric option string mapping (for the 3 overlapping items)
QUESTIONNAIRE_ENTITY_MAP = {
    # C-Corp (or local equivalent) — 8 pts
    "c_corp": ("C-Corp (or local equivalent)", 8),
    "non_us_equiv": ("C-Corp (or local equivalent)", 8),
    "pbc_bcorp": ("C-Corp (or local equivalent)", 8),
    # LLC (conversion planned) — 6 pts
    "llc_converting": ("LLC (conversion planned)", 6),
    "scorp_converting": ("LLC (conversion planned)", 6),
    "partnership_converting": ("LLC (conversion planned)", 6),
    # LLC (no conversion plan) — 4 pts
    "llc_no_convert": ("LLC (no conversion plan)", 4),
    "scorp_no_convert": ("LLC (no conversion plan)", 4),
    "sole_proprietorship": ("LLC (no conversion plan)", 4),
    # Other / Unknown — 0 pts
    "no_entity": ("Other / Unknown", 0),
    "nonprofit": ("Other / Unknown", 0),
    "other_unknown": ("Other / Unknown", 0),
    # Legacy values (backward compat)
    "llc": ("LLC (no conversion plan)", 4),
    "other": ("Other / Unknown", 0),
    "unknown": ("Other / Unknown", 0),
}
QUESTIONNAIRE_PRODUCT_STATUS_MAP = {
    "idea": ("Idea / Concept", 1),
    "mvp": ("MVP / First Run", 2),
    "beta": ("Beta / Pilot", 3),
    "launched": ("Launched", 4),
    "scaling": ("Scaling", 5),
}
QUESTIONNAIRE_REVENUE_MAP = {
    "subscription": ("Subscription (SaaS)", 5),
    "usage": ("Usage-based", 5),
    "transaction": ("Transaction fee / Take-rate", 5),
    "licensing": ("Licensing", 5),
    "ad": ("Advertising", 5),
    "not_monetizing": ("Not yet monetizing", 2),
}

SYSTEM_PROMPT = """You are a VC analyst scoring a startup against a rubric.

You receive: OCR of pitch deck, founder LinkedIn data, Apollo.io company data, and numbered rubric items.

For EACH numbered item respond with ONLY these 4 fields:
- "i": item number (int)
- "a": EXACT option string from the given options (copy verbatim)
- "p": points for that option (int)
- "v": extracted value (string) if NeedValue=YES, else null
- "r": 1-2 sentence human analyst reasoning (specific, references data found)

RULES:
- "a" MUST be character-for-character identical to one of the option strings.
- If no evidence found, pick the lowest-scoring option.
- Keep reasoning short but specific to actual data.

Return ONLY a JSON array. No markdown, no backticks, no explanation."""


def _load_rubric() -> dict:
    with open(RUBRIC_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _extract_subtopics(rubric: dict) -> list:
    items = []
    for cat_key, cat_val in rubric.items():
        if not isinstance(cat_val, dict):
            continue
        for sub_key, sub_val in cat_val.items():
            if not isinstance(sub_val, list):
                continue
            for item in sub_val:
                if isinstance(item, dict) and "options" in item:
                    items.append({"cat_key": cat_key, "sub_key": sub_key, "item": item})
    return items


def _build_compact_prompt(subtopics: list, start_offset: int = 0) -> str:
    lines = []
    for i, entry in enumerate(subtopics):
        item = entry["item"]
        opts = item.get("options", {})
        opts_str = " | ".join(f'"{k}":{v}' for k, v in opts.items())
        req = "YES" if item.get("required_value") else "NO"
        num = start_offset + i + 1
        lines.append(
            f'{num}. [{item.get("subcategory_name","")}] '
            f'Q: {item.get("Question","")} | NeedValue: {req} | Opts: {opts_str}'
        )
    return "\n".join(lines)


def _call_claude(client: anthropic.Anthropic, system: str, user: str) -> str:
    for attempt in range(3):
        try:
            resp = client.messages.create(
                model=MODEL,
                max_tokens=12000,
                temperature=0.1,
                system=system,
                messages=[{"role": "user", "content": user}],
            )
            log.info("Claude batch done (attempt %d)", attempt + 1)
            return resp.content[0].text
        except anthropic.RateLimitError:
            wait = 5 * (attempt + 1)
            log.warning("Claude rate limited, waiting %ds", wait)
            time.sleep(wait)
        except Exception as e:
            log.warning("Claude API error (attempt %d): %s", attempt + 1, e)
            if attempt < 2:
                time.sleep(3)
            else:
                raise
    return ""


def _parse_response(raw: str) -> list:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    m = re.search(r"\[.*]", raw, re.DOTALL)
    if m:
        try:
            return json.loads(m.group())
        except json.JSONDecodeError:
            pass
    log.warning("Could not parse Claude response")
    return []


def _score_batch(
    client: anthropic.Anthropic,
    batch_subtopics: list,
    start_idx: int,
    summarized_context: str,
) -> list:
    items_prompt = _build_compact_prompt(batch_subtopics, start_offset=start_idx)
    user_prompt = f"""=== STARTUP DATA ===
{summarized_context}

=== RUBRIC ITEMS ({len(batch_subtopics)} items, numbered {start_idx + 1} to {start_idx + len(batch_subtopics)}) ===
{items_prompt}

Score these {len(batch_subtopics)} items. Use the EXACT item numbers shown above (i: {start_idx + 1}, {start_idx + 2}, ...).
Return ONLY a JSON array with keys: i, a, p, v, r"""
    raw = _call_claude(client, SYSTEM_PROMPT, user_prompt)
    return _parse_response(raw)


def _verify_and_fix(scored_rubric: dict) -> int:
    fixes = 0
    for cat_val in scored_rubric.values():
        if not isinstance(cat_val, dict):
            continue
        for sub_val in cat_val.values():
            if not isinstance(sub_val, list):
                continue
            for item in sub_val:
                if not isinstance(item, dict) or "Answer" not in item:
                    continue
                opts = item.get("options", {})
                ans = item["Answer"]
                if ans in opts:
                    if item["Points"] != opts[ans]:
                        item["Points"] = opts[ans]
                        fixes += 1
                else:
                    fixed = False
                    for k in opts:
                        if k.lower().strip() == ans.lower().strip():
                            item["Answer"] = k
                            item["Points"] = opts[k]
                            fixes += 1
                            fixed = True
                            break
                    if not fixed:
                        lo = min(opts.items(), key=lambda x: x[1])
                        item["Answer"] = lo[0]
                        item["Points"] = lo[1]
                        item["Reasoning"] = (
                            item.get("Reasoning", "") + " [Auto-corrected: original answer not in options]"
                        )
                        fixes += 1
    return fixes


def _compute_summary(scored_rubric: dict) -> dict:
    """
    Score summary from scored_rubric. Per-category uses category maximum_point.
    Overall total_maximum is sum of all item maximum_points so that completing
    all tasks (every item at max) yields raw_percentage = 100.
    """
    summary = {}
    t_earned = 0
    t_max_from_items = 0  # sum of item maximum_points so 100% is reachable when all items at max
    t_weighted = 0.0
    for cat_key, cat_val in scored_rubric.items():
        if not isinstance(cat_val, dict):
            continue
        mx = cat_val.get("maximum_point", 0)
        wt = cat_val.get("weight", 0)
        earned = 0
        cat_item_max = 0
        for v in cat_val.values():
            if not isinstance(v, list):
                continue
            for item in v:
                if not isinstance(item, dict):
                    continue
                earned += item.get("Points", 0)
                cat_item_max += item.get("maximum_points", 0)
        pct = (earned / mx * 100) if mx > 0 else 0
        w_score = (earned / mx * wt) if mx > 0 else 0
        summary[cat_key] = {
            "category_name": cat_val.get("Category_Name", cat_key),
            "earned": earned,
            "maximum": mx,
            "percentage": round(pct, 1),
            "weight": wt,
            "weighted_score": round(w_score, 2),
        }
        t_earned += earned
        t_max_from_items += cat_item_max
        t_weighted += w_score
    summary["_overall"] = {
        "total_earned": t_earned,
        "total_maximum": t_max_from_items,
        "raw_percentage": round(t_earned / t_max_from_items * 100, 1) if t_max_from_items > 0 else 0,
        "weighted_total": round(t_weighted, 2),
    }
    return summary


def _inject_questionnaire(
    scored_rubric: dict,
    questionnaire: dict,
) -> None:
    """Override rubric items for entity_type, product_status, revenue_model with questionnaire answers."""
    entity = (questionnaire.get("entity_type") or "").strip().lower()
    product = (questionnaire.get("product_status") or "").strip().lower()
    revenue_raw = (questionnaire.get("revenue_model") or "").strip().lower()
    # revenue_model may be comma-separated (multiselect); use first value for scoring
    revenue = revenue_raw.split(",")[0].strip() if revenue_raw else ""

    for cat_val in scored_rubric.values():
        if not isinstance(cat_val, dict):
            continue
        for sub_val in cat_val.values():
            if not isinstance(sub_val, list):
                continue
            for item in sub_val:
                if not isinstance(item, dict):
                    continue
                sc = item.get("subcategory_name", "")
                if sc == "company.entity_type" and entity in QUESTIONNAIRE_ENTITY_MAP:
                    opt, pts = QUESTIONNAIRE_ENTITY_MAP[entity]
                    item["Answer"] = opt
                    item["Points"] = pts
                    item["Reasoning"] = (item.get("Reasoning", "") or "") + " [From questionnaire]"
                elif sc == "overview.product_status" and product in QUESTIONNAIRE_PRODUCT_STATUS_MAP:
                    opt, pts = QUESTIONNAIRE_PRODUCT_STATUS_MAP[product]
                    item["Answer"] = opt
                    item["Points"] = pts
                    item["Reasoning"] = (item.get("Reasoning", "") or "") + " [From questionnaire]"
                elif sc == "biz.revenue_model" and revenue in QUESTIONNAIRE_REVENUE_MAP:
                    opt, pts = QUESTIONNAIRE_REVENUE_MAP[revenue]
                    item["Answer"] = opt
                    item["Points"] = pts
                    item["Reasoning"] = (item.get("Reasoning", "") or "") + " [From questionnaire]"


def run_readiness_scoring(
    ocr_text: str,
    startup_data: dict,
    apollo_data: dict,
    questionnaire_data: dict | None = None,
) -> dict:
    """
    Run readiness scoring. Returns {"scored_rubric": ..., "score_summary": ...}.
    Raises on missing API keys or rubric.
    """
    api_key = os.getenv("CLAUDE_API_KEY", "").strip()
    if not api_key:
        raise ValueError("CLAUDE_API_KEY not set")
    if not RUBRIC_PATH.exists():
        raise FileNotFoundError(f"Rubric not found: {RUBRIC_PATH}")

    rubric = _load_rubric()
    founder_data = startup_data.get("founder_linkedin", {})
    founder_json_str = json.dumps(founder_data, indent=1)
    apollo_json_str = json.dumps(apollo_data, indent=1)

    combined_input = f"""--- PITCH DECK OCR ---
{ocr_text}

--- FOUNDER LINKEDIN JSON ---
{founder_json_str}

--- APOLLO.IO JSON ---
{apollo_json_str}"""
    summarized_context = (
        combined_input[:MAX_CONTEXT_CHARS] if len(combined_input) > MAX_CONTEXT_CHARS else combined_input
    )

    subtopics = _extract_subtopics(rubric)
    if not subtopics:
        raise ValueError("No scoreable items in rubric")

    batches = []
    idx = 0
    for sz in BATCH_SIZES:
        batch = subtopics[idx : idx + sz]
        if batch:
            batches.append((idx, batch))
        idx += sz

    client = anthropic.Anthropic(api_key=api_key)
    log.info("Running %d Claude batches...", len(batches))
    all_results = []
    with ThreadPoolExecutor(max_workers=4) as ex:
        futures = {
            ex.submit(_score_batch, client, batch, start_idx, summarized_context): bi
            for bi, (start_idx, batch) in enumerate(batches)
        }
        for fut in as_completed(futures):
            bi = futures[fut]
            try:
                results = fut.result()
                all_results.extend(results)
                log.info("Batch %d done: %d items", bi + 1, len(results))
            except Exception as e:
                log.exception("Batch %d failed: %s", bi + 1, e)
                raise

    scored_rubric = copy.deepcopy(rubric)
    scored_subtopics = _extract_subtopics(scored_rubric)
    result_map = {}
    for r in all_results:
        i = r.get("i", 0) - 1
        result_map[i] = r

    for idx, entry in enumerate(scored_subtopics):
        item = entry["item"]
        r = result_map.get(idx)
        if r:
            item["Answer"] = r.get("a", "")
            item["Points"] = r.get("p", 0)
            item["Value"] = r.get("v") if item.get("required_value") else None
            item["Reasoning"] = r.get("r", "")
        else:
            opts = item.get("options", {})
            lo = min(opts.items(), key=lambda x: x[1])
            item["Answer"] = lo[0]
            item["Points"] = lo[1]
            item["Value"] = None
            item["Reasoning"] = "No evaluation data returned for this item."

    _verify_and_fix(scored_rubric)
    if questionnaire_data:
        _inject_questionnaire(scored_rubric, questionnaire_data)
    summary = _compute_summary(scored_rubric)
    return {"scored_rubric": scored_rubric, "score_summary": summary}
