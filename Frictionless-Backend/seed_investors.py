"""
Seed investor_universal_profiles with 20 realistic investors.

Usage:
    cd Frictionless-Backend
    python seed_investors.py
"""
import json
import os
import uuid
from datetime import datetime, timezone

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")

sb = create_client(SUPABASE_URL, SUPABASE_KEY)

# ---------------------------------------------------------------------------
# 20 realistic investors spanning diverse sectors, stages, and check sizes
# ---------------------------------------------------------------------------
INVESTORS = [
    {
        "investor_name": "Sequoia Capital",
        "investor_type": "VC",
        "investor_hq_city": "Menlo Park",
        "investor_hq_state": "CA",
        "investor_hq_country": "USA",
        "investor_url": "https://www.sequoiacap.com",
        "investor_stages": ["Seed", "Series A", "Series B", "Growth"],
        "investor_sectors": ["AI", "SaaS", "Fintech", "Enterprise Software", "Consumer", "Healthcare"],
        "investor_geography_focus": ["USA", "Europe", "India", "Southeast Asia"],
        "investor_minimum_check_usd": 500000,
        "investor_typical_check_usd": 5000000,
        "investor_maximum_check_usd": 50000000,
        "investor_aum_usd": 85000000000,
        "investor_lead_or_follow": "lead",
        "investor_portfolio_size": 400,
        "investor_founded_year": 1972,
    },
    {
        "investor_name": "Andreessen Horowitz (a16z)",
        "investor_type": "VC",
        "investor_hq_city": "Menlo Park",
        "investor_hq_state": "CA",
        "investor_hq_country": "USA",
        "investor_url": "https://a16z.com",
        "investor_stages": ["Seed", "Series A", "Series B", "Growth"],
        "investor_sectors": ["AI", "Crypto", "Enterprise", "Bio", "Gaming", "Infrastructure"],
        "investor_geography_focus": ["USA", "Global"],
        "investor_minimum_check_usd": 1000000,
        "investor_typical_check_usd": 10000000,
        "investor_maximum_check_usd": 100000000,
        "investor_aum_usd": 42000000000,
        "investor_lead_or_follow": "lead",
        "investor_portfolio_size": 350,
        "investor_founded_year": 2009,
    },
    {
        "investor_name": "Y Combinator",
        "investor_type": "Accelerator",
        "investor_hq_city": "San Francisco",
        "investor_hq_state": "CA",
        "investor_hq_country": "USA",
        "investor_url": "https://www.ycombinator.com",
        "investor_stages": ["Pre-Seed", "Seed"],
        "investor_sectors": ["AI", "SaaS", "Fintech", "Healthcare", "Developer Tools", "B2B"],
        "investor_geography_focus": ["USA", "Global"],
        "investor_minimum_check_usd": 125000,
        "investor_typical_check_usd": 500000,
        "investor_maximum_check_usd": 500000,
        "investor_aum_usd": 600000000,
        "investor_lead_or_follow": "lead",
        "investor_portfolio_size": 4000,
        "investor_founded_year": 2005,
    },
    {
        "investor_name": "First Round Capital",
        "investor_type": "VC",
        "investor_hq_city": "San Francisco",
        "investor_hq_state": "CA",
        "investor_hq_country": "USA",
        "investor_url": "https://firstround.com",
        "investor_stages": ["Seed", "Series A"],
        "investor_sectors": ["Enterprise", "SaaS", "Marketplace", "Fintech", "AI"],
        "investor_geography_focus": ["USA"],
        "investor_minimum_check_usd": 250000,
        "investor_typical_check_usd": 2000000,
        "investor_maximum_check_usd": 5000000,
        "investor_aum_usd": 1500000000,
        "investor_lead_or_follow": "lead",
        "investor_portfolio_size": 300,
        "investor_founded_year": 2004,
    },
    {
        "investor_name": "Bessemer Venture Partners",
        "investor_type": "VC",
        "investor_hq_city": "San Francisco",
        "investor_hq_state": "CA",
        "investor_hq_country": "USA",
        "investor_url": "https://www.bvp.com",
        "investor_stages": ["Seed", "Series A", "Series B"],
        "investor_sectors": ["Cloud", "SaaS", "Cybersecurity", "Healthcare IT", "Consumer"],
        "investor_geography_focus": ["USA", "Israel", "India"],
        "investor_minimum_check_usd": 500000,
        "investor_typical_check_usd": 5000000,
        "investor_maximum_check_usd": 25000000,
        "investor_aum_usd": 10000000000,
        "investor_lead_or_follow": "lead",
        "investor_portfolio_size": 200,
        "investor_founded_year": 1911,
    },
    {
        "investor_name": "Accel Partners",
        "investor_type": "VC",
        "investor_hq_city": "Palo Alto",
        "investor_hq_state": "CA",
        "investor_hq_country": "USA",
        "investor_url": "https://www.accel.com",
        "investor_stages": ["Seed", "Series A", "Series B"],
        "investor_sectors": ["Enterprise Software", "SaaS", "Security", "Fintech", "AI"],
        "investor_geography_focus": ["USA", "Europe", "India"],
        "investor_minimum_check_usd": 500000,
        "investor_typical_check_usd": 5000000,
        "investor_maximum_check_usd": 50000000,
        "investor_aum_usd": 17000000000,
        "investor_lead_or_follow": "both",
        "investor_portfolio_size": 300,
        "investor_founded_year": 1983,
    },
    {
        "investor_name": "Lightspeed Venture Partners",
        "investor_type": "VC",
        "investor_hq_city": "Menlo Park",
        "investor_hq_state": "CA",
        "investor_hq_country": "USA",
        "investor_url": "https://lsvp.com",
        "investor_stages": ["Seed", "Series A", "Series B", "Growth"],
        "investor_sectors": ["Enterprise", "Consumer", "Healthtech", "Fintech", "Crypto"],
        "investor_geography_focus": ["USA", "India", "Israel", "Europe"],
        "investor_minimum_check_usd": 500000,
        "investor_typical_check_usd": 8000000,
        "investor_maximum_check_usd": 50000000,
        "investor_aum_usd": 18000000000,
        "investor_lead_or_follow": "lead",
        "investor_portfolio_size": 250,
        "investor_founded_year": 2000,
    },
    {
        "investor_name": "Founders Fund",
        "investor_type": "VC",
        "investor_hq_city": "San Francisco",
        "investor_hq_state": "CA",
        "investor_hq_country": "USA",
        "investor_url": "https://foundersfund.com",
        "investor_stages": ["Seed", "Series A", "Series B", "Growth"],
        "investor_sectors": ["Deep Tech", "AI", "Space", "Defense", "Biotech", "Infrastructure"],
        "investor_geography_focus": ["USA"],
        "investor_minimum_check_usd": 1000000,
        "investor_typical_check_usd": 10000000,
        "investor_maximum_check_usd": 100000000,
        "investor_aum_usd": 12000000000,
        "investor_lead_or_follow": "lead",
        "investor_portfolio_size": 120,
        "investor_founded_year": 2005,
    },
    {
        "investor_name": "Greylock Partners",
        "investor_type": "VC",
        "investor_hq_city": "Menlo Park",
        "investor_hq_state": "CA",
        "investor_hq_country": "USA",
        "investor_url": "https://greylock.com",
        "investor_stages": ["Seed", "Series A", "Series B"],
        "investor_sectors": ["Enterprise", "AI", "Consumer Internet", "Data Infrastructure"],
        "investor_geography_focus": ["USA"],
        "investor_minimum_check_usd": 500000,
        "investor_typical_check_usd": 5000000,
        "investor_maximum_check_usd": 20000000,
        "investor_aum_usd": 5000000000,
        "investor_lead_or_follow": "lead",
        "investor_portfolio_size": 180,
        "investor_founded_year": 1965,
    },
    {
        "investor_name": "Index Ventures",
        "investor_type": "VC",
        "investor_hq_city": "London",
        "investor_hq_state": "",
        "investor_hq_country": "UK",
        "investor_url": "https://www.indexventures.com",
        "investor_stages": ["Seed", "Series A", "Series B", "Growth"],
        "investor_sectors": ["Fintech", "SaaS", "Marketplace", "Gaming", "AI", "Commerce"],
        "investor_geography_focus": ["Europe", "USA", "Global"],
        "investor_minimum_check_usd": 500000,
        "investor_typical_check_usd": 10000000,
        "investor_maximum_check_usd": 50000000,
        "investor_aum_usd": 9000000000,
        "investor_lead_or_follow": "lead",
        "investor_portfolio_size": 200,
        "investor_founded_year": 1996,
    },
    {
        "investor_name": "NEA (New Enterprise Associates)",
        "investor_type": "VC",
        "investor_hq_city": "Chevy Chase",
        "investor_hq_state": "MD",
        "investor_hq_country": "USA",
        "investor_url": "https://www.nea.com",
        "investor_stages": ["Seed", "Series A", "Series B", "Growth"],
        "investor_sectors": ["Healthcare", "Enterprise", "Energy", "Consumer", "Technology"],
        "investor_geography_focus": ["USA", "China", "India"],
        "investor_minimum_check_usd": 500000,
        "investor_typical_check_usd": 8000000,
        "investor_maximum_check_usd": 50000000,
        "investor_aum_usd": 25000000000,
        "investor_lead_or_follow": "lead",
        "investor_portfolio_size": 300,
        "investor_founded_year": 1977,
    },
    {
        "investor_name": "Khosla Ventures",
        "investor_type": "VC",
        "investor_hq_city": "Menlo Park",
        "investor_hq_state": "CA",
        "investor_hq_country": "USA",
        "investor_url": "https://www.khoslaventures.com",
        "investor_stages": ["Seed", "Series A", "Series B"],
        "investor_sectors": ["AI", "Sustainability", "Climate Tech", "Healthcare", "Robotics", "Deep Tech"],
        "investor_geography_focus": ["USA", "Global"],
        "investor_minimum_check_usd": 250000,
        "investor_typical_check_usd": 5000000,
        "investor_maximum_check_usd": 50000000,
        "investor_aum_usd": 15000000000,
        "investor_lead_or_follow": "both",
        "investor_portfolio_size": 150,
        "investor_founded_year": 2004,
    },
    {
        "investor_name": "General Catalyst",
        "investor_type": "VC",
        "investor_hq_city": "Cambridge",
        "investor_hq_state": "MA",
        "investor_hq_country": "USA",
        "investor_url": "https://www.generalcatalyst.com",
        "investor_stages": ["Seed", "Series A", "Series B", "Growth"],
        "investor_sectors": ["Fintech", "Healthcare", "Enterprise", "Consumer", "AI", "Climate"],
        "investor_geography_focus": ["USA", "Europe", "India"],
        "investor_minimum_check_usd": 500000,
        "investor_typical_check_usd": 10000000,
        "investor_maximum_check_usd": 75000000,
        "investor_aum_usd": 25000000000,
        "investor_lead_or_follow": "lead",
        "investor_portfolio_size": 350,
        "investor_founded_year": 2000,
    },
    {
        "investor_name": "Insight Partners",
        "investor_type": "Growth",
        "investor_hq_city": "New York",
        "investor_hq_state": "NY",
        "investor_hq_country": "USA",
        "investor_url": "https://www.insightpartners.com",
        "investor_stages": ["Series A", "Series B", "Growth"],
        "investor_sectors": ["Software", "SaaS", "Data", "Cybersecurity", "Fintech"],
        "investor_geography_focus": ["USA", "Europe", "Israel"],
        "investor_minimum_check_usd": 5000000,
        "investor_typical_check_usd": 25000000,
        "investor_maximum_check_usd": 200000000,
        "investor_aum_usd": 80000000000,
        "investor_lead_or_follow": "lead",
        "investor_portfolio_size": 600,
        "investor_founded_year": 1995,
    },
    {
        "investor_name": "Techstars",
        "investor_type": "Accelerator",
        "investor_hq_city": "Boulder",
        "investor_hq_state": "CO",
        "investor_hq_country": "USA",
        "investor_url": "https://www.techstars.com",
        "investor_stages": ["Pre-Seed", "Seed"],
        "investor_sectors": ["AI", "SaaS", "Fintech", "Healthcare", "Sustainability", "Mobility"],
        "investor_geography_focus": ["USA", "Global"],
        "investor_minimum_check_usd": 20000,
        "investor_typical_check_usd": 120000,
        "investor_maximum_check_usd": 250000,
        "investor_aum_usd": 400000000,
        "investor_lead_or_follow": "lead",
        "investor_portfolio_size": 3500,
        "investor_founded_year": 2006,
    },
    {
        "investor_name": "Kleiner Perkins",
        "investor_type": "VC",
        "investor_hq_city": "Menlo Park",
        "investor_hq_state": "CA",
        "investor_hq_country": "USA",
        "investor_url": "https://www.kleinerperkins.com",
        "investor_stages": ["Seed", "Series A", "Series B"],
        "investor_sectors": ["Enterprise", "Fintech", "Healthcare", "Consumer", "Hardtech"],
        "investor_geography_focus": ["USA"],
        "investor_minimum_check_usd": 500000,
        "investor_typical_check_usd": 8000000,
        "investor_maximum_check_usd": 40000000,
        "investor_aum_usd": 9000000000,
        "investor_lead_or_follow": "lead",
        "investor_portfolio_size": 200,
        "investor_founded_year": 1972,
    },
    {
        "investor_name": "SV Angel",
        "investor_type": "Angel",
        "investor_hq_city": "San Francisco",
        "investor_hq_state": "CA",
        "investor_hq_country": "USA",
        "investor_url": "https://svangel.com",
        "investor_stages": ["Pre-Seed", "Seed"],
        "investor_sectors": ["AI", "Consumer", "SaaS", "Marketplace", "Mobile"],
        "investor_geography_focus": ["USA"],
        "investor_minimum_check_usd": 25000,
        "investor_typical_check_usd": 100000,
        "investor_maximum_check_usd": 500000,
        "investor_aum_usd": 200000000,
        "investor_lead_or_follow": "follow",
        "investor_portfolio_size": 800,
        "investor_founded_year": 2009,
    },
    {
        "investor_name": "Tiger Global Management",
        "investor_type": "Growth",
        "investor_hq_city": "New York",
        "investor_hq_state": "NY",
        "investor_hq_country": "USA",
        "investor_url": "https://www.tigerglobal.com",
        "investor_stages": ["Series A", "Series B", "Growth"],
        "investor_sectors": ["Software", "Internet", "Fintech", "Consumer Tech", "E-Commerce"],
        "investor_geography_focus": ["USA", "India", "Global"],
        "investor_minimum_check_usd": 5000000,
        "investor_typical_check_usd": 30000000,
        "investor_maximum_check_usd": 200000000,
        "investor_aum_usd": 70000000000,
        "investor_lead_or_follow": "both",
        "investor_portfolio_size": 400,
        "investor_founded_year": 2001,
    },
    {
        "investor_name": "Lux Capital",
        "investor_type": "VC",
        "investor_hq_city": "New York",
        "investor_hq_state": "NY",
        "investor_hq_country": "USA",
        "investor_url": "https://www.luxcapital.com",
        "investor_stages": ["Seed", "Series A", "Series B"],
        "investor_sectors": ["Deep Tech", "AI", "Robotics", "Space", "Defense", "Biotech"],
        "investor_geography_focus": ["USA"],
        "investor_minimum_check_usd": 500000,
        "investor_typical_check_usd": 5000000,
        "investor_maximum_check_usd": 25000000,
        "investor_aum_usd": 5000000000,
        "investor_lead_or_follow": "lead",
        "investor_portfolio_size": 100,
        "investor_founded_year": 2000,
    },
    {
        "investor_name": "Initialized Capital",
        "investor_type": "VC",
        "investor_hq_city": "San Francisco",
        "investor_hq_state": "CA",
        "investor_hq_country": "USA",
        "investor_url": "https://initialized.com",
        "investor_stages": ["Pre-Seed", "Seed", "Series A"],
        "investor_sectors": ["AI", "Fintech", "Healthcare", "Developer Tools", "B2B SaaS"],
        "investor_geography_focus": ["USA"],
        "investor_minimum_check_usd": 100000,
        "investor_typical_check_usd": 1000000,
        "investor_maximum_check_usd": 5000000,
        "investor_aum_usd": 700000000,
        "investor_lead_or_follow": "lead",
        "investor_portfolio_size": 200,
        "investor_founded_year": 2012,
    },
]


def seed():
    now = datetime.now(timezone.utc).isoformat()
    rows = []
    for inv in INVESTORS:
        # Only include columns that actually exist in the table
        row = {
            "id": str(uuid.uuid4()),
            "investor_name": inv["investor_name"],
            "investor_type": inv["investor_type"],
            "investor_hq_city": inv["investor_hq_city"],
            "investor_hq_state": inv["investor_hq_state"],
            "investor_hq_country": inv["investor_hq_country"],
            "investor_url": inv["investor_url"],
            "investor_minimum_check_usd": inv["investor_minimum_check_usd"],
            "investor_typical_check_usd": inv["investor_typical_check_usd"],
            "investor_maximum_check_usd": inv["investor_maximum_check_usd"],
            "investor_stages": inv["investor_stages"],
            "investor_sectors": inv["investor_sectors"],
            "investor_geography_focus": inv["investor_geography_focus"],
            "investor_aum_usd": inv.get("investor_aum_usd"),
            "investor_lead_or_follow": inv["investor_lead_or_follow"],
            "investor_active_status": "Active",
            "investor_founded_year": inv.get("investor_founded_year"),
            "investor_portfolio_size": inv.get("investor_portfolio_size"),
            "investor_stage_keywords": inv["investor_stages"],
            "investor_sector_keywords": inv["investor_sectors"],
            "investor_geo_keywords": inv["investor_geography_focus"],
            "investor_prefers_b2b": True,
            "investor_prefers_b2c": inv["investor_type"] != "Growth",
            "source": "seed_script",
            "metadata_json": {
                "seeded": True,
                "seeded_at": now,
            },
        }
        rows.append(row)

    print(f"Inserting {len(rows)} investors into investor_universal_profiles...")
    try:
        resp = sb.table("investor_universal_profiles").upsert(
            rows, on_conflict="id"
        ).execute()
        inserted = len(resp.data) if resp.data else 0
        print(f"SUCCESS: {inserted} investors upserted.")
    except Exception as e:
        print(f"Batch insert failed: {e}")
        print("Trying one-by-one...")
        success = 0
        for row in rows:
            try:
                sb.table("investor_universal_profiles").upsert(
                    row, on_conflict="id"
                ).execute()
                success += 1
                print(f"  OK: {row['investor_name']}")
            except Exception as e2:
                print(f"  FAIL: {row['investor_name']} — {e2}")
        print(f"Inserted {success}/{len(rows)} investors.")

    # Verify
    resp = sb.table("investor_universal_profiles").select(
        "id", count="exact"
    ).eq("investor_active_status", "Active").execute()
    count = resp.count if resp.count is not None else len(resp.data or [])
    print(f"\nVerification: {count} active investors in database.")


if __name__ == "__main__":
    seed()
