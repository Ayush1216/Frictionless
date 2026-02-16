"""Extract domain from website URL."""
import re
from urllib.parse import urlparse


def extract_domain(url: str) -> str | None:
    """Extract domain from a website URL (e.g. https://www.airbnb.com/path -> airbnb.com)."""
    if not url or not isinstance(url, str):
        return None
    url = url.strip()
    if not url:
        return None
    # Allow URLs without scheme (e.g. airbnb.com, www.airbnb.com)
    if not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", url):
        url = "https://" + url
    try:
        parsed = urlparse(url)
        hostname = parsed.hostname or parsed.netloc.split(":")[0] or parsed.path.split("/")[0]
        if not hostname or hostname.startswith("."):
            return None
        # Remove www. prefix
        if hostname.lower().startswith("www."):
            hostname = hostname[4:]
        return hostname.lower() if hostname else None
    except Exception:
        return None
