#!/usr/bin/env python3
from __future__ import annotations

import argparse
import copy
import dataclasses
import datetime as dt
import json
import math
import os
import re
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional, Tuple
import requests

# Optional dotenv
try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None


# ----------------------------
# Env / Logging
# ----------------------------

def init_env() -> None:
    if load_dotenv:
        load_dotenv(override=False)

def now_utc_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")

def log_info(msg: str) -> None:
    print(f"[INFO] {msg}")

def log_warn(msg: str) -> None:
    print(f"[WARN] {msg}")

def log_step(title: str) -> None:
    print(f"\n===== {title} =====")


# ----------------------------
# IO Helpers
# ----------------------------

def read_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def write_json(path: str, data: Any) -> None:
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ----------------------------
# Core Utils
# ----------------------------

def norm_text(x: Any) -> str:
    if x is None:
        return ""
    return str(x).strip().lower()

def clean_text(x: Any) -> str:
    if x is None:
        return ""
    return str(x).strip()

def to_float(x: Any) -> Optional[float]:
    if x is None:
        return None
    if isinstance(x, (int, float)):
        try:
            if math.isnan(float(x)):
                return None
        except Exception:
            pass
        return float(x)
    s = str(x).strip()
    if not s:
        return None
    s = s.replace(",", "")
    s = re.sub(r"[$%]", "", s)
    try:
        return float(s)
    except Exception:
        return None

def to_int(x: Any) -> Optional[int]:
    v = to_float(x)
    return int(v) if v is not None else None

def to_bool(x: Any) -> Optional[bool]:
    if isinstance(x, bool):
        return x
    if x is None:
        return None
    s = norm_text(x)
    if s in {"true", "yes", "y", "1", "provided", "available"}:
        return True
    if s in {"false", "no", "n", "0", "missing", "unknown", "not provided", "none"}:
        return False
    return None

def to_list(x: Any) -> List[Any]:
    if x is None:
        return []
    if isinstance(x, list):
        return x
    if isinstance(x, tuple):
        return list(x)
    if isinstance(x, set):
        return list(x)
    s = str(x).strip()
    if not s:
        return []
    if "," in s or ";" in s:
        parts = re.split(r"[;,]", s)
        return [p.strip() for p in parts if p.strip()]
    return [s]

def unique_norm_list(values: List[Any]) -> List[str]:
    out, seen = [], set()
    for v in values:
        t = clean_text(v)
        if not t:
            continue
        n = norm_text(t)
        if n not in seen:
            seen.add(n)
            out.append(t)
    return out

def recursive_find_first(obj: Any, key_aliases: List[str]) -> Any:
    aliases = {a.lower() for a in key_aliases}
    if isinstance(obj, dict):
        for k, v in obj.items():
            if str(k).lower() in aliases:
                return v
        for _, v in obj.items():
            found = recursive_find_first(v, key_aliases)
            if found is not None:
                return found
    elif isinstance(obj, list):
        for v in obj:
            found = recursive_find_first(v, key_aliases)
            if found is not None:
                return found
    return None

def recursive_find_all(obj: Any, key_aliases: List[str]) -> List[Any]:
    aliases = {a.lower() for a in key_aliases}
    out = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if str(k).lower() in aliases:
                out.append(v)
            out.extend(recursive_find_all(v, key_aliases))
    elif isinstance(obj, list):
        for v in obj:
            out.extend(recursive_find_all(v, key_aliases))
    return out

def first_non_null(*vals: Any) -> Any:
    for v in vals:
        if v is None:
            continue
        if isinstance(v, str) and not v.strip():
            continue
        return v
    return None

def is_missing(v: Any) -> bool:
    return v is None or (isinstance(v, str) and not v.strip()) or (isinstance(v, list) and not v)

def is_empty(v: Any) -> bool:
    if v is None:
        return True
    if isinstance(v, str):
        return not v.strip()
    if isinstance(v, (list, tuple, set, dict)):
        return len(v) == 0
    return False

def list_norm_set(v: Any) -> set:
    return {norm_text(x) for x in to_list(v) if clean_text(x)}

def overlap(a: Any, b: Any) -> bool:
    return len(list_norm_set(a).intersection(list_norm_set(b))) > 0

def count_overlap(a: Any, b: Any) -> int:
    return len(list_norm_set(a).intersection(list_norm_set(b)))

def range_overlap(a_min: Optional[float], a_max: Optional[float], b_min: Optional[float], b_max: Optional[float]) -> bool:
    if any(x is None for x in [a_min, a_max, b_min, b_max]):
        return False
    return max(float(a_min), float(b_min)) <= min(float(a_max), float(b_max))

def abs_distance_to_range(value: Optional[float], lo: Optional[float], hi: Optional[float]) -> Optional[float]:
    if value is None or lo is None or hi is None:
        return None
    if lo <= value <= hi:
        return 0.0
    if value < lo:
        return float(lo - value)
    return float(value - hi)

def parse_percent(x: Any) -> Optional[float]:
    if x is None:
        return None
    if isinstance(x, (int, float)):
        xv = float(x)
        if 0 <= xv <= 1:
            return xv
        if 1 < xv <= 100:
            return xv / 100.0
        return None
    s = str(x).strip()
    if not s:
        return None
    if s.endswith("%"):
        v = to_float(s[:-1])
        return None if v is None else v / 100.0
    v = to_float(s)
    if v is None:
        return None
    if 0 <= v <= 1:
        return v
    if 1 < v <= 100:
        return v / 100.0
    return None

def normalize_condition_key(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())

def slugify(s: str) -> str:
    s = norm_text(s)
    s = re.sub(r"[^a-z0-9]+", "_", s).strip("_")
    return s or "task"


STAGE_MAP = {
    "preseed": "pre_seed", "pre-seed": "pre_seed", "pre seed": "pre_seed",
    "seed": "seed",
    "series a": "series_a", "series-a": "series_a", "series_a": "series_a",
    "series b": "series_b", "series-b": "series_b", "series_b": "series_b",
    "series c": "series_c_plus", "series d": "series_c_plus", "growth": "series_c_plus",
}
ROUND_MAP = dict(STAGE_MAP)
REG_RISK_MAP = {"low": 1, "medium": 2, "high": 3, "very_high": 4, "very high": 4}
CAPITAL_INTENSITY_MAP = {"light": 1, "moderate": 2, "heavy": 3}
STAGE_ORDER = {"pre_seed": 0, "seed": 1, "series_a": 2, "series_b": 3, "series_c_plus": 4}


def normalize_stage(v: Any) -> Optional[str]:
    s = norm_text(v)
    if not s:
        return None
    if s in STAGE_MAP:
        return STAGE_MAP[s]
    for k, mapped in STAGE_MAP.items():
        if k in s:
            return mapped
    return None

def normalize_round(v: Any) -> Optional[str]:
    s = norm_text(v)
    if not s:
        return None
    if s in ROUND_MAP:
        return ROUND_MAP[s]
    for k, mapped in ROUND_MAP.items():
        if k in s:
            return mapped
    return None

def normalize_instrument(v: Any) -> Optional[str]:
    s = norm_text(v)
    if not s:
        return None
    if "safe" in s:
        return "safe"
    if "convertible" in s or "note" in s:
        return "convertible_note"
    if "equity" in s or "priced" in s:
        return "equity"
    if "debt" in s:
        return "debt"
    return s.replace(" ", "_")

def normalize_geos(values: List[Any]) -> List[str]:
    return unique_norm_list([clean_text(v) for v in values if clean_text(v)])

def normalize_sectors(values: List[Any]) -> List[str]:
    return unique_norm_list(values)

def normalize_business_model(primary: Any, is_b2b: Optional[bool], is_b2c: Optional[bool]):
    p = norm_text(primary)
    if not p:
        if is_b2b is True and is_b2c is True:
            p = "b2b_b2c"
        elif is_b2b is True:
            p = "b2b"
        elif is_b2c is True:
            p = "b2c"
        else:
            return None, is_b2b, is_b2c
    if "b2b" in p and "b2c" in p:
        return "b2b_b2c", True if is_b2b is None else is_b2b, True if is_b2c is None else is_b2c
    if "b2b" in p or "enterprise" in p or "saas" in p:
        return "b2b", True if is_b2b is None else is_b2b, False if is_b2c is None else is_b2c
    if "b2c" in p or "consumer" in p or "d2c" in p:
        return "b2c", False if is_b2b is None else is_b2b, True if is_b2c is None else is_b2c
    if "marketplace" in p:
        return "marketplace", is_b2b, is_b2c
    return p.replace(" ", "_"), is_b2b, is_b2c

def adjacent_stage(startup_stage: Optional[str], investor_stage_list: List[str]) -> bool:
    if startup_stage is None or startup_stage not in STAGE_ORDER:
        return False
    s_idx = STAGE_ORDER[startup_stage]
    for st in investor_stage_list:
        n = normalize_stage(st) or st
        if n in STAGE_ORDER and abs(STAGE_ORDER[n] - s_idx) == 1:
            return True
    return False

def strict_role_conflict(needs_lead, only_followers, investor_role):
    role = norm_text(investor_role)
    return (needs_lead is True and role == "follow") or (only_followers is True and role == "lead")

def artifact_count_present(*vals: Any) -> int:
    c = 0
    for v in vals:
        if isinstance(v, bool):
            c += 1 if v else 0
        elif isinstance(v, str):
            c += 1 if v.strip() else 0
        elif v is not None:
            c += 1
    return c


# ----------------------------
# LLM Router (OpenAI + Kimi + Gemini)
# ----------------------------

class LLMRouter:
    def __init__(
        self,
        provider: str = "auto",
        model: Optional[str] = None,
        timeout_sec: int = 90,
        max_output_tokens: int = 8192,
    ):
        self.provider = (provider or "auto").lower().strip()
        self.model = model
        self.timeout_sec = timeout_sec
        self.max_output_tokens = max_output_tokens

    @staticmethod
    def _extract_json(text: str) -> Dict[str, Any]:
        if not text:
            return {}
        s = text.strip()
        s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE)
        s = re.sub(r"\s*```$", "", s)
        start = s.find("{")
        end = s.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(s[start:end + 1])
            except Exception:
                return {}
        return {}

    def _kimi_complete_json(self, system_prompt: str, user_payload: Dict[str, Any], model: Optional[str] = None) -> Dict[str, Any]:
        api_key = os.getenv("KIMI_API_KEY")
        base_url = os.getenv("KIMI_BASE_URL", "").rstrip("/")
        kimi_model = model or self.model or os.getenv("KIMI_MODEL", "kimi-k2")
        if not api_key or not base_url:
            raise RuntimeError("KIMI_API_KEY or KIMI_BASE_URL missing for Kimi provider.")

        url = f"{base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        user_txt = "Return STRICT JSON only. No markdown.\n\nINPUT:\n" + json.dumps(user_payload, ensure_ascii=False)
        body = {
            "model": kimi_model,
            "temperature": 0.1,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_txt},
            ],
            "response_format": {"type": "json_object"},
        }
        resp = requests.post(url, headers=headers, json=body, timeout=self.timeout_sec)
        if resp.status_code >= 400:
            raise RuntimeError(f"Kimi HTTP {resp.status_code}: {resp.text[:500]}")
        data = resp.json()
        content = ""
        try:
            content = data["choices"][0]["message"]["content"]
        except Exception:
            pass
        parsed = self._extract_json(content)
        if not parsed:
            # try direct parse of content as already json string
            try:
                parsed = json.loads(content)
            except Exception:
                pass
        if not parsed:
            raise RuntimeError("Kimi returned non-JSON or empty JSON.")
        return parsed

    def _gemini_complete_json(self, system_prompt: str, user_payload: Dict[str, Any], model: Optional[str] = None) -> Dict[str, Any]:
        api_key = os.getenv("GEMINI_API_KEY")
        gemini_model = model or self.model or os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY missing for Gemini provider.")

        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        prompt = (
            f"{system_prompt}\n\n"
            f"Return STRICT JSON only. No markdown.\n\n"
            f"INPUT:\n{json.dumps(user_payload, ensure_ascii=False)}"
        )
        resp = client.models.generate_content(
            model=gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,
                top_p=0.9,
                max_output_tokens=self.max_output_tokens,
            ),
        )
        text = getattr(resp, "text", None) or ""
        parsed = self._extract_json(text)
        if not parsed:
            raise RuntimeError("Gemini returned non-JSON or empty JSON.")
        return parsed

    def _openai_complete_json(self, system_prompt: str, user_payload: Dict[str, Any], model: Optional[str] = None) -> Dict[str, Any]:
        api_key = (os.getenv("OPENAI_API_KEY") or "").strip().strip('"').strip("'")
        openai_model = model or self.model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY missing for OpenAI provider.")

        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        user_txt = "Return STRICT JSON only. No markdown.\n\nINPUT:\n" + json.dumps(user_payload, ensure_ascii=False)
        body = {
            "model": openai_model,
            "temperature": 0.1,
            "max_tokens": self.max_output_tokens,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_txt},
            ],
            "response_format": {"type": "json_object"},
        }
        resp = requests.post(url, headers=headers, json=body, timeout=self.timeout_sec)
        if resp.status_code >= 400:
            raise RuntimeError(f"OpenAI HTTP {resp.status_code}: {resp.text[:500]}")
        data = resp.json()
        content = ""
        try:
            content = data["choices"][0]["message"]["content"]
        except Exception:
            pass
        parsed = self._extract_json(content)
        if not parsed:
            try:
                parsed = json.loads(content)
            except Exception:
                pass
        if not parsed:
            raise RuntimeError("OpenAI returned non-JSON or empty JSON.")
        return parsed

    def refine_json(
        self,
        system_prompt: str,
        user_payload: Dict[str, Any],
        provider: Optional[str] = None,
        model: Optional[str] = None,
        fallback_to_gemini: bool = True,
    ) -> Tuple[Dict[str, Any], str, str]:
        """
        Returns: (json, provider_used, model_used)
        Supports: openai, kimi, gemini.  Default order: openai → gemini → kimi.
        """
        p = (provider or self.provider or "auto").lower().strip()

        if p == "auto":
            order = ["openai", "gemini", "kimi"]
        elif p == "openai":
            order = ["openai", "gemini"] if fallback_to_gemini else ["openai"]
        elif p == "kimi":
            order = ["kimi", "gemini"] if fallback_to_gemini else ["kimi"]
        elif p == "gemini":
            order = ["gemini", "openai"] if fallback_to_gemini else ["gemini"]
        else:
            raise ValueError(f"Unsupported provider: {p}")

        last_err = None
        for pr in order:
            try:
                if pr == "openai":
                    out = self._openai_complete_json(system_prompt, user_payload, model=model)
                    return out, "openai", model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
                elif pr == "kimi":
                    out = self._kimi_complete_json(system_prompt, user_payload, model=model)
                    return out, "kimi", model or os.getenv("KIMI_MODEL", "kimi-k2")
                elif pr == "gemini":
                    out = self._gemini_complete_json(system_prompt, user_payload, model=model)
                    return out, "gemini", model or os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
            except Exception as e:
                last_err = e
                print(f"  [LLMRouter] {pr} failed: {e}", flush=True)
                continue
        raise RuntimeError(f"All providers failed. Last error: {last_err}")


def maybe_llm_router(enabled: bool, provider: str, model: str) -> Optional[LLMRouter]:
    if not enabled:
        log_warn("LLM refinement disabled; running heuristic-only.")
        return None
    try:
        router = LLMRouter(provider=provider, model=model)
        log_info(f"LLM enabled | provider={provider} | model={model or 'env_default'}")
        return router
    except Exception as e:
        log_warn(f"Could not initialize LLM router: {e}")
        return None


# ----------------------------
# Normalization Builders
# ----------------------------

def readiness_map(readiness: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    out = {}
    answers = []
    if isinstance(readiness, dict):
        if isinstance(readiness.get("rubric_answers"), list):
            answers = readiness["rubric_answers"]
        elif isinstance(readiness.get("answers"), list):
            answers = readiness["answers"]
    for a in answers:
        if not isinstance(a, dict):
            continue
        k = a.get("key") or a.get("subcategory_name") or a.get("question_key")
        if k:
            out[str(k)] = a
    return out

def from_sources_first(sources: List[Dict[str, Any]], aliases: List[str]) -> Any:
    for src in sources:
        v = recursive_find_first(src, aliases)
        if v is not None:
            return v
    return None

def infer_startup_heuristic(apollo: Dict[str, Any], startup_kv: Dict[str, Any], readiness: Dict[str, Any]) -> Dict[str, Any]:
    sources = [startup_kv, readiness, apollo]
    rmap = readiness_map(readiness)

    stage_raw = first_non_null(
        from_sources_first(sources, ["current_stage", "stage", "startup_stage", "funding_stage", "company_stage"]),
        rmap.get("company.current_stage", {}).get("answer"),
        rmap.get("funds.current_round", {}).get("answer"),
    )
    round_raw = first_non_null(
        from_sources_first(sources, ["round", "current_round", "raise_round", "funding_round"]),
        rmap.get("funds.current_round", {}).get("answer"),
    )

    hq_country = first_non_null(
        from_sources_first(sources, ["hq_country", "country", "headquarters_country", "company_country"]),
        rmap.get("company.hq_country", {}).get("answer"),
    )
    hq_state = from_sources_first(sources, ["hq_state", "state", "headquarters_state"])
    hq_city = from_sources_first(sources, ["hq_city", "city", "headquarters_city"])

    target_geos = []
    target_geos.extend(to_list(from_sources_first(sources, ["target_geography", "target_geographies", "target_market_geography"])))
    target_geos.extend(to_list(rmap.get("market.target_geography", {}).get("extracted_value")))
    operating_geos = []
    operating_geos.extend(to_list(from_sources_first(sources, ["operating_geographies", "operating_countries", "current_geographies"])))
    operating_geos.extend(to_list(hq_country))

    sectors = []
    sectors.extend(to_list(from_sources_first(sources, ["industry", "industries", "sector", "sectors", "market_industry"])))
    sectors.extend(to_list(from_sources_first(sources, ["investor_sectors_fit", "primary_sector"])))
    subsectors = []
    subsectors.extend(to_list(from_sources_first(sources, ["sub_industry", "subsector", "subsectors", "category"])))

    bm_primary = first_non_null(
        from_sources_first(sources, ["business_model", "business_model_primary", "go_to_market_model"]),
        rmap.get("biz.business_model", {}).get("answer"),
    )
    is_b2b = to_bool(first_non_null(from_sources_first(sources, ["is_b2b", "b2b"]), rmap.get("biz.is_b2b", {}).get("answer")))
    is_b2c = to_bool(first_non_null(from_sources_first(sources, ["is_b2c", "b2c"]), rmap.get("biz.is_b2c", {}).get("answer")))

    target_raise_usd = to_float(first_non_null(
        from_sources_first(sources, ["target_raise_usd", "raise_amount_usd", "fundraising_target_usd", "round_size_usd"]),
        rmap.get("funds.target_raise_usd", {}).get("extracted_value"),
    ))
    min_ticket_usd = to_float(first_non_null(
        from_sources_first(sources, ["min_ticket_usd", "minimum_ticket_usd", "min_check_accepted_usd"]),
        rmap.get("funds.min_ticket_usd", {}).get("extracted_value"),
    ))
    max_ticket_usd = to_float(first_non_null(
        from_sources_first(sources, ["max_ticket_usd", "maximum_ticket_usd", "max_check_accepted_usd"]),
        rmap.get("funds.max_ticket_usd", {}).get("extracted_value"),
    ))
    instrument = normalize_instrument(first_non_null(
        from_sources_first(sources, ["instrument", "funding_instrument", "security_type"]),
        rmap.get("funds.instrument", {}).get("answer"),
    ))

    needs_lead = to_bool(first_non_null(from_sources_first(sources, ["needs_lead", "requires_lead", "need_lead_investor"]), rmap.get("deal.needs_lead", {}).get("answer")))
    only_followers = to_bool(first_non_null(from_sources_first(sources, ["only_followers", "followers_only"]), rmap.get("deal.only_followers", {}).get("answer")))
    timeline_to_close_days = to_int(first_non_null(from_sources_first(sources, ["timeline_to_close_days", "close_timeline_days", "fundraise_timeline_days"]), rmap.get("deal.timeline_to_close_days", {}).get("extracted_value")))

    traction_primary = first_non_null(from_sources_first(sources, ["traction_primary_signal", "primary_traction_signal", "traction_type"]), rmap.get("traction.primary_signal", {}).get("answer"))
    arr_usd = to_float(first_non_null(from_sources_first(sources, ["arr_usd", "annual_recurring_revenue_usd"]), rmap.get("biz.arr_usd", {}).get("extracted_value")))
    revenue_ttm_usd = to_float(first_non_null(from_sources_first(sources, ["revenue_ttm_usd", "ttm_revenue_usd", "revenue_usd"]), rmap.get("biz.revenue_ttm_usd", {}).get("extracted_value")))
    paying_customers_count = to_int(first_non_null(from_sources_first(sources, ["paying_customers", "paying_customers_count", "customers_count"]), rmap.get("traction.paying_customers_count", {}).get("extracted_value")))
    mom_growth_pct = to_float(first_non_null(from_sources_first(sources, ["mom_growth_pct_3m_avg", "mom_growth_pct", "growth_mom_pct"]), rmap.get("traction.mom_growth_pct_3m_avg", {}).get("extracted_value")))
    yoy_growth_pct = to_float(first_non_null(from_sources_first(sources, ["yoy_growth_pct", "growth_yoy_pct"]), rmap.get("traction.yoy_growth_pct", {}).get("extracted_value")))
    evidence_links = recursive_find_all(sources, ["evidence_url", "evidence_urls", "source_url", "source_urls"])
    evidence_links_count = sum(len(to_list(v)) for v in evidence_links)

    quantified_count = to_int(first_non_null(from_sources_first(sources, ["milestones_quantified_count", "quantified_milestones_count"]), rmap.get("milestones.quantified_count", {}).get("extracted_value")))
    stage_linked = to_bool(first_non_null(from_sources_first(sources, ["milestones_stage_linked", "stage_linked_milestones"]), rmap.get("milestones.stage_linked", {}).get("answer")))

    core_roles_covered_pct = parse_percent(first_non_null(from_sources_first(sources, ["core_roles_covered_pct", "team_core_roles_coverage"]), rmap.get("team.core_roles_covered_pct", {}).get("extracted_value")))
    domain_years_avg = to_float(first_non_null(from_sources_first(sources, ["domain_years_avg", "founder_domain_years_avg"]), rmap.get("team.domain_years_avg", {}).get("extracted_value")))
    prior_exit_count = to_int(first_non_null(from_sources_first(sources, ["prior_exit_count", "founder_prior_exit_count", "team_prior_exit_count"]), rmap.get("team.prior_exit_count", {}).get("extracted_value")))

    responsiveness_days = to_int(first_non_null(from_sources_first(sources, ["responsiveness_days", "response_time_days"]), rmap.get("signals.responsiveness_days", {}).get("extracted_value")))
    reference_count = to_int(first_non_null(from_sources_first(sources, ["reference_count", "references_count"]), rmap.get("signals.reference_count", {}).get("extracted_value")))
    negative_reference_flag = to_bool(first_non_null(from_sources_first(sources, ["negative_reference_flag", "negative_references"]), rmap.get("signals.negative_reference_flag", {}).get("answer")))

    regulatory_domain = first_non_null(from_sources_first(sources, ["regulatory_domain", "compliance_domain"]), rmap.get("risk.regulatory_domain", {}).get("answer"))
    reg_risk_raw = first_non_null(from_sources_first(sources, ["regulatory_risk_level", "risk_level", "regulatory_risk"]), rmap.get("risk.regulatory_risk_level", {}).get("answer"))
    mitigation_plan_present = to_bool(first_non_null(from_sources_first(sources, ["mitigation_plan_present", "risk_mitigation_plan_present"]), rmap.get("risk.mitigation_plan_present", {}).get("answer")))
    moat_score = parse_percent(first_non_null(from_sources_first(sources, ["moat_score", "defensibility_score"]), rmap.get("moat.score", {}).get("extracted_value")))
    moat_types = to_list(first_non_null(from_sources_first(sources, ["moat_types", "defensibility_types"]), rmap.get("moat.types", {}).get("extracted_value")))
    time_to_liquidity_years = to_float(first_non_null(from_sources_first(sources, ["time_to_liquidity_years", "time_to_exit_years", "liquidity_timeline_years"]), rmap.get("risk.time_to_liquidity_years", {}).get("extracted_value")))
    cap_intensity_raw = first_non_null(from_sources_first(sources, ["capital_intensity_level", "capital_intensity"]), rmap.get("risk.capital_intensity_level", {}).get("answer"))

    pitch_deck_link = first_non_null(from_sources_first(sources, ["pitch_deck_link", "pitchdeck_link", "deck_url"]), rmap.get("company.pitch_deck_link", {}).get("extracted_value"))
    data_room_link = first_non_null(from_sources_first(sources, ["data_room_link", "dataroom_link", "data_room_url"]), rmap.get("company.data_room_link", {}).get("extracted_value"))
    cap_table_link = first_non_null(from_sources_first(sources, ["cap_table_link"]), rmap.get("funds.cap_table_link", {}).get("extracted_value"))
    fin_model_link = first_non_null(from_sources_first(sources, ["financial_model_link", "finance_model_link"]), rmap.get("fin.financial_model_link", {}).get("extracted_value"))
    customer_metrics_uploaded = to_bool(first_non_null(from_sources_first(sources, ["customer_metrics_uploaded", "metrics_uploaded"]), rmap.get("biz.customer_metrics_uploaded", {}).get("answer")))

    if customer_metrics_uploaded is None:
        customer_metrics_uploaded = any(x is not None for x in [arr_usd, revenue_ttm_usd, paying_customers_count, mom_growth_pct, yoy_growth_pct])
    if min_ticket_usd is None and target_raise_usd is not None:
        min_ticket_usd = round(0.05 * target_raise_usd, 2)
    if max_ticket_usd is None and target_raise_usd is not None:
        max_ticket_usd = round(0.30 * target_raise_usd, 2)
    if timeline_to_close_days is None:
        timeline_to_close_days = 90
    if quantified_count is None:
        quantified_count = 0 if not any([arr_usd, revenue_ttm_usd, paying_customers_count]) else 1
    if stage_linked is None:
        stage_linked = False

    bm_primary_norm, is_b2b_norm, is_b2c_norm = normalize_business_model(bm_primary, is_b2b, is_b2c)

    reg_level = int(reg_risk_raw) if isinstance(reg_risk_raw, (int, float)) else REG_RISK_MAP.get(norm_text(reg_risk_raw))
    cap_intensity = int(cap_intensity_raw) if isinstance(cap_intensity_raw, (int, float)) else CAPITAL_INTENSITY_MAP.get(norm_text(cap_intensity_raw))

    return {
        "startup": {
            "stage_normalized": normalize_stage(stage_raw),
            "round_normalized": normalize_round(round_raw),
            "hq_country": clean_text(hq_country) or None,
            "hq_state": clean_text(hq_state) or None,
            "hq_city": clean_text(hq_city) or None,
            "target_geographies": normalize_geos(target_geos),
            "operating_geographies": normalize_geos(operating_geos),
            "sectors_normalized": normalize_sectors(sectors),
            "subsectors_normalized": normalize_sectors(subsectors),
            "business_model": {"primary": bm_primary_norm, "is_b2b": is_b2b_norm, "is_b2c": is_b2c_norm},
            "raise": {
                "target_raise_usd": target_raise_usd,
                "min_ticket_usd": min_ticket_usd,
                "max_ticket_usd": max_ticket_usd,
                "instrument_normalized": instrument,
            },
            "deal_preferences": {
                "needs_lead": needs_lead,
                "only_followers": only_followers,
                "timeline_to_close_days": timeline_to_close_days,
            },
            "traction": {
                "primary_signal": norm_text(traction_primary) if traction_primary else None,
                "arr_usd": arr_usd,
                "revenue_ttm_usd": revenue_ttm_usd,
                "paying_customers_count": paying_customers_count,
                "mom_growth_pct_3m_avg": mom_growth_pct,
                "yoy_growth_pct": yoy_growth_pct,
                "evidence_links_count": evidence_links_count,
            },
            "milestones": {"quantified_count": quantified_count, "stage_linked": stage_linked},
            "team": {"core_roles_covered_pct": core_roles_covered_pct, "domain_years_avg": domain_years_avg, "prior_exit_count": prior_exit_count},
            "signals": {"responsiveness_days": responsiveness_days, "reference_count": reference_count, "negative_reference_flag": negative_reference_flag},
            "risk": {
                "regulatory_domain": norm_text(regulatory_domain) if regulatory_domain else None,
                "regulatory_risk_level": reg_level,
                "mitigation_plan_present": mitigation_plan_present,
                "time_to_liquidity_years": time_to_liquidity_years,
                "capital_intensity_level": cap_intensity,
            },
            "moat": {"score": moat_score, "types": unique_norm_list(moat_types)},
            "artifacts": {
                "pitch_deck_uploaded": bool(clean_text(pitch_deck_link)),
                "pitch_deck_completeness_score": 0.8 if clean_text(pitch_deck_link) else None,
                "data_room_url": clean_text(data_room_link) or None,
                "cap_table_uploaded": bool(clean_text(cap_table_link)),
                "financial_model_uploaded": bool(clean_text(fin_model_link)),
                "customer_metrics_uploaded": customer_metrics_uploaded,
            },
        },
        "metadata": {
            "generated_at_utc": now_utc_iso(),
            "generator": "heuristic_startup_builder_v2",
            "source_files": {"apollo": "apollo.json", "startup_kv": "startup_kv.json", "readiness": "readiness_que.json"},
        },
    }

def deep_merge_dict(base: Dict[str, Any], updates: Dict[str, Any]) -> Dict[str, Any]:
    out = copy.deepcopy(base)
    for k, v in updates.items():
        if k in out and isinstance(out[k], dict) and isinstance(v, dict):
            out[k] = deep_merge_dict(out[k], v)
        else:
            out[k] = v
    return out

def fill_startup_defaults(obj: Dict[str, Any]) -> Dict[str, Any]:
    x = copy.deepcopy(obj)
    s = x.setdefault("startup", {})

    s.setdefault("target_geographies", [])
    s.setdefault("operating_geographies", [])
    s.setdefault("sectors_normalized", [])
    s.setdefault("subsectors_normalized", [])

    s.setdefault("business_model", {})
    s["business_model"].setdefault("primary", None)
    s["business_model"].setdefault("is_b2b", None)
    s["business_model"].setdefault("is_b2c", None)

    s.setdefault("raise", {})
    for k in ["target_raise_usd", "min_ticket_usd", "max_ticket_usd", "instrument_normalized"]:
        s["raise"].setdefault(k, None)

    s.setdefault("deal_preferences", {})
    for k in ["needs_lead", "only_followers", "timeline_to_close_days"]:
        s["deal_preferences"].setdefault(k, None)

    s.setdefault("traction", {})
    for k in ["primary_signal", "arr_usd", "revenue_ttm_usd", "paying_customers_count", "mom_growth_pct_3m_avg", "yoy_growth_pct"]:
        s["traction"].setdefault(k, None)
    s["traction"].setdefault("evidence_links_count", 0)

    s.setdefault("milestones", {})
    s["milestones"].setdefault("quantified_count", None)
    s["milestones"].setdefault("stage_linked", None)

    s.setdefault("team", {})
    s["team"].setdefault("core_roles_covered_pct", None)
    s["team"].setdefault("domain_years_avg", None)
    s["team"].setdefault("prior_exit_count", None)

    s.setdefault("signals", {})
    s["signals"].setdefault("responsiveness_days", None)
    s["signals"].setdefault("reference_count", None)
    s["signals"].setdefault("negative_reference_flag", None)

    s.setdefault("risk", {})
    for k in ["regulatory_domain", "regulatory_risk_level", "mitigation_plan_present", "time_to_liquidity_years", "capital_intensity_level"]:
        s["risk"].setdefault(k, None)

    s.setdefault("moat", {})
    s["moat"].setdefault("score", None)
    s["moat"].setdefault("types", [])

    s.setdefault("artifacts", {})
    for k in ["pitch_deck_uploaded", "pitch_deck_completeness_score", "data_room_url", "cap_table_uploaded", "financial_model_uploaded", "customer_metrics_uploaded"]:
        s["artifacts"].setdefault(k, None)

    rr = s["risk"].get("regulatory_risk_level")
    if isinstance(rr, str):
        s["risk"]["regulatory_risk_level"] = REG_RISK_MAP.get(norm_text(rr))

    ci = s["risk"].get("capital_intensity_level")
    if isinstance(ci, str):
        s["risk"]["capital_intensity_level"] = CAPITAL_INTENSITY_MAP.get(norm_text(ci))

    if s.get("stage_normalized"):
        s["stage_normalized"] = normalize_stage(s["stage_normalized"]) or s["stage_normalized"]
    if s.get("round_normalized"):
        s["round_normalized"] = normalize_round(s["round_normalized"]) or s["round_normalized"]
    if s["raise"].get("instrument_normalized"):
        s["raise"]["instrument_normalized"] = normalize_instrument(s["raise"]["instrument_normalized"]) or s["raise"]["instrument_normalized"]

    s["team"]["core_roles_covered_pct"] = parse_percent(s["team"]["core_roles_covered_pct"])
    s["moat"]["score"] = parse_percent(s["moat"]["score"])

    return x

def infer_investor_heuristic(d: Dict[str, Any]) -> Dict[str, Any]:
    stages = unique_norm_list(to_list(d.get("investor_stages")) + to_list(d.get("investor_stage_keywords")))
    sectors = unique_norm_list(to_list(d.get("investor_sectors")) + to_list(d.get("investor_sector_keywords")))
    geos = unique_norm_list(
        to_list(d.get("investor_geography_focus"))
        + to_list(d.get("investor_geo_keywords"))
        + to_list(d.get("investor_hq_country"))
        + to_list(d.get("investor_hq_state"))
        + to_list(d.get("investor_hq_city"))
    )

    stage_focus = [normalize_stage(x) or norm_text(x).replace(" ", "_") for x in stages if clean_text(x)]
    stage_focus = unique_norm_list(stage_focus)
    sector_focus = normalize_sectors(sectors)
    geo_focus = normalize_geos(geos)

    lead_or_follow = norm_text(d.get("investor_lead_or_follow")) or None
    if lead_or_follow not in {"lead", "follow", "both"}:
        lead_or_follow = "both"

    investor_type = norm_text(d.get("investor_type"))
    requires_pitch_deck = True
    requires_data_room = investor_type in {"vc", "pe", "growth"}
    geo_hard_constraint = False

    bmi = []
    if to_bool(d.get("investor_prefers_b2b")) is True:
        bmi.append("b2b")
    if to_bool(d.get("investor_prefers_b2c")) is True:
        bmi.append("b2c")
    if not bmi:
        bmi = ["b2b", "b2c"]

    sf_text = " ".join([norm_text(x) for x in sector_focus + to_list(d.get("investor_thesis_summary"))])
    reg_tol = 3 if any(k in sf_text for k in ["health", "biotech", "medtech", "fintech", "insurtech"]) else 2
    defensibility_min = 0.6 if investor_type in {"vc", "growth", "cvc"} else 0.5
    if investor_type in {"vc", "growth", "cvc"}:
        horizon_min, horizon_max, cap_tol = 3, 12, 2
    else:
        horizon_min, horizon_max, cap_tol = 2, 10, 2

    out = {
        "investor": {
            "name": d.get("investor_name"),
            "active_status": norm_text(d.get("investor_active_status")) or "active",
            "stage_focus_normalized": stage_focus,
            "stage_exclude_normalized": [],
            "sector_focus_normalized": sector_focus,
            "sector_exclude_normalized": [],
            "business_models_include": bmi,
            "business_models_exclude": [],
            "prefers_b2b": to_bool(d.get("investor_prefers_b2b")),
            "prefers_b2c": to_bool(d.get("investor_prefers_b2c")),
            "geo_focus_normalized": geo_focus,
            "geo_exclude_normalized": [],
            "geo_hard_constraint": geo_hard_constraint,
            "remote_ok": True,
            "check_min_usd": to_float(d.get("investor_minimum_check_usd")),
            "check_typical_usd": to_float(d.get("investor_typical_check_usd")),
            "check_max_usd": to_float(d.get("investor_maximum_check_usd")),
            "lead_or_follow": lead_or_follow,
            "lead_follow_strict": False,
            "instrument_include_normalized": ["equity", "safe", "convertible_note"],
            "instrument_exclude_normalized": [],
            "regulatory_exclude": [],
            "regulatory_tolerance_level": reg_tol,
            "defensibility_preference_min_score": defensibility_min,
            "time_horizon_min_years": horizon_min,
            "time_horizon_max_years": horizon_max,
            "capital_intensity_tolerance_level": cap_tol,
            "requires_pitch_deck": requires_pitch_deck,
            "requires_data_room": requires_data_room,
            "decision_speed_days": to_int(d.get("investor_decision_speed_days")),
            "source_urls": unique_norm_list(to_list(d.get("investor_source_urls")) + to_list(d.get("investor_grounding_urls"))),
        },
        "metadata": {"generated_at_utc": now_utc_iso(), "generator": "heuristic_investor_builder_v2", "source_file": "investor_data.json"},
    }

    chk_min, chk_typ, chk_max = out["investor"]["check_min_usd"], out["investor"]["check_typical_usd"], out["investor"]["check_max_usd"]
    if chk_min is None and chk_typ is not None:
        out["investor"]["check_min_usd"] = round(0.5 * chk_typ, 2)
    if chk_max is None and chk_typ is not None:
        out["investor"]["check_max_usd"] = round(2.0 * chk_typ, 2)
    if out["investor"]["check_typical_usd"] is None and out["investor"]["check_min_usd"] is not None and out["investor"]["check_max_usd"] is not None:
        out["investor"]["check_typical_usd"] = round((out["investor"]["check_min_usd"] + out["investor"]["check_max_usd"]) / 2.0, 2)

    return out

def fill_investor_defaults(obj: Dict[str, Any]) -> Dict[str, Any]:
    x = copy.deepcopy(obj)
    i = x.setdefault("investor", {})
    i.setdefault("active_status", "active")

    for k in [
        "stage_focus_normalized", "stage_exclude_normalized", "sector_focus_normalized", "sector_exclude_normalized",
        "business_models_include", "business_models_exclude", "geo_focus_normalized", "geo_exclude_normalized",
        "instrument_include_normalized", "instrument_exclude_normalized", "regulatory_exclude", "source_urls"
    ]:
        i.setdefault(k, [])

    for k in ["geo_hard_constraint", "remote_ok", "lead_follow_strict", "requires_pitch_deck", "requires_data_room", "prefers_b2b", "prefers_b2c"]:
        i.setdefault(k, None)

    for k in [
        "check_min_usd", "check_typical_usd", "check_max_usd", "decision_speed_days",
        "regulatory_tolerance_level", "capital_intensity_tolerance_level",
        "time_horizon_min_years", "time_horizon_max_years", "defensibility_preference_min_score"
    ]:
        i.setdefault(k, None)

    i.setdefault("lead_or_follow", "both")

    i["stage_focus_normalized"] = unique_norm_list([normalize_stage(x) or norm_text(x).replace(" ", "_") for x in to_list(i["stage_focus_normalized"]) if clean_text(x)])
    i["stage_exclude_normalized"] = unique_norm_list([normalize_stage(x) or norm_text(x).replace(" ", "_") for x in to_list(i["stage_exclude_normalized"]) if clean_text(x)])
    i["sector_focus_normalized"] = normalize_sectors(to_list(i["sector_focus_normalized"]))
    i["sector_exclude_normalized"] = normalize_sectors(to_list(i["sector_exclude_normalized"]))
    i["business_models_include"] = unique_norm_list([norm_text(x).replace(" ", "_") for x in to_list(i["business_models_include"]) if clean_text(x)])
    i["business_models_exclude"] = unique_norm_list([norm_text(x).replace(" ", "_") for x in to_list(i["business_models_exclude"]) if clean_text(x)])
    i["geo_focus_normalized"] = normalize_geos(to_list(i["geo_focus_normalized"]))
    i["geo_exclude_normalized"] = normalize_geos(to_list(i["geo_exclude_normalized"]))
    i["instrument_include_normalized"] = unique_norm_list([normalize_instrument(x) or norm_text(x).replace(" ", "_") for x in to_list(i["instrument_include_normalized"]) if clean_text(x)])
    i["instrument_exclude_normalized"] = unique_norm_list([normalize_instrument(x) or norm_text(x).replace(" ", "_") for x in to_list(i["instrument_exclude_normalized"]) if clean_text(x)])
    i["regulatory_exclude"] = unique_norm_list(to_list(i["regulatory_exclude"]))

    for k in ["check_min_usd", "check_typical_usd", "check_max_usd", "defensibility_preference_min_score"]:
        i[k] = to_float(i.get(k))

    for k in ["decision_speed_days", "regulatory_tolerance_level", "capital_intensity_tolerance_level", "time_horizon_min_years", "time_horizon_max_years"]:
        i[k] = to_int(i.get(k))

    if i["defensibility_preference_min_score"] is not None:
        i["defensibility_preference_min_score"] = min(max(i["defensibility_preference_min_score"], 0.0), 1.0)
    if i["lead_or_follow"] not in {"lead", "follow", "both"}:
        i["lead_or_follow"] = "both"

    return x


def critical_missing_ratio_startup(obj: Dict[str, Any]) -> float:
    s = obj.get("startup", {})
    critical_paths = [
        ("stage_normalized",), ("round_normalized",), ("hq_country",),
        ("sectors_normalized",), ("raise", "target_raise_usd"), ("raise", "instrument_normalized"),
        ("traction", "primary_signal"), ("risk", "regulatory_risk_level"),
        ("team", "domain_years_avg"),
    ]
    miss = 0
    for p in critical_paths:
        cur = s
        ok = True
        for k in p:
            if isinstance(cur, dict) and k in cur:
                cur = cur[k]
            else:
                ok = False
                break
        if not ok or is_missing(cur):
            miss += 1
    return miss / max(len(critical_paths), 1)

def critical_missing_ratio_investor(obj: Dict[str, Any]) -> float:
    i = obj.get("investor", {})
    critical_paths = [
        ("active_status",), ("stage_focus_normalized",), ("sector_focus_normalized",), ("geo_focus_normalized",),
        ("check_typical_usd",), ("lead_or_follow",), ("instrument_include_normalized",), ("regulatory_tolerance_level",),
    ]
    miss = 0
    for p in critical_paths:
        cur = i
        ok = True
        for k in p:
            if isinstance(cur, dict) and k in cur:
                cur = cur[k]
            else:
                ok = False
                break
        if not ok or is_missing(cur):
            miss += 1
    return miss / max(len(critical_paths), 1)

def refine_startup_with_llm(
    heuristic_obj: Dict[str, Any],
    apollo: Dict[str, Any],
    startup_kv: Dict[str, Any],
    readiness: Dict[str, Any],
    router: LLMRouter,
    provider: str = "auto",
    model: Optional[str] = None,
    second_pass_gemini: bool = True,
    missing_threshold: float = 0.45,
) -> Dict[str, Any]:
    system = """
You are normalizing startup data for deterministic startup-investor thesis matching.
Return ONLY JSON:
{"startup": {...same keys as heuristic draft startup...}}
Do not invent facts. Unknown -> null.
Normalize:
- stage_normalized and round_normalized to [pre_seed, seed, series_a, series_b, series_c_plus]
- instrument_normalized to [equity, safe, convertible_note, debt]
- regulatory_risk_level integer 1..4
- capital_intensity_level integer 1..3
- moat.score and core_roles_covered_pct in 0..1
"""
    payload = {"heuristic_draft": heuristic_obj, "apollo": apollo, "startup_kv": startup_kv, "readiness_que": readiness}
    refined, used_provider, used_model = router.refine_json(system, payload, provider=provider, model=model, fallback_to_gemini=True)

    out = copy.deepcopy(heuristic_obj)
    rs = refined.get("startup") if isinstance(refined, dict) and "startup" in refined else refined
    if isinstance(rs, dict):
        out["startup"] = deep_merge_dict(out.get("startup", {}), rs)
    out = fill_startup_defaults(out)

    second_pass_used = False
    if second_pass_gemini and used_provider != "gemini":
        ratio = critical_missing_ratio_startup(out)
        if ratio >= missing_threshold:
            try:
                refined2, _, model2 = router.refine_json(system, payload, provider="gemini", model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite"), fallback_to_gemini=False)
                rs2 = refined2.get("startup") if isinstance(refined2, dict) and "startup" in refined2 else refined2
                if isinstance(rs2, dict):
                    out["startup"] = deep_merge_dict(out.get("startup", {}), rs2)
                    out = fill_startup_defaults(out)
                    second_pass_used = True
                    used_provider = "gemini"
                    used_model = model2
            except Exception as e:
                out.setdefault("metadata", {})
                out["metadata"]["second_pass_error"] = str(e)

    out.setdefault("metadata", {})
    out["metadata"]["llm_refined"] = True
    out["metadata"]["llm_provider"] = used_provider
    out["metadata"]["llm_model"] = used_model
    out["metadata"]["second_pass_used"] = second_pass_used
    return out

def refine_investor_with_llm(
    heuristic_obj: Dict[str, Any],
    investor_data: Dict[str, Any],
    router: LLMRouter,
    provider: str = "auto",
    model: Optional[str] = None,
    second_pass_gemini: bool = True,
    missing_threshold: float = 0.40,
) -> Dict[str, Any]:
    system = """
You are normalizing investor data for deterministic startup-investor thesis matching.
Return only JSON:
{"investor": {...same keys as heuristic draft investor...}}
Do not invent facts. Unknown -> null or [].
Normalize stage to [pre_seed, seed, series_a, series_b, series_c_plus].
Normalize instruments to [equity, safe, convertible_note, debt].
regulatory_tolerance_level: 1..4; capital_intensity_tolerance_level: 1..3; defensibility_preference_min_score: 0..1.
"""
    refined, used_provider, used_model = router.refine_json(
        system,
        {"heuristic_draft": heuristic_obj, "investor_data": investor_data},
        provider=provider,
        model=model,
        fallback_to_gemini=True,
    )

    out = copy.deepcopy(heuristic_obj)
    ri = refined.get("investor") if isinstance(refined, dict) and "investor" in refined else refined
    if isinstance(ri, dict):
        out["investor"] = deep_merge_dict(out.get("investor", {}), ri)
    out = fill_investor_defaults(out)

    second_pass_used = False
    if second_pass_gemini and used_provider != "gemini":
        ratio = critical_missing_ratio_investor(out)
        if ratio >= missing_threshold:
            try:
                refined2, _, model2 = router.refine_json(
                    system,
                    {"heuristic_draft": heuristic_obj, "investor_data": investor_data},
                    provider="gemini",
                    model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite"),
                    fallback_to_gemini=False,
                )
                ri2 = refined2.get("investor") if isinstance(refined2, dict) and "investor" in refined2 else refined2
                if isinstance(ri2, dict):
                    out["investor"] = deep_merge_dict(out.get("investor", {}), ri2)
                    out = fill_investor_defaults(out)
                    second_pass_used = True
                    used_provider = "gemini"
                    used_model = model2
            except Exception as e:
                out.setdefault("metadata", {})
                out["metadata"]["second_pass_error"] = str(e)

    out.setdefault("metadata", {})
    out["metadata"]["llm_refined"] = True
    out["metadata"]["llm_provider"] = used_provider
    out["metadata"]["llm_model"] = used_model
    out["metadata"]["second_pass_used"] = second_pass_used
    return out


# ----------------------------
# Scoring Engine
# ----------------------------

@dataclasses.dataclass
class RuleResult:
    key: str
    points: float
    max_points: float
    matched_condition: str
    reason: str

def rr(key, pts, mx, cond, reason):
    return RuleResult(key, float(pts), float(mx), cond, reason)

def to_geo_union(s: Dict[str, Any]) -> List[str]:
    vals = []
    vals.extend(to_list(s.get("target_geographies")))
    vals.extend(to_list(s.get("operating_geographies")))
    vals.extend(to_list(s.get("hq_country")))
    return unique_norm_list(vals)

def check_hard_gates(startup: Dict[str, Any], investor: Dict[str, Any]):
    fails = []
    if norm_text(investor.get("active_status")) != "active":
        fails.append("Investor is not active.")
    if investor.get("check_max_usd") is not None and startup.get("raise", {}).get("min_ticket_usd") is not None:
        if float(investor["check_max_usd"]) < float(startup["raise"]["min_ticket_usd"]):
            fails.append("Investor max check is below startup minimum acceptable check.")
    if overlap(to_geo_union(startup), investor.get("geo_exclude_normalized")):
        fails.append("Startup falls in investor explicit geography exclusion.")
    if overlap(startup.get("sectors_normalized"), investor.get("sector_exclude_normalized")):
        fails.append("Startup sector explicitly excluded by investor.")
    bm_primary = norm_text(startup.get("business_model", {}).get("primary"))
    if bm_primary and bm_primary in list_norm_set(investor.get("business_models_exclude")):
        fails.append("Startup business model explicitly excluded by investor.")
    instr = norm_text(startup.get("raise", {}).get("instrument_normalized"))
    if instr and instr in list_norm_set(investor.get("instrument_exclude_normalized")):
        fails.append("Startup instrument explicitly excluded by investor.")
    reg_domain = norm_text(startup.get("risk", {}).get("regulatory_domain"))
    if reg_domain and reg_domain in list_norm_set(investor.get("regulatory_exclude")):
        fails.append("Regulatory domain explicitly excluded by investor.")
    if investor.get("geo_hard_constraint") is True and not overlap(to_geo_union(startup), investor.get("geo_focus_normalized")):
        fails.append("Investor has hard geography constraint and startup is outside allowed geography.")
    return len(fails) == 0, fails


def score_deal_compatibility(startup, investor):
    out = {}
    s_stage = startup.get("stage_normalized")
    s_round = startup.get("round_normalized")
    i_focus = to_list(investor.get("stage_focus_normalized"))
    i_excl = to_list(investor.get("stage_exclude_normalized"))

    if s_stage and norm_text(s_stage) in list_norm_set(i_focus):
        out["A1_stage_alignment"] = rr("A1_stage_alignment", 30, 30, "startup.stage_normalized IN investor.stage_focus_normalized", "Stage directly in focus.")
    elif s_round and norm_text(s_round) in list_norm_set(i_focus):
        out["A1_stage_alignment"] = rr("A1_stage_alignment", 26, 30, "startup.round_normalized IN investor.stage_focus_normalized", "Round aligns with stage focus.")
    elif adjacent_stage(s_stage, i_focus):
        out["A1_stage_alignment"] = rr("A1_stage_alignment", 20, 30, "adjacent_stage(startup.stage_normalized, investor.stage_focus_normalized)", "Adjacent stage to focus.")
    elif s_stage and norm_text(s_stage) in list_norm_set(i_excl):
        out["A1_stage_alignment"] = rr("A1_stage_alignment", 0, 30, "startup.stage_normalized IN investor.stage_exclude_normalized", "Stage is explicitly excluded.")
    elif is_missing(s_stage) or len(i_focus) == 0:
        out["A1_stage_alignment"] = rr("A1_stage_alignment", 6, 30, "missing(startup.stage_normalized) OR empty(investor.stage_focus_normalized)", "Missing stage or empty investor stage focus.")
    else:
        out["A1_stage_alignment"] = rr("A1_stage_alignment", 10, 30, "default_non_focus_stage", "Stage not focused and not excluded.")

    sr = startup.get("raise", {})
    s_min = to_float(sr.get("min_ticket_usd"))
    s_max = to_float(sr.get("max_ticket_usd"))
    s_target = to_float(sr.get("target_raise_usd"))
    i_min = to_float(investor.get("check_min_usd"))
    i_typ = to_float(investor.get("check_typical_usd"))
    i_max = to_float(investor.get("check_max_usd"))

    if range_overlap(s_min, s_max, i_min, i_max):
        out["A2_check_size_compatibility"] = rr("A2_check_size_compatibility", 30, 30, "range_overlap([startup.raise.min_ticket_usd, startup.raise.max_ticket_usd], [investor.check_min_usd, investor.check_max_usd])", "Check ranges overlap.")
    elif i_typ is not None and s_min is not None and s_max is not None and s_min <= i_typ <= s_max:
        out["A2_check_size_compatibility"] = rr("A2_check_size_compatibility", 26, 30, "investor.check_typical_usd BETWEEN startup.raise.min_ticket_usd AND startup.raise.max_ticket_usd", "Typical check fits startup acceptable ticket.")
    elif i_typ is not None and s_target is not None and i_typ >= 0.01 * s_target:
        out["A2_check_size_compatibility"] = rr("A2_check_size_compatibility", 22, 30, "investor.check_typical_usd >= 0.01 * startup.raise.target_raise_usd", "Typical check is meaningful relative to round.")
    elif i_typ is not None and s_target is not None and i_typ >= 0.005 * s_target:
        out["A2_check_size_compatibility"] = rr("A2_check_size_compatibility", 16, 30, "investor.check_typical_usd >= 0.005 * startup.raise.target_raise_usd", "Typical check is small but usable.")
    elif i_max is not None and s_min is not None and i_max < s_min:
        out["A2_check_size_compatibility"] = rr("A2_check_size_compatibility", 0, 30, "investor.check_max_usd < startup.raise.min_ticket_usd", "Investor cannot meet minimum ticket.")
    elif is_missing(s_target) or is_missing(i_max):
        out["A2_check_size_compatibility"] = rr("A2_check_size_compatibility", 6, 30, "missing(startup.raise.target_raise_usd) OR missing(investor.check_max_usd)", "Missing raise target or investor max check.")
    else:
        out["A2_check_size_compatibility"] = rr("A2_check_size_compatibility", 8, 30, "default_low_coverage", "Low check coverage.")

    tg = to_list(startup.get("target_geographies"))
    og = to_list(startup.get("operating_geographies"))
    hq = startup.get("hq_country")
    gf = to_list(investor.get("geo_focus_normalized"))
    geo_union = to_geo_union(startup)

    if overlap(tg, gf):
        out["A3_geography_jurisdiction_fit"] = rr("A3_geography_jurisdiction_fit", 25, 25, "overlap(startup.target_geographies, investor.geo_focus_normalized)", "Target geography overlaps investor focus.")
    elif overlap(og, gf):
        out["A3_geography_jurisdiction_fit"] = rr("A3_geography_jurisdiction_fit", 21, 25, "overlap(startup.operating_geographies, investor.geo_focus_normalized)", "Operating geography overlaps investor focus.")
    elif hq and norm_text(hq) in list_norm_set(gf):
        out["A3_geography_jurisdiction_fit"] = rr("A3_geography_jurisdiction_fit", 18, 25, "startup.hq_country IN investor.geo_focus_normalized", "HQ country in investor geo focus.")
    elif investor.get("remote_ok") is True:
        out["A3_geography_jurisdiction_fit"] = rr("A3_geography_jurisdiction_fit", 16, 25, "investor.remote_ok == true", "Investor open to remote/cross-geo deals.")
    elif investor.get("geo_hard_constraint") is True and not overlap(geo_union, gf):
        out["A3_geography_jurisdiction_fit"] = rr("A3_geography_jurisdiction_fit", 0, 25, "investor.geo_hard_constraint == true AND NOT overlap(startup.target_geographies OR startup.operating_geographies OR startup.hq_country, investor.geo_focus_normalized)", "Hard geo constraint not met.")
    elif is_missing(hq) or len(gf) == 0:
        out["A3_geography_jurisdiction_fit"] = rr("A3_geography_jurisdiction_fit", 5, 25, "missing(startup.hq_country) OR empty(investor.geo_focus_normalized)", "Missing HQ country or no geo focus.")
    else:
        out["A3_geography_jurisdiction_fit"] = rr("A3_geography_jurisdiction_fit", 9, 25, "default_outside_preference", "Outside primary geo preference.")

    needs_lead = startup.get("deal_preferences", {}).get("needs_lead")
    only_followers = startup.get("deal_preferences", {}).get("only_followers")
    role = norm_text(investor.get("lead_or_follow"))

    if needs_lead is True and role in {"lead", "both"}:
        out["A4_deal_leadership_preference_fit"] = rr("A4_deal_leadership_preference_fit", 20, 20, "startup.deal_preferences.needs_lead == true AND investor.lead_or_follow IN ['lead','both']", "Lead need is satisfied.")
    elif only_followers is True and role in {"follow", "both"}:
        out["A4_deal_leadership_preference_fit"] = rr("A4_deal_leadership_preference_fit", 18, 20, "startup.deal_preferences.only_followers == true AND investor.lead_or_follow IN ['follow','both']", "Follower preference is satisfied.")
    elif role == "both":
        out["A4_deal_leadership_preference_fit"] = rr("A4_deal_leadership_preference_fit", 16, 20, "investor.lead_or_follow == 'both'", "Investor can lead or follow.")
    elif investor.get("lead_follow_strict") is True and strict_role_conflict(needs_lead, only_followers, role):
        out["A4_deal_leadership_preference_fit"] = rr("A4_deal_leadership_preference_fit", 0, 20, "investor.lead_follow_strict == true AND strict_role_conflict(startup.deal_preferences, investor.lead_or_follow)", "Strict lead/follow conflict.")
    elif needs_lead is None or is_missing(role):
        out["A4_deal_leadership_preference_fit"] = rr("A4_deal_leadership_preference_fit", 5, 20, "missing(startup.deal_preferences.needs_lead) OR missing(investor.lead_or_follow)", "Missing lead/follow inputs.")
    else:
        out["A4_deal_leadership_preference_fit"] = rr("A4_deal_leadership_preference_fit", 9, 20, "default_role_friction", "Some role friction.")

    instr = norm_text(startup.get("raise", {}).get("instrument_normalized"))
    i_inc = to_list(investor.get("instrument_include_normalized"))
    i_exc = to_list(investor.get("instrument_exclude_normalized"))

    if instr and instr in list_norm_set(i_inc):
        out["A5_investment_instrument_fit"] = rr("A5_investment_instrument_fit", 20, 20, "startup.raise.instrument_normalized IN investor.instrument_include_normalized", "Instrument in included list.")
    elif len(i_inc) == 0:
        out["A5_investment_instrument_fit"] = rr("A5_investment_instrument_fit", 14, 20, "empty(investor.instrument_include_normalized)", "No include constraints set.")
    elif instr and instr in list_norm_set(i_exc):
        out["A5_investment_instrument_fit"] = rr("A5_investment_instrument_fit", 0, 20, "startup.raise.instrument_normalized IN investor.instrument_exclude_normalized", "Instrument explicitly excluded.")
    elif is_missing(instr) or len(i_inc) == 0:
        out["A5_investment_instrument_fit"] = rr("A5_investment_instrument_fit", 5, 20, "missing(startup.raise.instrument_normalized) OR empty(investor.instrument_include_normalized)", "Missing instrument info.")
    else:
        out["A5_investment_instrument_fit"] = rr("A5_investment_instrument_fit", 8, 20, "default_unlisted_instrument", "Instrument not listed.")

    return out

def score_sector_business_model_fit(startup, investor):
    out = {}
    s_sec = startup.get("sectors_normalized", [])
    s_sub = startup.get("subsectors_normalized", [])
    i_sec = investor.get("sector_focus_normalized", [])
    i_exc = investor.get("sector_exclude_normalized", [])

    c_main = count_overlap(s_sec, i_sec)
    c_sub = count_overlap(s_sub, i_sec)

    if c_main >= 2:
        out["B1_sector_focus_alignment"] = rr("B1_sector_focus_alignment", 30, 30, "count_overlap(startup.sectors_normalized, investor.sector_focus_normalized) >= 2", "Strong multi-sector overlap.")
    elif c_main == 1:
        out["B1_sector_focus_alignment"] = rr("B1_sector_focus_alignment", 24, 30, "count_overlap(startup.sectors_normalized, investor.sector_focus_normalized) == 1", "Single sector overlap.")
    elif c_sub >= 1:
        out["B1_sector_focus_alignment"] = rr("B1_sector_focus_alignment", 18, 30, "count_overlap(startup.subsectors_normalized, investor.sector_focus_normalized) >= 1", "Subsector overlap.")
    elif overlap(s_sec, i_exc):
        out["B1_sector_focus_alignment"] = rr("B1_sector_focus_alignment", 0, 30, "overlap(startup.sectors_normalized, investor.sector_exclude_normalized)", "Sector explicitly excluded.")
    elif is_empty(s_sec) or is_empty(i_sec):
        out["B1_sector_focus_alignment"] = rr("B1_sector_focus_alignment", 6, 30, "missing(startup.sectors_normalized) OR empty(investor.sector_focus_normalized)", "Missing sector info.")
    else:
        out["B1_sector_focus_alignment"] = rr("B1_sector_focus_alignment", 10, 30, "default_no_overlap", "No sector overlap.")

    primary = norm_text(startup.get("business_model", {}).get("primary"))
    is_b2b = startup.get("business_model", {}).get("is_b2b")
    is_b2c = startup.get("business_model", {}).get("is_b2c")
    include = investor.get("business_models_include", [])
    exclude = investor.get("business_models_exclude", [])
    pref_b2b = investor.get("prefers_b2b")
    pref_b2c = investor.get("prefers_b2c")

    if primary and primary in list_norm_set(include):
        out["B2_business_model_fit"] = rr("B2_business_model_fit", 20, 20, "startup.business_model.primary IN investor.business_models_include", "Primary model explicitly included.")
    elif is_b2b is True and pref_b2b is True:
        out["B2_business_model_fit"] = rr("B2_business_model_fit", 17, 20, "startup.business_model.is_b2b == true AND investor.prefers_b2b == true", "B2B preference match.")
    elif is_b2c is True and pref_b2c is True:
        out["B2_business_model_fit"] = rr("B2_business_model_fit", 17, 20, "startup.business_model.is_b2c == true AND investor.prefers_b2c == true", "B2C preference match.")
    elif primary and primary in list_norm_set(exclude):
        out["B2_business_model_fit"] = rr("B2_business_model_fit", 0, 20, "startup.business_model.primary IN investor.business_models_exclude", "Primary model excluded.")
    elif is_missing(primary):
        out["B2_business_model_fit"] = rr("B2_business_model_fit", 5, 20, "missing(startup.business_model.primary)", "Missing business model.")
    else:
        out["B2_business_model_fit"] = rr("B2_business_model_fit", 8, 20, "default_model_misalignment", "Model does not align well.")

    return out

def score_traction_vs_thesis(startup, investor):
    out = {}
    stage = norm_text(startup.get("stage_normalized"))
    t = startup.get("traction", {})
    arr = to_float(t.get("arr_usd"))
    rev = to_float(t.get("revenue_ttm_usd"))
    links = to_int(t.get("evidence_links_count")) or 0
    primary = norm_text(t.get("primary_signal"))

    if stage in {"seed", "series_a", "series_b"} and ((arr or 0) > 0 or (rev or 0) > 0) and links >= 1:
        out["C1_traction_evidence_type"] = rr("C1_traction_evidence_type", 30, 30, "startup.stage_normalized IN ['seed','series_a','series_b'] AND (startup.traction.arr_usd > 0 OR startup.traction.revenue_ttm_usd > 0) AND startup.traction.evidence_links_count >= 1", "Revenue evidence aligned with stage.")
    elif primary in {"paying_customers", "revenue", "arr"} and links >= 1:
        out["C1_traction_evidence_type"] = rr("C1_traction_evidence_type", 26, 30, "startup.traction.primary_signal IN ['paying_customers','revenue','arr'] AND startup.traction.evidence_links_count >= 1", "Strong traction signal with evidence.")
    elif primary in {"pilots", "lois"} and links >= 1:
        out["C1_traction_evidence_type"] = rr("C1_traction_evidence_type", 20, 30, "startup.traction.primary_signal IN ['pilots','lois'] AND startup.traction.evidence_links_count >= 1", "Early commercial signal with evidence.")
    elif primary in {"waitlist", "engagement"}:
        out["C1_traction_evidence_type"] = rr("C1_traction_evidence_type", 12, 30, "startup.traction.primary_signal IN ['waitlist','engagement']", "Directional signal, weaker commercial proof.")
    elif primary in {"none", "unknown"}:
        out["C1_traction_evidence_type"] = rr("C1_traction_evidence_type", 0, 30, "startup.traction.primary_signal IN ['none','unknown']", "No traction signal.")
    elif is_missing(primary):
        out["C1_traction_evidence_type"] = rr("C1_traction_evidence_type", 6, 30, "missing(startup.traction.primary_signal)", "Missing traction primary signal.")
    else:
        out["C1_traction_evidence_type"] = rr("C1_traction_evidence_type", 10, 30, "default_other_signal", "Other traction signal.")

    mom = to_float(t.get("mom_growth_pct_3m_avg"))
    yoy = to_float(t.get("yoy_growth_pct"))
    if (mom is not None and mom >= 10) or (yoy is not None and yoy >= 50):
        out["C2_traction_momentum"] = rr("C2_traction_momentum", 20, 20, "startup.traction.mom_growth_pct_3m_avg >= 10 OR startup.traction.yoy_growth_pct >= 50", "Strong growth momentum.")
    elif (mom is not None and mom >= 5) or (yoy is not None and yoy >= 20):
        out["C2_traction_momentum"] = rr("C2_traction_momentum", 16, 20, "startup.traction.mom_growth_pct_3m_avg >= 5 OR startup.traction.yoy_growth_pct >= 20", "Good growth momentum.")
    elif (mom is not None and mom >= 0):
        out["C2_traction_momentum"] = rr("C2_traction_momentum", 10, 20, "startup.traction.mom_growth_pct_3m_avg >= 0", "Flat-to-positive momentum.")
    elif (mom is not None and mom < 0) or (yoy is not None and yoy < 0):
        out["C2_traction_momentum"] = rr("C2_traction_momentum", 0, 20, "startup.traction.mom_growth_pct_3m_avg < 0 OR startup.traction.yoy_growth_pct < 0", "Negative momentum.")
    elif mom is None and yoy is None:
        out["C2_traction_momentum"] = rr("C2_traction_momentum", 4, 20, "missing(startup.traction.mom_growth_pct_3m_avg) AND missing(startup.traction.yoy_growth_pct)", "Missing momentum metrics.")
    else:
        out["C2_traction_momentum"] = rr("C2_traction_momentum", 8, 20, "default_momentum_mid", "Partial momentum evidence.")

    m = startup.get("milestones", {})
    q = to_int(m.get("quantified_count"))
    linked = m.get("stage_linked")
    if q is not None and q >= 3 and linked is True:
        out["C3_milestones_vs_next_stage"] = rr("C3_milestones_vs_next_stage", 25, 25, "startup.milestones.quantified_count >= 3 AND startup.milestones.stage_linked == true", "Strong quantified milestones linked to stage.")
    elif q is not None and q >= 2:
        out["C3_milestones_vs_next_stage"] = rr("C3_milestones_vs_next_stage", 18, 25, "startup.milestones.quantified_count >= 2", "Good quantified milestones.")
    elif q == 1:
        out["C3_milestones_vs_next_stage"] = rr("C3_milestones_vs_next_stage", 10, 25, "startup.milestones.quantified_count == 1", "Single quantified milestone.")
    elif q == 0:
        out["C3_milestones_vs_next_stage"] = rr("C3_milestones_vs_next_stage", 0, 25, "startup.milestones.quantified_count == 0", "No quantified milestones.")
    elif q is None:
        out["C3_milestones_vs_next_stage"] = rr("C3_milestones_vs_next_stage", 5, 25, "missing(startup.milestones.quantified_count)", "Missing milestones count.")
    else:
        out["C3_milestones_vs_next_stage"] = rr("C3_milestones_vs_next_stage", 8, 25, "default_milestone_mid", "Partial milestone info.")

    return out

def score_founder_team_fit(startup, investor):
    out = {}
    t = startup.get("team", {})
    s = startup.get("signals", {})

    coverage = parse_percent(t.get("core_roles_covered_pct"))
    if coverage is not None and coverage >= 0.9:
        out["D1_team_completeness_vs_stage"] = rr("D1_team_completeness_vs_stage", 25, 25, "startup.team.core_roles_covered_pct >= 0.9", "Excellent role coverage.")
    elif coverage is not None and coverage >= 0.7:
        out["D1_team_completeness_vs_stage"] = rr("D1_team_completeness_vs_stage", 18, 25, "startup.team.core_roles_covered_pct >= 0.7", "Good role coverage.")
    elif coverage is not None and coverage >= 0.4:
        out["D1_team_completeness_vs_stage"] = rr("D1_team_completeness_vs_stage", 10, 25, "startup.team.core_roles_covered_pct >= 0.4", "Partial role coverage.")
    elif coverage is not None and coverage < 0.4:
        out["D1_team_completeness_vs_stage"] = rr("D1_team_completeness_vs_stage", 0, 25, "startup.team.core_roles_covered_pct < 0.4", "Weak role coverage.")
    else:
        out["D1_team_completeness_vs_stage"] = rr("D1_team_completeness_vs_stage", 5, 25, "missing(startup.team.core_roles_covered_pct)", "Missing role coverage metric.")

    exits = to_int(t.get("prior_exit_count")) or 0
    years = to_float(t.get("domain_years_avg"))
    if exits >= 1 or (years is not None and years >= 8):
        out["D2_domain_execution_evidence"] = rr("D2_domain_execution_evidence", 30, 30, "startup.team.prior_exit_count >= 1 OR startup.team.domain_years_avg >= 8", "Strong founder execution proof.")
    elif years is not None and years >= 5:
        out["D2_domain_execution_evidence"] = rr("D2_domain_execution_evidence", 24, 30, "startup.team.domain_years_avg >= 5", "Strong domain depth.")
    elif years is not None and years >= 3:
        out["D2_domain_execution_evidence"] = rr("D2_domain_execution_evidence", 18, 30, "startup.team.domain_years_avg >= 3", "Moderate domain depth.")
    elif years is not None and years >= 1:
        out["D2_domain_execution_evidence"] = rr("D2_domain_execution_evidence", 10, 30, "startup.team.domain_years_avg >= 1", "Early domain experience.")
    elif years is not None and years < 1:
        out["D2_domain_execution_evidence"] = rr("D2_domain_execution_evidence", 4, 30, "startup.team.domain_years_avg < 1", "Limited domain depth.")
    else:
        out["D2_domain_execution_evidence"] = rr("D2_domain_execution_evidence", 6, 30, "missing(startup.team.domain_years_avg)", "Missing domain-years metric.")

    neg = s.get("negative_reference_flag")
    resp_days = to_int(s.get("responsiveness_days"))
    refs = to_int(s.get("reference_count")) or 0

    if neg is True:
        out["D3_coachability_signals"] = rr("D3_coachability_signals", 0, 20, "startup.signals.negative_reference_flag == true", "Negative references present.")
    elif resp_days is not None and resp_days <= 3 and refs >= 2:
        out["D3_coachability_signals"] = rr("D3_coachability_signals", 20, 20, "startup.signals.responsiveness_days <= 3 AND startup.signals.reference_count >= 2", "Fast response with strong references.")
    elif resp_days is not None and resp_days <= 7 and refs >= 1:
        out["D3_coachability_signals"] = rr("D3_coachability_signals", 15, 20, "startup.signals.responsiveness_days <= 7 AND startup.signals.reference_count >= 1", "Good responsiveness and references.")
    elif resp_days is not None and resp_days <= 14:
        out["D3_coachability_signals"] = rr("D3_coachability_signals", 9, 20, "startup.signals.responsiveness_days <= 14", "Moderate responsiveness.")
    else:
        out["D3_coachability_signals"] = rr("D3_coachability_signals", 4, 20, "missing(startup.signals.responsiveness_days)", "Missing coachability timing signals.")

    return out

def score_risk_regulatory_alignment(startup, investor):
    out = {}
    r = startup.get("risk", {})
    m = startup.get("moat", {})

    reg_domain = norm_text(r.get("regulatory_domain"))
    reg_level = to_int(r.get("regulatory_risk_level"))
    reg_tol = to_int(investor.get("regulatory_tolerance_level"))
    mitigate = r.get("mitigation_plan_present")

    if reg_domain and reg_domain in list_norm_set(investor.get("regulatory_exclude")):
        out["E1_regulatory_exposure_vs_tolerance"] = rr("E1_regulatory_exposure_vs_tolerance", 0, 30, "startup.risk.regulatory_domain IN investor.regulatory_exclude", "Regulatory domain excluded.")
    elif reg_level is not None and reg_tol is not None and reg_level <= reg_tol:
        out["E1_regulatory_exposure_vs_tolerance"] = rr("E1_regulatory_exposure_vs_tolerance", 30, 30, "startup.risk.regulatory_risk_level <= investor.regulatory_tolerance_level", "Regulatory risk within tolerance.")
    elif reg_level is not None and reg_tol is not None and reg_level == reg_tol + 1 and mitigate is True:
        out["E1_regulatory_exposure_vs_tolerance"] = rr("E1_regulatory_exposure_vs_tolerance", 20, 30, "startup.risk.regulatory_risk_level == investor.regulatory_tolerance_level + 1 AND startup.risk.mitigation_plan_present == true", "Slightly above tolerance but mitigated.")
    elif reg_level is not None and reg_tol is not None and reg_level > reg_tol:
        out["E1_regulatory_exposure_vs_tolerance"] = rr("E1_regulatory_exposure_vs_tolerance", 8, 30, "startup.risk.regulatory_risk_level > investor.regulatory_tolerance_level", "Above tolerance.")
    else:
        out["E1_regulatory_exposure_vs_tolerance"] = rr("E1_regulatory_exposure_vs_tolerance", 5, 30, "missing(startup.risk.regulatory_risk_level) OR missing(investor.regulatory_tolerance_level)", "Missing regulatory risk inputs.")

    moat_score = parse_percent(m.get("score"))
    min_pref = to_float(investor.get("defensibility_preference_min_score"))
    if min_pref is None:
        min_pref = 0.0

    if moat_score is not None and moat_score >= max(0.8, min_pref):
        out["E2_defensibility_vs_preference"] = rr("E2_defensibility_vs_preference", 25, 25, "startup.moat.score >= max(0.8, investor.defensibility_preference_min_score)", "High defensibility.")
    elif moat_score is not None and moat_score >= max(0.6, min_pref):
        out["E2_defensibility_vs_preference"] = rr("E2_defensibility_vs_preference", 18, 25, "startup.moat.score >= max(0.6, investor.defensibility_preference_min_score)", "Good defensibility.")
    elif moat_score is not None and moat_score >= 0.4:
        out["E2_defensibility_vs_preference"] = rr("E2_defensibility_vs_preference", 10, 25, "startup.moat.score >= 0.4", "Moderate defensibility.")
    elif moat_score is not None and moat_score < 0.4:
        out["E2_defensibility_vs_preference"] = rr("E2_defensibility_vs_preference", 4, 25, "startup.moat.score < 0.4", "Low defensibility.")
    else:
        out["E2_defensibility_vs_preference"] = rr("E2_defensibility_vs_preference", 5, 25, "missing(startup.moat.score)", "Missing moat score.")

    tli = to_float(r.get("time_to_liquidity_years"))
    hmin = to_float(investor.get("time_horizon_min_years"))
    hmax = to_float(investor.get("time_horizon_max_years"))
    s_cap = to_int(r.get("capital_intensity_level"))
    i_cap = to_int(investor.get("capital_intensity_tolerance_level"))
    dist = abs_distance_to_range(tli, hmin, hmax)

    if tli is not None and hmin is not None and hmax is not None and s_cap is not None and i_cap is not None and (hmin <= tli <= hmax) and (s_cap <= i_cap):
        out["E3_time_horizon_risk_concentration"] = rr("E3_time_horizon_risk_concentration", 20, 20, "startup.risk.time_to_liquidity_years BETWEEN investor.time_horizon_min_years AND investor.time_horizon_max_years AND startup.risk.capital_intensity_level <= investor.capital_intensity_tolerance_level", "Time horizon and capital intensity fit.")
    elif dist is not None and dist <= 2:
        out["E3_time_horizon_risk_concentration"] = rr("E3_time_horizon_risk_concentration", 14, 20, "abs_distance_to_range(startup.risk.time_to_liquidity_years, [investor.time_horizon_min_years, investor.time_horizon_max_years]) <= 2", "Near horizon range.")
    elif s_cap is not None and i_cap is not None and s_cap > i_cap:
        out["E3_time_horizon_risk_concentration"] = rr("E3_time_horizon_risk_concentration", 6, 20, "startup.risk.capital_intensity_level > investor.capital_intensity_tolerance_level", "Capital intensity above tolerance.")
    elif dist is not None and dist > 2:
        out["E3_time_horizon_risk_concentration"] = rr("E3_time_horizon_risk_concentration", 6, 20, "abs_distance_to_range(startup.risk.time_to_liquidity_years, [investor.time_horizon_min_years, investor.time_horizon_max_years]) > 2", "Outside time horizon.")
    else:
        out["E3_time_horizon_risk_concentration"] = rr("E3_time_horizon_risk_concentration", 4, 20, "missing(startup.risk.time_to_liquidity_years) OR missing(investor.time_horizon_min_years)", "Missing time-horizon inputs.")

    return out

def score_diligence_process_fit(startup, investor):
    out = {}
    a = startup.get("artifacts", {})
    d = startup.get("deal_preferences", {})

    deck = a.get("pitch_deck_uploaded")
    deck_score = to_float(a.get("pitch_deck_completeness_score"))

    if deck is True and deck_score is not None and deck_score >= 0.8:
        out["F1_pitch_deck_availability"] = rr("F1_pitch_deck_availability", 20, 20, "startup.artifacts.pitch_deck_uploaded == true AND startup.artifacts.pitch_deck_completeness_score >= 0.8", "Deck is strong and ready.")
    elif deck is True and deck_score is not None and deck_score >= 0.6:
        out["F1_pitch_deck_availability"] = rr("F1_pitch_deck_availability", 15, 20, "startup.artifacts.pitch_deck_uploaded == true AND startup.artifacts.pitch_deck_completeness_score >= 0.6", "Deck is usable.")
    elif deck is True:
        out["F1_pitch_deck_availability"] = rr("F1_pitch_deck_availability", 9, 20, "startup.artifacts.pitch_deck_uploaded == true", "Deck exists.")
    elif investor.get("requires_pitch_deck") is True and deck is False:
        out["F1_pitch_deck_availability"] = rr("F1_pitch_deck_availability", 0, 20, "investor.requires_pitch_deck == true AND startup.artifacts.pitch_deck_uploaded == false", "Deck required but missing.")
    else:
        out["F1_pitch_deck_availability"] = rr("F1_pitch_deck_availability", 4, 20, "missing(startup.artifacts.pitch_deck_uploaded)", "Deck availability unknown.")

    c = artifact_count_present(a.get("data_room_url"), a.get("cap_table_uploaded"), a.get("financial_model_uploaded"), a.get("customer_metrics_uploaded"), a.get("pitch_deck_uploaded"))
    if c == 5:
        out["F2_data_room_artifacts"] = rr("F2_data_room_artifacts", 35, 35, "artifact_count_present(startup.artifacts.data_room_url, startup.artifacts.cap_table_uploaded, startup.artifacts.financial_model_uploaded, startup.artifacts.customer_metrics_uploaded, startup.artifacts.pitch_deck_uploaded) == 5", "Complete diligence pack.")
    elif c == 4:
        out["F2_data_room_artifacts"] = rr("F2_data_room_artifacts", 28, 35, "artifact_count_present(startup.artifacts.data_room_url, startup.artifacts.cap_table_uploaded, startup.artifacts.financial_model_uploaded, startup.artifacts.customer_metrics_uploaded, startup.artifacts.pitch_deck_uploaded) == 4", "Near-complete diligence pack.")
    elif c == 3:
        out["F2_data_room_artifacts"] = rr("F2_data_room_artifacts", 20, 35, "artifact_count_present(startup.artifacts.data_room_url, startup.artifacts.cap_table_uploaded, startup.artifacts.financial_model_uploaded, startup.artifacts.customer_metrics_uploaded, startup.artifacts.pitch_deck_uploaded) == 3", "Moderate diligence pack.")
    elif c in {1, 2}:
        out["F2_data_room_artifacts"] = rr("F2_data_room_artifacts", 10, 35, "artifact_count_present(startup.artifacts.data_room_url, startup.artifacts.cap_table_uploaded, startup.artifacts.financial_model_uploaded, startup.artifacts.customer_metrics_uploaded, startup.artifacts.pitch_deck_uploaded) IN [1,2]", "Limited artifacts.")
    elif investor.get("requires_data_room") is True and c == 0:
        out["F2_data_room_artifacts"] = rr("F2_data_room_artifacts", 0, 35, "investor.requires_data_room == true AND artifact_count_present(startup.artifacts.data_room_url, startup.artifacts.cap_table_uploaded, startup.artifacts.financial_model_uploaded, startup.artifacts.customer_metrics_uploaded, startup.artifacts.pitch_deck_uploaded) == 0", "Data room required but absent.")
    else:
        out["F2_data_room_artifacts"] = rr("F2_data_room_artifacts", 6, 35, "missing(startup.artifacts.data_room_url) AND missing(startup.artifacts.cap_table_uploaded)", "Missing core diligence artifacts.")

    ds = to_int(investor.get("decision_speed_days"))
    tl = to_int(d.get("timeline_to_close_days"))
    if ds is not None and tl is not None and ds <= tl:
        out["F3_timeline_compatibility"] = rr("F3_timeline_compatibility", 20, 20, "investor.decision_speed_days <= startup.deal_preferences.timeline_to_close_days", "Decision speed fits close timeline.")
    elif ds is not None and tl is not None and ds <= tl + 14:
        out["F3_timeline_compatibility"] = rr("F3_timeline_compatibility", 14, 20, "investor.decision_speed_days <= startup.deal_preferences.timeline_to_close_days + 14", "Slight timeline stretch.")
    elif ds is not None and tl is not None and ds <= tl + 45:
        out["F3_timeline_compatibility"] = rr("F3_timeline_compatibility", 8, 20, "investor.decision_speed_days <= startup.deal_preferences.timeline_to_close_days + 45", "Moderate timeline friction.")
    elif ds is not None and tl is not None and ds > tl + 45:
        out["F3_timeline_compatibility"] = rr("F3_timeline_compatibility", 0, 20, "investor.decision_speed_days > startup.deal_preferences.timeline_to_close_days + 45", "Major timeline mismatch.")
    else:
        out["F3_timeline_compatibility"] = rr("F3_timeline_compatibility", 4, 20, "missing(investor.decision_speed_days) OR missing(startup.deal_preferences.timeline_to_close_days)", "Missing timeline inputs.")

    return out


# ----------------------------
# Rubric Integration
# ----------------------------

def build_rubric_index(rubric: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    idx = {
        "category_meta": {},
        "subrules": {},
        "hard_gate_failure_reasons": set(),
    }
    if not isinstance(rubric, dict):
        return idx

    cats = rubric.get("categories", {})
    if isinstance(cats, dict):
        for cat_key, cat_cfg in cats.items():
            if not isinstance(cat_cfg, dict):
                continue
            idx["category_meta"][cat_key] = {
                "max_point": to_float(cat_cfg.get("maximum_point")),
                "weight": to_float(cat_cfg.get("weight")),
            }
            for subkey, arr in cat_cfg.items():
                if not isinstance(arr, list) or not arr or not isinstance(arr[0], dict):
                    continue
                rule = arr[0]
                options = rule.get("options", {}) if isinstance(rule.get("options"), dict) else {}
                norm_options = {normalize_condition_key(k): to_float(v) for k, v in options.items()}
                idx["subrules"][subkey] = {
                    "category_key": cat_key,
                    "maximum_points": to_float(rule.get("maximum_points")),
                    "evaluation_order": [normalize_condition_key(x) for x in to_list(rule.get("evaluation_order"))],
                    "options": norm_options,
                }

    gates = rubric.get("hard_gates")
    if isinstance(gates, list):
        for g in gates:
            if isinstance(g, dict) and clean_text(g.get("failure_reason")):
                idx["hard_gate_failure_reasons"].add(clean_text(g.get("failure_reason")))
    return idx

def apply_rubric_points(rule_results: Dict[str, RuleResult], rubric_index: Dict[str, Any]) -> Dict[str, RuleResult]:
    out = {}
    subrules = rubric_index.get("subrules", {})
    for key, rr_obj in rule_results.items():
        sub = subrules.get(key)
        if not sub:
            out[key] = rr_obj
            continue
        options = sub.get("options", {})
        condition_norm = normalize_condition_key(rr_obj.matched_condition)
        points = options.get(condition_norm, rr_obj.points)
        mx = sub.get("maximum_points")
        max_points = rr_obj.max_points if mx is None else float(mx)
        out[key] = RuleResult(
            key=rr_obj.key,
            points=float(points),
            max_points=float(max_points),
            matched_condition=rr_obj.matched_condition,
            reason=rr_obj.reason,
        )
    return out


def calc_category_summary(rule_results, max_point, weight):
    raw_points = sum(r.points for r in rule_results.values())
    percent = (raw_points / max_point) if max_point > 0 else 0.0
    weighted_contribution = percent * weight
    return {
        "raw_points": round(raw_points, 4),
        "max_point": round(float(max_point), 4),
        "percent": round(percent * 100.0, 4),
        "weight": round(float(weight), 4),
        "weighted_contribution": round(weighted_contribution, 4),
        "subcategories": {
            k: {
                "points": round(v.points, 4),
                "max_points": round(v.max_points, 4),
                "matched_condition": v.matched_condition,
                "reason": v.reason,
            }
            for k, v in rule_results.items()
        },
    }

def manual_match(startup_obj, investor_obj, rubric=None):
    startup = startup_obj.get("startup", startup_obj)
    investor = investor_obj.get("investor", investor_obj)

    rubric_index = build_rubric_index(rubric)

    eligible, gate_fails = check_hard_gates(startup, investor)

    # default meta (fallback)
    cat_meta = {
        "deal_compatibility": {"max_point": 125.0, "weight": 35.0},
        "sector_business_model_fit": {"max_point": 50.0, "weight": 20.0},
        "traction_vs_thesis_bar": {"max_point": 75.0, "weight": 15.0},
        "founder_team_fit": {"max_point": 75.0, "weight": 20.0},
        "risk_regulatory_alignment": {"max_point": 75.0, "weight": 5.0},
        "diligence_process_fit": {"max_point": 75.0, "weight": 5.0},
    }

    # override from rubric
    if isinstance(rubric, dict):
        rcat = rubric.get("categories", {})
        if isinstance(rcat, dict):
            for ck in cat_meta.keys():
                cfg = rcat.get(ck, {})
                if isinstance(cfg, dict):
                    mp = to_float(cfg.get("maximum_point"))
                    wt = to_float(cfg.get("weight"))
                    if mp is not None:
                        cat_meta[ck]["max_point"] = mp
                    if wt is not None:
                        cat_meta[ck]["weight"] = wt

    c1 = score_deal_compatibility(startup, investor)
    c2 = score_sector_business_model_fit(startup, investor)
    c3 = score_traction_vs_thesis(startup, investor)
    c4 = score_founder_team_fit(startup, investor)
    c5 = score_risk_regulatory_alignment(startup, investor)
    c6 = score_diligence_process_fit(startup, investor)

    # apply rubric options/max points when available
    c1 = apply_rubric_points(c1, rubric_index)
    c2 = apply_rubric_points(c2, rubric_index)
    c3 = apply_rubric_points(c3, rubric_index)
    c4 = apply_rubric_points(c4, rubric_index)
    c5 = apply_rubric_points(c5, rubric_index)
    c6 = apply_rubric_points(c6, rubric_index)

    summaries = {
        "deal_compatibility": calc_category_summary(c1, cat_meta["deal_compatibility"]["max_point"], cat_meta["deal_compatibility"]["weight"]),
        "sector_business_model_fit": calc_category_summary(c2, cat_meta["sector_business_model_fit"]["max_point"], cat_meta["sector_business_model_fit"]["weight"]),
        "traction_vs_thesis_bar": calc_category_summary(c3, cat_meta["traction_vs_thesis_bar"]["max_point"], cat_meta["traction_vs_thesis_bar"]["weight"]),
        "founder_team_fit": calc_category_summary(c4, cat_meta["founder_team_fit"]["max_point"], cat_meta["founder_team_fit"]["weight"]),
        "risk_regulatory_alignment": calc_category_summary(c5, cat_meta["risk_regulatory_alignment"]["max_point"], cat_meta["risk_regulatory_alignment"]["weight"]),
        "diligence_process_fit": calc_category_summary(c6, cat_meta["diligence_process_fit"]["max_point"], cat_meta["diligence_process_fit"]["weight"]),
    }

    raw_total = sum(v["raw_points"] for v in summaries.values())
    raw_max_total = sum(v["max_point"] for v in summaries.values())

    fit_score_if_eligible = sum(v["weighted_contribution"] for v in summaries.values())
    fit_score_final = 0.0 if not eligible else fit_score_if_eligible

    return {
        "matching_version": "manual_deterministic_v2",
        "generated_at_utc": now_utc_iso(),
        "startup_ref": startup_obj.get("metadata", {}).get("source_files", {}),
        "investor_ref": investor_obj.get("metadata", {}).get("source_file", None),
        "eligible": eligible,
        "gate_fail_reasons": gate_fails,
        "raw_points_total": round(raw_total, 4),
        "raw_points_max_total": round(raw_max_total, 4),
        "fit_score_if_eligible_0_to_100": round(fit_score_if_eligible, 4),
        "fit_score_0_to_100": round(fit_score_final, 4),
        "category_breakdown": summaries,
        "notes": [
            "Startup and investor normalization are separate artifacts.",
            "Same startup_thesis_fit.json can be matched with multiple investor_thesis_fit.json files.",
            "First-match-in-order logic is preserved per subcategory.",
            "Points/weights are loaded from rubric when available.",
        ],
    }


# ----------------------------
# Human Reasoning + Tasks
# ----------------------------

TASK_LIBRARY = {
    "A1_stage_alignment": {
        "task_title": "Align stage narrative with investor mandate",
        "task_description": "Reframe or validate current round/stage with hard evidence so it maps directly to the investor’s target stage buckets.",
        "field_hints": ["startup.stage_normalized", "startup.round_normalized", "startup.traction.primary_signal"],
    },
    "A2_check_size_compatibility": {
        "task_title": "Restructure check-size ask",
        "task_description": "Adjust minimum/maximum acceptable ticket or syndicate strategy so the investor’s typical check can participate cleanly.",
        "field_hints": ["startup.raise.min_ticket_usd", "startup.raise.max_ticket_usd", "startup.raise.target_raise_usd"],
    },
    "A3_geography_jurisdiction_fit": {
        "task_title": "Improve geo fit for this investor",
        "task_description": "Add operating footprint, GTM partners, or regulatory readiness in investor focus geographies.",
        "field_hints": ["startup.hq_country", "startup.operating_geographies", "startup.target_geographies"],
    },
    "A4_deal_leadership_preference_fit": {
        "task_title": "Clarify lead/follow expectations",
        "task_description": "Make lead investor need explicit and align syndicate plan to the investor’s lead/follow behavior.",
        "field_hints": ["startup.deal_preferences.needs_lead", "startup.deal_preferences.only_followers"],
    },
    "A5_investment_instrument_fit": {
        "task_title": "Match funding instrument",
        "task_description": "Offer a compatible instrument (SAFE, priced round, convertible) aligned with investor policy.",
        "field_hints": ["startup.raise.instrument_normalized"],
    },
    "B1_sector_focus_alignment": {
        "task_title": "Strengthen thesis-sector overlap",
        "task_description": "Tighten category positioning and proof points to match the investor’s sector thesis terms.",
        "field_hints": ["startup.sectors_normalized", "startup.subsectors_normalized"],
    },
    "B2_business_model_fit": {
        "task_title": "Improve business model fit messaging",
        "task_description": "Clarify B2B/B2C mix, pricing model, and ICP to match investor preference.",
        "field_hints": ["startup.business_model.primary", "startup.business_model.is_b2b", "startup.business_model.is_b2c"],
    },
    "C1_traction_evidence_type": {
        "task_title": "Upgrade traction evidence quality",
        "task_description": "Add verifiable traction artifacts (ARR, revenue, pilots, customer proofs) with source links.",
        "field_hints": ["startup.traction.arr_usd", "startup.traction.revenue_ttm_usd", "startup.traction.evidence_links_count"],
    },
    "C2_traction_momentum": {
        "task_title": "Improve growth momentum",
        "task_description": "Deliver measurable MoM/YoY improvements and highlight durable growth drivers.",
        "field_hints": ["startup.traction.mom_growth_pct_3m_avg", "startup.traction.yoy_growth_pct"],
    },
    "C3_milestones_vs_next_stage": {
        "task_title": "Define quantified next-stage milestones",
        "task_description": "Publish 3+ measurable milestones explicitly tied to next financing readiness.",
        "field_hints": ["startup.milestones.quantified_count", "startup.milestones.stage_linked"],
    },
    "D1_team_completeness_vs_stage": {
        "task_title": "Close team gaps for current stage",
        "task_description": "Fill missing core roles and make ownership/accountability explicit.",
        "field_hints": ["startup.team.core_roles_covered_pct"],
    },
    "D2_domain_execution_evidence": {
        "task_title": "Increase execution credibility",
        "task_description": "Highlight domain depth, prior outcomes, and operator references tied to current market.",
        "field_hints": ["startup.team.domain_years_avg", "startup.team.prior_exit_count"],
    },
    "D3_coachability_signals": {
        "task_title": "Improve responsiveness and references",
        "task_description": "Reduce response times and add trusted references to improve investor confidence.",
        "field_hints": ["startup.signals.responsiveness_days", "startup.signals.reference_count", "startup.signals.negative_reference_flag"],
    },
    "E1_regulatory_exposure_vs_tolerance": {
        "task_title": "Reduce regulatory risk mismatch",
        "task_description": "Add concrete compliance plan and mitigation milestones to move into investor tolerance.",
        "field_hints": ["startup.risk.regulatory_risk_level", "startup.risk.mitigation_plan_present", "startup.risk.regulatory_domain"],
    },
    "E2_defensibility_vs_preference": {
        "task_title": "Strengthen defensibility narrative",
        "task_description": "Increase moat clarity (IP, switching costs, data/network effects) with evidence.",
        "field_hints": ["startup.moat.score", "startup.moat.types"],
    },
    "E3_time_horizon_risk_concentration": {
        "task_title": "Align timeline and capital intensity",
        "task_description": "De-risk time-to-liquidity and capex profile to better fit investor constraints.",
        "field_hints": ["startup.risk.time_to_liquidity_years", "startup.risk.capital_intensity_level"],
    },
    "F1_pitch_deck_availability": {
        "task_title": "Make deck investor-ready",
        "task_description": "Improve deck completeness and decision-readiness (problem, traction, moat, use of funds).",
        "field_hints": ["startup.artifacts.pitch_deck_uploaded", "startup.artifacts.pitch_deck_completeness_score"],
    },
    "F2_data_room_artifacts": {
        "task_title": "Complete data room package",
        "task_description": "Upload cap table, financial model, KPI exports, and structured data room links.",
        "field_hints": ["startup.artifacts.data_room_url", "startup.artifacts.cap_table_uploaded", "startup.artifacts.financial_model_uploaded", "startup.artifacts.customer_metrics_uploaded"],
    },
    "F3_timeline_compatibility": {
        "task_title": "Align fundraising timeline",
        "task_description": "Adjust close timeline or investor process plan to avoid decision-speed mismatch.",
        "field_hints": ["startup.deal_preferences.timeline_to_close_days", "investor.decision_speed_days"],
    },
}

def gate_task_template(reason: str, investor_name: str) -> Dict[str, Any]:
    mapping = {
        "Investor is not active.": ("Switch to active investor", "This investor is currently inactive; prioritize active investors with similar thesis."),
        "Investor max check is below startup minimum acceptable check.": ("Fix minimum ticket mismatch", "Lower minimum acceptable ticket or redesign syndicate to fit this investor’s max check."),
        "Startup falls in investor explicit geography exclusion.": ("Remove geography exclusion conflict", "Target a geo-aligned investor or adapt expansion plan to avoid excluded jurisdictions."),
        "Startup sector explicitly excluded by investor.": ("Resolve sector exclusion", "Position toward non-excluded segment or prioritize a sector-aligned investor."),
        "Startup business model explicitly excluded by investor.": ("Resolve business model exclusion", "Update packaging/pricing model or target investors that back your current model."),
        "Startup instrument explicitly excluded by investor.": ("Use accepted investment instrument", "Switch to investor-accepted instrument or target compatible investors."),
        "Regulatory domain explicitly excluded by investor.": ("Address regulatory domain exclusion", "Target investor profiles that accept your regulatory domain."),
        "Investor has hard geography constraint and startup is outside allowed geography.": ("Satisfy hard geography constraint", "Establish a compliant presence/traction inside investor focus geography."),
    }
    ttl, desc = mapping.get(reason, ("Resolve hard-gate mismatch", reason))
    return {
        "task_id": f"gate_{slugify(ttl)}",
        "task_title": ttl,
        "task_description": f"For {investor_name}: {desc}",
        "task_points": 100.0,
        "task_done": False,
        "task_value": None,
        "task_type": "hard_gate",
        "field_hints": [],
    }

def generate_improvement_tasks(
    result: Dict[str, Any],
    startup_obj: Dict[str, Any],
    investor_obj: Dict[str, Any],
    max_tasks: int = 12,
) -> List[Dict[str, Any]]:
    investor_name = investor_obj.get("investor", {}).get("name") or "this investor"
    tasks: List[Dict[str, Any]] = []

    gate_fails = to_list(result.get("gate_fail_reasons"))
    if gate_fails:
        unlock_value_total = to_float(result.get("fit_score_if_eligible_0_to_100")) or 0.0
        per_gate_unlock = round(unlock_value_total / max(len(gate_fails), 1), 4)
        for reason in gate_fails:
            t = gate_task_template(clean_text(reason), investor_name)
            t["task_value"] = per_gate_unlock
            tasks.append(t)

    breakdown = result.get("category_breakdown", {})
    for cat_key, cat_val in breakdown.items():
        if not isinstance(cat_val, dict):
            continue
        cat_max = to_float(cat_val.get("max_point")) or 1.0
        cat_weight = to_float(cat_val.get("weight")) or 0.0
        subs = cat_val.get("subcategories", {})
        if not isinstance(subs, dict):
            continue

        for subkey, sv in subs.items():
            if not isinstance(sv, dict):
                continue
            pts = to_float(sv.get("points")) or 0.0
            mx = to_float(sv.get("max_points")) or 0.0
            gap = max(mx - pts, 0.0)
            if gap <= 0:
                continue

            weighted_gap = round((gap / max(cat_max, 1e-9)) * cat_weight, 4)
            template = TASK_LIBRARY.get(subkey, None)
            if template:
                task_title = template["task_title"]
                task_desc = template["task_description"]
                field_hints = template.get("field_hints", [])
            else:
                task_title = f"Improve {subkey}"
                task_desc = f"Close scoring gap in {subkey} for {investor_name}."
                field_hints = []

            tasks.append({
                "task_id": f"{subkey}_{slugify(task_title)}",
                "task_title": task_title,
                "task_description": f"For {investor_name}: {task_desc}",
                "task_points": round(gap, 4),
                "task_done": False,
                "task_value": weighted_gap,
                "task_type": "score_improvement",
                "subcategory_key": subkey,
                "category_key": cat_key,
                "field_hints": field_hints,
            })

    # Deduplicate by task_title and pick highest value
    best_by_title: Dict[str, Dict[str, Any]] = {}
    for t in tasks:
        title = t.get("task_title", "")
        cur = best_by_title.get(title)
        tv = to_float(t.get("task_value")) or 0.0
        if cur is None or tv > (to_float(cur.get("task_value")) or 0.0):
            best_by_title[title] = t

    deduped = list(best_by_title.values())
    deduped.sort(key=lambda x: (to_float(x.get("task_value")) or -1.0), reverse=True)
    return deduped[:max_tasks]

def deterministic_reasoning(result: Dict[str, Any], investor_obj: Dict[str, Any], tasks: List[Dict[str, Any]]) -> Dict[str, Any]:
    inv_name = investor_obj.get("investor", {}).get("name") or "the investor"
    eligible = bool(result.get("eligible"))
    fit = to_float(result.get("fit_score_0_to_100")) or 0.0
    fit_if = to_float(result.get("fit_score_if_eligible_0_to_100")) or fit

    top_cats = sorted(
        [(k, v.get("weighted_contribution", 0.0), v.get("percent", 0.0)) for k, v in (result.get("category_breakdown") or {}).items()],
        key=lambda x: x[1],
        reverse=True,
    )
    strongest = [x[0] for x in top_cats[:2]]
    weakest = [x[0] for x in top_cats[-2:]]

    if eligible:
        summary = (
            f"The startup is currently eligible for {inv_name}. "
            f"Fit score is {fit:.2f}/100. Strongest areas: {', '.join(strongest)}. "
            f"Primary improvement opportunities: {', '.join(weakest)}."
        )
    else:
        summary = (
            f"The startup is currently not eligible for {inv_name} due to hard-gate failures. "
            f"Current score is forced to 0.00, while the estimated score after gate resolution is {fit_if:.2f}/100."
        )

    top_tasks = [t.get("task_title") for t in tasks[:3] if t.get("task_title")]
    return {
        "overall_summary": summary,
        "what_is_working": strongest,
        "what_is_blocking": weakest,
        "priority_actions": top_tasks,
        "style": "deterministic_fallback",
    }

def llm_reasoning(
    router: Optional[LLMRouter],
    result: Dict[str, Any],
    startup_obj: Dict[str, Any],
    investor_obj: Dict[str, Any],
    tasks: List[Dict[str, Any]],
    provider: str = "gemini",
    model: Optional[str] = None,
) -> Dict[str, Any]:
    if router is None:
        return deterministic_reasoning(result, investor_obj, tasks)

    system = """
You are an investment analyst writing explainable startup-investor fit reasoning.
Write human-readable, concise, professional analysis.
Return ONLY JSON with keys:
{
  "overall_summary": "...",
  "investor_view": "...",
  "startup_view": "...",
  "key_strengths": ["..."],
  "key_risks": ["..."],
  "priority_actions": ["..."]
}
Requirements:
- Keep it practical and plain English.
- Mention hard gates if any.
- Do not mention internal rule names like A1/B2.
- Use concrete language tied to business facts.
"""
    payload = {
        "match_result": result,
        "startup": startup_obj.get("startup", {}),
        "investor": investor_obj.get("investor", {}),
        "top_tasks": tasks[:5],
    }

    try:
        data, used_provider, used_model = router.refine_json(
            system_prompt=system,
            user_payload=payload,
            provider=provider,
            model=model,
            fallback_to_gemini=True,
        )
        if isinstance(data, dict):
            data["style"] = "llm_generated"
            data["provider"] = used_provider
            data["model"] = used_model
            return data
    except Exception as e:
        fallback = deterministic_reasoning(result, investor_obj, tasks)
        fallback["llm_error"] = str(e)
        return fallback

    return deterministic_reasoning(result, investor_obj, tasks)


# ----------------------------
# Task completion overrides
# ----------------------------

def set_by_dotted_path(root: Dict[str, Any], dotted: str, value: Any) -> None:
    parts = [p for p in dotted.split(".") if p]
    if not parts:
        return
    cur = root
    for p in parts[:-1]:
        if p not in cur or not isinstance(cur[p], dict):
            cur[p] = {}
        cur = cur[p]
    cur[parts[-1]] = value

def apply_completed_tasks_overrides(startup_obj: Dict[str, Any], investor_obj: Dict[str, Any], completed_tasks_file: Optional[str]) -> Tuple[Dict[str, Any], Dict[str, Any], List[str]]:
    if not completed_tasks_file:
        return startup_obj, investor_obj, []
    if not os.path.exists(completed_tasks_file):
        log_warn(f"Completed tasks file not found: {completed_tasks_file}")
        return startup_obj, investor_obj, []

    try:
        payload = read_json(completed_tasks_file)
    except Exception as e:
        log_warn(f"Could not read completed tasks file: {e}")
        return startup_obj, investor_obj, []

    tasks = payload.get("tasks") if isinstance(payload, dict) else payload
    if not isinstance(tasks, list):
        return startup_obj, investor_obj, []

    startup_new = copy.deepcopy(startup_obj)
    investor_new = copy.deepcopy(investor_obj)
    applied = []

    for t in tasks:
        if not isinstance(t, dict):
            continue
        done = to_bool(t.get("task_done"))
        if done is not True:
            continue
        updates = t.get("field_updates", {})
        if not isinstance(updates, dict):
            continue
        for path, val in updates.items():
            p = str(path).strip()
            if p.startswith("startup."):
                set_by_dotted_path(startup_new, p, val)
                applied.append(p)
            elif p.startswith("investor."):
                set_by_dotted_path(investor_new, p, val)
                applied.append(p)
            else:
                # default to startup path when prefix absent
                set_by_dotted_path(startup_new, p, val)
                applied.append(p)

    return startup_new, investor_new, applied


# ----------------------------
# Commands
# ----------------------------

def build_startup_cmd(args):
    log_step("BUILD STARTUP THESIS JSON")
    log_info(f"Reading: apollo={args.apollo}, startup_kv={args.startup_kv}, readiness={args.readiness}")

    apollo = read_json(args.apollo)
    startup_kv = read_json(args.startup_kv)
    readiness = read_json(args.readiness)

    base = fill_startup_defaults(infer_startup_heuristic(apollo, startup_kv, readiness))
    s = base.get("startup", {})
    log_info(f"Heuristic snapshot | stage={s.get('stage_normalized')} | sectors={s.get('sectors_normalized')} | raise_target={s.get('raise', {}).get('target_raise_usd')}")

    if args.use_llm:
        router = maybe_llm_router(True, args.provider, args.model)
        try:
            final = refine_startup_with_llm(
                base, apollo, startup_kv, readiness, router,
                provider=args.provider,
                model=args.model or None,
                second_pass_gemini=args.second_pass_gemini,
                missing_threshold=args.missing_threshold_startup,
            )
            log_info("Startup LLM refinement completed.")
        except Exception as e:
            final = base
            final.setdefault("metadata", {})
            final["metadata"]["llm_refined"] = False
            final["metadata"]["llm_error"] = str(e)
            log_warn(f"Startup LLM refinement failed. Fallback heuristic. Error: {e}")
    else:
        final = base
        final.setdefault("metadata", {})
        final["metadata"]["llm_refined"] = False
        log_warn("Startup build in heuristic-only mode.")

    write_json(args.out, final)
    log_info(f"Wrote: {args.out}")
    return args.out

def build_investor_cmd(args):
    log_step("BUILD INVESTOR THESIS JSON")
    log_info(f"Reading investor data: {args.investor_data}")

    investor_data = read_json(args.investor_data)
    base = fill_investor_defaults(infer_investor_heuristic(investor_data))
    i = base.get("investor", {})
    log_info(f"Heuristic snapshot | name={i.get('name')} | stages={i.get('stage_focus_normalized')} | sectors={i.get('sector_focus_normalized')}")

    if args.use_llm:
        router = maybe_llm_router(True, args.provider, args.model)
        try:
            final = refine_investor_with_llm(
                base, investor_data, router,
                provider=args.provider,
                model=args.model or None,
                second_pass_gemini=args.second_pass_gemini,
                missing_threshold=args.missing_threshold_investor,
            )
            log_info("Investor LLM refinement completed.")
        except Exception as e:
            final = base
            final.setdefault("metadata", {})
            final["metadata"]["llm_refined"] = False
            final["metadata"]["llm_error"] = str(e)
            log_warn(f"Investor LLM refinement failed. Fallback heuristic. Error: {e}")
    else:
        final = base
        final.setdefault("metadata", {})
        final["metadata"]["llm_refined"] = False
        log_warn("Investor build in heuristic-only mode.")

    write_json(args.out, final)
    log_info(f"Wrote: {args.out}")
    return args.out

def match_cmd(args):
    log_step("MATCH STARTUP <-> INVESTOR")
    startup_obj = read_json(args.startup_thesis)
    investor_obj = read_json(args.investor_thesis)

    startup_obj, investor_obj, applied_updates = apply_completed_tasks_overrides(
        startup_obj, investor_obj, args.completed_tasks
    )
    if applied_updates:
        log_info(f"Applied completed task field updates: {len(applied_updates)} fields")

    rubric = None
    if args.rubric and os.path.exists(args.rubric):
        rubric = read_json(args.rubric)
        log_info(f"Rubric loaded: {args.rubric}")
    else:
        log_warn("Rubric not found. Using built-in fallback max/weights.")

    result = manual_match(startup_obj, investor_obj, rubric=rubric)

    # generate tasks and human reasoning in parallel
    tasks = []
    reasoning = {}
    router = maybe_llm_router(args.reasoning, args.reasoning_provider, args.reasoning_model)

    with ThreadPoolExecutor(max_workers=2) as ex:
        f_tasks = ex.submit(generate_improvement_tasks, result, startup_obj, investor_obj, args.max_tasks)
        f_reason = ex.submit(
            llm_reasoning,
            router,
            result,
            startup_obj,
            investor_obj,
            [],  # filled after tasks (fallback still works)
            args.reasoning_provider,
            args.reasoning_model or None,
        )
        tasks = f_tasks.result()
        # regenerate reasoning with actual tasks for better quality (cheap deterministic if llm disabled)
        reasoning = llm_reasoning(
            router,
            result,
            startup_obj,
            investor_obj,
            tasks,
            provider=args.reasoning_provider,
            model=args.reasoning_model or None,
        )

    result["tasks"] = tasks
    result["reasoning"] = reasoning
    result["task_engine_version"] = "v1"
    if applied_updates:
        result["completed_task_updates_applied"] = applied_updates

    write_json(args.out, result)
    log_info(f"Match output written: {args.out}")
    log_info(f"Eligible={result['eligible']} | Fit={result['fit_score_0_to_100']} | IfEligible={result.get('fit_score_if_eligible_0_to_100')}")

    if result.get("gate_fail_reasons"):
        log_warn("Gate fails:")
        for r in result["gate_fail_reasons"]:
            log_warn(f" - {r}")

    if args.verbose:
        log_step("CATEGORY BREAKDOWN")
        for ck, cv in result.get("category_breakdown", {}).items():
            print(f"[CAT] {ck}: raw={cv.get('raw_points')}/{cv.get('max_point')} | percent={cv.get('percent')}% | weight={cv.get('weight')} | weighted={cv.get('weighted_contribution')}")
            for sk, sv in cv.get("subcategories", {}).items():
                print(f"   - {sk}: {sv.get('points')}/{sv.get('max_points')} | {sv.get('reason')}")

    return args.out

def run_all_cmd(args):
    log_step("RUN FULL PIPELINE")
    os.makedirs(args.out_dir, exist_ok=True)

    startup_out = os.path.join(args.out_dir, "startup_thesis_fit.json")
    investor_out = os.path.join(args.out_dir, "investor_thesis_fit.json")
    match_out = os.path.join(args.out_dir, "match_result.json")

    # Step 1 & 2 in parallel
    log_info("Running startup + investor normalization in parallel...")
    with ThreadPoolExecutor(max_workers=2) as ex:
        f_startup = ex.submit(
            build_startup_cmd,
            argparse.Namespace(
                apollo=args.apollo,
                startup_kv=args.startup_kv,
                readiness=args.readiness,
                out=startup_out,
                use_llm=args.use_llm,
                provider=args.provider,
                model=args.model,
                second_pass_gemini=args.second_pass_gemini,
                missing_threshold_startup=args.missing_threshold_startup,
            ),
        )
        f_investor = ex.submit(
            build_investor_cmd,
            argparse.Namespace(
                investor_data=args.investor_data,
                out=investor_out,
                use_llm=args.use_llm,
                provider=args.provider,
                model=args.model,
                second_pass_gemini=args.second_pass_gemini,
                missing_threshold_investor=args.missing_threshold_investor,
            ),
        )
        # Propagate errors
        for f in as_completed([f_startup, f_investor]):
            _ = f.result()

    log_info("Running final match...")
    match_cmd(
        argparse.Namespace(
            startup_thesis=startup_out,
            investor_thesis=investor_out,
            rubric=args.rubric,
            out=match_out,
            verbose=args.verbose,
            reasoning=args.reasoning,
            reasoning_provider=args.reasoning_provider,
            reasoning_model=args.reasoning_model,
            max_tasks=args.max_tasks,
            completed_tasks=args.completed_tasks,
        )
    )

    log_step("PIPELINE COMPLETE")
    print(f"Startup JSON : {startup_out}")
    print(f"Investor JSON: {investor_out}")
    print(f"Match JSON   : {match_out}")
    return match_out


# ----------------------------
# CLI
# ----------------------------

# def build_parser():
#     p = argparse.ArgumentParser(
#         description="Advanced startup-investor thesis fit pipeline (LLM-assisted normalization + deterministic rubric scoring + task generation)."
#     )
#     sub = p.add_subparsers(dest="cmd", required=True)

#     common = argparse.ArgumentParser(add_help=False)
#     common.add_argument("--use-llm", dest="use_llm", action="store_true", default=True, help="Enable LLM refinement (default: enabled).")
#     common.add_argument("--no-llm", dest="use_llm", action="store_false", help="Disable LLM refinement and use heuristics only.")
#     common.add_argument(
#         "--provider",
#         type=str,
#         default=os.getenv("MATCH_LLM_PROVIDER", "auto"),
#         choices=["auto", "kimi", "gemini"],
#         help="LLM provider routing. auto = Kimi first, Gemini fallback.",
#     )
#     common.add_argument(
#         "--model",
#         type=str,
#         default=os.getenv("MATCH_LLM_MODEL", ""),
#         help="Model override for selected provider (optional).",
#     )
#     common.add_argument(
#         "--second-pass-gemini",
#         action="store_true",
#         default=True,
#         help="If first pass leaves many critical fields missing, run Gemini refinement pass.",
#     )
#     common.add_argument(
#         "--no-second-pass-gemini",
#         dest="second_pass_gemini",
#         action="store_false",
#         help="Disable second-pass Gemini recovery.",
#     )
#     common.add_argument("--missing-threshold-startup", type=float, default=0.45, help="Critical missing ratio threshold for startup second pass.")
#     common.add_argument("--missing-threshold-investor", type=float, default=0.40, help="Critical missing ratio threshold for investor second pass.")
#     common.add_argument("--verbose", action="store_true", help="Verbose logs including subcategory outputs.")

#     # match-time extras
#     match_extra = argparse.ArgumentParser(add_help=False)
#     match_extra.add_argument("--reasoning", dest="reasoning", action="store_true", default=True, help="Generate human-readable reasoning.")
#     match_extra.add_argument("--no-reasoning", dest="reasoning", action="store_false", help="Disable reasoning generation.")
#     match_extra.add_argument("--reasoning-provider", type=str, default=os.getenv("REASONING_PROVIDER", "gemini"), choices=["auto", "kimi", "gemini"], help="Provider for reasoning generation.")
#     match_extra.add_argument("--reasoning-model", type=str, default=os.getenv("REASONING_MODEL", "gemini-2.5-flash-lite"), help="Reasoning model.")
#     match_extra.add_argument("--max-tasks", type=int, default=12, help="Max number of improvement tasks in output.")
#     match_extra.add_argument("--completed-tasks", type=str, default=None, help="Optional JSON containing completed tasks with field_updates for rerun scoring.")

#     s = sub.add_parser("build-startup", parents=[common], help="Build startup_thesis_fit JSON.")
#     s.add_argument("--apollo", type=str, required=True)
#     s.add_argument("--startup-kv", type=str, required=True)
#     s.add_argument("--readiness", type=str, required=True)
#     s.add_argument("--out", type=str, default="startup_thesis_fit.json")
#     s.set_defaults(func=build_startup_cmd)

#     i = sub.add_parser("build-investor", parents=[common], help="Build investor_thesis_fit JSON.")
#     i.add_argument("--investor-data", type=str, required=True)
#     i.add_argument("--out", type=str, default="investor_thesis_fit.json")
#     i.set_defaults(func=build_investor_cmd)

#     m = sub.add_parser("match", parents=[match_extra], help="Deterministic match using rubric + tasks + reasoning.")
#     m.add_argument("--startup-thesis", type=str, required=True)
#     m.add_argument("--investor-thesis", type=str, required=True)
#     m.add_argument("--rubric", type=str, default="thesis_match_exact_field_based_v4.json")
#     m.add_argument("--out", type=str, default="match_result.json")
#     m.add_argument("--verbose", action="store_true")
#     m.set_defaults(func=match_cmd)

#     a = sub.add_parser("run-all", parents=[common, match_extra], help="Run full pipeline end-to-end.")
#     a.add_argument("--apollo", type=str, required=True)
#     a.add_argument("--startup-kv", type=str, required=True)
#     a.add_argument("--readiness", type=str, required=True)
#     a.add_argument("--investor-data", type=str, required=True)
#     a.add_argument("--rubric", type=str, default="thesis_match_exact_field_based_v4.json")
#     a.add_argument("--out-dir", type=str, default="outputs")
#     a.set_defaults(func=run_all_cmd)

#     return p


# def main():
#     init_env()
#     parser = build_parser()
#     args = parser.parse_args()
#     log_info(f"Command: {args.cmd}")
#     try:
#         args.func(args)
#     except Exception as e:
#         log_warn(f"Pipeline failed: {e}")
#         traceback.print_exc()
#         raise


# if __name__ == "__main__":
#     main()

