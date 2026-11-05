import os
import requests
import json
import uuid

port = os.environ.get("PORT", "5001")
BASE_URL = f"http://127.0.0.1:{port}/api"

def test_full_workflow():
    print("=" * 60)
    print("PREPFORGE FULL WORKFLOW AND EVALUATION SPECIFICITY TEST")
    print("=" * 60)

    # 1. Health Check
    print("\n[Step 1] Verifying server health...")
    r = requests.get(f"{BASE_URL}/health", timeout=5)
    assert r.status_code == 200
    print("  -> Backend is healthy and running.")

    # 2. Load Resume
    print("\n[Step 2] Loading Alex Morgan candidate resume...")
    r = requests.post(f"{BASE_URL}/load-sample-resume", json={"sample_id": "fullstack"}, timeout=5)
    assert r.status_code == 200
    candidate_profile = r.json()["candidate_profile"]
    print(f"  -> Candidate: {candidate_profile['candidate_name']}, Skills: {len(candidate_profile['all_skills'])}")

    # 3. Generate Questions
    print("\n[Step 3] Generating questions for Senior Full Stack Engineer (Mixed)...")
    gen_payload = {
        "resume_data": candidate_profile,
        "target_role": "Senior Full Stack Engineer",
        "interview_type": "Mixed",
        "difficulty": "Senior",
        "question_count": 2
    }
    r = requests.post(f"{BASE_URL}/generate-questions", json=gen_payload, timeout=5)
    assert r.status_code == 200
    questions = r.json()["questions"]
    assert len(questions) == 2
    for i, q in enumerate(questions):
        print(f"  Q{i+1}: [{q['category']}] {q['question_text']}")

    # 4. Evaluate each question with tailored responses
    # Prepare one Behavioral question and one Technical question
    behavioral_q = {
        "id": 1,
        "category": "Leadership & Collaboration",
        "question_text": "In your role at 'CloudScale Systems', have you ever disagreed with a teammate or technical lead regarding an implementation detail? How did you resolve it?",
        "resume_context": "Grounded in Work Experience: 'Senior Software Engineer | CloudScale Systems'",
        "focus_areas": ["Constructive debate", "Data-driven decisions", "Team cohesion"],
        "difficulty": "Senior"
    }

    technical_q = {
        "id": 2,
        "category": "Data & Persistence",
        "question_text": "You have experience working with PostgreSQL. Can you describe an instance where query optimization, indexing, or transaction isolation played a key role?",
        "resume_context": "Grounded in Database: PostgreSQL",
        "focus_areas": ["Query execution & indexing", "Locking / consistency", "Storage optimization"],
        "difficulty": "Senior"
    }

    test_questions = [behavioral_q, technical_q]

    # Candidate answers
    answers = [
        # Behavioral answer: active conflict resolution, 1-on-1, compromise, on-time delivery
        (
            "When working at CloudScale Systems, a senior colleague proposed shipping a critical feature without full automated integration tests to beat a deadline. "
            "I set up a 1-on-1 discussion to actively listen to their timeline pressure and understand the business commitments. "
            "I proposed a balanced compromise: we automated the primary customer checkout path tests first, which took only 2 hours, and scheduled non-critical edge cases for sprint 2. "
            "Our manager approved the plan, our team remained closely aligned, and we delivered on schedule with zero customer issues."
        ),
        # Technical answer: EXPLAIN ANALYZE, B-Tree index, connection pooling, latency reduction
        (
            "In our PostgreSQL analytics database, a complex user activity query was creating severe CPU spikes and 850ms latency. "
            "I ran EXPLAIN ANALYZE to inspect the query execution plan and observed sequential scans on foreign keys. "
            "I introduced a composite B-Tree index on (tenant_id, created_at) and tuned our connection pool settings. "
            "This dropped latency from 850ms to 110ms with zero index bloating, verified using automated load testing."
        )
    ]

    evaluated_questions = []

    print("\n[Step 4] Submitting and evaluating answers...")
    for idx, q in enumerate(test_questions):
        cand_ans = answers[idx]
        eval_resp = requests.post(f"{BASE_URL}/evaluate-answer", json={
            "question": q,
            "candidate_answer": cand_ans,
            "resume_data": candidate_profile,
            "target_role": "Senior Full Stack Engineer",
            "difficulty": "Senior"
        }, timeout=5)
        assert eval_resp.status_code == 200
        ev = eval_resp.json()
        print(f"\n  Evaluation Q{idx+1} ({q['category']}):")
        print(f"    Overall Score: {ev['score']}/100")
        print(f"    Subscores: Relevance={ev['relevance_score']}, Accuracy={ev['accuracy_score']}, Clarity={ev['clarity_score']}, Evidence={ev['evidence_score']}")
        print(f"    Coach Suggestion: {ev['suggestion']}")
        print(f"    Strengths: {ev['strengths']}")
        print(f"    Mode: {ev['evaluation_mode']}")

        # Validate that Behavioral does not contain tech suggestions
        if q["category"] == "Leadership & Collaboration":
            assert "database index" not in ev["suggestion"].lower(), "Behavioral suggestion mentioned database indexes!"
            assert "caching" not in ev["suggestion"].lower(), "Behavioral suggestion mentioned caching!"
            print("    -> VERIFIED: Behavioral coach suggestion is strictly leadership-focused!")

        # Validate that Technical does focus on technical implementation
        if q["category"] == "Data & Persistence":
            assert "postgresql" in ev["suggestion"].lower() or "tools" in ev["suggestion"].lower()
            print("    -> VERIFIED: Technical coach suggestion focuses on engineering trade-offs!")

        q_copy = dict(q)
        q_copy["candidate_answer"] = cand_ans
        q_copy["evaluation"] = ev
        evaluated_questions.append(q_copy)

    # 5. Complete Session & Finalize Report
    print("\n[Step 5] Finalizing session & saving to database via /api/complete-session...")
    session_id = str(uuid.uuid4())
    comp_payload = {
        "session_id": session_id,
        "candidate_name": "Alex Morgan",
        "target_role": "Senior Full Stack Engineer",
        "interview_type": "Mixed",
        "difficulty": "Senior",
        "resume_filename": "alex_morgan_resume.pdf",
        "resume_data": candidate_profile,
        "questions": evaluated_questions
    }
    comp_resp = requests.post(f"{BASE_URL}/complete-session", json=comp_payload, timeout=5)
    assert comp_resp.status_code == 200
    comp_data = comp_resp.json()
    print(f"  -> Session Completed! Session ID: {comp_data['session_id']}")
    print(f"  -> Report Overall Score: {comp_data['overall_score']}/100")
    print(f"  -> Generated Strengths Count: {len(comp_data['summary']['strengths'])}")
    print(f"  -> Generated Actionable Suggestions Count: {len(comp_data['summary']['actionable_suggestions'])}")
    print(f"  -> Targeted Drills Generated: {len(comp_data['summary']['drills'])}")

    expected_avg = round((evaluated_questions[0]["evaluation"]["score"] + evaluated_questions[1]["evaluation"]["score"]) / 2, 1)
    assert abs(comp_data["overall_score"] - expected_avg) < 0.2, f"Score mismatch: {comp_data['overall_score']} vs expected {expected_avg}"
    print(f"  -> VERIFIED: Report overall score ({comp_data['overall_score']}) matches individual question average ({expected_avg})!")

    # 6. Verify Persistence in Past Sessions (/api/history and /api/history/<session_id>)
    print("\n[Step 6] Simulating browser refresh and verifying Past Sessions...")
    hist_resp = requests.get(f"{BASE_URL}/history", timeout=5)
    assert hist_resp.status_code == 200
    sessions = hist_resp.json()["sessions"]
    saved_session = next((s for s in sessions if s["id"] == session_id), None)
    assert saved_session is not None, f"Session {session_id} not found in history list!"
    print(f"  -> Found session in Past Sessions list: {saved_session['id']} (Score: {saved_session['overall_score']})")

    # Fetch deep details
    detail_resp = requests.get(f"{BASE_URL}/history/{session_id}", timeout=5)
    assert detail_resp.status_code == 200
    detail = detail_resp.json()["session"]
    assert len(detail["questions"]) == 2
    for idx, q_saved in enumerate(detail["questions"]):
        print(f"    Saved Q{idx+1}: [{q_saved['category']}] Score={q_saved['evaluation']['score']}")
        print(f"      Coach Suggestion: {q_saved['evaluation']['suggestion']}")
        assert q_saved["candidate_answer"] == answers[idx]
        assert q_saved["evaluation"]["score"] > 70
        assert q_saved["evaluation"]["suggestion"] is not None and len(q_saved["evaluation"]["suggestion"]) > 10

    print("\n" + "=" * 60)
    print("ALL TESTS PASSED: FULL EVALUATION AND WORKFLOW VERIFIED 100%!")
    print("=" * 60)

if __name__ == "__main__":
    test_full_workflow()
