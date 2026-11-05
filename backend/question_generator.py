import os
import re
import json
import random
import requests
from typing import Dict, Any, List, Set, Optional, Tuple
import config
import database
from duplicate_detector import (
    normalize_text,
    calculate_similarity,
    is_near_duplicate,
    find_duplicate
)
from question_bank import STRUCTURED_QUESTION_BANK

def is_fresher_candidate(experience_level: str, resume_data: Dict[str, Any]) -> bool:
    """
    Determines whether the candidate must be evaluated as a Fresher / Entry-Level engineer:
    1. If the user explicitly selects Fresher or Junior in the setup wizard.
    2. Or if the candidate's resume contains zero verified professional full-time employment.
    """
    lvl = str(experience_level or "").strip().lower()
    if lvl in ["fresher", "junior", "0–2 years", "0-2 years", "entry-level", "entry level", "student", "college", "college graduate", "intern"]:
        return True
    experiences = resume_data.get("experience", []) or []
    if len(experiences) == 0:
        return True
    return False

def validate_question_for_candidate(
    question: Dict[str, Any],
    is_fresher: bool,
    resume_data: Dict[str, Any]
) -> Tuple[bool, str]:
    """
    Strict validation engine ensuring question context accurately matches
    the candidate's experience level and verified resume content.
    Prevents hallucinating corporate employment or fictional companies.
    """
    q_text = question.get("question_text", "").strip()
    r_ctx = question.get("resume_context", "").strip()
    
    if not q_text or len(q_text.split()) < 10:
        return False, "Question text is empty or too brief."

    # Placeholders check
    if any(ph in q_text for ph in ["[Company", "[Project", "[Your", "[Role", "<company>", "<project>"]):
        return False, "Contains unresolved template placeholders."

    # Fresher-Specific Validation Checks
    if is_fresher:
        senior_corporate_markers = [
            "during your tenure at",
            "production outage you were directly responsible",
            "advocated for refactoring critical technical debt",
            "at your former employer",
            "at your previous job",
            "when you managed a team of engineers",
            "architectural direction with a technical lead",
            "stakeholders were pushing exclusively"
        ]
        q_lower = q_text.lower()
        if any(marker in q_lower for marker in senior_corporate_markers):
            return False, f"Question assumes senior corporate employment for a Fresher candidate: {q_text[:60]}"
            
        if "grounded in work experience" in r_ctx.lower():
            return False, f"Fresher question cannot cite corporate work experience: {r_ctx}"

    # Experienced Candidate Validation Checks
    else:
        # If question cites a specific corporate role, verify it exists in candidate experience
        if "grounded in work experience:" in r_ctx.lower():
            verified_roles = [e.get("role_header", "").lower() for e in resume_data.get("experience", [])]
            match_found = any(role in r_ctx.lower() or any(w in r_ctx.lower() for w in role.split() if len(w) > 4) for role in verified_roles)
            if not match_found and len(verified_roles) > 0:
                return False, f"Cites work experience not verified in resume: {r_ctx}"

    # Project Context Validation
    if "grounded in project:" in r_ctx.lower() or "academic project:" in r_ctx.lower():
        verified_projects = [p.get("title", "").lower() for p in resume_data.get("projects", [])]
        raw_text_lower = (resume_data.get("raw_text") or "").lower()
        match_project = any(proj in r_ctx.lower() or proj in raw_text_lower for proj in verified_projects if len(proj) > 3)
        if not match_project and len(verified_projects) > 0:
            return False, f"Cites project not present in candidate resume: {r_ctx}"

    return True, "Valid"

def generate_questions(
    resume_data: Dict[str, Any],
    target_role: str = "Software Engineer",
    interview_type: str = "Mixed",
    difficulty: str = "Mid-Level",
    experience_level: str = "Mid-Level",
    question_count: int = 5,
    candidate_name: str = "",
    prefer_fresh: bool = True,
    include_review: bool = False,
    practice_weak_areas: bool = False,
    job_description: str = ""
) -> Dict[str, Any]:
    """
    Intelligent Question Generation and Selection Engine.
    Strictly distinguishes Fresher vs. Experienced candidates.
    Minimizes repeated questions within a session and across historical sessions.
    Combines curated Question Bank, resume entity grounding, and optional LLM inference.
    """
    cand_name = candidate_name or resume_data.get("candidate_name", "Candidate")
    is_fresher = is_fresher_candidate(experience_level, resume_data)
    
    # 1. Retrieve Candidate Historical Questions from Database
    historical_records = database.get_previously_asked_questions(cand_name, limit=300)
    previously_asked_texts = [r["question_text"] for r in historical_records if r.get("question_text")]
    
    # 2. Retrieve Candidate Weak Topics for Personalization
    weak_topics = database.get_candidate_weak_topics(cand_name) if practice_weak_areas else []

    ai_status = config.get_ai_status()
    
    # 3. If AI Provider is Configured (Gemini / OpenAI)
    if ai_status["enabled"] and ai_status["provider"] == "Gemini" and config.GEMINI_API_KEY:
        try:
            res = generate_questions_gemini(
                resume_data=resume_data,
                target_role=target_role,
                interview_type=interview_type,
                difficulty=difficulty,
                experience_level=experience_level,
                is_fresher=is_fresher,
                question_count=question_count,
                previously_asked_texts=previously_asked_texts[:20],
                weak_topics=weak_topics
            )
            validated_questions, fresh_count, review_count, avoided_dups = filter_and_diversify_questions(
                candidate_pool=res,
                target_count=question_count,
                previously_asked_texts=previously_asked_texts,
                prefer_fresh=prefer_fresh,
                include_review=include_review,
                difficulty=difficulty,
                is_fresher=is_fresher,
                resume_data=resume_data
            )
            if len(validated_questions) >= question_count:
                return {
                    "questions": validated_questions,
                    "mode": "AI-Powered (Gemini 1.5 Flash)",
                    "is_ai": True,
                    "is_fresher": is_fresher,
                    "fresh_questions_count": fresh_count,
                    "review_questions_count": review_count,
                    "avoided_duplicates_count": avoided_dups
                }
        except Exception as e:
            print(f"Gemini Question Generation error: {e}. Falling back to Rule-Based Grounding.")

    elif ai_status["enabled"] and ai_status["provider"] == "OpenAI" and config.OPENAI_API_KEY:
        try:
            res = generate_questions_openai(
                resume_data=resume_data,
                target_role=target_role,
                interview_type=interview_type,
                difficulty=difficulty,
                experience_level=experience_level,
                is_fresher=is_fresher,
                question_count=question_count,
                previously_asked_texts=previously_asked_texts[:20],
                weak_topics=weak_topics
            )
            validated_questions, fresh_count, review_count, avoided_dups = filter_and_diversify_questions(
                candidate_pool=res,
                target_count=question_count,
                previously_asked_texts=previously_asked_texts,
                prefer_fresh=prefer_fresh,
                include_review=include_review,
                difficulty=difficulty,
                is_fresher=is_fresher,
                resume_data=resume_data
            )
            if len(validated_questions) >= question_count:
                return {
                    "questions": validated_questions,
                    "mode": "AI-Powered (OpenAI GPT-4o)",
                    "is_ai": True,
                    "is_fresher": is_fresher,
                    "fresh_questions_count": fresh_count,
                    "review_questions_count": review_count,
                    "avoided_duplicates_count": avoided_dups
                }
        except Exception as e:
            print(f"OpenAI Question Generation error: {e}. Falling back to Rule-Based Grounding.")

    # 4. Deterministic Grounded Engine + Diverse Question Bank
    candidate_pool = build_grounded_candidate_pool(
        resume_data=resume_data,
        target_role=target_role,
        interview_type=interview_type,
        difficulty=difficulty,
        experience_level=experience_level,
        weak_topics=weak_topics,
        job_description=job_description
    )

    validated_questions, fresh_count, review_count, avoided_dups = filter_and_diversify_questions(
        candidate_pool=candidate_pool,
        target_count=question_count,
        previously_asked_texts=previously_asked_texts,
        prefer_fresh=prefer_fresh,
        include_review=include_review,
        difficulty=difficulty,
        is_fresher=is_fresher,
        resume_data=resume_data
    )

    return {
        "questions": validated_questions,
        "mode": "Demo Mode (Rule-Based Grounding)",
        "is_ai": False,
        "is_fresher": is_fresher,
        "note": f"Generated via deterministic grounding engine for {'Fresher/Entry-Level' if is_fresher else 'Experienced'} candidate profile.",
        "fresh_questions_count": fresh_count,
        "review_questions_count": review_count,
        "avoided_duplicates_count": avoided_dups
    }

def filter_and_diversify_questions(
    candidate_pool: List[Dict[str, Any]],
    target_count: int,
    previously_asked_texts: List[str],
    prefer_fresh: bool = True,
    include_review: bool = False,
    difficulty: str = "Mid-Level",
    is_fresher: bool = False,
    resume_data: Dict[str, Any] = None
) -> Tuple[List[Dict[str, Any]], int, int, int]:
    """
    Applies multi-stage duplicate rejection and resume truth validation:
    1. Validates question against candidate seniority and resume facts.
    2. Rejects duplicates & near-duplicates WITHIN the current interview batch.
    3. Enforces concept diversity (no two questions testing the same concept_id).
    4. Rejects historical duplicates if prefer_fresh=True.
    5. If fresh questions are exhausted, cleanly permits review questions labeled 'Review Question'.
    """
    resume_data = resume_data or {}
    selected_questions: List[Dict[str, Any]] = []
    selected_texts: List[str] = []
    selected_concepts: Set[str] = set()

    fresh_pool: List[Dict[str, Any]] = []
    historical_review_pool: List[Dict[str, Any]] = []
    avoided_duplicates_count = 0

    # Separate candidates into fresh vs previously asked with truth validation
    for q in candidate_pool:
        q_text = q.get("question_text", "").strip()
        if not q_text:
            continue

        # Step 0: Seniority and Fact Validation
        is_valid, reason = validate_question_for_candidate(q, is_fresher, resume_data)
        if not is_valid:
            continue

        is_dup_history, max_sim, matching_q = find_duplicate(q_text, previously_asked_texts, threshold=0.65)
        
        if is_dup_history:
            avoided_duplicates_count += 1
            historical_review_pool.append({
                **q,
                "is_review": True,
                "tag": "Review Question",
                "matched_previous": matching_q
            })
        else:
            fresh_pool.append({
                **q,
                "is_review": False,
                "tag": "Fresh Question"
            })

    # Selection Step A: Pick from fresh pool first (if prefer_fresh is True)
    pool_order = []
    if prefer_fresh and not include_review:
        pool_order = fresh_pool + historical_review_pool # Review pool acts as fallback if exhausted
    elif include_review:
        pool_order = historical_review_pool + fresh_pool
    else:
        pool_order = fresh_pool + historical_review_pool

    for q in pool_order:
        q_text = q.get("question_text", "").strip()
        concept_id = q.get("concept_id") or q.get("category")

        # Check 1: Concept collision within current interview session
        if concept_id and concept_id in selected_concepts and concept_id != "general":
            continue

        # Check 2: Within-interview near-duplicate text check (Threshold 0.60)
        is_dup_current, sim, match_curr = find_duplicate(q_text, selected_texts, threshold=0.60)
        if is_dup_current:
            continue

        # Passes all within-session checks!
        selected_questions.append({
            "id": len(selected_questions) + 1,
            "question_text": q_text,
            "category": q.get("category", "Technical Evaluation"),
            "concept_id": concept_id,
            "resume_context": q.get("resume_context", "Verified technical domain competency"),
            "focus_areas": q.get("focus_areas", ["Technical correctness", "Concrete trade-offs"]),
            "difficulty": q.get("difficulty") or difficulty,
            "is_review": q.get("is_review", False),
            "tag": "Review Question" if q.get("is_review") else "Fresh Question"
        })
        selected_texts.append(q_text)
        if concept_id:
            selected_concepts.add(concept_id)

        if len(selected_questions) >= target_count:
            break

    # If still needing questions (e.g. pool exhausted), relax concept constraints but keep truth validation
    if len(selected_questions) < target_count:
        for q in candidate_pool:
            is_valid, _ = validate_question_for_candidate(q, is_fresher, resume_data)
            if not is_valid:
                continue
            q_text = q.get("question_text", "").strip()
            is_dup_current, _, _ = find_duplicate(q_text, selected_texts, threshold=0.65)
            if not is_dup_current:
                is_hist, _, _ = find_duplicate(q_text, previously_asked_texts, threshold=0.65)
                selected_questions.append({
                    "id": len(selected_questions) + 1,
                    "question_text": q_text,
                    "category": q.get("category", "General Evaluation"),
                    "concept_id": q.get("concept_id") or "general",
                    "resume_context": q.get("resume_context", "Domain competency"),
                    "focus_areas": q.get("focus_areas", ["Implementation detail"]),
                    "difficulty": q.get("difficulty") or difficulty,
                    "is_review": is_hist,
                    "tag": "Review Question" if is_hist else "Fresh Question"
                })
                selected_texts.append(q_text)
                if len(selected_questions) >= target_count:
                    break

    fresh_count = sum(1 for q in selected_questions if not q.get("is_review"))
    review_count = sum(1 for q in selected_questions if q.get("is_review"))

    return selected_questions, fresh_count, review_count, avoided_duplicates_count

def build_grounded_candidate_pool(
    resume_data: Dict[str, Any],
    target_role: str,
    interview_type: str,
    difficulty: str,
    experience_level: str,
    weak_topics: List[str] = None,
    job_description: str = ""
) -> List[Dict[str, Any]]:
    """
    Builds a broad, diverse pool of candidate questions with strict Fresher vs. Experienced branching:
    1. For Freshers: Only academic projects, internships, coursework, foundational CS, and academic teamwork.
    2. For Experienced: Grounded in verified employment records from resume, system architecture, and leadership.
    """
    pool: List[Dict[str, Any]] = []
    is_fresher = is_fresher_candidate(experience_level, resume_data)
    
    skills = resume_data.get("all_skills", []) or []
    projects = resume_data.get("projects", []) or []
    experiences = resume_data.get("experience", []) or []
    internships = resume_data.get("internships", []) or []
    coursework = resume_data.get("coursework", []) or []
    skills_lower = {s.lower() for s in skills}

    # -------------------------------------------------------------
    # 1. Match from Curated Question Bank by Role, Type, & Seniority
    # -------------------------------------------------------------
    for qb in STRUCTURED_QUESTION_BANK:
        role_match = any(r.lower() in target_role.lower() or target_role.lower() in r.lower() for r in qb.get("roles", []))
        type_match = interview_type == "Mixed" or any(interview_type.lower() in t.lower() for t in qb.get("interview_types", []))
        qb_skills = qb.get("skills", [])
        has_skill = not qb_skills or any(s.lower() in skills_lower for s in qb_skills)

        # Seniority Match Guard
        qb_exp_levels = [l.lower() for l in qb.get("experience_levels", [])]
        if is_fresher:
            # Exclude senior-only questions for freshers
            if qb_exp_levels and not any(l in ["fresher", "0–2 years", "0-2 years"] for l in qb_exp_levels):
                continue
        else:
            # For experienced candidates (3+ years), exclude pure fresher-only questions
            if "fresher" in qb_exp_levels and len(qb_exp_levels) == 1:
                continue

        if role_match and type_match and (has_skill or len(skills) == 0):
            matched_skill_name = next((s for s in qb_skills if s.lower() in skills_lower), skills[0] if skills else target_role)
            context_prefix = "Verified Foundational Competency" if is_fresher else "Verified Competency"
            pool.append({
                "concept_id": qb["concept_id"],
                "topic": qb["topic"],
                "category": qb["topic"],
                "question_text": qb["question_text"],
                "resume_context": f"Grounded in {context_prefix}: {matched_skill_name}",
                "focus_areas": qb["focus_areas"],
                "difficulty": qb.get("difficulty", difficulty)
            })

    # -------------------------------------------------------------
    # 2. Add Project-Grounded Questions
    # -------------------------------------------------------------
    for idx, proj in enumerate(projects):
        title = proj.get("title", f"Project {idx + 1}")
        tools = proj.get("tools") or "the stack utilized"
        
        if is_fresher:
            # Fresher Framing: Academic / Coursework / Hands-on Implementation
            pool.append({
                "concept_id": f"proj_fresher_arch_{idx}",
                "topic": "Academic Project Architecture",
                "category": "Project Architecture",
                "question_text": f"In your project '{title}', where you worked with {tools}, walk me through the code structure and data flow you implemented. What was the most challenging technical decision you made while building it?",
                "resume_context": f"Academic Project: '{title}' ({tools})",
                "focus_areas": ["Code modularity", "Data flow", "Design rationale"],
                "difficulty": "Junior"
            })

            pool.append({
                "concept_id": f"proj_fresher_debugging_{idx}",
                "topic": "Technical Debugging",
                "category": "Technical Deep-Dive",
                "question_text": f"Walk me through a difficult bug or logic error you encountered while building '{title}'. How did you isolate the problem, and how did you verify that your fix solved it?",
                "resume_context": f"Academic Project: '{title}' ({tools})",
                "focus_areas": ["Systematic debugging", "Reproducing edge cases", "Testing safeguards"],
                "difficulty": "Junior"
            })
        else:
            # Experienced Framing: Production Systems & Architectural Trade-offs
            pool.append({
                "concept_id": f"proj_arch_{idx}",
                "topic": "Project Architecture",
                "category": "Project Architecture",
                "question_text": f"In your project '{title}', where you leveraged {tools}, what was the most difficult architectural decision you made, and what tradeoffs did you evaluate before settling on your approach?",
                "resume_context": f"Grounded in Project: '{title}' ({tools})",
                "focus_areas": ["Architecture tradeoffs", "Component interaction", "Decision rationale"],
                "difficulty": difficulty
            })

            pool.append({
                "concept_id": f"proj_debugging_{idx}",
                "topic": "Technical Debugging",
                "category": "Technical Deep-Dive",
                "question_text": f"Walk me through a performance bottleneck or critical bug you encountered while building '{title}'. How did you diagnose the root cause, and how did you verify that your fix solved the issue?",
                "resume_context": f"Grounded in Project: '{title}' ({tools})",
                "focus_areas": ["Root-cause debugging", "Telemetry & profiling", "Verification"],
                "difficulty": difficulty
            })

    # -------------------------------------------------------------
    # 3. Add Behavioral / STAR Questions
    # -------------------------------------------------------------
    if is_fresher:
        # A. FRESHER BEHAVIORAL QUESTIONS:
        # Focus on college coursework, lab teamwork, hackathons, and verified internships.
        # NEVER reference corporate tenures, former employers, or fictional companies!
        
        # 1. Verified Internships (if present in resume)
        for idx, intern in enumerate(internships):
            role_header = intern.get("role_header", f"Internship {idx + 1}")
            pool.append({
                "concept_id": f"star_intern_rampup_{idx}",
                "topic": "Internship Adaptability",
                "category": "Behavioral / STAR",
                "question_text": f"During your internship in '{role_header}', how did you adapt to the team's development workflow, seek guidance when facing blockers, and ensure your assigned tasks met expectations?",
                "resume_context": f"Grounded in Internship: '{role_header}'",
                "focus_areas": ["Mentorship & feedback", "Learning curve adaptation", "Reliable delivery"],
                "difficulty": "Junior"
            })

        # 2. Academic Project Teamwork & Disagreements
        for idx, proj in enumerate(projects[:3]):
            title = proj.get("title", f"Project {idx + 1}")
            pool.append({
                "concept_id": f"star_fresher_conflict_{idx}",
                "topic": "Academic Teamwork",
                "category": "Behavioral / STAR",
                "question_text": f"Reflecting on your project '{title}', tell me about a time when you and a teammate had differing viewpoints on technical choices or task distribution. How did you resolve the disagreement and deliver on time?",
                "resume_context": f"Academic Project Teamwork: '{title}'",
                "focus_areas": ["Peer communication", "Constructive compromise", "Shared milestone commitment"],
                "difficulty": "Junior"
            })
            pool.append({
                "concept_id": f"star_fresher_deadline_{idx}",
                "topic": "Project Deadline Triage",
                "category": "Behavioral / STAR",
                "question_text": f"While building '{title}', describe a situation where you faced a tight project deadline alongside an unexpected roadblock. What tasks did you prioritize to ensure a working submission was delivered?",
                "resume_context": f"Project Deadline Management: '{title}'",
                "focus_areas": ["Scope triage", "Time management", "Delivering working software"],
                "difficulty": "Junior"
            })

        # 3. Academic Group Work / Hackathons / Coursework Scenarios
        pool.append({
            "concept_id": "star_fresher_peer_accountability",
            "topic": "Peer Collaboration",
            "category": "Behavioral / STAR",
            "question_text": "Describe a college group assignment or hackathon where a team member wasn't contributing as agreed or struggled with their part. How did you handle the situation constructively while ensuring the project succeeded?",
            "resume_context": "Academic Group Project & Peer Teamwork",
            "focus_areas": ["Empathy & active listening", "constructive communication", "Protecting project delivery"],
            "difficulty": "Junior"
        })

        pool.append({
            "concept_id": "star_fresher_learning_initiative",
            "topic": "Self-Directed Learning",
            "category": "Behavioral / STAR",
            "question_text": f"Tell me about a programming language, library, or tool from your resume that you had to learn completely on your own for a project. How did you structure your learning and verify your understanding?",
            "resume_context": "Continuous Learning & Self-Directed Study",
            "focus_areas": ["Technical curiosity", "Documentation reading", "Hands-on prototype verification"],
            "difficulty": "Junior"
        })

    else:
        # B. EXPERIENCED BEHAVIORAL QUESTIONS:
        # Grounded ONLY in verified professional employment present in resume!
        if experiences:
            for idx, exp in enumerate(experiences):
                role_header = exp.get("role_header", f"Role {idx + 1}")
                pool.append({
                    "concept_id": f"star_conflict_{idx}",
                    "topic": "Behavioral Leadership",
                    "category": "Behavioral / STAR",
                    "question_text": f"Reflecting on your experience as described in '{role_header}', tell me about a time when you had to navigate conflicting technical priorities or team disagreement. How did you align the team toward a shared objective?",
                    "resume_context": f"Grounded in Work Experience: '{role_header}'",
                    "focus_areas": ["De-escalation", "Objective criteria", "Team cohesion"],
                    "difficulty": difficulty
                })

                pool.append({
                    "concept_id": f"star_deliverable_{idx}",
                    "topic": "Execution & Delivery",
                    "category": "Behavioral / STAR",
                    "question_text": f"During your tenure at '{role_header}', describe a situation where you delivered a high-impact deliverable under tight schedule constraints. What tasks did you prioritize to prevent scope creep?",
                    "resume_context": f"Grounded in Work Experience: '{role_header}'",
                    "focus_areas": ["Scope management", "Transparent communication", "Measured outcome"],
                    "difficulty": difficulty
                })
        else:
            # Experienced candidate without corporate employment listed: ground in project leadership
            pool.append({
                "concept_id": "star_pro_team_consensus",
                "topic": "Technical Alignment",
                "category": "Behavioral / STAR",
                "question_text": "Describe an engineering initiative where you and other contributors had fundamentally different views on system architecture. How did you use objective benchmarks to build team consensus?",
                "resume_context": "Technical Initiative Leadership",
                "focus_areas": ["Data-driven alignment", "Trade-off documentation", "Team velocity"],
                "difficulty": difficulty
            })

    # -------------------------------------------------------------
    # 4. Weak Topics Requested
    # -------------------------------------------------------------
    if weak_topics:
        for wt in weak_topics[:3]:
            framing = "foundational principles and a college or personal project example" if is_fresher else "production trade-offs and implementation safeguards"
            pool.insert(0, {
                "concept_id": f"weak_topic_{wt.lower().replace(' ', '_')}",
                "topic": wt,
                "category": "Targeted Weak Area Practice",
                "question_text": f"In previous interview evaluations, you identified {wt} as a focus area. Can you walk me through the {framing} of {wt} and how you apply it in practice?",
                "resume_context": f"Personalized Drill targeting focus area: {wt}",
                "focus_areas": [f"{wt} fundamentals", "Implementation trade-offs", "Verification"],
                "difficulty": difficulty
            })

    random.shuffle(pool)
    return pool

def generate_questions_gemini(
    resume_data: Dict[str, Any],
    target_role: str,
    interview_type: str,
    difficulty: str,
    experience_level: str,
    is_fresher: bool,
    question_count: int,
    previously_asked_texts: List[str] = None,
    weak_topics: List[str] = None
) -> List[Dict[str, Any]]:
    neg_prompt = ""
    if previously_asked_texts:
        avoid_list = "\n".join([f"- {q}" for q in previously_asked_texts[:10]])
        neg_prompt = f"\nDO NOT ASK OR REPEAT ANY OF THE FOLLOWING PREVIOUSLY ASKED QUESTIONS (OR NEAR-DUPLICATES):\n{avoid_list}\n"

    fresher_guidelines = """
CRITICAL CANDIDATE SENIORITY RULES:
- The candidate is a FRESHER / JUNIOR CANDIDATE.
- NEVER assume past full-time corporate employment. Never reference fictional companies, corporate titles, or employment dates.
- Behavioral questions MUST be grounded in academic projects, coursework, college group assignments, hackathons, and verified internships.
- Technical questions must test foundational computer science principles (DSA, OOP, DBMS, OS, web basics) and verified tools on their resume.
""" if is_fresher else """
CRITICAL CANDIDATE SENIORITY RULES:
- The candidate is EXPERIENCED.
- ONLY cite professional companies or roles that are EXPLICITLY present in the resume below.
- Never invent fictional companies or dates.
"""

    prompt = f"""You are an elite technical interviewer preparing an interview for target role: '{target_role}'.
Experience Level: {experience_level} ({difficulty} difficulty).
Is Fresher: {is_fresher}.
Interview Type: {interview_type}.
Number of questions needed: {question_count}.
{fresher_guidelines}
RESUME CONTENT:
---
{resume_data.get('raw_text', '')[:3500]}
---
{neg_prompt}

Generate {question_count} diverse, distinct interview questions grounded strictly in the resume above.
Assign unique concept_id tags to each question to prevent testing the same topic twice.

Respond ONLY with valid JSON array:
[
  {{
    "id": 1,
    "concept_id": "unique_concept_slug",
    "question_text": "...",
    "category": "...",
    "resume_context": "...",
    "focus_areas": ["..."],
    "difficulty": "{difficulty}"
  }}
]"""

    api_key = config.GEMINI_API_KEY
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.5, "responseMimeType": "application/json"}
    }
    
    resp = requests.post(url, json=payload, timeout=20)
    resp.raise_for_status()
    raw = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    raw = re.sub(r'^```(?:json)?\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    return json.loads(raw)

def generate_questions_openai(
    resume_data: Dict[str, Any],
    target_role: str,
    interview_type: str,
    difficulty: str,
    experience_level: str,
    is_fresher: bool,
    question_count: int,
    previously_asked_texts: List[str] = None,
    weak_topics: List[str] = None
) -> List[Dict[str, Any]]:
    neg_prompt = ""
    if previously_asked_texts:
        avoid_list = "\n".join([f"- {q}" for q in previously_asked_texts[:10]])
        neg_prompt = f"AVOID ASKING THESE OR NEAR-DUPLICATES:\n{avoid_list}\n"

    fresher_rules = "The candidate is a FRESHER. Ground all questions in academic projects, coursework, and college teamwork. NEVER invent or assume corporate employment." if is_fresher else "Candidate is EXPERIENCED. Only reference verified work experience from resume."

    prompt = f"""Target Role: {target_role} ({experience_level}, {difficulty}).
{fresher_rules}
Interview Type: {interview_type}.
Resume:
{resume_data.get('raw_text', '')[:3500]}
{neg_prompt}
Generate {question_count} diverse, grounded interview questions with unique concept_id tags.
Respond with JSON array of objects with keys: id, concept_id, question_text, category, resume_context, focus_areas, difficulty."""

    api_key = config.OPENAI_API_KEY
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.5
    }
    resp = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload, timeout=20)
    resp.raise_for_status()
    raw = resp.json()["choices"][0]["message"]["content"].strip()
    raw = re.sub(r'^```(?:json)?\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    return json.loads(raw)

def generate_follow_up_question(question, candidate_answer, resume_data=None, target_role="Software Engineer", difficulty="Mid-Level"):
    """
    Generate an intelligent technical/behavioral follow-up question digging deeper into
    the candidate's answer without inventing false facts.
    """
    q_text = question.get("question_text", "") if isinstance(question, dict) else str(question)
    q_cat = question.get("category", "Technical") if isinstance(question, dict) else "Technical"
    
    # Check if Gemini or OpenAI available
    provider = config.get_available_provider()
    if provider and provider.lower() == "gemini":
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={config.GEMINI_API_KEY}"
            prompt = f"""You are an expert interviewer for a {target_role} role ({difficulty}).
The original question was: "{q_text}" (Category: {q_cat})
The candidate answered: "{candidate_answer}"

Generate ONE targeted, insightful follow-up question that probes deeper into the candidate's explanation, asks about edge cases, trade-offs, metrics, or concrete technical choices.
Return JSON ONLY:
{{
  "follow_up_question": "...",
  "reason": "...",
  "focus_area": "..."
}}"""
            payload = {"contents": [{"parts": [{"text": prompt}]}]}
            resp = requests.post(url, json=payload, timeout=15)
            if resp.status_code == 200:
                text = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                text = re.sub(r'^```(?:json)?\s*', '', text)
                text = re.sub(r'\s*```$', '', text)
                return json.loads(text)
        except Exception as e:
            print(f"Gemini follow-up failed: {e}")
            
    # Deterministic fallback
    ans_lower = (candidate_answer or "").lower()
    if "scale" in ans_lower or "performance" in ans_lower or "latency" in ans_lower:
        return {
            "follow_up_question": "Building on your point about performance, what specific metrics or monitoring alerts would you configure in production to detect degradation before users notice?",
            "reason": "Probing operational observability and production readiness.",
            "focus_area": "Monitoring & Metrics"
        }
    elif "team" in ans_lower or "collaborat" in ans_lower or "stakeholder" in ans_lower:
        return {
            "follow_up_question": "When executing this with your team, was there any disagreement regarding the technical approach, and how did you reach alignment?",
            "reason": "Probing cross-functional leadership and conflict resolution.",
            "focus_area": "Stakeholder Alignment"
        }
    elif "database" in ans_lower or "query" in ans_lower or "sql" in ans_lower or "data" in ans_lower:
        return {
            "follow_up_question": "How does this design handle concurrency and data consistency under high concurrent write loads?",
            "reason": "Probing distributed systems concurrency and transaction isolation.",
            "focus_area": "Concurrency & Consistency"
        }
    else:
        return {
            "follow_up_question": "If you had to redesign this solution with 10x the traffic or complexity, what single bottleneck would break first, and how would you refactor it?",
            "reason": "Probing system scalability bottlenecks and architectural foresight.",
            "focus_area": "Scalability & Trade-offs"
        }
