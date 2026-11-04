import sqlite3
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional
from config import DATABASE_PATH

def get_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        candidate_name TEXT,
        target_role TEXT,
        interview_type TEXT,
        difficulty TEXT,
        resume_filename TEXT,
        overall_score REAL,
        evaluation_mode TEXT,
        strengths_json TEXT,
        weaknesses_json TEXT,
        actionable_suggestions_json TEXT,
        weak_topics_json TEXT,
        created_at TEXT
    )
    """)
    
    # Session questions & individual evaluations
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS session_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        question_index INTEGER,
        question_text TEXT,
        category TEXT,
        resume_context TEXT,
        candidate_answer TEXT,
        score REAL,
        relevance_score REAL,
        accuracy_score REAL,
        clarity_score REAL,
        evidence_score REAL,
        strengths_json TEXT,
        weaknesses_json TEXT,
        suggestion TEXT,
        improved_answer TEXT,
        weak_topics_json TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    )
    """)
    
    # Recommended follow-up practice drills
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS practice_drills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        topic TEXT,
        recommended_question TEXT,
        difficulty TEXT,
        category TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    )
    """)
    
    # Historical tracked asked questions table for duplicate prevention
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS asked_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidate_name TEXT,
        question_text TEXT,
        normalized_question TEXT,
        concept_id TEXT,
        topic TEXT,
        difficulty TEXT,
        interview_type TEXT,
        target_role TEXT,
        session_id TEXT,
        asked_at TEXT
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_asked_cand ON asked_questions(candidate_name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_asked_norm ON asked_questions(normalized_question)")

    conn.commit()
    conn.close()

def save_session(session_data: Dict[str, Any]) -> str:
    conn = get_connection()
    cursor = conn.cursor()
    
    session_id = session_data["id"]
    now_str = datetime.utcnow().isoformat()
    
    cursor.execute("""
    INSERT OR REPLACE INTO sessions (
        id, candidate_name, target_role, interview_type, difficulty,
        resume_filename, overall_score, evaluation_mode, strengths_json,
        weaknesses_json, actionable_suggestions_json, weak_topics_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        session_id,
        session_data.get("candidate_name", "Candidate"),
        session_data.get("target_role", "Software Engineer"),
        session_data.get("interview_type", "Mixed"),
        session_data.get("difficulty", "Mid-Level"),
        session_data.get("resume_filename", ""),
        float(session_data.get("overall_score", 0)),
        session_data.get("evaluation_mode", "Demo Mode (Rule-Based Evaluation)"),
        json.dumps(session_data.get("strengths", [])),
        json.dumps(session_data.get("weaknesses", [])),
        json.dumps(session_data.get("actionable_suggestions", [])),
        json.dumps(session_data.get("weak_topics", [])),
        session_data.get("created_at", now_str)
    ))
    
    # Clean up any existing records for this session_id to allow clean updates
    cursor.execute("DELETE FROM session_questions WHERE session_id = ?", (session_id,))
    cursor.execute("DELETE FROM practice_drills WHERE session_id = ?", (session_id,))

    # Save questions and evaluations
    questions = session_data.get("questions", [])
    for idx, q in enumerate(questions):
        eval_data = q.get("evaluation") or {}
        if not isinstance(eval_data, dict):
            eval_data = {}
        cursor.execute("""
        INSERT INTO session_questions (
            session_id, question_index, question_text, category, resume_context,
            candidate_answer, score, relevance_score, accuracy_score,
            clarity_score, evidence_score, strengths_json, weaknesses_json,
            suggestion, improved_answer, weak_topics_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            session_id,
            idx,
            q.get("question_text", ""),
            q.get("category", "General"),
            q.get("resume_context", ""),
            q.get("candidate_answer", ""),
            float(eval_data.get("score", 0)),
            float(eval_data.get("relevance_score", 0)),
            float(eval_data.get("accuracy_score", 0)),
            float(eval_data.get("clarity_score", 0)),
            float(eval_data.get("evidence_score", 0)),
            json.dumps(eval_data.get("strengths", [])),
            json.dumps(eval_data.get("weaknesses", [])),
            eval_data.get("suggestion", ""),
            eval_data.get("improved_answer", ""),
            json.dumps(eval_data.get("weak_topics", []))
        ))
        
    # Save targeted practice drill recommendations
    drills = session_data.get("drills", [])
    for d in drills:
        if isinstance(d, str):
            try:
                d = json.loads(d)
            except Exception:
                continue
        if not isinstance(d, dict):
            continue
        cursor.execute("""
        INSERT INTO practice_drills (
            session_id, topic, recommended_question, difficulty, category, status, created_at
        ) VALUES (?, ?, ?, ?, ?, 'pending', ?)
        """, (
            session_id,
            d.get("topic", "Targeted Practice"),
            d.get("recommended_question", ""),
            d.get("difficulty", session_data.get("difficulty", "Mid-Level")),
            d.get("category", "Targeted Drill"),
            now_str
        ))
        
    conn.commit()
    conn.close()

    # Record all session questions to the historical duplicate tracking ledger
    try:
        record_asked_questions_batch(
            candidate_name=session_data.get("candidate_name", "Candidate"),
            questions=questions,
            session_id=session_id,
            target_role=session_data.get("target_role", "Software Engineer"),
            difficulty=session_data.get("difficulty", "Mid-Level"),
            interview_type=session_data.get("interview_type", "Mixed")
        )
    except Exception as e:
        print(f"Warning: Failed to record asked questions to history ledger: {e}")

    return session_id

def record_asked_question(
    candidate_name: str,
    question_text: str,
    concept_id: str = "general",
    topic: str = "General",
    difficulty: str = "Mid-Level",
    interview_type: str = "Mixed",
    target_role: str = "Software Engineer",
    session_id: str = ""
):
    from duplicate_detector import normalize_text
    norm = normalize_text(question_text)
    now_str = datetime.utcnow().isoformat()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO asked_questions (
        candidate_name, question_text, normalized_question, concept_id, topic,
        difficulty, interview_type, target_role, session_id, asked_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        candidate_name or "Candidate",
        question_text,
        norm,
        concept_id or "general",
        topic or "General",
        difficulty or "Mid-Level",
        interview_type or "Mixed",
        target_role or "Software Engineer",
        session_id or "",
        now_str
    ))
    conn.commit()
    conn.close()

def record_asked_questions_batch(
    candidate_name: str,
    questions: List[Dict[str, Any]],
    session_id: str = "",
    target_role: str = "Software Engineer",
    difficulty: str = "Mid-Level",
    interview_type: str = "Mixed"
):
    from duplicate_detector import normalize_text
    now_str = datetime.utcnow().isoformat()
    conn = get_connection()
    cursor = conn.cursor()
    for q in questions:
        q_text = q.get("question_text", "")
        if not q_text or not q_text.strip():
            continue
        norm = normalize_text(q_text)
        concept_id = q.get("concept_id") or q.get("category") or "general"
        topic = q.get("category") or "General"
        diff = q.get("difficulty") or difficulty
        
        cursor.execute("""
        INSERT INTO asked_questions (
            candidate_name, question_text, normalized_question, concept_id, topic,
            difficulty, interview_type, target_role, session_id, asked_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            candidate_name or "Candidate",
            q_text,
            norm,
            concept_id,
            topic,
            diff,
            interview_type,
            target_role,
            session_id,
            now_str
        ))
    conn.commit()
    conn.close()

def get_previously_asked_questions(candidate_name: str = "", limit: int = 300) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    if candidate_name and candidate_name.strip() and candidate_name.lower() != "candidate":
        cursor.execute("""
        SELECT question_text, normalized_question, concept_id, topic, difficulty, target_role, asked_at
        FROM asked_questions
        WHERE LOWER(candidate_name) = LOWER(?)
        ORDER BY id DESC
        LIMIT ?
        """, (candidate_name.strip(), limit))
    else:
        cursor.execute("""
        SELECT question_text, normalized_question, concept_id, topic, difficulty, target_role, asked_at
        FROM asked_questions
        ORDER BY id DESC
        LIMIT ?
        """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(r) for r in rows]

def get_candidate_weak_topics(candidate_name: str = "") -> List[str]:
    conn = get_connection()
    cursor = conn.cursor()
    query = "SELECT weak_topics_json FROM sessions WHERE weak_topics_json IS NOT NULL"
    params = ()
    if candidate_name and candidate_name.strip() and candidate_name.lower() != "candidate":
        query += " AND LOWER(candidate_name) = LOWER(?)"
        params = (candidate_name.strip(),)
        
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    counts = {}
    for r in rows:
        try:
            topics = json.loads(r[0])
            for t in topics:
                if t:
                    counts[t] = counts.get(t, 0) + 1
        except Exception:
            pass
            
    sorted_topics = sorted(counts.keys(), key=lambda k: counts[k], reverse=True)
    return sorted_topics

def get_recent_sessions(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, candidate_name, target_role, interview_type, difficulty,
           resume_filename, overall_score, evaluation_mode, created_at
    FROM sessions
    ORDER BY created_at DESC
    LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "candidate_name": r["candidate_name"],
            "target_role": r["target_role"],
            "interview_type": r["interview_type"],
            "difficulty": r["difficulty"],
            "resume_filename": r["resume_filename"],
            "overall_score": r["overall_score"],
            "evaluation_mode": r["evaluation_mode"],
            "created_at": r["created_at"]
        })
    return results

def get_session_details(session_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
    session_row = cursor.fetchone()
    if not session_row:
        conn.close()
        return None
        
    cursor.execute("""
    SELECT * FROM session_questions WHERE session_id = ? ORDER BY question_index ASC
    """, (session_id,))
    q_rows = cursor.fetchall()
    
    cursor.execute("""
    SELECT * FROM practice_drills WHERE session_id = ?
    """, (session_id,))
    drill_rows = cursor.fetchall()
    
    conn.close()
    
    questions = []
    for qr in q_rows:
        questions.append({
            "question_index": qr["question_index"],
            "question_text": qr["question_text"],
            "category": qr["category"],
            "resume_context": qr["resume_context"],
            "candidate_answer": qr["candidate_answer"],
            "evaluation": {
                "score": qr["score"],
                "relevance_score": qr["relevance_score"],
                "accuracy_score": qr["accuracy_score"],
                "clarity_score": qr["clarity_score"],
                "evidence_score": qr["evidence_score"],
                "strengths": json.loads(qr["strengths_json"] or "[]"),
                "weaknesses": json.loads(qr["weaknesses_json"] or "[]"),
                "suggestion": qr["suggestion"],
                "improved_answer": qr["improved_answer"],
                "weak_topics": json.loads(qr["weak_topics_json"] or "[]")
            }
        })
        
    drills = []
    for dr in drill_rows:
        drills.append({
            "id": dr["id"],
            "topic": dr["topic"],
            "recommended_question": dr["recommended_question"],
            "difficulty": dr["difficulty"],
            "category": dr["category"],
            "status": dr["status"]
        })
        
    return {
        "id": session_row["id"],
        "candidate_name": session_row["candidate_name"],
        "target_role": session_row["target_role"],
        "interview_type": session_row["interview_type"],
        "difficulty": session_row["difficulty"],
        "resume_filename": session_row["resume_filename"],
        "overall_score": session_row["overall_score"],
        "evaluation_mode": session_row["evaluation_mode"],
        "strengths": json.loads(session_row["strengths_json"] or "[]"),
        "weaknesses": json.loads(session_row["weaknesses_json"] or "[]"),
        "actionable_suggestions": json.loads(session_row["actionable_suggestions_json"] or "[]"),
        "weak_topics": json.loads(session_row["weak_topics_json"] or "[]"),
        "created_at": session_row["created_at"],
        "questions": questions,
        "drills": drills
    }

def delete_session(session_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM session_questions WHERE session_id = ?", (session_id,))
    cursor.execute("DELETE FROM practice_drills WHERE session_id = ?", (session_id,))
    cursor.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    conn.commit()
    conn.close()
    return True

def get_dashboard_analytics() -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*), AVG(overall_score) FROM sessions")
    cnt, avg_score = cursor.fetchone()
    total_sessions = cnt or 0
    avg_score = round(avg_score, 1) if avg_score else 0.0
    
    # Score progression
    cursor.execute("""
    SELECT id, target_role, interview_type, overall_score, created_at
    FROM sessions
    ORDER BY created_at ASC
    LIMIT 20
    """)
    trend_rows = cursor.fetchall()
    score_trend = [{
        "id": r["id"],
        "role": r["target_role"],
        "type": r["interview_type"],
        "score": r["overall_score"],
        "date": r["created_at"][:10]
    } for r in trend_rows]
    
    # Aggregate weak topics from all sessions
    cursor.execute("SELECT weak_topics_json FROM sessions WHERE weak_topics_json IS NOT NULL")
    topic_rows = cursor.fetchall()
    topic_counts = {}
    for tr in topic_rows:
        try:
            topics = json.loads(tr[0])
            for t in topics:
                topic_counts[t] = topic_counts.get(t, 0) + 1
        except Exception:
            pass
            
    # Sort weak topics
    sorted_weak_topics = sorted(
        [{"topic": k, "count": v} for k, v in topic_counts.items()],
        key=lambda x: x["count"],
        reverse=True
    )[:8]
    
    # Category averages
    cursor.execute("""
    SELECT interview_type, COUNT(*), AVG(overall_score)
    FROM sessions
    GROUP BY interview_type
    """)
    cat_rows = cursor.fetchall()
    category_breakdown = [{
        "type": r[0],
        "count": r[1],
        "avg_score": round(r[2], 1)
    } for r in cat_rows]
    
    # Pending drills
    cursor.execute("""
    SELECT id, topic, recommended_question, difficulty, category, session_id
    FROM practice_drills
    WHERE status = 'pending'
    ORDER BY id DESC
    LIMIT 6
    """)
    drill_rows = cursor.fetchall()
    pending_drills = [{
        "id": dr["id"],
        "topic": dr["topic"],
        "recommended_question": dr["recommended_question"],
        "difficulty": dr["difficulty"],
        "category": dr["category"],
        "session_id": dr["session_id"]
    } for dr in drill_rows]
    
    conn.close()
    
    return {
        "total_sessions": total_sessions,
        "average_score": avg_score,
        "score_trend": score_trend,
        "weak_topics": sorted_weak_topics,
        "category_breakdown": category_breakdown,
        "pending_drills": pending_drills
    }
