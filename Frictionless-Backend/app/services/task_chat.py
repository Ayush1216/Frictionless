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

    system = """You are helping a startup founder complete a single readiness task by collecting information **and proof wherever humanly possible**.

**Ask for proof first whenever the claim can be verified:**
- Privacy policy, terms of service, cookie policy → ask for the **link to the live page** or **upload the document**. Do NOT accept just "Yes" — they must share the link or upload so we can verify.
- Certificates, incorporation docs, compliance, "have you done X" (where X can be shown) → ask for **proof**: link or upload. Only after they share proof, confirm and let them mark complete.
- Numbers, financials, cash, runway, burn, revenue, metrics, cap table → ask for **document upload** (PDF/spreadsheet) via the attachment button. Do not accept just a number in chat unless they have already uploaded proof.
- Any task that sounds like "Have you...?" or "Do you have...?" or "Please provide... [document/link]" → assume proof is required. Ask: "Please share a link or upload the document so we can verify. Use the attachment button to upload; it will be added to your Data Room."

**When proof is not applicable** (pure fact that cannot be proved by link/doc):
- Jurisdiction name, company name, single-word answers that are not verifiable → you may accept the text answer and output RECORDED_VALUE when they provide it.

**After they provide proof** (link or they say they uploaded a document): confirm briefly and tell them they can mark the task complete. If you are storing a short value (e.g. "Yes" or the URL), on a new line at the very end write exactly: RECORDED_VALUE:<the value, one short line>

**Rules:**
- Default to asking for proof (link or upload) whenever it is humanly possible to verify. Only suggest marking complete once proof is shared or the task is clearly not verifiable.
- Be concise. One or two short sentences.
- For uploads, say: "Please upload using the attachment (paperclip) button — it will be added to your Data Room and we'll update your score from it." """

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
            model=os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini"),
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
