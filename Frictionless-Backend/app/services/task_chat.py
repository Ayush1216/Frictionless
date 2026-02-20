"""Task completion chat: collect the user's answer for the task, then they mark complete."""
from __future__ import annotations

import json
import logging
import os
import re

log = logging.getLogger(__name__)

RECORDED_VALUE_MARKER = "RECORDED_VALUE:"


def _build_company_context_block(company_context: dict | None) -> str:
    """Build a concise context block from company/founder/team data."""
    if not company_context:
        return ""

    parts: list[str] = []

    # Company info
    company_name = company_context.get("company_name") or company_context.get("name")
    if company_name:
        parts.append(f"Company: {company_name}")

    for key in ["industry", "sector", "stage", "business_model", "hq_city", "hq_country", "website", "founded_year", "employee_count", "description"]:
        val = company_context.get(key)
        if val:
            parts.append(f"{key.replace('_', ' ').title()}: {val}")

    # Founders
    founders = company_context.get("founders") or []
    if founders:
        founder_lines = []
        for f in founders[:10]:  # cap at 10
            if isinstance(f, dict):
                name = f.get("full_name") or f.get("name") or "Unknown"
                title = f.get("title") or f.get("role") or ""
                linkedin = f.get("linkedin_url") or ""
                skills = f.get("skills") or f.get("expertise") or ""
                line = f"  - {name}"
                if title:
                    line += f" ({title})"
                if skills:
                    line += f" — Skills: {skills}" if isinstance(skills, str) else f" — Skills: {', '.join(skills[:5])}"
                if linkedin:
                    line += f" | LinkedIn: {linkedin}"
                founder_lines.append(line)
            elif isinstance(f, str):
                founder_lines.append(f"  - {f}")
        if founder_lines:
            parts.append("Founders/Team Members:\n" + "\n".join(founder_lines))

    # Team members (from org_people or similar)
    team = company_context.get("team_members") or company_context.get("team") or []
    if team and not founders:
        team_lines = []
        for m in team[:10]:
            if isinstance(m, dict):
                name = m.get("full_name") or m.get("name") or "Unknown"
                title = m.get("title") or m.get("role") or ""
                skills = m.get("skills") or m.get("expertise") or ""
                line = f"  - {name}"
                if title:
                    line += f" ({title})"
                if skills:
                    line += f" — Skills: {skills}" if isinstance(skills, str) else f" — Skills: {', '.join(skills[:5])}"
                team_lines.append(line)
        if team_lines:
            parts.append("Team Members:\n" + "\n".join(team_lines))

    # Key metrics
    metrics = company_context.get("metrics") or {}
    if isinstance(metrics, dict) and metrics:
        metric_lines = []
        for k, v in metrics.items():
            if v is not None and v != "" and v != 0:
                metric_lines.append(f"  - {k.replace('_', ' ').title()}: {v}")
        if metric_lines:
            parts.append("Key Metrics:\n" + "\n".join(metric_lines[:10]))

    # Previously completed tasks — so we don't re-ask
    prev = company_context.get("previously_completed_tasks")
    if prev:
        parts.append("Already Answered Tasks (DO NOT re-ask these):\n" + prev)

    if not parts:
        return ""

    return "\n\nCOMPANY CONTEXT (use this data to give specific, personalized answers):\n" + "\n".join(parts)


def get_task_chat_response(
    task_title: str,
    task_description: str,
    subcategory_name: str,
    user_message: str,
    history: list[dict] | None = None,
    company_context: dict | None = None,
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

    company_block = _build_company_context_block(company_context)

    system = f"""You are helping a startup founder complete a single readiness task by collecting information **and proof only when it makes sense**.

You are "Ask Frictionless", a smart AI advisor that knows this startup's data. When the user asks questions like "who should I assign this to?" or "who on my team?", ALWAYS reference the actual team members/founders listed in the company context below by NAME and ROLE. Never give generic advice when you have their real data.

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
- ALWAYS use the actual company data below to give specific, personalized answers. Refer to people by their real names and roles.
- When asked about team assignments, recommendations, or "who should do X", analyze the team members' titles, skills, and roles to suggest the best person BY NAME.
- For founder/team full-time, founder status, and similar attestations: accept testimony. Do not ask for documents to "verify" — their word is sufficient.
- For policies, certificates, financials, and tasks that explicitly ask for a link or document: ask for proof.
- Be concise and conversational. Use short paragraphs, not long lists.
- For uploads, say: "Please upload using the attachment (paperclip) button — it will be added to your Data Room."
- NEVER ask for information the user has already provided in previously completed tasks (listed in the context below). If the info is already there, use it directly and tell them they can mark the task complete.
{company_block}"""

    context = f"Task: {task_title}\nDescription: {task_description or 'No description'}\nCategory: {subcategory_name or 'General'}\nWe need to collect and store one value from the user for this task."

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
            max_tokens=600,
            temperature=0.3,
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
