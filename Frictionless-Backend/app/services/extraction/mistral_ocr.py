"""Mistral OCR for online PDFs."""
from __future__ import annotations

import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, List

import requests
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)
from mistralai import Mistral

log = logging.getLogger(__name__)


def _utc_ts() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")


def _ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)


def _download_file(url: str, dest: Path, timeout: int = 90) -> None:
    with requests.get(url, stream=True, timeout=timeout) as r:
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 20):
                if chunk:
                    f.write(chunk)


def _clean_ocr_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"!\[[^\]]*]\([^)]+\)", "", text)
    text = re.sub(r"!\[[^\]]*]", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _parse_response(resp: Any) -> str:
    if resp is None:
        return ""
    data = (
        resp.model_dump()
        if hasattr(resp, "model_dump")
        else (resp if isinstance(resp, dict) else {})
    )
    if not data:
        return _clean_ocr_text(str(resp))
    parts: List[str] = []
    pages = data.get("pages") or data.get("document_pages") or []
    if isinstance(pages, list) and pages:
        for i, p in enumerate(pages, 1):
            txt = p.get("markdown") or p.get("text") or ""
            if txt:
                parts.append(f"--- PAGE {i} ---\n{txt}")
    if not parts:
        fb = data.get("markdown") or data.get("text") or data.get("content") or ""
        parts.append(fb if isinstance(fb, str) and fb.strip() else str(data))
    return _clean_ocr_text("\n\n".join(parts))


class MistralOCRClient:
    def __init__(self, api_key: str, model: str = "mistral-ocr-latest"):
        self._client = Mistral(api_key=api_key)
        self._model = model

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(min=1, max=10),
        retry=retry_if_exception_type(Exception),
        reraise=True,
    )
    def ocr_from_url(self, pdf_url: str) -> str:
        resp = self._client.ocr.process(
            model=self._model,
            document={"type": "document_url", "document_url": pdf_url},
        )
        return _parse_response(resp)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(min=1, max=10),
        retry=retry_if_exception_type(Exception),
        reraise=True,
    )
    def ocr_from_file(self, path: Path) -> str:
        with open(path, "rb") as f:
            uploaded = self._client.files.upload(
                file={"file_name": path.name, "content": f},
                purpose="ocr",
            )
        fid = getattr(uploaded, "id", None)
        if fid is None and hasattr(uploaded, "model_dump"):
            fid = uploaded.model_dump().get("id")
        if not fid:
            raise RuntimeError("Upload OK but file-id missing")
        resp = self._client.ocr.process(
            model=self._model,
            document={"type": "file", "file_id": fid},
        )
        return _parse_response(resp)


def run(
    pdf_url: str,
    out_dir: Path,
    model: str = "mistral-ocr-latest",
    force_download_fallback: bool = True,
) -> Path:
    """Run OCR on a PDF URL. Returns path to the saved .txt file."""
    _ensure_dir(out_dir)
    api_key = os.getenv("MISTRAL_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("MISTRAL_API_KEY not set")
    ocr = MistralOCRClient(api_key=api_key, model=model)
    ts = _utc_ts()
    out_file = out_dir / f"ocr_{ts}.txt"
    mode = "url"
    try:
        text = ocr.ocr_from_url(pdf_url)
    except Exception as exc:
        if not force_download_fallback:
            raise RuntimeError(f"URL OCR failed: {exc}") from exc
        log.info("URL OCR failed — falling back to download+upload")
        mode = "download_fallback"
        local = out_dir / f"source_{ts}.pdf"
        _download_file(pdf_url, local)
        text = ocr.ocr_from_file(local)
    header = (
        f"# OCR Output\n"
        f"# Generated: {datetime.now(timezone.utc).isoformat()}\n"
        f"# Source:    {pdf_url}\n"
        f"# Model:     {model}\n"
        f"# Mode:      {mode}\n"
        f"{'=' * 72}\n\n"
    )
    out_file.write_text(header + (text or "[EMPTY]"), encoding="utf-8")
    log.info("OCR saved → %s (%d chars)", out_file.name, len(text))
    return out_file
