"""Maximum parallelism startup extraction pipeline: OCR, founder, charts, KV."""
from __future__ import annotations

import json
import logging
import os
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from google import genai
from google.genai import types as gtypes

from . import charts_exctor, founder_linkedin, mistral_ocr, startup_kv_extractor

log = logging.getLogger("pipeline")

OCR_MODEL = "mistral-ocr-latest"
CHARTS_MODEL = "gemini-3-flash-preview"
KV_MODEL = "gemini-2.5-flash-lite"
FOUNDER_MODEL = "gemini-3-flash-preview"
BOOTSTRAP_MODEL = "gemini-2.5-flash-lite"

_ocr_event = threading.Event()
_ocr_result: Dict[str, Any] = {"path": None, "error": None}
_ocr_lock = threading.Lock()


def _set_ocr_result(path: Optional[Path] = None, error: Optional[str] = None) -> None:
    with _ocr_lock:
        _ocr_result["path"] = path
        _ocr_result["error"] = error
    _ocr_event.set()


def _wait_for_ocr(timeout: float = 300.0) -> Path:
    if not _ocr_event.wait(timeout=timeout):
        raise TimeoutError(f"OCR did not complete within {timeout}s")
    with _ocr_lock:
        if _ocr_result["error"]:
            raise RuntimeError(f"OCR failed: {_ocr_result['error']}")
        return _ocr_result["path"]


class AtomicSaver:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._lock = threading.Lock()
        self._data: Dict[str, Any] = {}

    def update(self, patch: Dict[str, Any], *, label: str = "") -> None:
        with self._lock:
            self._data.update(patch)
            tmp = self.path.with_suffix(".tmp")
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(self._data, f, indent=2, ensure_ascii=False)
            tmp.replace(self.path)
        if label:
            log.info("  Saved [%s]", label)

    @property
    def snapshot(self) -> Dict[str, Any]:
        with self._lock:
            return dict(self._data)


def _task_ocr(pdf_url: str, ocr_dir: Path, saver: AtomicSaver) -> Dict[str, Any]:
    t0 = time.perf_counter()
    try:
        txt_path = mistral_ocr.run(pdf_url=pdf_url, out_dir=ocr_dir, model=OCR_MODEL)
        elapsed = time.perf_counter() - t0
        _set_ocr_result(path=txt_path)
        saver.update({"ocr_file": str(txt_path)}, label="OCR")
        log.info("  OCR done %.1fs -> %s", elapsed, txt_path.name)
        return {"status": "ok", "path": str(txt_path), "seconds": round(elapsed, 2)}
    except Exception as exc:
        _set_ocr_result(error=str(exc))
        log.error("  OCR FAILED: %s", exc)
        saver.update({"ocr": {"error": str(exc)}}, label="OCR (error)")
        return {"status": "error", "error": str(exc)}


def _task_founder(
    linkedin: str, name: str, out_path: Path, saver: AtomicSaver
) -> Dict[str, Any]:
    t0 = time.perf_counter()
    try:
        result = founder_linkedin.run(
            company_linkedin=linkedin,
            company_name=name,
            output_path=str(out_path),
        )
        elapsed = time.perf_counter() - t0
        saver.update({"founder_linkedin": result}, label="founder_linkedin")
        d = result.get("data", {})
        log.info("  Founder done %.1fs (founders=%d, leadership=%d)", elapsed, len(d.get("founders", [])), len(d.get("leadership_team", [])))
        return {"status": "ok", "seconds": round(elapsed, 2)}
    except Exception as exc:
        log.error("  Founder FAILED: %s", exc)
        saver.update({"founder_linkedin": {"error": str(exc)}}, label="founder (error)")
        return {"status": "error", "error": str(exc)}


def _task_charts(out_path: Path, saver: AtomicSaver) -> Dict[str, Any]:
    t0 = time.perf_counter()
    try:
        txt_path = _wait_for_ocr()
        result = charts_exctor.run(
            txt_path=str(txt_path), out_path=str(out_path), model=CHARTS_MODEL
        )
        elapsed = time.perf_counter() - t0
        saver.update({"charts": result}, label="charts")
        log.info("  Charts done %.1fs (%d charts, %d KPIs)", elapsed, len(result.get("charts", [])), len(result.get("kpi_cards", [])))
        return {"status": "ok", "seconds": round(elapsed, 2)}
    except Exception as exc:
        log.error("  Charts FAILED: %s", exc)
        saver.update({"charts": {"error": str(exc)}}, label="charts (error)")
        return {"status": "error", "error": str(exc)}


def _task_kv(out_path: Path, saver: AtomicSaver) -> Dict[str, Any]:
    t0 = time.perf_counter()
    try:
        txt_path = _wait_for_ocr()
        result = startup_kv_extractor.run_pipeline(
            input_path=str(txt_path), output_path=str(out_path)
        )
        elapsed = time.perf_counter() - t0
        saver.update({"startup_kv": result}, label="startup_kv")
        log.info("  Startup KV done %.1fs", elapsed)
        return {"status": "ok", "seconds": round(elapsed, 2)}
    except Exception as exc:
        log.error("  Startup KV FAILED: %s", exc)
        saver.update({"startup_kv": {"error": str(exc)}}, label="startup_kv (error)")
        return {"status": "error", "error": str(exc)}


def _bootstrap(txt_path: Path) -> Tuple[str, str]:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return "", ""
    with open(txt_path, "r", encoding="utf-8", errors="ignore") as f:
        text = f.read()[:6000].strip()
    if not text:
        return "", ""
    prompt = (
        "From this startup pitch-deck text extract ONLY:\n"
        '1) company_name  2) linkedin_url (https://linkedin.com/company/…)\n'
        'Return ONLY valid JSON: {"company_name":"","linkedin_url":""}\n'
        f'Text:\n"""\n{text}\n"""'
    )
    try:
        client = genai.Client(api_key=api_key)
        resp = client.models.generate_content(
            model=BOOTSTRAP_MODEL,
            contents=prompt,
            config=gtypes.GenerateContentConfig(temperature=0.0, max_output_tokens=256),
        )
        raw = re.sub(r"^```(?:json)?\s*", "", (resp.text or "").strip(), flags=re.I)
        i, j = raw.find("{"), raw.rfind("}")
        if i != -1 and j > i:
            d = json.loads(raw[i : j + 1])
            if isinstance(d, dict):
                return (
                    str(d.get("linkedin_url") or "").strip(),
                    str(d.get("company_name") or "").strip(),
                )
    except Exception:
        pass
    return "", ""


def run_pipeline(
    pdf_url: str,
    out_dir: Path,
    ocr_dir: Path,
    company_linkedin: str = "",
    company_name: str = "",
) -> Path:
    """Run full extraction pipeline. Returns path to merged JSON."""
    _ocr_event.clear()
    with _ocr_lock:
        _ocr_result["path"] = None
        _ocr_result["error"] = None

    t0 = time.perf_counter()
    out_dir = Path(out_dir)
    ocr_dir = Path(ocr_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    ocr_dir.mkdir(parents=True, exist_ok=True)
    temp = out_dir / "temp"
    temp.mkdir(parents=True, exist_ok=True)

    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    merged = out_dir / f"startup_profile_{ts}.json"
    saver = AtomicSaver(merged)

    has_linkedin = bool(company_linkedin.strip() or company_name.strip())

    log.info("Pipeline started | PDF: %s...", pdf_url[:80])
    saver.update(
        {
            "meta": {
                "generated_at_utc": datetime.now(timezone.utc).isoformat(),
                "source_pdf_url": pdf_url,
                "company_linkedin": company_linkedin,
                "company_name": company_name,
                "models": {"ocr": OCR_MODEL, "charts": CHARTS_MODEL, "startup_kv": KV_MODEL, "founder": FOUNDER_MODEL},
            },
        },
        label="meta",
    )

    task_results: Dict[str, Any] = {}

    if has_linkedin:
        cl, cn = company_linkedin.strip(), company_name.strip()
        log.info("Mode: FAST (4 tasks in parallel)")
        with ThreadPoolExecutor(max_workers=4) as pool:
            futs = {
                pool.submit(_task_ocr, pdf_url, ocr_dir, saver): "ocr",
                pool.submit(_task_founder, cl, cn, temp / "founder_linkedin.json", saver): "founder",
                pool.submit(_task_charts, temp / "charts.json", saver): "charts",
                pool.submit(_task_kv, temp / "startup_kv.json", saver): "startup_kv",
            }
            for fut in as_completed(futs):
                name = futs[fut]
                try:
                    task_results[name] = fut.result()
                except Exception as exc:
                    log.error("  %s unexpected: %s", name, exc)
                    task_results[name] = {"status": "error", "error": str(exc)}
    else:
        log.info("Mode: AUTO (OCR -> bootstrap -> 3 tasks)")
        try:
            txt_path = mistral_ocr.run(pdf_url=pdf_url, out_dir=ocr_dir, model=OCR_MODEL)
            task_results["ocr"] = {"status": "ok", "seconds": round(time.perf_counter() - t0, 2)}
            saver.update({"ocr_file": str(txt_path)}, label="OCR")
        except Exception as exc:
            log.error("OCR FAILED: %s", exc)
            saver.update({"ocr": {"error": str(exc)}})
            task_results["ocr"] = {"status": "error", "error": str(exc)}
            saver.update({"timings_seconds": {"total": round(time.perf_counter() - t0, 2)}})
            return merged

        bl, bn = _bootstrap(txt_path)
        company_linkedin, company_name = bl, bn
        _set_ocr_result(path=txt_path)

        tasks: Dict[str, Any] = {
            "charts": lambda: _task_charts(temp / "charts.json", saver),
            "startup_kv": lambda: _task_kv(temp / "startup_kv.json", saver),
        }
        if company_linkedin or company_name:
            cl, cn = company_linkedin, company_name
            tasks["founder"] = lambda: _task_founder(cl, cn, temp / "founder_linkedin.json", saver)

        with ThreadPoolExecutor(max_workers=len(tasks)) as pool:
            futs = {pool.submit(fn): name for name, fn in tasks.items()}
            for fut in as_completed(futs):
                name = futs[fut]
                try:
                    task_results[name] = fut.result()
                except Exception as exc:
                    log.error("  %s: %s", name, exc)
                    task_results[name] = {"status": "error", "error": str(exc)}

    total = time.perf_counter() - t0
    timings = {"total": round(total, 2)}
    for name, res in task_results.items():
        if isinstance(res, dict) and "seconds" in res:
            timings[name] = res["seconds"]
    saver.update({"timings_seconds": timings, "task_results": task_results}, label="timings")
    log.info("Pipeline done -> %s (%.1fs)", merged, total)
    return merged
