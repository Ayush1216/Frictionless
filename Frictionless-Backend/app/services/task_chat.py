"""Task completion chat: collect the user's answer for the task, then they mark complete."""
from __future__ import annotations

import logging
import os
import re

log = logging.getLogger(__name__)

RECORDED_VALUE_MARKER = "RECORDED_VALUE:"


def get_task_chat_response(
    task_title: str,
    task_description: str,
    subcategory_name: str,
    user_message: str,
    history: list[dict] | None = None,
) -> dict:
    """
    Get OpenAI response. Goal: recognize when the user is providing the required
    information (e.g. "Austin, Texas", "Yes", a link). Return that as submitted_value
    and tell them to mark the task complete. Do NOT give generic "how to do it" steps.
    Returns {"reply": str, "suggest_complete": bool, "submitted_value": str | None}.
    """
    try:
        from openai import OpenAI
    except ImportError:
        log.warning("openai not installed")
        return {"reply": "Chat is not configured.", "suggest_complete": False, "submitted_value": None}

    api_key = (os.getenv("OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY_BACKEND", "")).strip()
    if not api_key:
        log.warning("OPENAI_API_KEY not set")
        return {"reply": "OpenAI API key is not configured.", "suggest_complete": False, "submitted_value": None}

    system = """You are helping a startup founder complete a single readiness task by collecting information **and proof only when it makes sense**.

**Accept testimony (no proof required)** — for these, the founder's word is enough. Do NOT ask for documents or links; accept their clear answer and tell them they can mark the task complete. Output RECORDED_VALUE with their answer.
- Founder/team status: "Are all founders full-time?", "Are you a founder?", "Is the founding team full-time?", "Do all founders work full-time?" → If they say e.g. "Yes, I am full time and I am founder" or "Yes we are all full-time", accept it. No document needed.
- Similar attestations: "Do you have a board?", "Is the company bootstrapped?" (yes/no), "Are you the sole founder?" → Accept their statement.
- Pure facts that cannot be proved by document: jurisdiction, company legal name, single-word or short factual answers → accept and use RECORDED_VALUE.

**Ask for proof** only when the task clearly asks for something verifiable by link or document:
- Privacy policy, terms of service, cookie policy → ask for the **link** or **upload**. Do not accept just "Yes" without link/upload.
- Certificates, incorporation docs, compliance docs, "Please provide [document/link]" → ask for link or upload.
- Numbers, financials, cap table, revenue, runway → ask for **document upload** via the attachment button when the task requires verification.
- If the task text says "provide a link" or "upload" or "attach", then ask for proof. Otherwise, prefer accepting testimony for status/attestation questions.

**After they provide** (either testimony you accept, or proof): confirm briefly and tell them they can mark the task complete. If storing a short value, on a new line at the very end write exactly: RECORDED_VALUE:<the value, one short line>

**Rules:**
- For founder/team full-time, founder status, and similar attestations: accept testimony. Do not ask for documents to "verify" — their word is sufficient.
- For policies, certificates, financials, and tasks that explicitly ask for a link or document: ask for proof.
- Be concise. One or two short sentences.
- For uploads, say: "Please upload using the attachment (paperclip) button — it will be added to your Data Room." """

    context = f"Task: {task_title}\nDescription: {task_description or 'No description'}\nWe need to collect and store one value from the user for this task."

    client = OpenAI(api_key=api_key)
    messages = [{"role": "system", "content": system}]
    if context:
        messages.append({"role": "system", "content": f"Context: {context}"})
    for h in (history or []):
        role = (h.get("role") or "user").lower()
        if role not in ("user", "assistant", "system"):
            role = "user"
        content = h.get("content") or ""
        if content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": user_message})

    suggest_complete = False
    submitted_value = None
    reply = ""
    try:
        resp = client.chat.completions.create(
            model=os.getenv("OPENAI_CHAT_MODEL", "gpt-4.1-mini"),
            messages=messages,
            max_tokens=400,
            temperature=0.2,
        )
        reply = (resp.choices[0].message.content or "").strip()
        if RECORDED_VALUE_MARKER in reply:
            match = re.search(r"RECORDED_VALUE:\s*(.+?)(?:\n|$)", reply, re.DOTALL)
            if match:
                submitted_value = match.group(1).strip()
                suggest_complete = True
            reply = re.sub(r"\n?RECORDED_VALUE:.*", "", reply, flags=re.DOTALL).strip()
        if submitted_value:
            suggest_complete = True
    except Exception as e:
        log.exception("OpenAI task chat error: %s", e)
        reply = "Sorry, I couldn't process that. Please try again."

    return {"reply": reply, "suggest_complete": suggest_complete, "submitted_value": submitted_value}
