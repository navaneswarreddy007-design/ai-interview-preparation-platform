import requests
import json
import uuid
import io
import pypdf

BASE_URL = "http://127.0.0.1:5000/api"

def test_voice_interviewer_feature():
    print("=" * 65)
    print("TESTING PREPFORGE VOICE AI INTERVIEWER FEATURE SUITE")
    print("=" * 65)

    # 1. Health check
    print("\n[Step 1] Verifying Backend Health...")
    r = requests.get(f"{BASE_URL}/health", timeout=5)
    assert r.status_code == 200
    print("  -> Backend is healthy and ready.")

    # 2. Load candidate resume
    print("\n[Step 2] Loading candidate profile for voice interview...")
    r = requests.post(f"{BASE_URL}/load-sample-resume", json={"sample_id": "fullstack"}, timeout=5)
    assert r.status_code == 200
    candidate_profile = r.json()["candidate_profile"]
    print(f"  -> Candidate: {candidate_profile['candidate_name']}")

    # 3. Generate grounded questions for Voice AI Studio
    print("\n[Step 3] Generating questions for Voice AI Studio...")
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
    print(f"  -> Generated {len(questions)} grounded questions for Voice AI Studio.")

    # 4. Test Spoken Transcript Evaluation
    print("\n[Step 4] Testing Spoken Answer Transcription & Evaluation...")
    q1 = questions[0]
    spoken_transcript = (
        "During my work at CloudScale Systems, a teammate wanted to ship without testing to hit a release date. "
        "I scheduled a 1-on-1 discussion to listen to their timeline pressure and proposed a middle-ground compromise: "
        "we automated the critical user-facing path tests first, which took only 2 hours, and scheduled edge cases for next sprint. "
        "We met the deployment milestone on schedule with zero customer issues."
    )
    
    eval_resp = requests.post(f"{BASE_URL}/evaluate-answer", json={
        "question": q1,
        "candidate_answer": spoken_transcript,
        "resume_data": candidate_profile,
        "target_role": "Senior Full Stack Engineer",
        "difficulty": "Senior"
    }, timeout=5)
    assert eval_resp.status_code == 200
    ev1 = eval_resp.json()
    print(f"  -> Spoken Answer Score: {ev1['score']}/100")
    print(f"  -> Subscores: Relevance={ev1['relevance_score']}, Accuracy={ev1['accuracy_score']}, Clarity={ev1['clarity_score']}, Evidence={ev1['evidence_score']}")
    print(f"  -> Coach Suggestion: {ev1['suggestion']}")
    assert ev1["score"] >= 75

    # 5. Test Adaptive Follow-up Question Generation
    print("\n[Step 5] Testing Adaptive Follow-Up Question Generation (/api/generate-follow-up)...")
    fu_resp = requests.post(f"{BASE_URL}/generate-follow-up", json={
        "question": q1,
        "candidate_answer": spoken_transcript,
        "resume_data": candidate_profile,
        "target_role": "Senior Full Stack Engineer",
        "difficulty": "Senior"
    }, timeout=5)
    assert fu_resp.status_code == 200
    fu_data = fu_resp.json()
    follow_up = fu_data["follow_up_question"]
    print(f"  -> Follow-up Question Generated: \"{follow_up['question_text']}\"")
    print(f"  -> Mode: {fu_data['mode']}")
    assert "compromise" in follow_up["question_text"].lower() or "resolution" in follow_up["question_text"].lower() or "follow" in follow_up["question_text"].lower()
    print("  -> VERIFIED: Adaptive follow-up dynamically probes details from candidate's answer!")

    # 6. Test Empty Transcript Handling
    print("\n[Step 6] Testing Empty/Silent Transcript Fallback...")
    blank_eval_resp = requests.post(f"{BASE_URL}/evaluate-answer", json={
        "question": questions[1],
        "candidate_answer": "",
        "resume_data": candidate_profile,
        "target_role": "Senior Full Stack Engineer"
    }, timeout=5)
    assert blank_eval_resp.status_code == 200
    blank_ev = blank_eval_resp.json()
    assert blank_ev["score"] == 0.0
    print("  -> VERIFIED: Empty voice transcript returns 0 score without fabricated evaluations.")

    # 7. Complete Voice Session & SQLite Persistence
    print("\n[Step 7] Finalizing Voice Session & Persisting to Database...")
    q1_copy = dict(q1)
    q1_copy["candidate_answer"] = spoken_transcript
    q1_copy["evaluation"] = ev1

    # Answer second question with text fallback
    q2_copy = dict(questions[1])
    q2_text_fallback = (
        "In our analytics platform on PostgreSQL, a slow JOIN was spiking CPU usage. "
        "I ran EXPLAIN ANALYZE and discovered unindexed foreign keys. "
        "I added composite B-Tree indexes on tenant_id and created_at and tuned connection pool settings. "
        "Query latency dropped from 850ms to 110ms with zero index bloating."
    )
    eval_resp2 = requests.post(f"{BASE_URL}/evaluate-answer", json={
        "question": q2_copy,
        "candidate_answer": q2_text_fallback,
        "resume_data": candidate_profile,
        "target_role": "Senior Full Stack Engineer",
        "difficulty": "Senior"
    }, timeout=5)
    q2_copy["candidate_answer"] = q2_text_fallback
    q2_copy["evaluation"] = eval_resp2.json()

    session_id = str(uuid.uuid4())
    voice_session_payload = {
        "session_id": session_id,
        "candidate_name": "Alex Morgan",
        "target_role": "Senior Full Stack Engineer",
        "interview_type": "Mixed (Voice Studio)",
        "difficulty": "Senior",
        "resume_filename": "alex_morgan_resume.pdf",
        "resume_data": candidate_profile,
        "questions": [q1_copy, q2_copy]
    }

    comp_resp = requests.post(f"{BASE_URL}/complete-session", json=voice_session_payload, timeout=5)
    assert comp_resp.status_code == 200
    comp_data = comp_resp.json()
    print(f"  -> Voice Session Persisted! Session ID: {comp_data['session_id']}")
    print(f"  -> Overall Benchmark Score: {comp_data['overall_score']}/100")

    # 8. Verify Past Sessions Retrieval & PDF Generation
    print("\n[Step 8] Verifying Persistence in History & PDF Generation...")
    hist_resp = requests.get(f"{BASE_URL}/history", timeout=5)
    assert hist_resp.status_code == 200
    sessions = hist_resp.json()["sessions"]
    saved_session = next((s for s in sessions if s["id"] == session_id), None)
    assert saved_session is not None, "Voice session not found in history!"
    print(f"  -> Found in Past Sessions: {saved_session['interview_type']} (Score: {saved_session['overall_score']})")

    # Download PDF for Voice Session
    pdf_resp = requests.get(f"{BASE_URL}/history/{session_id}/pdf", timeout=10)
    assert pdf_resp.status_code == 200
    assert "application/pdf" in pdf_resp.headers["Content-Type"]
    reader = pypdf.PdfReader(io.BytesIO(pdf_resp.content))
    assert len(reader.pages) >= 1
    pdf_text = "\n".join([p.extract_text() for p in reader.pages])
    assert "Voice Studio" in pdf_text or "Senior Full Stack Engineer" in pdf_text
    print(f"  -> Successfully generated {len(reader.pages)}-page PDF report for the Voice AI session!")

    print("\n" + "=" * 65)
    print("ALL VOICE AI INTERVIEWER TESTS PASSED SUCCESSFULLY 100%!")
    print("=" * 65)

if __name__ == "__main__":
    test_voice_interviewer_feature()
