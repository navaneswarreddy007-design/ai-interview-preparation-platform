import app
from question_generator import generate_questions
from evaluator import evaluate_answer
import database

def test_full_pipeline():
    print("1. Testing resume parsing...")
    sample = app.SAMPLE_RESUMES["fullstack"]
    parsed = app.parse_resume_structure(sample["raw_text"])
    assert parsed["candidate_name"] == "Alex Morgan", f"Unexpected name: {parsed['candidate_name']}"
    assert len(parsed["all_skills"]) >= 8, f"Too few skills: {parsed['all_skills']}"
    assert len(parsed["projects"]) >= 1, "No projects extracted"
    print(f"   Success: Extracted {len(parsed['all_skills'])} skills, {len(parsed['projects'])} projects.")

    print("\n2. Testing grounded question generator...")
    q_resp = generate_questions(parsed, target_role="Senior Full Stack Engineer", interview_type="Mixed", difficulty="Senior", experience_level="Senior", question_count=3)
    questions = q_resp["questions"]
    assert len(questions) == 3, f"Expected 3 questions, got {len(questions)}"
    for q in questions:
        print(f"   [{q['category']}] {q['question_text']}")
        print(f"   Context: {q['resume_context']}")
        # Ensure context is grounded in actual resume tools
        grounding_terms = [s.lower() for s in parsed["all_skills"]] + ["cloudscale", "finedge", "microservices"]
        assert any(term in q["resume_context"].lower() or term in q["question_text"].lower() for term in grounding_terms), f"Question not grounded in resume: {q}"

    print("\n3. Testing answer evaluator...")
    target_q = questions[0]
    sample_answer = "At CloudScale Systems, I resolved the API bottleneck by introducing a multi-tiered Redis caching strategy and optimizing our PostgreSQL execution plans with composite indexes. As a direct result, our p95 latency reduced from 850ms to 110ms across 450,000 monthly users."
    
    evaluation = evaluate_answer(target_q, sample_answer, parsed, "Senior Full Stack Engineer")
    print(f"   Score: {evaluation['score']}/100")
    print(f"   Relevance: {evaluation['relevance_score']}, Accuracy: {evaluation['accuracy_score']}, Clarity: {evaluation['clarity_score']}, Evidence: {evaluation['evidence_score']}")
    print(f"   Strengths: {len(evaluation['strengths'])} identified")
    print(f"   Weaknesses: {len(evaluation['weaknesses'])} identified")
    print(f"   Improved answer preview: {evaluation['improved_answer'][:100]}...")
    assert evaluation["score"] > 60, f"Expected high score for strong answer, got {evaluation['score']}"
    assert evaluation["evaluation_mode"] == "Demo Mode (Rule-Based Evaluation)"

    print("\n4. Testing session saving & dashboard analytics...")
    target_q["candidate_answer"] = sample_answer
    target_q["evaluation"] = evaluation
    session_data = {
        "id": "test_session_1",
        "candidate_name": parsed["candidate_name"],
        "target_role": "Senior Full Stack Engineer",
        "interview_type": "Mixed",
        "difficulty": "Senior",
        "resume_filename": "alex_morgan.pdf",
        "overall_score": evaluation["score"],
        "evaluation_mode": evaluation["evaluation_mode"],
        "strengths": evaluation["strengths"],
        "weaknesses": evaluation["weaknesses"],
        "actionable_suggestions": [evaluation["suggestion"]],
        "weak_topics": evaluation["weak_topics"],
        "questions": [target_q],
        "drills": evaluation["recommended_drills"]
    }
    saved_id = database.save_session(session_data)
    assert saved_id == "test_session_1"
    
    stats = database.get_dashboard_analytics()
    assert stats["total_sessions"] >= 1
    print(f"   Dashboard Analytics: Total Sessions={stats['total_sessions']}, Avg Score={stats['average_score']}")

    # Clean up test session
    database.delete_session("test_session_1")
    print("\nAll Backend Pipeline Tests Passed Successfully!")

if __name__ == "__main__":
    test_full_pipeline()
