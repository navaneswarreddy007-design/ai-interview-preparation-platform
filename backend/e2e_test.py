import requests
import json
import time

def run_e2e_tests():
    print("=== STARTING END-TO-END VERIFICATION ===")
    
    # 1. Health check
    print("\n[1/8] Verifying Backend Health API (/api/health)...")
    res = requests.get("http://localhost:5000/api/health", timeout=5)
    assert res.status_code == 200, f"Health check failed with {res.status_code}"
    health_data = res.json()
    print(f"      Backend Status: {health_data['status']}")
    print(f"      AI Evaluation Engine: {health_data['ai_status']['mode']}")
    print(f"      Database: {health_data['database']}")

    # 2. Frontend check
    print("\n[2/8] Verifying Frontend Dev Server (http://localhost:3000)...")
    fe_res = requests.get("http://localhost:3000", timeout=5)
    assert fe_res.status_code == 200, f"Frontend returned {fe_res.status_code}"
    assert "PrepForge" in fe_res.text or "root" in fe_res.text, "Frontend index HTML missing root div"
    print("      Frontend served successfully with HTTP 200!")

    # 3. Sample Resumes API
    print("\n[3/8] Testing Sample Resumes Retrieval (/api/sample-resumes)...")
    samples_res = requests.get("http://localhost:5000/api/sample-resumes", timeout=5)
    assert samples_res.status_code == 200
    samples = samples_res.json()["samples"]
    print(f"      Retrieved {len(samples)} pre-loaded resumes.")
    for s in samples:
        print(f"      - {s['title']} ({s['skills_count']} skills, {s['projects_count']} projects)")

    # 4. Load Sample Resume
    print("\n[4/8] Testing Resume Loading & Entity Extraction (/api/load-sample-resume)...")
    load_res = requests.post("http://localhost:5000/api/load-sample-resume", json={"sample_id": "fullstack"}, timeout=5)
    assert load_res.status_code == 200
    resume_payload = load_res.json()
    candidate_profile = resume_payload["candidate_profile"]
    assert candidate_profile["candidate_name"] == "Alex Morgan"
    print(f"      Candidate: {candidate_profile['candidate_name']}")
    print(f"      Verified Skills: {', '.join(candidate_profile['all_skills'][:6])}...")
    print(f"      Projects: {[p['title'] for p in candidate_profile['projects']]}")

    # 5. Generate Grounded Questions
    print("\n[5/8] Testing Grounded Question Generation (/api/generate-questions)...")
    gen_payload = {
        "resume_data": candidate_profile,
        "target_role": "Senior Full Stack Engineer",
        "interview_type": "Mixed",
        "difficulty": "Senior",
        "question_count": 3
    }
    gen_res = requests.post("http://localhost:5000/api/generate-questions", json=gen_payload, timeout=10)
    assert gen_res.status_code == 200
    gen_data = gen_res.json()
    questions = gen_data["questions"]
    assert len(questions) == 3, f"Expected 3 questions, got {len(questions)}"
    print(f"      Generated {len(questions)} grounded questions in {gen_data['mode']}:")
    for idx, q in enumerate(questions):
        print(f"      Q{idx+1}: [{q['category']}] {q['question_text'][:75]}...")
        print(f"          Context: {q['resume_context']}")

    # 6. Evaluate Candidate Answer
    print("\n[6/8] Testing Answer Evaluation & Improved Answer Generation (/api/evaluate-answer)...")
    sample_candidate_answer = (
        "During my time at CloudScale Systems, we had a major query latency issue with our PostgreSQL database "
        "affecting 450,000 monthly users. I designed and deployed a multi-tiered Redis caching layer and added composite "
        "indexes on customer_id and created_at. As a result, our p95 latency plummeted from 850ms to 110ms with zero downtime."
    )
    eval_payload = {
        "question": questions[0],
        "candidate_answer": sample_candidate_answer,
        "resume_data": candidate_profile,
        "target_role": "Senior Full Stack Engineer"
    }
    eval_res = requests.post("http://localhost:5000/api/evaluate-answer", json=eval_payload, timeout=10)
    assert eval_res.status_code == 200
    eval_data = eval_res.json()
    print(f"      Evaluation Score: {eval_data['score']}/100")
    print(f"      Rubric Breakdown: Relevance={eval_data['relevance_score']}, Accuracy={eval_data['accuracy_score']}, Clarity={eval_data['clarity_score']}, Evidence={eval_data['evidence_score']}")
    print(f"      Identified Strengths: {eval_data['strengths']}")
    print(f"      Identified Weaknesses: {eval_data['weaknesses']}")
    print(f"      Evaluation Mode: {eval_data['evaluation_mode']}")
    print(f"      Improved Answer Preview: {eval_data['improved_answer'][:90]}...")
    assert eval_data["score"] > 60

    # 7. Complete Session & Persist in SQLite
    print("\n[7/8] Testing Session Finalization & SQLite Persistence (/api/complete-session)...")
    questions[0]["candidate_answer"] = sample_candidate_answer
    questions[0]["evaluation"] = eval_data
    session_payload = {
        "candidate_name": candidate_profile["candidate_name"],
        "target_role": "Senior Full Stack Engineer",
        "interview_type": "Mixed",
        "difficulty": "Senior",
        "resume_filename": "alex_morgan_resume.pdf",
        "questions": questions
    }
    comp_res = requests.post("http://localhost:5000/api/complete-session", json=session_payload, timeout=10)
    assert comp_res.status_code == 200
    comp_data = comp_res.json()
    session_id = comp_data["session_id"]
    print(f"      Session successfully persisted! ID: {session_id}")
    print(f"      Aggregate Score: {comp_data['overall_score']}/100")

    # 8. History & Dashboard Analytics
    print("\n[8/8] Testing History & Dashboard Analytics (/api/history & /api/dashboard-stats)...")
    hist_res = requests.get("http://localhost:5000/api/history", timeout=5)
    assert hist_res.status_code == 200
    sessions_list = hist_res.json()["sessions"]
    matching_session = next((s for s in sessions_list if s["id"] == session_id), None)
    assert matching_session is not None, "Saved session not found in history list!"
    print(f"      History contains {len(sessions_list)} sessions. Found session {session_id}.")

    stats_res = requests.get("http://localhost:5000/api/dashboard-stats", timeout=5)
    assert stats_res.status_code == 200
    stats_data = stats_res.json()
    print(f"      Dashboard Stats: Total Sessions={stats_data['total_sessions']}, Average Score={stats_data['average_score']}")
    print(f"      Pending Follow-Up Drills: {len(stats_data['pending_drills'])}")

    print("\n=== ALL 8 END-TO-END TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    run_e2e_tests()
