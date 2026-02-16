"""Structured startup profile extraction via Gemini (KV sections)."""
from __future__ import annotations

import json
import logging
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Tuple

from google import genai
from google.genai import types

log = logging.getLogger(__name__)

MODEL_NAME = "gemini-2.5-flash-lite"
MAX_WORKERS = 3
MAX_OUTPUT_TOKENS = 4096
UNKNOWN_STRINGS = frozenset({"unknown", "n/a", "na", "not available", "null", "none", "not found", "-"})


def _read(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read().strip()


def _extract_json(raw: str) -> Dict[str, Any]:
    if not raw:
        return {}
    s = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.I)
    s = re.sub(r"\s*```$", "", s)
    try:
        obj = json.loads(s)
        return obj if isinstance(obj, dict) else {}
    except Exception:
        i, j = s.find("{"), s.rfind("}")
        if i != -1 and j > i:
            try:
                obj = json.loads(s[i : j + 1])
                return obj if isinstance(obj, dict) else {}
            except Exception:
                pass
    return {}


def _norm(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: _norm(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_norm(v) for v in value]
    if value is None:
        return ""
    if isinstance(value, str) and value.strip().lower() in UNKNOWN_STRINGS:
        return ""
    return value.strip() if isinstance(value, str) else value


def _ensure_keys(data: Dict[str, Any], keys: List[str]) -> Dict[str, Any]:
    out = {}
    for k in keys:
        v = data.get(k, "")
        if v is None or (isinstance(v, str) and v.strip().lower() in UNKNOWN_STRINGS):
            v = ""
        out[k] = v
    return out


_USD_KEYS = [
    "total_funding_usd", "last_round_amount_usd", "valuation_usd",
    "monthly_revenue_usd", "annual_revenue_usd", "mrr_usd", "arr_usd",
    "burn_rate_usd_per_month", "cac_usd", "ltv_usd", "cash_on_hand_usd",
]
_PCT_KEYS = ["gross_margin_percent", "ebitda_margin_percent", "revenue_growth_percent"]
_INT_KEYS = ["runway_months", "paying_customers"]


def _to_usd(text: Any) -> str:
    if text is None:
        return ""
    s = str(text).strip().lower()
    if not s or s in UNKNOWN_STRINGS:
        return ""
    s = re.split(r"\s*(?:to|-|—|–)\s*", s)[0].strip()
    s = s.replace(",", "").replace("usd", "").replace("$", "").strip()
    m = re.match(r"^([0-9]*\.?[0-9]+)\s*([kmb]|thousand|million|billion)?$", s)
    if not m:
        n = re.search(r"([0-9]*\.?[0-9]+)", s)
        if not n:
            return ""
        val = float(n.group(1))
        for word, scale in [("billion", 1e9), ("million", 1e6), ("thousand", 1e3)]:
            if word in s or re.search(rf"\b{word[0]}\b", s):
                val *= scale
                break
        return str(int(round(val)))
    num = float(m.group(1))
    u = (m.group(2) or "").lower()
    num *= {"k": 1e3, "thousand": 1e3, "m": 1e6, "million": 1e6, "b": 1e9, "billion": 1e9}.get(u, 1)
    return str(int(round(num)))


def _to_pct(text: Any) -> str:
    if text is None:
        return ""
    s = str(text).strip()
    if not s or s.lower() in UNKNOWN_STRINGS:
        return ""
    m = re.search(r"-?\d+(\.\d+)?", s)
    if not m:
        return ""
    v = float(m.group(0))
    if 0 < v <= 1 and "%" not in s:
        v *= 100
    return str(int(v)) if abs(v - int(v)) < 1e-9 else str(round(v, 2))


def _norm_financials(fin: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(fin)
    for k in _USD_KEYS:
        out[k] = _to_usd(out.get(k, ""))
    for k in _PCT_KEYS:
        out[k] = _to_pct(out.get(k, ""))
    for k in _INT_KEYS:
        v = out.get(k, "")
        if v != "":
            m = re.search(r"\d+", str(v))
            out[k] = m.group(0) if m else ""
    d = str(out.get("last_round_date", "") or "").strip()
    if d:
        dm = re.search(r"\b(\d{4})(-\d{2})?(-\d{2})?\b", d)
        out["last_round_date"] = dm.group(0) if dm else d
    else:
        out["last_round_date"] = ""
    return _norm(out)


def _missing_ratio(data: Dict[str, Any], keys: List[str]) -> float:
    if not keys:
        return 1.0
    return sum(1 for k in keys if str(data.get(k, "")).strip() == "") / len(keys)


INITIAL_KEYS = [
    "name", "legal_name", "entity_type", "website_url", "website_domain",
    "linkedin_url", "founded_year", "industry", "sub_industry", "hq_city",
    "hq_state", "hq_country", "team_size", "business_model", "target_market",
    "product_stage", "one_line_summary", "problem_statement",
    "solution_summary", "traction_summary",
]
FINANCIAL_KEYS = [
    "funding_stage", "total_funding_usd", "last_round_type",
    "last_round_amount_usd", "last_round_date", "valuation_usd",
    "monthly_revenue_usd", "annual_revenue_usd", "mrr_usd", "arr_usd",
    "burn_rate_usd_per_month", "runway_months", "gross_margin_percent",
    "ebitda_margin_percent", "cac_usd", "ltv_usd", "paying_customers",
    "revenue_growth_percent", "cash_on_hand_usd", "financial_notes",
]
FOUNDER_KEYS = [
    "founder_count", "founders", "ceo_name", "ceo_linkedin_url", "cto_name",
    "cto_linkedin_url", "key_team_members", "advisors",
    "founder_background_summary", "education_summary",
    "work_experience_summary", "previous_exits", "patents_or_ip",
    "awards_or_recognition", "notable_partnerships", "major_customers",
    "risk_flags", "compliance_or_regulatory_notes",
    "news_or_press_highlights", "other_notes",
]
_SECTION_EXTRA = {
    "financial_data": "USD → numeric string. Percent → number without '%'. Range → lower bound.",
    "initial_details": "Summaries 1-2 lines max.",
    "founder_and_other_data": "Keep factual. Arrays [] only when no data.",
}


def _build_prompt(section: str, keys: List[str], text: str) -> str:
    extra = _SECTION_EXTRA.get(section, "")
    return f"""Extract ONLY these {section} fields. Return valid JSON. Keys: {json.dumps(keys)}
Missing → "". No markdown. {extra}
Text:
\"\"\"
{text}
\"\"\""""


def _extract_section(
    client: genai.Client, section: str, keys: List[str], text: str
) -> Dict[str, Any]:
    resp = client.models.generate_content(
        model=MODEL_NAME,
        contents=_build_prompt(section, keys, text),
        config=types.GenerateContentConfig(
            temperature=0.0, top_p=0.8, max_output_tokens=MAX_OUTPUT_TOKENS,
        ),
    )
    raw = resp.text if hasattr(resp, "text") and resp.text else ""
    parsed = _ensure_keys(_extract_json(raw), keys)
    parsed = _norm(parsed)
    if section == "financial_data":
        parsed = _norm_financials(parsed)
    return parsed


def _refill_financials(
    client: genai.Client, text: str, current: Dict[str, Any], keys: List[str],
) -> Dict[str, Any]:
    missing = [k for k in keys if str(current.get(k, "")).strip() == ""]
    if not missing:
        return current
    prompt = f"""Extract ONLY: {json.dumps(missing)}. Valid JSON. USD→numeric. Text:\n\"\"\"\n{text}\n\"\"\""""
    resp = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
        config=types.GenerateContentConfig(temperature=0.0, top_p=0.8, max_output_tokens=2048),
    )
    refill = _norm_financials(_ensure_keys(_extract_json(resp.text or ""), missing))
    merged = dict(current)
    for k in missing:
        if str(merged.get(k, "")).strip() == "" and str(refill.get(k, "")).strip() != "":
            merged[k] = refill[k]
    return _norm_financials(merged)


def run_pipeline(input_path: str, output_path: str) -> Dict[str, Any]:
    """Run KV extraction. Returns dict."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise ValueError("Missing GEMINI_API_KEY")
    text = _read(input_path)
    if not text:
        raise ValueError(f"Empty input: {input_path}")
    client = genai.Client(api_key=api_key)
    sections: List[Tuple[str, List[str]]] = [
        ("initial_details", INITIAL_KEYS),
        ("financial_data", FINANCIAL_KEYS),
        ("founder_and_other_data", FOUNDER_KEYS),
    ]
    results: Dict[str, Any] = {}
    errors: Dict[str, str] = {}
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futs = {pool.submit(_extract_section, client, s, k, text): (s, k) for s, k in sections}
        for f in as_completed(futs):
            s, k = futs[f]
            try:
                results[s] = f.result()
            except Exception as e:
                results[s] = {kk: "" for kk in k}
                errors[s] = str(e)
    fin = results.get("financial_data", {})
    if fin and _missing_ratio(fin, FINANCIAL_KEYS) > 0.45:
        try:
            results["financial_data"] = _refill_financials(client, text, fin, FINANCIAL_KEYS)
        except Exception as e:
            errors["financial_refill"] = str(e)
    final = _norm({
        "input_file": input_path,
        "model_used": MODEL_NAME,
        "initial_details": _norm(results.get("initial_details", {})),
        "financial_data": _norm_financials(results.get("financial_data", {})),
        "founder_and_other_data": _norm(results.get("founder_and_other_data", {})),
        "errors": errors,
    })
    from pathlib import Path
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(final, f, indent=2, ensure_ascii=False)
    log.info("Startup KV → %s", output_path)
    return final
