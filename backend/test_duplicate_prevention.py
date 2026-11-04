import os
import sys
import unittest
import requests

# Ensure backend directory is in python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from duplicate_detector import (
    normalize_text,
    calculate_similarity,
    is_near_duplicate,
    find_duplicate,
    ACRONYMS_AND_SYNONYMS
)
import database
from question_generator import generate_questions

class TestDuplicatePrevention(unittest.TestCase):

    def setUp(self):
        database.init_db()
        with database.get_connection() as conn:
            conn.execute("DELETE FROM asked_questions WHERE candidate_name LIKE 'TestCandidate%'")
            conn.commit()

    def test_01_normalization_and_acronym_expansion(self):
        print("\n--- Test 1: Normalization & Acronym Expansion ---")
        norm1 = normalize_text("Explain overfitting in machine learning?")
        norm2 = normalize_text("What is overfitting in ML???")
        print(f"Norm 1: {norm1}")
        print(f"Norm 2: {norm2}")
        
        # 'ml' should be expanded to 'machine learning', 'explain' and 'what is' stripped
        self.assertIn("overfitting", norm1)
        self.assertIn("machine learning", norm1)
        self.assertIn("overfitting", norm2)
        self.assertIn("machine learning", norm2)

    def test_02_near_duplicate_detection(self):
        print("\n--- Test 2: Near-Duplicate Detection on Core Example ---")
        q1 = "Explain overfitting in machine learning and how to prevent it."
        q2 = "What is overfitting in ML and how can you avoid it?"
        
        sim = calculate_similarity(q1, q2)
        print(f"Similarity between '{q1}' and '{q2}': {sim:.2f}")
        self.assertGreaterEqual(sim, 0.70, "Should detect high similarity between ML phrasing variations")
        self.assertTrue(is_near_duplicate(q1, q2, threshold=0.60), "is_near_duplicate should return True")

        # Distinct questions must not trigger duplicate
        q3 = "How does database indexing work using B-Trees?"
        sim_distinct = calculate_similarity(q1, q3)
        print(f"Similarity between ML and DB indexing: {sim_distinct:.2f}")
        self.assertLess(sim_distinct, 0.35, "Different concepts must have low similarity")
        self.assertFalse(is_near_duplicate(q1, q3, threshold=0.60))

    def test_03_within_session_duplicate_prevention(self):
        print("\n--- Test 3: Zero Duplicates Within an Interview Session ---")
        mock_resume = {
            "candidate_name": "TestCandidate_ZeroDupes",
            "all_skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "Machine Learning"],
            "target_role": "AI/ML Engineer"
        }
        
        # Generate 5 questions for mixed interview
        result = generate_questions(
            resume_data=mock_resume,
            target_role="AI/ML Engineer",
            interview_type="Mixed",
            difficulty="Mid-Level",
            question_count=5,
            candidate_name="TestCandidate_ZeroDupes"
        )
        questions = result.get("questions", [])
        self.assertEqual(len(questions), 5)
        
        # Verify no pairs within the generated batch are near duplicates
        for i in range(len(questions)):
            for j in range(i + 1, len(questions)):
                q_i = questions[i]["question_text"]
                q_j = questions[j]["question_text"]
                is_dup = is_near_duplicate(q_i, q_j, threshold=0.55)
                self.assertFalse(is_dup, f"Questions {i+1} and {j+1} are near-duplicates!\nQ1: {q_i}\nQ2: {q_j}")
        print("[OK] All 5 generated questions are distinct with zero within-session duplicates.")

    def test_04_cross_session_duplicate_tracking(self):
        print("\n--- Test 4: Cross-Session Tracking in SQLite Ledger ---")
        candidate = "TestCandidate_Ledger"
        
        # Simulate Session 1 questions
        session_1_questions = [
            {
                "question_text": "Explain overfitting in machine learning models. How do L1 (Lasso) and L2 (Ridge) weight decay regularization techniques mathematically discourage models from memorizing training noise?",
                "concept_id": "ml_overfitting_regularization",
                "topic": "Machine Learning Fundamentals",
                "difficulty": "Mid-Level",
                "category": "Technical"
            },
            {
                "question_text": "How do B-tree and Hash database indexes differ internally, and in what query scenarios would an index actually degrade database write performance?",
                "concept_id": "db_indexing_optimization",
                "topic": "Database Architecture",
                "difficulty": "Mid-Level",
                "category": "Technical"
            }
        ]
        
        database.record_asked_questions_batch(candidate, session_1_questions, session_id="test-session-1", target_role="AI/ML Engineer")
        
        asked = database.get_previously_asked_questions(candidate_name=candidate)
        self.assertEqual(len(asked), 2)
        print(f"[OK] Recorded {len(asked)} questions in SQLite for candidate '{candidate}'")
        
        # Now generate Session 2 with prefer_fresh=True
        mock_resume = {
            "candidate_name": candidate,
            "all_skills": ["Python", "PyTorch", "TensorFlow", "Scikit-Learn", "PostgreSQL"],
            "target_role": "AI/ML Engineer"
        }
        
        result_s2 = generate_questions(
            resume_data=mock_resume,
            target_role="AI/ML Engineer",
            interview_type="Technical",
            difficulty="Mid-Level",
            question_count=3,
            candidate_name=candidate,
            prefer_fresh=True
        )
        
        s2_questions = result_s2.get("questions", [])
        for q in s2_questions:
            # Check concept_id
            self.assertNotEqual(q.get("concept_id"), "ml_overfitting_regularization", "Should not ask ml_overfitting again in fresh mode")
            self.assertNotEqual(q.get("concept_id"), "db_indexing_optimization", "Should not ask db_indexing again in fresh mode")
            # Check text similarity with session 1
            for prev_q in session_1_questions:
                self.assertFalse(
                    is_near_duplicate(q["question_text"], prev_q["question_text"], threshold=0.60),
                    f"Session 2 question '{q['question_text']}' is a duplicate of Session 1 question '{prev_q['question_text']}'"
                )
            self.assertEqual(q.get("tag"), "Fresh Question")
        print("[OK] Session 2 with prefer_fresh=True successfully avoided Session 1 questions.")

    def test_05_review_mode_allows_past_questions(self):
        print("\n--- Test 5: Review Mode Tagging ---")
        candidate = "TestCandidate_Review"
        session_1 = [
            {
                "question_text": "Explain the trade-offs between Write-Through, Write-Back, and Cache-Aside caching patterns. How do you mitigate the Cache Stampede (Thundering Herd) phenomenon when a popular key expires?",
                "concept_id": "caching_invalidation_strategies",
                "topic": "Distributed Caching",
                "difficulty": "Mid-Level",
                "category": "Technical"
            }
        ]
        database.record_asked_questions_batch(candidate, session_1, session_id="test-sess-rev", target_role="Software Engineer")
        
        # In review mode (include_review=True, prefer_fresh=False)
        mock_resume = {
            "candidate_name": candidate,
            "all_skills": ["Redis", "Caching", "PostgreSQL"],
            "target_role": "Software Engineer"
        }
        result = generate_questions(
            resume_data=mock_resume,
            target_role="Software Engineer",
            interview_type="Technical",
            difficulty="Mid-Level",
            question_count=2,
            candidate_name=candidate,
            prefer_fresh=False,
            include_review=True
        )
        questions = result.get("questions", [])
        self.assertGreaterEqual(len(questions), 1)
        tags = [q.get("tag") for q in questions]
        print(f"Review mode tags: {tags}")
        self.assertIn("Review Question", tags, "Review mode should include previously asked questions with 'Review Question' tag")
        print("[OK] Review mode correctly prioritized and tagged previous question as 'Review Question'.")

    def test_06_live_api_endpoints(self):
        print("\n--- Test 6: Live Flask API Endpoints ---")
        base_url = "http://127.0.0.1:5000/api"
        
        # 1. Health check
        health_resp = requests.get(f"{base_url}/health", timeout=5)
        self.assertEqual(health_resp.status_code, 200)
        self.assertEqual(health_resp.json().get("status"), "healthy")
        print("[OK] /api/health returned 200 healthy")
        
        # 2. Record seed questions for API test
        seed_questions = [
            {
                "question_text": "Explain overfitting in machine learning models and L1/L2 regularization.",
                "concept_id": "ml_overfitting_regularization",
                "topic": "Machine Learning",
                "difficulty": "Mid-Level"
            },
            {
                "question_text": "How do database indexes improve query performance and what are write tradeoffs?",
                "concept_id": "db_indexing_optimization",
                "topic": "Databases",
                "difficulty": "Mid-Level"
            }
        ]
        database.record_asked_questions_batch("TestCandidate_Ledger", seed_questions, session_id="test-api-seed", target_role="AI/ML Engineer")
        
        # 3. Candidate questions endpoint
        cand_resp = requests.get(f"{base_url}/candidate-questions?candidate_name=TestCandidate_Ledger", timeout=5)
        self.assertEqual(cand_resp.status_code, 200)
        cand_data = cand_resp.json()
        self.assertEqual(cand_data.get("status"), "success")
        self.assertGreaterEqual(cand_data.get("total_asked", 0), 2)
        print(f"[OK] /api/candidate-questions returned {cand_data.get('total_asked')} tracked questions")
        
        # 4. Generate questions endpoint with prefer_fresh
        gen_payload = {
            "resume_data": {
                "candidate_name": "TestCandidate_Ledger",
                "all_skills": ["Python", "FastAPI", "Docker", "Machine Learning"]
            },
            "target_role": "AI/ML Engineer",
            "interview_type": "Mixed",
            "difficulty": "Mid-Level",
            "question_count": 3,
            "candidate_name": "TestCandidate_Ledger",
            "prefer_fresh": True
        }
        gen_resp = requests.post(f"{base_url}/generate-questions", json=gen_payload, timeout=15)
        self.assertEqual(gen_resp.status_code, 200)
        gen_data = gen_resp.json()
        self.assertEqual(len(gen_data.get("questions", [])), 3)
        for q in gen_data.get("questions", []):
            self.assertEqual(q.get("tag"), "Fresh Question")
        print("[OK] /api/generate-questions returned 3 fresh, non-duplicate questions via API")
        self.assertEqual(gen_resp.status_code, 200)
        gen_data = gen_resp.json()
        self.assertEqual(len(gen_data.get("questions", [])), 3)
        for q in gen_data.get("questions", []):
            self.assertEqual(q.get("tag"), "Fresh Question")
        print("[OK] /api/generate-questions returned 3 fresh, non-duplicate questions via API")

if __name__ == '__main__':
    unittest.main()
