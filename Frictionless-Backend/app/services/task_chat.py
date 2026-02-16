"""AI chat for task completion using OpenAI."""
from __future__ import annotations

import json
import logging
import os
from typing import Any

from openai import OpenAI

log = logging.getLogger(__name__)

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")


def get_task_chat_response(
    task_title: str,
    task_description: str,
    user_message: str,
    history: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """
    Get AI response for task completion chat.
    Returns {reply: str, suggest_complete: bool}.
    """
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise ValueError("OPENAI_API_KEY not set")

    system = """You are a conversational assistant helping a founder complete THIS SPECIFIC task.
Your goal: help them actually complete the task, not give generic improvement advice.

- Be conversational and supportive. Ask follow-up questions when needed.
- Give step-by-step instructions to COMPLETE the task (e.g. "First, do X. Then Y. Upload here.").
- If they share progress (uploaded doc, added data, answered a question), acknowledge it and guide next steps.
- If they say they're done or have finished the task, set suggest_complete: true.
- If they provide all required information to mark complete, set suggest_complete: true.
- Do NOT give broad "how to improve your pitch" advice. Focus on THIS task only.
- Keep replies concise (under 150 words) unless detail is needed.

Respond with JSON only: {"reply": "your message", "suggest_complete": false or true}"""

    context = f"Task: {task_title}\nDescription: {task_description or 'No description'}"
    messages: list[dict[str, str]] = [
        {"role": "system", "content": f"{system}\n\n{context}"},
    ]
    for h in history or []:
        role = h.get("role", "user")
        content = h.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": user_message})

    client = OpenAI(api_key=api_key)
    resp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=messages,
        temperature=0.4,
    )
    text = (resp.choices[0].message.content or "").strip()
    if text.startswith("```"):
        lines = text.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return {"reply": text, "suggest_complete": False}
    return {
        "reply": data.get("reply", text),
        "suggest_complete": bool(data.get("suggest_complete", False)),
    }
