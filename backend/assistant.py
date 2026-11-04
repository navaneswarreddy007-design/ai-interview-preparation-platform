import os
import re
import json
import requests
from typing import Dict, Any
import config
import database

def process_assistant_command(
    command_text: str,
    candidate_data: Dict[str, Any] = None,
    current_session: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Parses conversational user commands and maps them directly to actionable PrepForge application tasks.
    Supports Gemini/OpenAI when API keys exist; otherwise utilizes transparent deterministic intent heuristics.
    """
    cmd = (command_text or "").strip()
    if not cmd:
        return {
            "action": "NONE",
            "spoken_response": "I am standing by. You may speak or type an instruction, such as starting an interview, inspecting your resume, or reviewing past sessions.",
            "screen_display": "Awaiting candidate instruction. Try 'Start interview', 'Load sample', or 'Analyze my resume'."
        }

    ai_status = config.get_ai_status()

    # If Gemini is enabled and configured
    if ai_status["enabled"] and ai_status["provider"] == "Gemini" and config.GEMINI_API_KEY:
        try:
            return process_command_gemini(cmd, candidate_data, current_session)
        except Exception as e:
            print(f"Gemini command processing failed: {e}. Falling back to Rule-Based Grounding.")

    # If OpenAI is enabled and configured
    elif ai_status["enabled"] and ai_status["provider"] == "OpenAI" and config.OPENAI_API_KEY:
        try:
            return process_command_openai(cmd, candidate_data, current_session)
        except Exception as e:
            print(f"OpenAI command processing failed: {e}. Falling back to Rule-Based Grounding.")

    # Rule-Based Intent Parser (Demo Mode)
    return process_command_rule_based(cmd, candidate_data, current_session)

def process_command_rule_based(
    cmd: str,
    candidate_data: Dict[str, Any] = None,
    current_session: Dict[str, Any] = None
) -> Dict[str, Any]:
    lower_cmd = cmd.lower()

    # 1. Voice Interview
    if ("voice" in lower_cmd and any(w in lower_cmd for w in ["interview", "studio", "session", "talk", "mode"])) or any(k in lower_cmd for k in ["voice studio", "voice ai", "talk to me"]):
        return {
            "action": "START_VOICE_INTERVIEW",
            "spoken_response": "Initiating the Voice AI Interview Studio. Preparing grounded technical and behavioral questions from your dossier.",
            "screen_display": "Routing to Voice AI Interview Studio with live Speech Synthesis and Microphone Transcription.",
            "parameters": {"interviewMode": "voice"}
        }

    # 2. Standard / Mock Interview
    if ("interview" in lower_cmd and any(w in lower_cmd for w in ["start", "begin", "conduct", "practice", "launch", "mock", "new", "run", "prepare"])) or lower_cmd.startswith("start ") or lower_cmd.startswith("begin "):
        # Extract potential role
        detected_role = "Senior Full Stack Engineer"
        for r in ["full stack", "frontend", "backend", "machine learning", "devops", "data engineer", "engineering manager", "product manager", "system architect"]:
            if r in lower_cmd:
                detected_role = r.title() + (" Engineer" if not r.endswith("manager") and not r.endswith("architect") else "")
                break
        return {
            "action": "START_INTERVIEW",
            "spoken_response": f"Affirmative. Initializing interview preparation for {detected_role}. You may adjust interview parameters before beginning.",
            "screen_display": f"Setting target parameters for {detected_role}. Questions will be strictly grounded in verified resume entities.",
            "parameters": {"targetRole": detected_role, "interviewMode": "standard"}
        }

    # 3. Load Sample Profile
    if any(k in lower_cmd for k in ["sample", "alex morgan", "preloaded", "demo profile", "example candidate"]):
        return {
            "action": "LOAD_SAMPLE",
            "spoken_response": "Loading preloaded Senior Full Stack Engineer profile for Alex Morgan with thirty-four verified competencies.",
            "screen_display": "Loaded preloaded Alex Morgan resume profile (React, Node.js, PostgreSQL, Docker, AWS).",
            "parameters": {"sample_id": "fullstack"}
        }

    # 4. Resume / Dossier / Upload
    if any(k in lower_cmd for k in ["resume", "dossier", "upload", "skills", "profile", "cv"]):
        cand_name = candidate_data.get("candidate_profile", {}).get("candidate_name") if candidate_data else None
        name_str = f" for candidate {cand_name}" if cand_name else ""
        return {
            "action": "OPEN_DOSSIER",
            "spoken_response": f"Opening candidate dossier{name_str}. Displaying extracted technical competencies, verified projects, and career milestones.",
            "screen_display": "Displaying Candidate Profile and Resume Entity Inspection Panel.",
            "parameters": {}
        }

    # 5. History / Past Sessions
    if any(k in lower_cmd for k in ["history", "past session", "previous", "previous session", "saved session", "telemetry"]):
        recent = database.get_recent_sessions(limit=5)
        count = len(recent)
        return {
            "action": "OPEN_HISTORY",
            "spoken_response": f"Accessing tactical history ledger. You have {count} stored interview sessions recorded in local persistence.",
            "screen_display": f"Opened History Dashboard. {count} verified sessions loaded from SQLite database.",
            "parameters": {}
        }

    # 6. Export PDF
    if any(k in lower_cmd for k in ["pdf", "export", "download report", "print report"]):
        return {
            "action": "EXPORT_PDF",
            "spoken_response": "Generating vector PDF performance report via ReportLab engine. The document will download directly to your system.",
            "screen_display": "Executing server-side PDF compilation with complete rubric breakdown and question evaluations.",
            "parameters": {}
        }

    # 7. Targeted Drills
    if any(k in lower_cmd for k in ["drill", "practice drill", "targeted", "weak topic", "weak area"]):
        return {
            "action": "OPEN_DRILLS",
            "spoken_response": "Opening targeted practice module. Focusing on competencies and edge cases identified during recent evaluations.",
            "screen_display": "Displaying Targeted Practice Drills categorized by architecture, STAR delivery, and computational complexity.",
            "parameters": {}
        }

    # 8. Benchmark / Analytics Inquiry
    if any(k in lower_cmd for k in ["score", "benchmark", "average", "stat", "performance", "metric", "analytic"]):
        stats = database.get_dashboard_analytics()
        avg = stats.get("average_score", 0)
        tot = stats.get("total_sessions", 0)
        return {
            "action": "GET_BENCHMARK",
            "spoken_response": f"Your current performance benchmark stands at {avg} out of one hundred, across {tot} completed interview sessions.",
            "screen_display": f"Telemetry Summary: Benchmark Score={avg}/100 | Stored Sessions={tot} | Active Drills={len(stats.get('pending_drills', []))}.",
            "parameters": {"stats": stats}
        }

    # 9. Help / Capabilities
    if any(k in lower_cmd for k in ["help", "what can you do", "command", "option", "directive"]):
        return {
            "action": "HELP",
            "spoken_response": "I can launch interview simulations, analyze resume dossiers, conduct voice interviews, export PDF reports, and isolate weak topics for targeted practice.",
            "screen_display": "Supported Commands: 'Start interview', 'Voice studio', 'Analyze resume', 'Show history', 'Export PDF', 'Current score', 'Practice drills'.",
            "parameters": {}
        }

    # General conversational fallback
    return {
        "action": "CONVERSE",
        "spoken_response": f"Understood. For '{cmd}', I can initialize a mock interview, inspect your resume data, or review past performance records.",
        "screen_display": f"Command received: '{cmd}'. You can ask me to start an interview, review past sessions, or practice targeted drills.",
        "parameters": {}
    }

def process_command_gemini(cmd: str, candidate_data: Dict[str, Any], current_session: Dict[str, Any]) -> Dict[str, Any]:
    prompt = f"""You are 'ForgeCore', an intelligent, calm, British-accented AI assistant commanding the PrepForge interview preparation platform.
The candidate said: "{cmd}"

Candidate Profile: {candidate_data.get('candidate_profile', {}).get('candidate_name', 'Not loaded')}
Current Target Role: {candidate_data.get('default_target_role', 'Software Engineer')}

Determine the intended action from this list:
- START_INTERVIEW (user wants to begin/practice interview)
- START_VOICE_INTERVIEW (user wants voice AI interview)
- OPEN_DOSSIER (user wants to check/upload resume/skills)
- LOAD_SAMPLE (user wants sample profile)
- OPEN_HISTORY (user wants past sessions)
- EXPORT_PDF (user wants to export PDF report)
- OPEN_DRILLS (user wants practice drills)
- GET_BENCHMARK (user asks about score/performance)
- CONVERSE (general inquiry)

Respond with JSON ONLY:
{{
  "action": "START_INTERVIEW",
  "spoken_response": "Calm, concise, professional spoken dialogue in refined British style (1-2 sentences).",
  "screen_display": "Technical HUD status description.",
  "parameters": {{"targetRole": "..."}}
}}"""

    api_key = config.GEMINI_API_KEY
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "responseMimeType": "application/json"}
    }
    resp = requests.post(url, json=payload, timeout=15)
    resp.raise_for_status()
    raw = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    raw = re.sub(r'^```(?:json)?\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    return json.loads(raw)

def process_command_openai(cmd: str, candidate_data: Dict[str, Any], current_session: Dict[str, Any]) -> Dict[str, Any]:
    prompt = f"""Act as ForgeCore, an intelligent British AI assistant for PrepForge interview platform.
Command: "{cmd}"

Actions: START_INTERVIEW, START_VOICE_INTERVIEW, OPEN_DOSSIER, LOAD_SAMPLE, OPEN_HISTORY, EXPORT_PDF, OPEN_DRILLS, GET_BENCHMARK, CONVERSE.

Return JSON:
{{
  "action": "...",
  "spoken_response": "Calm, composed, concise British spoken sentence.",
  "screen_display": "HUD telemetry description.",
  "parameters": {{}}
}}"""
    api_key = config.OPENAI_API_KEY
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3
    }
    resp = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload, timeout=15)
    resp.raise_for_status()
    raw = resp.json()["choices"][0]["message"]["content"].strip()
    raw = re.sub(r'^```(?:json)?\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    return json.loads(raw)
