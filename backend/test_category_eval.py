import json
from evaluator import evaluate_answer, classify_question_category

def run_tests():
    print("==================================================")
    print("RUNNING PREPFORGE EVALUATION SPECIFICITY TEST SUITE")
    print("==================================================")
    
    mock_resume = {
        "candidate_name": "Alex Morgan",
        "all_skills": ["React", "TypeScript", "Node.js", "PostgreSQL", "Redis", "Docker", "AWS"],
        "raw_text": "Alex Morgan, Senior Full Stack Engineer. 5 years experience in React, Node, PostgreSQL."
    }

    # ----------------------------------------------------
    # TEST 1: Leadership & Collaboration Question
    # ----------------------------------------------------
    print("\n[TEST 1] Testing Behavioral / Leadership Disagreement Question...")
    behavioral_q = {
        "id": 1,
        "category": "Leadership & Collaboration",
        "question_text": "In your role at 'CloudScale Systems', have you ever disagreed with a teammate or technical lead regarding an implementation detail or code design? How did you resolve the disagreement constructively?",
        "resume_context": "Grounded in Work Experience: 'Senior Software Engineer | CloudScale Systems'",
        "focus_areas": ["Constructive debate", "Data-driven decisions", "Team cohesion"],
        "difficulty": "Senior"
    }

    # Candidate answers with a real conflict resolution scenario without mentioning database indexes
    behavioral_answer = (
        "In my previous role, a teammate proposed deploying a feature without comprehensive staging tests to meet a strict deadline. "
        "I scheduled a quick 1-on-1 sync to listen to their timeline concerns and understand the urgency from the product team. "
        "I proposed a constructive compromise where we automated the critical path tests first, which took only 2 hours, and scheduled non-blocking edge-case tests for the next sprint. "
        "We presented this plan together to our engineering manager, kept the team aligned, and delivered on time with zero production incidents."
    )

    result_b = evaluate_answer(
        question=behavioral_q,
        candidate_answer=behavioral_answer,
        resume_data=mock_resume,
        target_role="Senior Full Stack Engineer",
        difficulty="Senior"
    )

    print(f"  Score: {result_b['score']} (Rel: {result_b['relevance_score']}, Acc: {result_b['accuracy_score']}, Cla: {result_b['clarity_score']}, Ev: {result_b['evidence_score']})")
    print(f"  Strengths: {result_b['strengths']}")
    print(f"  Weaknesses: {result_b['weaknesses']}")
    print(f"  Coach Suggestion: {result_b['suggestion']}")
    print(f"  Improved Answer Excerpt: {result_b['improved_answer'][:180]}...")

    # Strict Assertions for Behavioral Question
    assert result_b["score"] >= 75, f"Expected high score for well-structured behavioral answer, got {result_b['score']}"
    assert "caching strategy" not in result_b["suggestion"].lower(), "FAIL: Behavioral suggestion inappropriately mentioned caching strategy!"
    assert "database indexes" not in result_b["suggestion"].lower(), "FAIL: Behavioral suggestion inappropriately mentioned database indexes!"
    assert "modular architecture" not in result_b["improved_answer"].lower(), "FAIL: Behavioral improved answer inappropriately talked about modular architecture!"
    assert any("conflict" in s.lower() or "team" in s.lower() or "ownership" in s.lower() for s in result_b["strengths"]), "FAIL: Strengths should highlight conflict resolution or collaboration"
    print("  >>> PASS: Behavioral evaluation is strictly tailored to communication and conflict de-escalation.")

    # ----------------------------------------------------
    # TEST 2: Aptitude & Problem Solving Question
    # ----------------------------------------------------
    print("\n[TEST 2] Testing Aptitude & Problem Solving Question...")
    aptitude_q = {
        "id": 2,
        "category": "Aptitude & Problem Solving",
        "question_text": "Suppose your application experiences a memory consumption anomaly where RAM utilization grows linearly by 15MB/hour. What profiling strategy and memory leak isolation workflow would you execute?",
        "resume_context": "Analytical Aptitude grounded in Node.js service",
        "focus_areas": ["Analytical debugging", "Telemetry & profiling", "Resource lifecycle"],
        "difficulty": "Mid-Level"
    }

    aptitude_answer = (
        "I would start by capturing heap snapshots and memory allocation profiles using Node.js inspect and Chrome DevTools over a 30-minute window. "
        "By taking differential snapshots, I can identify which constructors or event listener closures retain references and prevent garbage collection. "
        "Once isolated to an unclosed WebSocket event handler, I write a reproducer test script, eliminate the leak, and verify on staging that RAM stabilizes with bounded O(1) auxiliary space."
    )

    result_a = evaluate_answer(
        question=aptitude_q,
        candidate_answer=aptitude_answer,
        resume_data=mock_resume,
        target_role="Full Stack Engineer",
        difficulty="Mid-Level"
    )

    print(f"  Score: {result_a['score']}")
    print(f"  Coach Suggestion: {result_a['suggestion']}")
    assert result_a["score"] >= 75, f"Expected high score, got {result_a['score']}"
    assert any("complexity" in s.lower() or "hypothes" in s.lower() or "profil" in s.lower() for s in [result_a["suggestion"]] + result_a["strengths"]), "FAIL: Aptitude evaluation missing analytical focus"
    print("  >>> PASS: Aptitude evaluation focuses on profiling, hypothesis testing, and complexity.")

    # ----------------------------------------------------
    # TEST 3: Technical Deep-Dive Question
    # ----------------------------------------------------
    print("\n[TEST 3] Testing Technical Deep-Dive Question...")
    technical_q = {
        "id": 3,
        "category": "Data & Persistence",
        "question_text": "You have experience working with PostgreSQL. Can you describe an instance where query optimization, indexing, or transaction isolation played a key role in maintaining application responsiveness?",
        "resume_context": "Grounded in Database: PostgreSQL",
        "focus_areas": ["Query execution & indexing", "Locking / consistency", "Storage optimization"],
        "difficulty": "Senior"
    }

    tech_answer = (
        "In our analytics platform, a complex JOIN query on user activity logs was causing high CPU spikes and 850ms latency. "
        "I ran EXPLAIN ANALYZE to inspect the query plan and discovered sequential scans on foreign keys. "
        "I introduced a composite B-Tree index on (tenant_id, created_at) and adjusted our connection pool. "
        "This dropped query latency from 850ms down to 110ms with zero index bloating, confirmed via automated load tests."
    )

    result_t = evaluate_answer(
        question=technical_q,
        candidate_answer=tech_answer,
        resume_data=mock_resume,
        target_role="Senior Full Stack Engineer",
        difficulty="Senior"
    )

    print(f"  Score: {result_t['score']}")
    print(f"  Coach Suggestion: {result_t['suggestion']}")
    assert result_t["score"] >= 75
    assert any("technical" in s.lower() or "tool" in s.lower() or "fluency" in s.lower() for s in result_t["strengths"])
    print("  >>> PASS: Technical evaluation properly assesses query optimization and implementation verification.")

    # ----------------------------------------------------
    # TEST 4: Blank Answer Handling
    # ----------------------------------------------------
    print("\n[TEST 4] Testing Blank Answer Handling...")
    result_blank = evaluate_answer(
        question=behavioral_q,
        candidate_answer="",
        resume_data=mock_resume,
        target_role="Senior Full Stack Engineer"
    )
    assert result_blank["score"] == 0.0
    assert result_blank["is_ai"] is False
    print("  >>> PASS: Blank answer returns 0 score with appropriate guidance.")

    print("\n==================================================")
    print("ALL CATEGORY EVALUATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
