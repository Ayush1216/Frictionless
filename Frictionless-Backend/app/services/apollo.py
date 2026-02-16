"""Apollo Organization Enrichment API client."""
import httpx
from app.utils.domain import extract_domain


async def enrich_organization(domain: str, api_key: str) -> dict | None:
    """Call Apollo organization enrichment API. Returns organization dict or None on failure."""
    if not domain or not api_key:
        return None
    url = "https://api.apollo.io/api/v1/organizations/enrich"
    params = {"domain": domain.strip().lower()}
    headers = {
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "x-api-key": api_key,
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url, params=params, headers=headers)
        resp.raise_for_status()
        data = resp.json()
    return data.get("organization")


def enrich_organization_sync(domain: str, api_key: str) -> dict | None:
    """Synchronous version for non-async callers."""
    if not domain or not api_key:
        return None
    url = "https://api.apollo.io/api/v1/organizations/enrich"
    params = {"domain": domain.strip().lower()}
    headers = {
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "x-api-key": api_key,
    }
    with httpx.Client(timeout=30.0) as client:
        resp = client.get(url, params=params, headers=headers)
        resp.raise_for_status()
        data = resp.json()
    return data.get("organization")
