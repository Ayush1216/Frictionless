"""Extract chart-ready JSON from pitchdeck text via Gemini."""
from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from google import genai
from google.genai import types

log = logging.getLogger(__name__)

CHARTS_SCHEMA: Dict[str, Any] = {
    "startup_name": None,
    "charts": [
        {
            "chart_id": None, "chart_title": None, "chart_type": None,
            "x_axis_label": None, "y_axis_label": None, "unit": None, "time_granularity": None,
            "series": [{"name": None, "data": [{"x": None, "y": None}]}],
            "categories": [], "insight": None, "confidence_score": None, "source_snippets": [],
        }
    ],
    "kpi_cards": [
        {"kpi_id": None, "label": None, "value": None, "unit": None, "as_of": None,
         "confidence_score": None, "source_snippets": []}
    ],
    "chart_pack_meta": {
        "schema_version": "v1.0.0", "extraction_model": None, "input_file_name": None,
        "input_char_count": None, "generated_at_utc": None, "notes": [],
    },
}


def _read(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def _strip_fences(raw: str) -> str:
    if not raw:
        return raw
    s = raw.strip()
    s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.I)
    s = re.sub(r"\s*```$", "", s)
    i, j = s.find("{"), s.rfind("}")
    return s[i : j + 1] if i != -1 and j > i else s


def _slugify(v: str) -> str:
    v = re.sub(r"[^a-z0-9]+", "_", (v or "").strip().lower())
    return re.sub(r"_+", "_", v).strip("_") or "chart"


def _safe_float(v: Any) -> Optional[float]:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip().replace(",", "").replace("$", "").replace("USD", "").replace("usd", "").strip()
    if s.endswith("%"):
        s = s[:-1].strip()
    mult = 1.0
    if re.search(r"[kmb]$", s, re.I):
        mult = {"k": 1e3, "m": 1e6, "b": 1e9}[s[-1].lower()]
        s = s[:-1]
    try:
        return float(s) * mult
    except Exception:
        return None


def _clamp(v: int, lo: int = 0, hi: int = 100) -> int:
    return max(lo, min(hi, v))


def _ensure_keys(template: Any, value: Any) -> Any:
    if isinstance(template, dict):
        val = value if isinstance(value, dict) else {}
        return {k: _ensure_keys(v, val.get(k)) for k, v in template.items()}
    if isinstance(template, list):
        val = value if isinstance(value, list) else []
        return [_ensure_keys(template[0], item) for item in val] if template else val
    return value if value is not None else template


def _postprocess(data: Dict[str, Any]) -> Dict[str, Any]:
    obj = _ensure_keys(CHARTS_SCHEMA, data)
    seen_ids: set = set()
    clean_charts = []
    for c in obj.get("charts") or []:
        cid = c.get("chart_id") or _slugify(c.get("chart_title") or "chart")
        base, n = cid, 2
        while cid in seen_ids:
            cid = f"{base}_{n}"
            n += 1
        seen_ids.add(cid)
        c["chart_id"] = cid
        series_out = []
        for s in c.get("series") or []:
            pts = []
            for p in s.get("data") or []:
                y = _safe_float(p.get("y"))
                if p.get("x") is not None and y is not None:
                    pts.append({"x": str(p["x"]), "y": y})
            if pts:
                series_out.append({"name": s.get("name") or "Series", "data": pts})
        c["series"] = series_out
        c["categories"] = [str(x) for x in (c.get("categories") or []) if x is not None]
        c["confidence_score"] = _clamp(int(_safe_float(c.get("confidence_score")) or 0))
        if series_out:
            clean_charts.append(c)
    obj["charts"] = clean_charts
    seen_kpi: set = set()
    clean_kpis = []
    for k in obj.get("kpi_cards") or []:
        kid = k.get("kpi_id") or _slugify(k.get("label") or "kpi")
        base, n = kid, 2
        while kid in seen_kpi:
            kid = f"{base}_{n}"
            n += 1
        seen_kpi.add(kid)
        k["kpi_id"] = kid
        k["value"] = _safe_float(k.get("value"))
        k["confidence_score"] = _clamp(int(_safe_float(k.get("confidence_score")) or 0))
        if k.get("label") and k.get("value") is not None:
            clean_kpis.append(k)
    obj["kpi_cards"] = clean_kpis
    return obj


SYSTEM_PROMPT = """You are a startup pitch-deck chart extraction engine.
Return ONLY valid JSON. Use exact schema keys. Numeric fields must be numbers."""


def _build_prompt(txt: str, fname: str) -> str:
    return f"""{SYSTEM_PROMPT}
INPUT_FILE_NAME: {fname}
SCHEMA: {json.dumps(CHARTS_SCHEMA, indent=2)}
PITCHDECK_TEXT:
\"\"\"
{txt}
\"\"\"
TASK: Extract chart-ready JSON for frontend. Time-series, KPIs. No invented data."""


def _call_gemini(client: genai.Client, model: str, txt: str, fname: str) -> Dict[str, Any]:
    resp = client.models.generate_content(
        model=model,
        contents=[types.Content(role="user", parts=[types.Part.from_text(text=_build_prompt(txt, fname))])],
        config=types.GenerateContentConfig(
            temperature=0.1, top_p=0.9, response_mime_type="application/json",
        ),
    )
    raw = (resp.text or "").strip()
    parsed = json.loads(_strip_fences(raw))
    if not isinstance(parsed, dict):
        raise ValueError("Gemini output is not a JSON object")
    return parsed


def run(
    txt_path: str,
    out_path: str,
    model: str = "gemini-3-flash-preview",
) -> Dict[str, Any]:
    """Extract chart JSON from pitchdeck text."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise EnvironmentError("Missing GEMINI_API_KEY")
    if not os.path.isfile(txt_path):
        raise FileNotFoundError(f"Not found: {txt_path}")
    txt = _read(txt_path)
    fname = os.path.basename(txt_path)
    client = genai.Client(api_key=api_key)
    raw_data = _call_gemini(client, model, txt, fname)
    final = _postprocess(raw_data)
    final["chart_pack_meta"].update({
        "input_file_name": fname,
        "input_char_count": len(txt),
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "extraction_model": model,
    })
    if not final.get("startup_name"):
        final["startup_name"] = os.path.splitext(fname)[0].replace("_", " ").replace("-", " ").strip() or None
    from pathlib import Path
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(final, f, indent=2, ensure_ascii=False)
    log.info("Charts → %s (%d charts, %d KPIs)", out_path, len(final["charts"]), len(final["kpi_cards"]))
    return final
