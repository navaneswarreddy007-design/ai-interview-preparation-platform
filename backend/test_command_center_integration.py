import requests
import json
import sys

BASE_URL = "http://127.0.0.1:5000/api"

def run_tests():
    print("==================================================")
    print("PREPFORGE JARVIS COMMAND CENTER INTEGRATION TESTS")
    print("==================================================")

    # 1. Health Endpoint
    print("\n[1] Testing /api/health...")
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=5)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        print(f"  -> Health OK: status={data.get('status')}, ai_status={data.get('ai_status', {}).get('mode')}")
    except Exception as e:
        print(f"  FAILED: {e}")
        sys.exit(1)

    # 2. Sample Resume Endpoint
    print("\n[2] Testing /api/load-sample-resume...")
    try:
        r = requests.post(f"{BASE_URL}/load-sample-resume", json={"sample_id": "fullstack"}, timeout=5)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        sample = r.json()
        cand_name = sample.get('candidate_profile', {}).get('candidate_name')
        skills = sample.get('candidate_profile', {}).get('all_skills', []) or sample.get('candidate_profile', {}).get('skills', [])
        assert cand_name == "Alex Morgan", f"Unexpected name: {cand_name}"
        assert len(skills) > 0, "No skills found in sample"
        print(f"  -> Sample Loaded OK: {cand_name} with {len(skills)} skills")
    except Exception as e:
        print(f"  FAILED: {e}")
        sys.exit(1)

    # 3. Assistant Command Directives
    print("\n[3] Testing /api/assistant/command with diverse directives...")
    test_cases = [
        ("start voice interview", "START_VOICE_INTERVIEW"),
        ("start full stack interview", "START_INTERVIEW"),
        ("load sample profile", "LOAD_SAMPLE"),
        ("analyze my resume cv", "OPEN_DOSSIER"),
        ("show previous history sessions", "OPEN_HISTORY"),
        ("download pdf report", "EXPORT_PDF"),
        ("practice targeted drills for weak areas", "OPEN_DRILLS"),
        ("what is my current benchmark score?", "GET_BENCHMARK"),
        ("what can you do help me", "HELP")
    ]

    for cmd, expected_action in test_cases:
        payload = {
            "command": cmd,
            "candidate_data": sample,
            "current_session": {}
        }
        r = requests.post(f"{BASE_URL}/assistant/command", json=payload, timeout=5)
        assert r.status_code == 200, f"Command '{cmd}' failed with {r.status_code}"
        res = r.json()
        action = res.get("action")
        spoken = res.get("spoken_response", "")
        screen = res.get("screen_display", "")
        assert action == expected_action, f"For '{cmd}', expected {expected_action}, got {action}"
        assert len(spoken) > 0, f"No spoken response for '{cmd}'"
        print(f"  -> Directive '{cmd}' => Action: {action}")
        print(f"     Spoken: \"{spoken[:65]}...\"")

    # 4. Question Generation
    print("\n[4] Testing /api/generate-questions with Alex Morgan resume...")
    gen_payload = {
        "resume_data": sample.get("candidate_profile", {}),
        "target_role": "Senior Full Stack Engineer",
        "interview_type": "Mixed",
        "difficulty": "Senior",
        "question_count": 3
    }
    r = requests.post(f"{BASE_URL}/generate-questions", json=gen_payload, timeout=5)
    assert r.status_code == 200
    q_data = r.json()
    questions = q_data.get("questions", [])
    assert len(questions) == 3, f"Expected 3 questions, got {len(questions)}"
    print(f"  -> Generated {len(questions)} grounded questions successfully.")

    # 5. Answer Evaluation
    print("\n[5] Testing /api/evaluate-answer...")
    eval_payload = {
        "question": questions[0],
        "candidate_answer": "At TechCorp I architected a real-time event pipeline using React, Node.js, and Redis which reduced API latency by 45%.",
        "resume_data": sample.get("candidate_profile", {}),
        "target_role": "Senior Full Stack Engineer",
        "difficulty": "Senior"
    }
    r = requests.post(f"{BASE_URL}/evaluate-answer", json=eval_payload, timeout=5)
    assert r.status_code == 200
    eval_res = r.json()
    assert "score" in eval_res
    print(f"  -> Evaluated Answer Score: {eval_res.get('score')}/100 | Relevance: {eval_res.get('relevance_score')}/25")

    # 6. PDF Export
    print("\n[6] Testing /api/export-pdf...")
    pdf_payload = {
        "session": {
            "id": "test_cmd_center_sess",
            "candidate_name": "Alex Morgan",
            "target_role": "Senior Full Stack Engineer",
            "overall_score": 86,
            "difficulty": "Senior",
            "questions": [
                {
                    **questions[0],
                    "candidate_answer": "At TechCorp I architected a real-time event pipeline using React, Node.js, and Redis.",
                    "evaluation": eval_res
                }
            ],
            "strengths": ["Clear metrics", "Grounded in Redis and Node.js"],
            "improvements": ["Expand on failure scenarios"]
        }
    }
    r = requests.post(f"{BASE_URL}/export-pdf", json=pdf_payload, timeout=10)
    assert r.status_code == 200
    assert r.headers.get("content-type") == "application/pdf"
    assert len(r.content) > 1000
    print(f"  -> Generated vector PDF successfully ({len(r.content)} bytes).")

    print("\n==================================================")
    print("ALL COMMAND CENTER INTEGRATION TESTS PASSED (100%)")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
