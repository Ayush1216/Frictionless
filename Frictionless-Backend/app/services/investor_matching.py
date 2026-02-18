"""Investor matching service.

Wraps thesis_fit_pipeline_v2.py functions to:
1. Generate a startup thesis profile from Supabase data.
2. Run deterministic investor matching against investor_universal_profiles.
3. Store results in startup_investor_matches.

Key tables:
  - startup_thesis_fit_profiles   (jsonb: thesis_profile)
  - investor_universal_profiles   (jsonb: normalized_thesis_json)
  - startup_investor_matches      (jsonb: investor_profile, category_breakdown, gate_fail_reasons)
"""
import json
import logging
import os
import sys
import time
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional

# Add project root so we can import thesis_fit_pipeline_v2
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from thesis_fit_pipeline_v2 import (
    LLMRouter,
    fill_investor_defaults,
    fill_startup_defaults,
    infer_investor_heuristic,
    infer_startup_heuristic,
    manual_match,
    now_utc_iso,
    refine_startup_with_llm,
)

log = logging.getLogger("investor_matching")

# ---------------------------------------------------------------------------
# FILE-BASED LOGGING — writes to investor_pipeline.log in backend root
# This is the RELIABLE way to see output even if terminal buffers stdout
# ---------------------------------------------------------------------------
_BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_LOG_FILE = os.path.join(_BACKEND_ROOT, "investor_pipeline.log")

# Set up a dedicated file logger
_file_logger = logging.getLogger("investor_pipeline_file")
_file_logger.setLevel(logging.DEBUG)
_file_logger.propagate = False
if not _file_logger.handlers:
    _fh = logging.FileHandler(_LOG_FILE, mode="a", encoding="utf-8")
    _fh.setLevel(logging.DEBUG)
    _fh.setFormatter(logging.Formatter("%(asctime)s │ %(message)s", datefmt="%Y-%m-%d %H:%M:%S"))
    _file_logger.addHandler(_fh)

def _p(msg: str):
    """Log to BOTH the log file and stdout/stderr."""
    # Always write to log file (most reliable)
    _file_logger.info(msg)
    # Also try stdout + stderr for terminal visibility
    try:
        sys.stdout.write(msg + "\n")
        sys.stdout.flush()
    except Exception:
        pass
    try:
        sys.stderr.write(msg + "\n")
        sys.stderr.flush()
    except Exception:
        pass

def _print_banner(text: str, width: int = 60):
    _p(f"\n{'=' * width}")
    _p(f"  {text}")
    _p(f"{'=' * width}")

def _print_section(text: str):
    _p(f"\n{'─' * 50}")
    _p(f"  {text}")
    _p(f"{'─' * 50}")

def _print_step(step: int, total: int, text: str):
    _p(f"  [{step}/{total}] {text}")

def _score_bar(score: float, width: int = 20) -> str:
    filled = int((score / 100) * width)
    bar = "█" * filled + "░" * (width - filled)
    if score >= 86:
        label = "Excellent"
    elif score >= 80:
        label = "Good"
    else:
        label = "Needs Work"
    return f"{bar} {score:5.1f}  ({label})"

def _format_duration(seconds: float) -> str:
    if seconds < 1:
        return f"{seconds * 1000:.0f}ms"
    elif seconds < 60:
        return f"{seconds:.1f}s"
    else:
        m, s = divmod(int(seconds), 60)
        return f"{m}m {s}s"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _safe_json(raw: Any) -> Any:
    """Decode a value that might be a JSON string (or even double-encoded)."""
    if isinstance(raw, (dict, list)):
        return raw
    if not isinstance(raw, str):
        return raw or {}
    try:
        parsed = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return {}
    if isinstance(parsed, str):
        try:
            parsed = json.loads(parsed)
        except (json.JSONDecodeError, TypeError):
            pass
    return parsed if parsed else {}


def _extract_logo_url(inv_row: Dict[str, Any]) -> Optional[str]:
    meta = _safe_json(inv_row.get("metadata_json"))
    if isinstance(meta, dict) and meta.get("logo_public_url"):
        return meta["logo_public_url"]
    raw = _safe_json(inv_row.get("raw_profile_json"))
    if isinstance(raw, dict) and raw.get("logo_url"):
        return raw["logo_url"]
    return None


def _parse_investor_thesis(raw_row: Dict[str, Any]) -> Dict[str, Any]:
    thesis = _safe_json(raw_row.get("normalized_thesis_json"))
    if isinstance(thesis, dict) and ("investor" in thesis or "stage_focus_normalized" in thesis):
        if "investor" not in thesis:
            thesis = {"investor": thesis}
        return thesis
    return infer_investor_heuristic(raw_row)


def _build_investor_profile(inv_row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": inv_row.get("id"),
        "name": inv_row.get("investor_name"),
        "logo_url": _extract_logo_url(inv_row),
        "city": inv_row.get("investor_hq_city"),
        "state": inv_row.get("investor_hq_state"),
        "country": inv_row.get("investor_hq_country"),
        "website": inv_row.get("investor_url"),
        "investor_type": inv_row.get("investor_type"),
        "check_min_usd": inv_row.get("investor_minimum_check_usd"),
        "check_max_usd": inv_row.get("investor_maximum_check_usd"),
        "check_typical_usd": inv_row.get("investor_typical_check_usd"),
        "stages": inv_row.get("investor_stages"),
        "sectors": inv_row.get("investor_sectors"),
    }


def _match_single_investor(
    startup_profile: Dict[str, Any], inv_row: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """Score a single investor against the startup. Thread-safe."""
    try:
        investor_thesis = _parse_investor_thesis(inv_row)
        investor_thesis = fill_investor_defaults(investor_thesis)
        result = manual_match(startup_profile, investor_thesis)
        result["investor_id"] = inv_row.get("id")
        result["investor_name"] = inv_row.get("investor_name") or "Unknown"
        result["investor_profile"] = _build_investor_profile(inv_row)
        return result
    except Exception as e:
        log.warning("Matching failed for investor %s (%s): %s",
                    inv_row.get("id"), inv_row.get("investor_name"), e)
        return None


_INVESTOR_MATCH_COLUMNS = (
    "id, investor_name, investor_type, "
    "investor_hq_city, investor_hq_state, investor_hq_country, "
    "investor_url, investor_linkedin_url, "
    "investor_minimum_check_usd, investor_maximum_check_usd, investor_typical_check_usd, "
    "investor_stages, investor_sectors, investor_geography_focus, "
    "investor_aum_usd, investor_lead_or_follow, investor_active_status, "
    "investor_founded_year, investor_portfolio_size, investor_ticket_style, "
    "investor_stage_keywords, investor_sector_keywords, "
    "investor_prefers_b2b, investor_prefers_b2c, "
    "normalized_thesis_json, metadata_json, raw_profile_json"
)


def _fetch_investors_by_location(
    supabase,
    city: Optional[str],
    state: Optional[str],
    country: Optional[str],
    limit: int = 1000,
) -> List[Dict[str, Any]]:
    """Progressive location expansion: city -> state -> country -> global."""
    results: List[Dict[str, Any]] = []
    seen_ids: set = set()
    PAGE_SIZE = 1000

    def _query_paginated(filters: Dict[str, str], remaining: int) -> List[Dict[str, Any]]:
        all_rows: List[Dict[str, Any]] = []
        offset = 0
        while len(all_rows) < remaining:
            page_limit = min(PAGE_SIZE, remaining - len(all_rows))
            q = supabase.table("investor_universal_profiles").select(
                _INVESTOR_MATCH_COLUMNS, count="exact"
            ).ilike("investor_active_status", "active")
            for col, val in filters.items():
                q = q.ilike(col, val)
            q = q.range(offset, offset + page_limit - 1)
            try:
                resp = q.execute()
            except Exception as e:
                _p(f"    ERROR fetching page (offset={offset}): {e}")
                log.warning("Investor fetch page failed (offset=%d): %s", offset, e)
                break
            rows = resp.data if resp and resp.data else []
            if not rows:
                break
            all_rows.extend(rows)
            offset += len(rows)
            if len(rows) < page_limit:
                break
        return all_rows

    tiers = []
    tier_labels = []
    if city:
        tiers.append({"investor_hq_city": city})
        tier_labels.append(f"City: {city}")
    if state:
        tiers.append({"investor_hq_state": state})
        tier_labels.append(f"State: {state}")
    if country:
        tiers.append({"investor_hq_country": country})
        tier_labels.append(f"Country: {country}")
    tiers.append({})
    tier_labels.append("Global (all)")

    for i, (filters, label) in enumerate(zip(tiers, tier_labels)):
        if len(results) >= limit:
            break
        remaining = limit - len(results)
        rows = _query_paginated(filters, remaining)
        new_count = 0
        for r in rows:
            rid = r.get("id")
            if rid and rid not in seen_ids:
                seen_ids.add(rid)
                results.append(r)
                new_count += 1
                if len(results) >= limit:
                    break
        _p(f"    Tier {i+1}/{len(tiers)} [{label}]: +{new_count} investors (total: {len(results)})")

    log.info("Fetched %d unique investors across %d location tiers (limit=%d)", len(results), len(tiers), limit)
    return results[:limit]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_startup_thesis_profile(
    supabase, org_id: str, use_llm: bool = True
) -> Dict[str, Any]:
    """Build a startup thesis profile from Supabase data and store it."""
    t0 = time.time()
    _print_banner("GENERATING STARTUP THESIS PROFILE")
    _p(f"  Org ID:   {org_id}")
    _p(f"  LLM:      {'OpenAI (enabled)' if use_llm else 'disabled (heuristic only)'}")

    # Fetch source data
    _print_step(1, 4, "Fetching Apollo enrichment data...")
    try:
        apollo_resp = supabase.table("apollo_organization_enrichment").select("raw_data").eq("org_id", org_id).limit(1).execute()
        apollo = _safe_json((apollo_resp.data[0].get("raw_data") if apollo_resp.data else None) or {})
    except Exception as e:
        _p(f"    ERROR fetching Apollo: {e}")
        apollo = {}
    company_name = apollo.get("name", "Unknown") if isinstance(apollo, dict) else "Unknown"
    _p(f"           Company: {company_name}")

    _print_step(2, 4, "Fetching extraction + readiness data...")
    try:
        extraction_resp = supabase.table("startup_extraction_results").select("extraction_data").eq("org_id", org_id).limit(1).execute()
        extraction = _safe_json((extraction_resp.data[0].get("extraction_data") if extraction_resp.data else None) or {})
    except Exception as e:
        _p(f"    ERROR fetching extraction: {e}")
        extraction = {}
    _p(f"           Extraction: {'found' if extraction else 'empty'}")

    try:
        readiness_resp = supabase.table("startup_readiness_results").select("scored_rubric, score_summary").eq("org_id", org_id).limit(1).execute()
        readiness_row = readiness_resp.data[0] if readiness_resp.data else {}
        readiness = _safe_json(readiness_row.get("scored_rubric") or {})
    except Exception as e:
        _p(f"    ERROR fetching readiness: {e}")
        readiness = {}
    _p(f"           Readiness: {'found' if readiness else 'empty'}")

    # --- Flatten nested extraction data so the heuristic can find fields ---
    # The extraction_data has nested structure like:
    #   startup_kv.initial_details.{industry, hq_city, business_model, ...}
    #   startup_kv.financial_data.{arr_usd, funding_stage, ...}
    #   startup_kv.founder_and_other_data.{founders, founder_count, ...}
    #   founder_linkedin.data.{founders: [{location, ...}], ...}
    # But infer_startup_heuristic expects flat top-level keys.
    extraction_flat = {}
    if isinstance(extraction, dict):
        # Merge startup_kv sub-dicts into flat namespace
        skv = _safe_json(extraction.get("startup_kv")) or {}
        if isinstance(skv, dict):
            for sub_key in ("initial_details", "financial_data", "founder_and_other_data"):
                sub = skv.get(sub_key)
                if isinstance(sub, dict):
                    extraction_flat.update({k: v for k, v in sub.items() if v not in (None, "", [], {})})

        # Extract founder location from founder_linkedin if HQ is missing
        if not extraction_flat.get("hq_city"):
            fl = _safe_json(extraction.get("founder_linkedin")) or {}
            fl_data = fl.get("data", fl) if isinstance(fl, dict) else {}
            founders_list = fl_data.get("founders", []) if isinstance(fl_data, dict) else []
            if isinstance(founders_list, list):
                for f in founders_list:
                    if not isinstance(f, dict):
                        continue
                    loc = f.get("location", "")
                    if loc and "," in loc:
                        parts = [p.strip() for p in loc.split(",")]
                        if len(parts) >= 2:
                            extraction_flat.setdefault("hq_city", parts[0])
                            extraction_flat.setdefault("hq_state", parts[1])
                            extraction_flat.setdefault("hq_country", "US")
                            break

        # Also include any top-level extraction fields
        for k, v in extraction.items():
            if k not in ("startup_kv", "founder_linkedin", "charts", "meta", "task_results",
                         "timings_seconds", "ocr_file", "ocr_storage_path") and v not in (None, "", [], {}):
                if isinstance(v, (str, int, float, bool)):
                    extraction_flat.setdefault(k, v)

    _p(f"           Flattened extraction fields: {len(extraction_flat)}")
    if extraction_flat.get("name"):
        _p(f"           Company: {extraction_flat.get('name')}")
    if extraction_flat.get("industry"):
        _p(f"           Industry: {extraction_flat.get('industry')}")
    if extraction_flat.get("hq_city"):
        _p(f"           HQ: {extraction_flat.get('hq_city')}, {extraction_flat.get('hq_state', '?')}")

    # Step 3: heuristic inference
    _print_step(3, 4, "Running heuristic inference + filling defaults...")
    try:
        heuristic = infer_startup_heuristic(apollo, extraction_flat, readiness)
        profile = fill_startup_defaults(heuristic)
    except Exception as e:
        _p(f"    ERROR in heuristic inference: {e}")
        _p(traceback.format_exc())
        profile = {"startup": {}, "metadata": {"error": str(e)}}

    startup = profile.get("startup", {})
    _p(f"           Sector: {startup.get('primary_sector', 'N/A')}")
    _p(f"           Stage:  {startup.get('funding_stage', 'N/A')}")
    _p(f"           HQ:     {startup.get('hq_city', '?')}, {startup.get('hq_state', '?')}, {startup.get('hq_country', '?')}")

    # Step 4: LLM refinement via OpenAI (was Kimi, now OpenAI)
    if use_llm:
        _print_step(4, 4, "Refining with LLM (OpenAI gpt-4o-mini)...")
        try:
            router = LLMRouter(provider="openai")
            profile = refine_startup_with_llm(profile, apollo, extraction, readiness, router)
            provider_used = profile.get("metadata", {}).get("llm_provider", "?")
            model_used = profile.get("metadata", {}).get("llm_model", "?")
            _p(f"           LLM refinement: SUCCESS (provider={provider_used}, model={model_used})")
        except Exception as e:
            _p(f"           LLM refinement: FAILED — {e}")
            _p(f"           Continuing with heuristic-only profile")
            log.warning("LLM refinement failed for org %s, using heuristic only: %s", org_id, e)
            profile.setdefault("metadata", {})
            profile["metadata"]["llm_error"] = str(e)
    else:
        _print_step(4, 4, "Skipping LLM refinement (disabled)")

    # Store in Supabase
    row = {
        "org_id": org_id,
        "thesis_profile": profile,
        "generated_at": now_utc_iso(),
        "generator": profile.get("metadata", {}).get("generator", "heuristic_startup_builder_v2"),
        "llm_refined": profile.get("metadata", {}).get("llm_refined", False),
    }
    try:
        supabase.table("startup_thesis_fit_profiles").upsert(row, on_conflict="org_id").execute()
        elapsed = time.time() - t0
        _p(f"\n  Thesis profile SAVED for {company_name} ({_format_duration(elapsed)})")
        log.info("Startup thesis profile stored for org %s", org_id)
    except Exception as e:
        _p(f"\n  ERROR saving thesis profile: {e}")
        log.warning("Failed to store thesis profile for org %s: %s", org_id, e)

    return profile


def get_startup_thesis_profile(supabase, org_id: str) -> Optional[Dict[str, Any]]:
    """Fetch stored thesis profile."""
    try:
        resp = supabase.table("startup_thesis_fit_profiles").select("thesis_profile").eq("org_id", org_id).limit(1).execute()
        if resp.data:
            profile = _safe_json(resp.data[0].get("thesis_profile"))
            if isinstance(profile, dict) and profile.get("startup"):
                return profile
    except Exception as e:
        log.warning("get_startup_thesis_profile failed for org %s: %s", org_id, e)
    return None


def run_investor_matching(
    supabase, org_id: str, max_matches: int = 10
) -> List[Dict[str, Any]]:
    """Run investor matching for a startup.

    1. Get or generate startup thesis profile.
    2. Fetch investors from investor_universal_profiles (city → state → country).
    3. Run manual_match per investor in parallel (ThreadPoolExecutor).
    4. Store top results in startup_investor_matches.
    """
    t0 = time.time()
    _print_banner(f"INVESTOR MATCHING PIPELINE  (top {max_matches})")
    _p(f"  Org ID: {org_id}")

    # --- Get startup profile ---
    _print_section("Step 1: Loading Startup Thesis Profile")
    try:
        startup_profile = get_startup_thesis_profile(supabase, org_id)
    except Exception as e:
        _p(f"  ERROR loading thesis profile: {e}")
        startup_profile = None

    if not startup_profile:
        _p("  No existing profile found — generating now...")
        try:
            startup_profile = generate_startup_thesis_profile(supabase, org_id)
        except Exception as e:
            _p(f"  FATAL: Could not generate thesis profile: {e}")
            _p(traceback.format_exc())
            return []
    else:
        _p("  Existing thesis profile loaded.")

    startup_data = startup_profile.get("startup", {})
    city = startup_data.get("hq_city")
    state = startup_data.get("hq_state")
    country = startup_data.get("hq_country")
    _p(f"  Location: {city or '?'}, {state or '?'}, {country or '?'}")
    _p(f"  Sector:   {startup_data.get('primary_sector', 'N/A')}")
    _p(f"  Stage:    {startup_data.get('funding_stage', 'N/A')}")

    # --- Fetch investors ---
    _print_section("Step 2: Fetching Investor Candidates")
    fetch_limit = 500
    t_fetch = time.time()
    try:
        investor_rows = _fetch_investors_by_location(supabase, city, state, country, limit=fetch_limit)
    except Exception as e:
        _p(f"  FATAL: Could not fetch investors: {e}")
        _p(traceback.format_exc())
        return []
    fetch_elapsed = time.time() - t_fetch

    if not investor_rows:
        _p("  WARNING: No investors found in database!")
        _p("  This could mean:")
        _p("    - The investor_universal_profiles table is empty")
        _p("    - No investors have investor_active_status = 'Active'")
        _p("    - Check your Supabase database")
        log.warning("No investors found for org %s", org_id)
        return []

    _p(f"  Found {len(investor_rows)} active investors ({_format_duration(fetch_elapsed)})")
    log.info("Fetched %d investors to score for org %s", len(investor_rows), org_id)

    # --- Match in parallel ---
    _print_section(f"Step 3: Scoring {len(investor_rows)} Investors (10 threads)")
    match_results: List[Dict[str, Any]] = []
    scored_count = 0
    failed_count = 0
    t_score = time.time()

    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = {
            pool.submit(_match_single_investor, startup_profile, inv_row): inv_row
            for inv_row in investor_rows
        }
        total = len(futures)
        for future in as_completed(futures):
            result = future.result()
            if result is not None:
                match_results.append(result)
                scored_count += 1
                if scored_count % 50 == 0 or (scored_count + failed_count) == total:
                    pct = int((scored_count + failed_count) / total * 100)
                    best_so_far = max((r.get("fit_score_0_to_100", 0) for r in match_results), default=0)
                    _p(f"  Progress: {scored_count + failed_count}/{total} ({pct}%) — best score so far: {best_so_far:.1f}")
            else:
                failed_count += 1

    score_elapsed = time.time() - t_score
    _p(f"\n  Scoring complete: {scored_count} scored, {failed_count} failed ({_format_duration(score_elapsed)})")

    if not match_results:
        _p("  FATAL: All investors failed scoring! No matches to save.")
        _p("  Check manual_match() in thesis_fit_pipeline_v2.py for errors.")
        return []

    # --- Sort by score, take top N ---
    match_results.sort(key=lambda r: r.get("fit_score_0_to_100", 0), reverse=True)
    top_matches = match_results[:max_matches]

    # --- Print results table ---
    _print_section(f"Step 4: Top {len(top_matches)} Investor Matches")
    _p("")
    _p(f"  {'#':>3}  {'Score':>6}  {'Eligible':>8}  {'Investor Name'}")
    _p(f"  {'─'*3}  {'─'*6}  {'─'*8}  {'─'*35}")

    for i, m in enumerate(top_matches, 1):
        score = m.get("fit_score_0_to_100", 0)
        eligible = "YES" if m.get("eligible") else "no"
        name = m.get("investor_name", "Unknown")[:35]
        bar = _score_bar(score, 15)
        _p(f"  {i:>3}  {bar}  {eligible:>8}  {name}")

    if top_matches:
        avg_score = sum(m.get("fit_score_0_to_100", 0) for m in top_matches) / len(top_matches)
        eligible_count = sum(1 for m in top_matches if m.get("eligible"))
        _p(f"\n  Avg score: {avg_score:.1f} | Eligible: {eligible_count}/{len(top_matches)}")

    log.info("Top %d matches scored for org %s (best=%.1f, worst=%.1f)",
             len(top_matches), org_id,
             top_matches[0].get("fit_score_0_to_100", 0) if top_matches else 0,
             top_matches[-1].get("fit_score_0_to_100", 0) if top_matches else 0)

    # --- Store results ---
    _print_section("Step 5: Saving to Database")
    matched_at = now_utc_iso()
    rows_to_upsert = []
    for m in top_matches:
        rows_to_upsert.append({
            "org_id": org_id,
            "investor_id": m["investor_id"],
            "fit_score_0_to_100": m.get("fit_score_0_to_100", 0),
            "fit_score_if_eligible_0_to_100": m.get("fit_score_if_eligible_0_to_100", 0),
            "eligible": m.get("eligible", False),
            "gate_fail_reasons": m.get("gate_fail_reasons", []),
            "category_breakdown": m.get("category_breakdown", {}),
            "investor_profile": m.get("investor_profile", {}),
            "matching_version": m.get("matching_version", "manual_deterministic_v2"),
            "matched_at": matched_at,
        })

    stored = 0
    try:
        _p(f"  Deleting old matches for org...")
        supabase.table("startup_investor_matches").delete().eq("org_id", org_id).execute()
        _p(f"  Inserting {len(rows_to_upsert)} new matches...")
        supabase.table("startup_investor_matches").upsert(
            rows_to_upsert, on_conflict="org_id,investor_id"
        ).execute()
        stored = len(rows_to_upsert)
        _p(f"  Saved {stored} matches successfully.")
    except Exception as e:
        _p(f"  Batch upsert failed: {e}")
        _p(f"  Falling back to one-by-one inserts...")
        log.warning("Upsert failed for org %s: %s – falling back to one-by-one", org_id, e)
        for row in rows_to_upsert:
            try:
                supabase.table("startup_investor_matches").upsert(
                    row, on_conflict="org_id,investor_id"
                ).execute()
                stored += 1
            except Exception as e2:
                _p(f"  FAILED: {row.get('investor_id', '?')} — {e2}")
                log.warning("Individual upsert failed for org %s investor %s: %s",
                            org_id, row["investor_id"], e2)

    total_elapsed = time.time() - t0
    _print_banner(f"MATCHING COMPLETE — {stored} investors saved ({_format_duration(total_elapsed)})")
    if top_matches:
        best = top_matches[0]
        _p(f"  Best match: {best.get('investor_name', 'Unknown')} (score: {best.get('fit_score_0_to_100', 0):.1f})")
    _p("")

    log.info("Stored %d/%d investor matches for org %s", stored, len(top_matches), org_id)
    return top_matches


def get_investor_matches(supabase, org_id: str) -> List[Dict[str, Any]]:
    """Fetch stored matches from startup_investor_matches, sorted by score."""
    try:
        resp = (
            supabase.table("startup_investor_matches")
            .select("*")
            .eq("org_id", org_id)
            .order("fit_score_0_to_100", desc=True)
            .execute()
        )
        rows = resp.data if resp and resp.data else []
        for row in rows:
            row["category_breakdown"] = _safe_json(row.get("category_breakdown"))
            row["investor_profile"] = _safe_json(row.get("investor_profile"))
            row["gate_fail_reasons"] = _safe_json(row.get("gate_fail_reasons"))
        return rows
    except Exception as e:
        log.warning("get_investor_matches failed for org %s: %s", org_id, e)
        return []
