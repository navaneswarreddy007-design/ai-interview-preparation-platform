import os
import sys
import unittest

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from extractor import parse_resume_structure
from question_generator import (
    generate_questions,
    is_fresher_candidate,
    validate_question_for_candidate
)
import database

FRESHER_RAW_RESUME = """Aarav Sharma
aarav.sharma.cs@example.com | github.com/aarav-cs | New York, NY

OBJECTIVE
Motivated Computer Science graduate with strong foundations in Data Structures, Algorithms, Full-Stack Web Development, and Database Systems. Seeking an entry-level Software Engineer role to contribute to production software development.

EDUCATION
B.S. in Computer Science | State University of New York | 2020 - 2024
GPA: 3.8 / 4.0
Relevant Coursework: Data Structures & Algorithms, Object-Oriented Programming, Database Management Systems, Operating Systems, Computer Networks, Web Development

TECHNICAL SKILLS
Languages: Python, JavaScript, TypeScript, Java, SQL, HTML5, CSS3, C++
Frameworks & Libraries: React, Node.js, Express, Flask, Tailwind CSS
Databases & Tools: PostgreSQL, SQLite, MongoDB, Git, GitHub, Postman, Linux

INTERNSHIP EXPERIENCE
Software Engineering Intern | TechStart Labs | Jun 2023 - Aug 2023
- Developed 5 RESTful API endpoints in Python Flask for user profile and document management.
- Wrote automated unit test suites using PyTest, achieving 85% test coverage on new endpoints.
- Collaborated in daily agile stand-ups with senior mentors and used Git for code reviews.

ACADEMIC & PERSONAL PROJECTS
Campus Event Hub | React, Node.js, Express, MongoDB
- Designed and built a full-stack campus event management web application for student clubs.
- Implemented JWT authentication, role-based access for club coordinators, and interactive event calendar.

Smart Attendance System | Python, OpenCV, SQLite
- Created a classroom attendance tracker utilizing OpenCV for facial detection and local SQLite database logging.

Algorithmic Pathfinding Visualizer | JavaScript, HTML5 Canvas, CSS3
- Implemented an interactive graph algorithm visualizer demonstrating Dijkstra's algorithm and A* search.

ACHIEVEMENTS & EXTRACURRICULAR
- Team Lead, Annual College 24-Hour Hackathon (Placed 2nd out of 35 teams).
"""

EXPERIENCED_RAW_RESUME = """Alex Morgan
alex.morgan.dev@example.com | +1 (555) 349-8821 | github.com/alexm-dev | linkedin.com/in/alexmorgan-eng
Seattle, WA

PROFESSIONAL SUMMARY
Senior Full Stack Engineer with 5+ years of experience designing scalable web platforms, distributed microservices, and reactive user interfaces.

TECHNICAL SKILLS
Languages: TypeScript, JavaScript, Python, SQL, Go
Frameworks & Libraries: React, Next.js, Node.js, Express, Tailwind CSS, FastAPI
Databases: PostgreSQL, Redis, MongoDB, Elasticsearch
DevOps & Cloud: AWS, Docker, Kubernetes, GitHub Actions, Terraform

PROFESSIONAL EXPERIENCE
Senior Software Engineer | CloudScale Systems | Jan 2022 - Present
- Architected and delivered customer analytics portal using React 18, TypeScript, and Node.js microservices serving 450,000 monthly active users.
- Redesigned backend query execution on PostgreSQL and implemented a multi-tiered Redis caching layer.

Software Engineer | FinEdge Technologies | Jun 2019 - Dec 2021
- Developed interactive portfolio dashboard using React, Tailwind CSS, and WebSockets for real-time stock and crypto price tracking.
- Built authentication and role-based access control (RBAC) microservice using Node.js, JWT, and PostgreSQL.

PROJECTS
E-Commerce Microservices Platform | React, Node.js, PostgreSQL, Docker, Kafka
- Engineered an event-driven e-commerce platform communicating via Apache Kafka.

EDUCATION
B.S. in Computer Science | University of Washington | 2015 - 2019
"""

class TestFresherPersonalization(unittest.TestCase):

    def setUp(self):
        database.init_db()

    def test_01_resume_structure_distinguishes_sections(self):
        print("\n=== Test 1: Resume Extraction Distinguishes Internships, Projects, & Experience ===")
        fresher_parsed = parse_resume_structure(FRESHER_RAW_RESUME)
        
        # Fresher MUST have zero full-time professional experience
        self.assertEqual(len(fresher_parsed["experience"]), 0, "Fresher should have 0 full-time experience entries")
        self.assertFalse(fresher_parsed["has_professional_experience"])
        
        # Fresher MUST have internships, projects, and coursework
        self.assertGreaterEqual(len(fresher_parsed["internships"]), 1, "Fresher should have parsed internship")
        self.assertGreaterEqual(len(fresher_parsed["projects"]), 2, "Fresher should have parsed academic projects")
        self.assertGreaterEqual(len(fresher_parsed["coursework"]), 2, "Fresher should have parsed coursework")
        print(f"[OK] Fresher extracted: {len(fresher_parsed['projects'])} projects, {len(fresher_parsed['internships'])} internships, 0 corporate experience.")
        
        # Experienced MUST have professional experience
        exp_parsed = parse_resume_structure(EXPERIENCED_RAW_RESUME)
        self.assertGreaterEqual(len(exp_parsed["experience"]), 2, "Experienced should have at least 2 experience entries")
        self.assertTrue(exp_parsed["has_professional_experience"])
        print(f"[OK] Experienced extracted: {len(exp_parsed['experience'])} corporate roles: {[e['role_header'] for e in exp_parsed['experience']]}")

    def test_02_fresher_questions_never_assume_corporate_experience(self):
        print("\n=== Test 2: Fresher Question Generation - Zero Corporate Employment Assumptions ===")
        fresher_parsed = parse_resume_structure(FRESHER_RAW_RESUME)
        
        # Generate 5 questions for Fresher Mixed interview
        result = generate_questions(
            resume_data=fresher_parsed,
            target_role="Software Engineer",
            interview_type="Mixed",
            difficulty="Junior",
            experience_level="Fresher",
            question_count=5,
            candidate_name="Aarav Sharma"
        )
        
        questions = result.get("questions", [])
        self.assertEqual(len(questions), 5, "Should generate exactly 5 questions")
        self.assertTrue(result.get("is_fresher"), "Result should flag candidate as fresher")
        
        prohibited_phrases = [
            "during your tenure at",
            "production outage",
            "at your former employer",
            "at your previous job",
            "when you managed a team of engineers",
            "refactoring critical technical debt when non-technical stakeholders",
            "FinEdge Technologies",
            "CloudScale Systems"
        ]
        
        print("\nGenerated Questions for Fresher Candidate (Aarav Sharma):")
        for idx, q in enumerate(questions):
            q_text = q["question_text"]
            r_ctx = q["resume_context"]
            print(f"  Q{idx+1}: [{q['category']}] (Context: {r_ctx})\n      \"{q_text}\"")
            
            # 1. No prohibited corporate assumptions
            for phrase in prohibited_phrases:
                self.assertNotIn(phrase.lower(), q_text.lower(), f"Fresher Q{idx+1} contains corporate phrase '{phrase}'")
                self.assertNotIn(phrase.lower(), r_ctx.lower(), f"Fresher Q{idx+1} context contains corporate phrase '{phrase}'")
                
            # 2. Context must be academic, project, coursework, or internship
            self.assertFalse(r_ctx.startswith("Grounded in Work Experience:"), f"Fresher Q{idx+1} falsely cited work experience: {r_ctx}")

    def test_03_experienced_questions_grounded_in_actual_resume(self):
        print("\n=== Test 3: Experienced Question Generation - Verified Employment Grounding ===")
        exp_parsed = parse_resume_structure(EXPERIENCED_RAW_RESUME)
        
        result = generate_questions(
            resume_data=exp_parsed,
            target_role="Senior Full Stack Engineer",
            interview_type="Mixed",
            difficulty="Senior",
            experience_level="5+ years",
            question_count=5,
            candidate_name="Alex Morgan"
        )
        
        questions = result.get("questions", [])
        self.assertEqual(len(questions), 5)
        self.assertFalse(result.get("is_fresher"), "Alex Morgan should be classified as experienced")
        
        print("\nGenerated Questions for Experienced Candidate (Alex Morgan):")
        found_pro_grounding = False
        for idx, q in enumerate(questions):
            q_text = q["question_text"]
            r_ctx = q["resume_context"]
            print(f"  Q{idx+1}: [{q['category']}] (Context: {r_ctx})\n      \"{q_text}\"")
            
            if "grounded in work experience:" in r_ctx.lower():
                found_pro_grounding = True
                # Must be one of Alex Morgan's actual employers
                self.assertTrue(
                    "cloudscale systems" in r_ctx.lower() or "finedge technologies" in r_ctx.lower(),
                    f"Cites unknown employer in context: {r_ctx}"
                )
        self.assertTrue(found_pro_grounding, "Experienced candidate should have questions grounded in verified employment")

    def test_04_user_selecting_fresher_with_experienced_resume_suppresses_corporate_roles(self):
        print("\n=== Test 4: Experienced Resume with User Selecting 'Fresher' in Wizard ===")
        # Scenario: User loads Alex Morgan's profile, but in Step 2 of the Wizard selects 'Fresher'
        exp_parsed = parse_resume_structure(EXPERIENCED_RAW_RESUME)
        
        result = generate_questions(
            resume_data=exp_parsed,
            target_role="Software Engineer",
            interview_type="Mixed",
            difficulty="Junior",
            experience_level="Fresher",  # USER OVERRIDE: CANDIDATE SELECTED FRESHER!
            question_count=5,
            candidate_name="Alex Morgan"
        )
        
        questions = result.get("questions", [])
        self.assertEqual(len(questions), 5)
        self.assertTrue(result.get("is_fresher"), "Selected level 'Fresher' must enforce Fresher mode")
        
        for idx, q in enumerate(questions):
            q_text = q["question_text"]
            r_ctx = q["resume_context"]
            # Even though Alex has FinEdge and CloudScale, selecting Fresher MUST NEVER cite corporate tenure!
            self.assertNotIn("during your tenure at", q_text.lower())
            self.assertFalse(r_ctx.startswith("Grounded in Work Experience:"), f"Fresher override failed for Q{idx+1}: {r_ctx}")
        print("[OK] When user selects 'Fresher', corporate employment questions were strictly suppressed!")

    def test_05_question_validation_engine(self):
        print("\n=== Test 5: Question Validation Engine Rejects Senior Assumptions for Freshers ===")
        fresher_parsed = parse_resume_structure(FRESHER_RAW_RESUME)
        
        # Test Case A: Invalid question for fresher (assumes corporate tenure)
        invalid_q = {
            "question_text": "During your tenure at FinEdge Technologies, describe how you led the team.",
            "resume_context": "Grounded in Work Experience: 'Software Engineer | FinEdge Technologies | Jun 2019 – Dec 2021'"
        }
        is_valid, reason = validate_question_for_candidate(invalid_q, is_fresher=True, resume_data=fresher_parsed)
        self.assertFalse(is_valid, "Should reject question with corporate tenure for fresher")
        print(f"[OK] Correctly rejected invalid fresher question: {reason}")
        
        # Test Case B: Valid question for fresher (academic project teamwork)
        valid_q = {
            "question_text": "While building 'Campus Event Hub', describe a time when you and a teammate had a disagreement over task allocation.",
            "resume_context": "Academic Project Teamwork: 'Campus Event Hub'"
        }
        is_valid_b, reason_b = validate_question_for_candidate(valid_q, is_fresher=True, resume_data=fresher_parsed)
        self.assertTrue(is_valid_b, f"Should accept valid academic project question for fresher: {reason_b}")
        print(f"[OK] Correctly validated academic project question: {reason_b}")

if __name__ == '__main__':
    unittest.main()
