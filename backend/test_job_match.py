import requests
import json
import sys

try:
    from app import app
except ImportError:
    from backend.app import app

BASE_URL = "http://127.0.0.1:5000/api"

def run_job_match_test():
    print("Testing /api/match-job endpoint...")
    
    # Try live requests first, or fall back to Flask test client
    client = app.test_client()
    try:
        r = requests.post(f"{BASE_URL}/load-sample-resume", json={"sample_id": "fullstack"}, timeout=1)
        use_live = (r.status_code == 200)
    except Exception:
        use_live = False

    if use_live:
        sample = r.json()
    else:
        resp = client.post("/api/load-sample-resume", json={"sample_id": "fullstack"})
        assert resp.status_code == 200, "Failed to load sample resume"
        sample = resp.get_json()

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
    
    if use_live:
        res = requests.post(f"{BASE_URL}/match-job", json=payload)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
    else:
        res = client.post("/api/match-job", json=payload)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.get_json()
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
