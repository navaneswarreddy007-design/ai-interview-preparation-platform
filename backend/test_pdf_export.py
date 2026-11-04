import os
import io
from pdf_generator import generate_pdf_report
import database

def test_pdf_generation():
    print("Testing ReportLab PDF Generator...")
    
    # Try fetching the most recent session from the SQLite DB
    sessions = database.get_recent_sessions(limit=1)
    if sessions:
        session_id = sessions[0]["id"]
        session_data = database.get_session_details(session_id)
        print(f"Using actual session from database: {session_id} ({session_data.get('candidate_name')})")
    else:
        # Mock session
        session_data = {
            "id": "test-session-123",
            "candidate_name": "Alex Morgan",
            "target_role": "Senior Full Stack Engineer",
            "interview_type": "Mixed",
            "difficulty": "Senior",
            "resume_filename": "alex_morgan_resume.pdf",
            "overall_score": 83.5,
            "evaluation_mode": "Demo Mode (Rule-Based Evaluation)",
            "strengths": [
                "Constructive Conflict Resolution: Focused on de-escalation and objective team alignment.",
                "Technical Fluency: Referenced specific database query optimization and B-Tree indexing.",
                "Proactive Ownership: Highlighted clear first-person responsibility."
            ],
            "weaknesses": [
                "Could elaborate further on database replication lag and failover boundaries."
            ],
            "actionable_suggestions": [
                "For a Senior Full Stack Engineer, interviewers look for systemic leadership. Tip: Emphasize how you anchored the discussion in shared data or customer impact rather than personal opinions.",
                "Detail the primary trade-off you navigated and explain how you tested your implementation in staging."
            ],
            "weak_topics": ["Distributed Caching & Invalidation", "Horizontal Database Partitioning"],
            "questions": [
                {
                    "question_text": "In your role at 'CloudScale Systems', have you ever disagreed with a teammate or technical lead regarding an implementation detail? How did you resolve it?",
                    "category": "Leadership & Collaboration",
                    "resume_context": "Grounded in Work Experience: 'Senior Software Engineer | CloudScale Systems'",
                    "candidate_answer": "A colleague proposed skipping automated tests to meet a deadline. I scheduled a 1-on-1, listened to their timeline constraints, and proposed a compromise: automate critical path checkout tests first, then complete edge cases in sprint 2. We delivered on schedule without production issues.",
                    "evaluation": {
                        "score": 85.0,
                        "relevance_score": 75,
                        "accuracy_score": 96,
                        "clarity_score": 85,
                        "evidence_score": 86,
                        "strengths": ["Constructive Conflict Resolution", "Proactive Ownership"],
                        "weaknesses": ["Minor: Could elaborate on team RFC playbooks."],
                        "suggestion": "For a Senior Full Stack Engineer, emphasize how you de-escalated tension with shared data.",
                        "improved_answer": "**Situation & Context:**\nReflecting on my experience in CloudScale Systems, our team faced a delivery crunch...\n\n**Action Taken:**\nI set up a 1-on-1 sync and proposed a tiered testing compromise...\n\n**Measured Result:**\nDelivered on schedule with 0 regressions and created a shared RFC playbook."
                    }
                },
                {
                    "question_text": "You have experience working with PostgreSQL. Can you describe an instance where query optimization played a key role?",
                    "category": "Data & Persistence",
                    "resume_context": "Grounded in Database: PostgreSQL",
                    "candidate_answer": "A user activity query was spiking CPU and causing 850ms latency. I ran EXPLAIN ANALYZE, identified sequential scans on foreign keys, and added composite B-Tree indexes on (tenant_id, created_at). Latency dropped from 850ms to 110ms with zero index bloating, confirmed via load tests.",
                    "evaluation": {
                        "score": 82.0,
                        "relevance_score": 74,
                        "accuracy_score": 96,
                        "clarity_score": 85,
                        "evidence_score": 74,
                        "strengths": ["Technical Fluency with B-Tree indexes", "Implementation Ownership"],
                        "weaknesses": ["Could discuss read-replica routing."],
                        "suggestion": "Detail the primary trade-off between index maintenance overhead and read throughput.",
                        "improved_answer": "**Situation:**\nDuring analytics scaling on PostgreSQL...\n\n**Action:**\nRan EXPLAIN ANALYZE, deployed composite indexing, and tuned connection pool...\n\n**Result:**\nReduced p95 latency from 850ms to 110ms."
                    }
                }
            ],
            "drills": [
                {
                    "topic": "Horizontal Scaling & Bottlenecks",
                    "recommended_question": "When scaling the PostgreSQL architecture to handle 20x user traffic, how do you manage database write bottlenecks and cache invalidation?"
                },
                {
                    "topic": "Constructive Conflict Resolution",
                    "recommended_question": "Tell me about a time when an architectural disagreement reached an impasse. What communication strategy did you use?"
                }
            ]
        }

    pdf_bytes = generate_pdf_report(session_data)
    print(f"Generated PDF Size: {len(pdf_bytes)} bytes")
    assert pdf_bytes.startswith(b"%PDF-"), "Generated file does not start with %PDF- header!"
    
    output_path = os.path.join(os.path.dirname(__file__), "sample_exported_report.pdf")
    with open(output_path, "wb") as f:
        f.write(pdf_bytes)
        
    print(f"Saved test PDF to: {output_path}")
    print("SUCCESS: ReportLab PDF generated and validated successfully!")

if __name__ == "__main__":
    test_pdf_generation()
