"""Gemini-based company enrichment fallback when Apollo fails.

Uses Gemini with Google Search grounding to gather company data from the web,
producing a dict compatible with the Apollo enrichment schema so downstream
consumers (extraction pipeline, readiness scoring, investor matching) work
unchanged.
"""

import json
import logging
import os
import re
from typing import Optional

import httpx

log = logging.getLogger("gemini_enrichment")


def _scrape_website(url: str, max_chars: int = 8000) -> str:
    """Fetch a company website and return cleaned text."""
    try:
        with httpx.Client(timeout=15.0, follow_redirects=True) as client:
            resp = client.get(
                url,
                headers={"User-Agent": "Mozilla/5.0 (compatible; FrictionlessBot/1.0)"},
            )
            if resp.status_code == 200:
                raw = re.sub(r"<script[^>]*>[\s\S]*?</script>", " ", resp.text, flags=re.IGNORECASE)
                raw = re.sub(r"<style[^>]*>[\s\S]*?</style>", " ", raw, flags=re.IGNORECASE)
                raw = re.sub(r"<[^>]+>", " ", raw)
                raw = re.sub(r"\s+", " ", raw).strip()
                return raw[:max_chars]
    except Exception as e:
        log.warning("Website scrape failed for %s: %s", url, e)
    return ""


async def enrich_with_gemini(domain: str, website_url: str) -> Optional[dict]:
    """Use Gemini with Google Search grounding to enrich company data.

    Returns a dict shaped like an Apollo organization response so downstream
    code can consume it transparently.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        log.error("GEMINI_API_KEY not set — cannot run Gemini enrichment fallback")
        return None

    # Step 1: scrape website for context
    website_text = _scrape_website(website_url)
    site_context = f"\nWebsite content snippet:\n{website_text}\n" if website_text else ""

    # Step 2: call Gemini with Google Search grounding
    try:
        from google import genai
        from google.genai import types

        prompt = (
            f"You are a company research analyst. Research the company at {domain} "
            f"({website_url}) and return a structured JSON profile.\n"
            f"{site_context}\n"
            f"Return ONLY a valid JSON object with these fields (use null for unknown):\n"
            f'{{\n'
            f'  "name": "Company Name",\n'
            f'  "website_url": "{website_url}",\n'
            f'  "primary_domain": "{domain}",\n'
            f'  "linkedin_url": "https://linkedin.com/company/...",\n'
            f'  "industry": "Industry name",\n'
            f'  "short_description": "One-line description",\n'
            f'  "long_description": "2-3 sentence description",\n'
            f'  "founded_year": 2020,\n'
            f'  "estimated_num_employees": 50,\n'
            f'  "city": "City",\n'
            f'  "state": "State",\n'
            f'  "country": "Country",\n'
            f'  "total_funding": 5000000,\n'
            f'  "latest_funding_round_type": "Seed",\n'
            f'  "keywords": ["keyword1", "keyword2"],\n'
            f'  "technologies": ["tech1", "tech2"],\n'
            f'  "phone": null,\n'
            f'  "publicly_traded_symbol": null,\n'
            f'  "publicly_traded_exchange": null,\n'
            f'  "logo_url": null,\n'
            f'  "twitter_url": null,\n'
            f'  "facebook_url": null,\n'
            f'  "blog_url": null,\n'
            f'  "angellist_url": null,\n'
            f'  "crunchbase_url": null\n'
            f'}}\n\n'
            f"Return ONLY valid JSON, no markdown fences, no explanation."
        )

        client = genai.Client(api_key=api_key)
        resp = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=2048,
                tools=[types.Tool(google_search=types.GoogleSearch())],
            ),
        )

        text = (getattr(resp, "text", None) or "").strip()
        # Strip markdown fences if present
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            data = json.loads(text[start : end + 1])
        else:
            log.error("No JSON found in Gemini enrichment response")
            return None

        # Ensure critical fields
        data.setdefault("primary_domain", domain)
        data.setdefault("website_url", website_url)
        data["_enrichment_source"] = "gemini_grounded_search"

        log.info(
            "Gemini enrichment succeeded for %s: name=%s",
            domain,
            data.get("name"),
        )
        return data

    except Exception as e:
        log.exception("Gemini enrichment failed for %s: %s", domain, e)
        return None
