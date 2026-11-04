import requests
import json
import sys

BASE_URL = "http://127.0.0.1:5000/api"

def run_job_match_test():
    print("Testing /api/match-job endpoint...")
    
    # Load sample resume
    r = requests.post(f"{BASE_URL}/load-sample-resume", json={"sample_id": "fullstack"})
    assert r.status_code == 200, "Failed to load sample resume"
    sample = r.json()
    resume_data = sample["candidate_profile"]
    
    jd_sample = """
    Job Title: Senior Full Stack Engineer
    Requirements:
    - 3+ years experience with React, TypeScript, and Node.js.
    - Deep expertise in PostgreSQL, Redis, and microservices architecture.
    - Experience deploying containers with Docker on AWS.
    - Familiarity with Kubernetes, GraphQL, and automated testing.
    - Experience with Kafka or RabbitMQ messaging queues.
    """
    
    payload = {
        "resume_data": resume_data,
        "job_description": jd_sample,
        "target_role": "Senior Full Stack Engineer"
    }
    
    res = requests.post(f"{BASE_URL}/match-job", json=payload)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    
    data = res.json()
    print("Job Match Results:")
    print(f"  -> Alignment Score: {data['alignment_score']}%")
    print(f"  -> Matched Skills ({len(data['matched_skills'])}): {[m['skill'] for m in data['matched_skills']]}")
    print(f"  -> Missing Skills ({len(data['missing_skills'])}): {[m['skill'] for m in data['missing_skills']]}")
    print(f"  -> Learning Roadmap ({len(data['roadmap'])} steps)")
    print(f"  -> Recommended Questions ({len(data['recommended_questions'])}):")
    for q in data['recommended_questions']:
        print(f"     - {q}")
        
    assert "disclaimer" in data, "Disclaimer missing from match result"
    assert len(data['matched_skills']) > 0, "Expected matched skills"
    print("\n>>> ALL JOB MATCH TESTS PASSED 100%! <<<")

if __name__ == '__main__':
    run_job_match_test()
