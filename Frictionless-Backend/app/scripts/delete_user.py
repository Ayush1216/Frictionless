#!/usr/bin/env python3
"""
Delete an entire user profile including:
- Uploaded PDFs (org-assets storage)
- Website URL and organization metadata
- Apollo enrichment data
- Startup extraction results
- Profile, roles, and auth user

Usage:
  cd Frictionless-Backend
  python -m app.scripts.delete_user --email user@example.com
  python -m app.scripts.delete_user --org-id <uuid>
"""
import argparse
import os
import sys
from pathlib import Path

# Add project root so we can load .env and app
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

from supabase import create_client


BUCKET = "org-assets"


def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
    return create_client(url, key)


def get_storage_paths_for_org(supabase, org_id: str) -> list[str]:
    """Get storage paths from org_assets (pitch decks, thesis docs, etc.)."""
    r = supabase.table("org_assets").select("storage_path").eq("org_id", org_id).execute()
    return [row["storage_path"] for row in (r.data or []) if row.get("storage_path")]


def delete_user_by_email(supabase, email: str) -> None:
    """Delete user and all data by email."""
    r = supabase.table("profiles").select("id").eq("email", email).execute()
    if not r.data or len(r.data) == 0:
        raise SystemExit(f"User not found: {email}")

    user_id = r.data[0]["id"]
    delete_user_by_id(supabase, user_id)


def delete_user_by_org_id(supabase, org_id: str) -> None:
    """Delete org and all data; optionally delete the owning user(s)."""
    # Get org members (owners)
    r = supabase.table("org_memberships").select("user_id").eq("org_id", org_id).execute()
    user_ids = [row["user_id"] for row in (r.data or [])]

    # 1. Delete storage files (pitch decks, thesis docs) from org-assets bucket
    paths = get_storage_paths_for_org(supabase, org_id)
    if paths:
        for i in range(0, len(paths), 1000):  # 1000 limit per remove()
            batch = paths[i : i + 1000]
            supabase.storage.from_(BUCKET).remove(batch)
            print(f"  Deleted {len(batch)} storage file(s)")
    else:
        print("  No storage files found (or bucket empty)")

    # 2. Delete organization (CASCADE: apollo, extraction, org_assets, org_memberships, profiles)
    supabase.table("organizations").delete().eq("id", org_id).execute()
    print(f"  Deleted organization {org_id} (apollo, extraction, org_assets, org_memberships, etc.)")

    # 3. Clean up users who had only this org (auth delete cascades to profiles, user_roles)
    for uid in user_ids:
        remaining = supabase.table("org_memberships").select("id").eq("user_id", uid).execute()
        if not remaining.data:
            try:
                supabase.auth.admin.delete_user(uid)
                print(f"  Deleted auth user {uid} (profile + user_roles cascade)")
            except Exception as e:
                print(f"  Note: could not delete auth user {uid}: {e}")


def delete_user_by_id(supabase, user_id: str) -> None:
    """Delete user and all data by user_id."""
    r = supabase.table("org_memberships").select("org_id").eq("user_id", user_id).execute()
    org_ids = [row["org_id"] for row in (r.data or [])]

    for org_id in org_ids:
        delete_user_by_org_id(supabase, org_id)

    # If no orgs, still delete auth user (cascades to profile, user_roles)
    if not org_ids:
        try:
            supabase.auth.admin.delete_user(user_id)
            print(f"  Deleted auth user {user_id}")
        except Exception as e:
            print(f"  Note: could not delete auth user {user_id}: {e}")


def main():
    parser = argparse.ArgumentParser(description="Delete user profile and all data")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--email", help="User email")
    group.add_argument("--org-id", help="Organization UUID (deletes org + storage + owning users)")
    args = parser.parse_args()

    supabase = get_supabase()

    if args.org_id:
        print(f"Deleting org {args.org_id} and all related data...")
        delete_user_by_org_id(supabase, args.org_id)
    else:
        print(f"Deleting user {args.email} and all related data...")
        delete_user_by_email(supabase, args.email)

    print("Done.")


if __name__ == "__main__":
    main()
