import os
import requests
import json

PORT = os.getenv("PORT", "5001")
BASE_URL = f"http://127.0.0.1:{PORT}/api"

def test_complete_session_with_partial_evaluations():
    print("=== TESTING COMPLETE SESSION EDGE CASES ===")
    
    # Simulate an interview session where:
    # Q1 was answered but NOT evaluated individually by the candidate
    # Q2 was skipped (blank answer)
    # Q3 was answered AND evaluated
    payload = {
        "candidate_name": "Bug Audit Candidate",
        "target_role": "Full Stack Developer",
        "interview_type": "Technical",
        "difficulty": "Mid-Level",
        "resume_filename": "sample_cv.pdf",
        "questions": [
            {
                "id": 1,
                "question_text": "How do you optimize slow database queries in PostgreSQL?",
                "category": "Technical Deep-Dive",
                "resume_context": "Grounded in PostgreSQL",
                "candidate_answer": "I analyze the query with EXPLAIN ANALYZE, look for sequential scans, and add composite indexes on foreign keys.",
                "evaluation": None  # NOT evaluated individually!
            },
            {
                "id": 2,
                "question_text": "Describe your experience handling production outages.",
                "category": "Behavioral",
                "resume_context": "Grounded in Work Experience",
                "candidate_answer": "",  # Skipped!
                "evaluation": None  # NOT evaluated!
            },
            {
                "id": 3,
                "question_text": "How do you manage state in React applications?",
                "category": "Frontend Architecture",
                "resume_context": "Grounded in React",
                "candidate_answer": "I use React context for lightweight global state and Redux Toolkit or Zustand for complex asynchronous server data.",
                "evaluation": {
                    "score": 82.0,
                    "relevance_score": 85,
                    "accuracy_score": 80,
                    "clarity_score": 85,
                    "evidence_score": 75,
                    "strengths": ["Clear comparison of state tools."],
                    "weaknesses": ["Could mention server cache tools like React Query."],
                    "suggestion": "Mention React Query for server cache.",
                    "improved_answer": "I structure state into local component state, server cache with React Query, and global state.",
                    "weak_topics": ["Server State Synchronization"],
                    "recommended_drills": [
                        {"topic": "Server State Synchronization", "recommended_question": "When would you prefer TanStack Query over Redux Toolkit?"}
                    ]
                }
            }
        ]
    }
    
    print(f"1. Sending complete-session request to {BASE_URL}/complete-session...")
    res = requests.post(f"{BASE_URL}/complete-session", json=payload, timeout=10)
    print(f"   Status Code: {res.status_code}")
    
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["success"] is True, "Expected success: True"
    summary = data["summary"]
    session_id = data["session_id"]
    print(f"   Session ID created: {session_id}")
    print(f"   Overall Score: {data['overall_score']}/100")
    
    # Verify Q1 was auto-evaluated
    q1 = summary["questions"][0]
    assert q1["evaluation"] is not None, "Q1 should have been auto-evaluated!"
    assert q1["evaluation"]["score"] > 0, "Q1 should have received a valid score!"
    print(f"   Q1 Auto-evaluation Score: {q1['evaluation']['score']}")
    
    # Verify Q2 was marked unattempted honestly
    q2 = summary["questions"][1]
    assert q2["evaluation"]["score"] == 0.0, "Q2 was skipped, score should be 0!"
    print(f"   Q2 Honest Skipped Score: {q2['evaluation']['score']}")
    
    # Verify Q3 preserved its evaluation
    q3 = summary["questions"][2]
    assert q3["evaluation"]["score"] == 82.0, "Q3 score should be preserved!"
    print(f"   Q3 Preserved Score: {q3['evaluation']['score']}")
    
    # Verify session retrieval from database
    print("\n2. Verifying retrieval from /api/history/<session_id>...")
    detail_res = requests.get(f"{BASE_URL}/history/{session_id}", timeout=5)
    assert detail_res.status_code == 200
    detail_data = detail_res.json()["session"]
    assert detail_data["id"] == session_id
    assert len(detail_data["questions"]) == 3
    print("   Session verified in SQLite database!")
    
    # Clean up test session
    requests.delete(f"{BASE_URL}/history/{session_id}")
    print("\n=== COMPLETE SESSION BUG VERIFICATION PASSED 100%! ===")

if __name__ == "__main__":
    test_complete_session_with_partial_evaluations()
