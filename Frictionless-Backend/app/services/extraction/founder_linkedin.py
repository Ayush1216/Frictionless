"""Grounded founder/team extractor via Gemini + Google Search."""
from __future__ import annotations

import hashlib
import json
import logging
import os
import random
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Tuple
from urllib.parse import urlparse, urlunparse

from google import genai
from google.genai import types

log = logging.getLogger(__name__)

MODEL_NAME = "gemini-3-flash-preview"
MAX_WORKERS = 2
MAX_RETRIES = 6
BASE_SLEEP = 1.5
MAX_SLEEP = 25.0
_RETRYABLE = (
    "503", "UNAVAILABLE", "deadline", "timed out", "timeout",
    "429", "RESOURCE_EXHAUSTED", "INTERNAL",
)


def _sanitize_linkedin(url: str) -> str:
    if not url:
        return ""
    u = re.sub(r"\s+", "", url.strip())
    if not re.match(r"^https?://", u, re.I):
        u = "https://" + u
    try:
        p = urlparse(u)
    except Exception:
        return ""
    netloc = re.sub(r"^(www\.)+", "", (p.netloc or "").lower())
    if "linkedin.com" not in netloc:
        return ""
    path = re.sub(r"/{2,}", "/", p.path or "")
    if path and not path.startswith("/"):
        path = "/" + path
    return urlunparse(("https", "www.linkedin.com", path, "", "", ""))


def _is_person_linkedin(url: str) -> bool:
    u = _sanitize_linkedin(url).lower()
    return bool(u) and u.startswith("https://www.linkedin.com/in/") and "/company/" not in u


def _is_company_linkedin(url: str) -> bool:
    return _sanitize_linkedin(url).lower().startswith("https://www.linkedin.com/company/")


def _extract_json(text: str) -> Dict[str, Any]:
    if not text:
        return {}
    s = re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=re.I)
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


def _norm(x: Any) -> Any:
    if isinstance(x, dict):
        return {k: _norm(v) for k, v in x.items()}
    if isinstance(x, list):
        return [_norm(v) for v in x]
    if x is None:
        return ""
    if isinstance(x, str) and x.strip().lower() in {
        "unknown", "n/a", "na", "none", "null", "not available", "not found",
    }:
        return ""
    return x


def _grounding_urls(response: Any) -> List[Dict[str, str]]:
    out: List[Dict[str, str]] = []
    seen: set = set()
    try:
        cands = getattr(response, "candidates", None) or []
        if not cands:
            return out
        gm = getattr(cands[0], "grounding_metadata", None)
        for ch in getattr(gm, "grounding_chunks", None) or []:
            web = getattr(ch, "web", None)
            if not web:
                continue
            title = (getattr(web, "title", "") or "").strip()
            uri = (getattr(web, "uri", "") or "").strip()
            if uri and (title, uri) not in seen:
                seen.add((title, uri))
                out.append({"title": title, "url": uri})
    except Exception:
        pass
    return out


def _is_retryable(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(h.lower() in msg for h in _RETRYABLE)


def _gemini_call(
    client: genai.Client,
    contents: str,
    tools: List[types.Tool],
    max_tokens: int,
) -> Any:
    last_exc: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            return client.models.generate_content(
                model=MODEL_NAME,
                contents=contents,
                config=types.GenerateContentConfig(
                    tools=tools,
                    temperature=0.0,
                    top_p=0.85,
                    max_output_tokens=max_tokens,
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(
                        disable=True,
                    ),
                ),
            )
        except Exception as e:
            last_exc = e
            if not _is_retryable(e):
                raise
            sleep = min(MAX_SLEEP, BASE_SLEEP * 2**attempt) + random.uniform(0, 1.0)
            log.warning("Retry %d/%d in %.1fs: %s", attempt + 1, MAX_RETRIES, sleep, str(e)[:120])
            time.sleep(sleep)
    raise RuntimeError(f"Gemini retries exhausted. Last: {last_exc}")


_PERSON_SCHEMA = """{
  "full_name": "",
  "first_name": "",
  "last_name": "",
  "title": "",
  "linkedin_url": "",
  "location": "",
  "summary": "",
  "profile_image_url": "",
  "education": [
    {"university": "", "degree": "", "field_of_study": "", "start_year": "", "end_year": ""}
  ],
  "work_experience": [
    {"company": "", "position": "", "start_year": "", "end_year": "", "is_current": ""}
  ]
}"""

_SECTION_CFG: Dict[str, Tuple[str, str, int]] = {
    "founders": (
        """Find ALL founders and co-founders of this company.
CRITICAL: You MUST return at least one founder. An empty list is NOT acceptable.
Search: Crunchbase, Company LinkedIn, website /about /team, press, LinkedIn search.
Include each person's full background, education, and work experience.""",
        "founders",
        4096,
    ),
    "leadership": (
        """Find ALL leadership/executive team members. CEO, CTO, COO, CFO, CMO, VP, etc.
Search company LinkedIn /people, website team page, Crunchbase.
Do NOT include founders again. Include full background for each.""",
        "leadership_team",
        4096,
    ),
}


def _call_section(
    client: genai.Client,
    linkedin: str,
    name: str,
    section: str,
) -> Tuple[str, Dict[str, Any], List[Dict[str, str]]]:
    instruction, key, budget = _SECTION_CFG[section]
    ctx_parts = []
    if linkedin:
        ctx_parts.append(f"Company LinkedIn URL: {linkedin}")
    if name:
        ctx_parts.append(f"Company Name: {name}")
    ctx = "\n".join(ctx_parts)
    prompt = f"""You are a thorough people-research engine. Use Google Search grounding.
{ctx}
TASK:
{instruction}
OUTPUT RULES:
1) Return ONLY valid JSON. 2) Schema: {{"{key}": [{_PERSON_SCHEMA}]}}
3) linkedin_url MUST be personal /in/ profile. 4) Return as many people as you can find."""
    if key == "founders":
        prompt += "\n5) NEVER return empty founders array. If no explicit founder, include CEO."
    tools = [types.Tool(google_search=types.GoogleSearch())]
    resp = _gemini_call(client, prompt, tools, budget)
    raw = ""
    if hasattr(resp, "text") and resp.text:
        raw = resp.text
    elif hasattr(resp, "candidates") and resp.candidates:
        parts = resp.candidates[0].content.parts if resp.candidates[0].content else []
        for part in parts:
            if hasattr(part, "text") and part.text:
                raw += part.text
    log.info("  [%s] raw response length: %d chars", section, len(raw))
    return section, _extract_json(raw), _grounding_urls(resp)


def _clean_edu(edu: Any) -> List[Dict[str, str]]:
    if not isinstance(edu, list):
        return []
    return [
        {
            "university": e.get("university", "") or "",
            "degree": e.get("degree", "") or "",
            "field_of_study": e.get("field_of_study", "") or "",
            "start_year": e.get("start_year", "") or "",
            "end_year": e.get("end_year", "") or "",
        }
        for e in edu
        if isinstance(e, dict)
    ]


def _clean_work(work: Any) -> List[Dict[str, Any]]:
    if not isinstance(work, list):
        return []
    out = []
    for w in work:
        if not isinstance(w, dict):
            continue
        ic = w.get("is_current", "")
        out.append({
            "company": w.get("company", "") or "",
            "position": w.get("position", "") or "",
            "start_year": w.get("start_year", "") or "",
            "end_year": w.get("end_year", "") or "",
            "is_current": ic if ic in (True, False, "") else "",
        })
    return out


def _clean_people(arr: Any) -> List[Dict[str, Any]]:
    if not isinstance(arr, list):
        return []
    out: List[Dict[str, Any]] = []
    seen: set = set()
    for p in arr:
        if not isinstance(p, dict):
            continue
        li = _sanitize_linkedin(p.get("linkedin_url", "") or "")
        if li and not _is_person_linkedin(li):
            li = ""
        person = _norm({
            "full_name": p.get("full_name", "") or "",
            "first_name": p.get("first_name", "") or "",
            "last_name": p.get("last_name", "") or "",
            "title": p.get("title", "") or "",
            "linkedin_url": li,
            "location": p.get("location", "") or "",
            "summary": p.get("summary", "") or "",
            "education": _clean_edu(p.get("education", [])),
            "work_experience": _clean_work(p.get("work_experience", []))
        })
        if not person["full_name"]:
            continue
        key = person["linkedin_url"].lower() if person["linkedin_url"] else f'{person["full_name"].lower()}|{person["title"].lower()}'
        if key not in seen:
            seen.add(key)
            out.append(person)
    return out


def run(
    company_linkedin: str,
    company_name: str,
    output_path: str,
) -> Dict[str, Any]:
    """Extract founder/leadership data. Returns dict."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise ValueError("Missing GEMINI_API_KEY")
    company_linkedin = _sanitize_linkedin(company_linkedin)
    if company_linkedin and not _is_company_linkedin(company_linkedin):
        raise ValueError(f"Invalid company LinkedIn: {company_linkedin}")
    client = genai.Client(api_key=api_key)
    defaults = {"founders": {"founders": []}, "leadership": {"leadership_team": []}}
    payloads: Dict[str, Dict[str, Any]] = {}
    sources: List[Dict[str, str]] = []
    errors: Dict[str, str] = {}
    log.info("Starting founder extraction …")
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futs = {pool.submit(_call_section, client, company_linkedin, company_name, s): s for s in defaults}
        for f in as_completed(futs):
            s = futs[f]
            try:
                _, data, srcs = f.result()
                payloads[s] = data
                sources.extend(srcs)
            except Exception as e:
                log.error("  [%s] failed: %s", s, e)
                errors[s] = str(e)
                payloads[s] = defaults[s]
    for s in defaults:
        payloads.setdefault(s, defaults[s])
    seen_urls: set = set()
    uniq_sources = []
    for s in sources:
        k = (s.get("title", ""), s.get("url", ""))
        if k not in seen_urls:
            seen_urls.add(k)
            uniq_sources.append(s)
    founders = _clean_people(payloads["founders"].get("founders", []))
    leadership = _clean_people(payloads["leadership"].get("leadership_team", []))
    final = _norm({
        "model_used": MODEL_NAME,
        "data": {
            "company_name": company_name or "",
            "company_linkedin_url": company_linkedin or "",
            "founders": founders,
            "leadership_team": leadership,
            "notes": "",
            "sources": uniq_sources,
        },
        "errors": errors,
    })
    from pathlib import Path
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(final, f, indent=2, ensure_ascii=False)
    log.info("Founder data → %s (founders=%d, leadership=%d)", output_path, len(founders), len(leadership))
    return final


def _identity_key(linkedin_url: str) -> str:
    """Deterministic identity key from normalized LinkedIn URL."""
    u = _sanitize_linkedin(linkedin_url).lower()
    return hashlib.sha256(u.encode()).hexdigest()


def _confidence_score(person: Dict[str, Any], evidence_links: List[Dict[str, str]]) -> float:
    """Compute confidence 0-1 from profile completeness and evidence."""
    score = 0.0
    if person.get("full_name"):
        score += 0.3
    if person.get("title"):
        score += 0.2
    if person.get("work_experience") and len(person["work_experience"]) > 0:
        score += 0.2
    if person.get("profile_image_url") or person.get("summary"):
        score += 0.1
    # Evidence from grounding boosts confidence
    if evidence_links:
        score += min(0.3, 0.1 * len(evidence_links))
    return min(1.0, score)


def run_person_profile(
    linkedin_url: str,
    company_domain: str | None = None,
    company_name: str | None = None,
) -> Dict[str, Any]:
    """Fetch and extract a single person's profile from a LinkedIn /in/ URL.
    Returns dict with: person, confidence_score, evidence_links, identity_key."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise ValueError("Missing GEMINI_API_KEY")
    url = _sanitize_linkedin(linkedin_url)
    if not url or not _is_person_linkedin(url):
        raise ValueError(f"Invalid person LinkedIn URL: must be linkedin.com/in/... (got {linkedin_url!r})")
    client = genai.Client(api_key=api_key)

    ctx = f"LinkedIn profile URL: {url}"
    if company_domain:
        ctx += f"\nCompany domain (for disambiguation): {company_domain}"
    if company_name:
        ctx += f"\nCompany name (for disambiguation): {company_name}"

    prompt = f"""You are a people-research engine. Use Google Search grounding to find this person's public profile.
{ctx}

TASK: Extract this person's profile so it can be stored alongside founders and leadership. Return ONLY valid JSON (no markdown, no backticks) with exactly this schema:
{_PERSON_SCHEMA}

RULES:
1. Search for the person by name and/or LinkedIn URL. Use the same field names and structure as above so the data displays correctly in the app.
2. full_name, first_name, last_name, title, location, summary: fill from profile or search results.
3. profile_image_url: Search for this person's LinkedIn profile/headshot image. Use a direct image URL (e.g. media.licdn.com) if found; otherwise set to "".
4. education: array of objects with university, degree, field_of_study, start_year, end_year.
5. work_experience: array of objects with company, position, start_year, end_year, is_current.
6. linkedin_url: use the normalized person URL (https://www.linkedin.com/in/...). Do not use a company page URL.
7. Ensure the person matches the LinkedIn URL - avoid attaching a different person with the same name."""
    tools = [types.Tool(google_search=types.GoogleSearch())]
    resp = _gemini_call(client, prompt, tools, 4096)
    raw = ""
    if hasattr(resp, "text") and resp.text:
        raw = resp.text
    elif hasattr(resp, "candidates") and resp.candidates:
        parts = resp.candidates[0].content.parts if resp.candidates[0].content else []
        for part in parts:
            if hasattr(part, "text") and part.text:
                raw += part.text
    data = _extract_json(raw)
    if not data:
        raise ValueError("Empty or invalid profile response from search")
    person = _norm({
        "full_name": data.get("full_name", "") or "",
        "first_name": data.get("first_name", "") or "",
        "last_name": data.get("last_name", "") or "",
        "title": data.get("title", "") or "",
        "linkedin_url": url,
        "location": data.get("location", "") or "",
        "summary": data.get("summary", "") or "",
        "profile_image_url": data.get("profile_image_url", "") or "",
        "education": _clean_edu(data.get("education", [])),
        "work_experience": _clean_work(data.get("work_experience", [])),
    })
    if not person["full_name"]:
        person["full_name"] = (person["first_name"] + " " + person["last_name"]).strip() or "Unknown"

    evidence_links = _grounding_urls(resp)
    identity_key = _identity_key(url)
    confidence = _confidence_score(person, evidence_links)

    log.info("Person profile fetched: %s confidence=%.2f", person.get("full_name"), confidence)
    return {
        "person": person,
        "confidence_score": round(confidence, 2),
        "evidence_links": evidence_links,
        "identity_key": identity_key,
    }
