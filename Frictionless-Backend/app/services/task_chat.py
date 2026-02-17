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

    system = """You are helping a startup founder complete a single readiness task. This task is about **collecting one specific piece of information** from them (e.g. a jurisdiction name, a link, Yes/No, a short answer).

Your job:
1. If the user **has not yet provided** the required information: ask them once, clearly, to provide it (e.g. "What is your incorporation jurisdiction (country or state)?" or "Please paste the link."). Do NOT give long "how to do it" steps or research advice.
2. If the user **has provided** the required information (e.g. they said "Austin, Texas", "Delaware", "Yes", "https://..."), then:
   - Confirm briefly: "We've recorded [their answer]. You can mark the task as complete."
   - On a new line at the very end of your message, write exactly: RECORDED_VALUE:<the value they provided, one short line>
   - Keep the value short: one phrase (e.g. "Austin, Texas" or "Delaware, USA" or the URL). No extra text after it.

Rules:
- Do NOT give generic steps like "visit the Secretary of State website" or "research options". We only need to **store what the user tells us**.
- For Yes/No tasks, RECORDED_VALUE should be "Yes" or "No".
- For links, RECORDED_VALUE should be the URL.
- For jurisdiction/location, RECORDED_VALUE should be their exact phrase (e.g. "Austin, Texas").
- Be concise. One or two short sentences is enough."""

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
