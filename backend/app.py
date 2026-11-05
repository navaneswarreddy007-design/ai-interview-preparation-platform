import os
import uuid
import json
import io
import re
from datetime import datetime, timezone
from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

import config
from extractor import validate_file, extract_text_from_pdf, extract_text_from_docx, parse_resume_structure
from question_generator import generate_questions, generate_follow_up_question
from evaluator import evaluate_answer
from pdf_generator import generate_pdf_report
from assistant import process_assistant_command
import database

# RAG & Knowledge Base Engine
from rag.vector_store import get_vector_store
from rag.generator import answer_query_with_rag

# Initialize database
database.init_db()

# Auto-index knowledge base on startup if empty or unindexed
def _bootstrap_rag():
    try:
        vs = get_vector_store()
        if vs.collection.count() == 0:
            print("[PrepForge RAG] Empty vector collection detected. Indexing knowledge base...")
            vs.index_knowledge_base()
        else:
            print(f"[PrepForge RAG] Vector store ready with {vs.collection.count()} indexed chunks.")
    except Exception as e:
        print(f"[PrepForge RAG] Startup indexing check: {e}")

_bootstrap_rag()

# Resolve production frontend distribution folder
FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

if os.path.exists(FRONTEND_DIST):
    app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path="")
else:
    app = Flask(__name__)

app.config['SECRET_KEY'] = config.SECRET_KEY
app.config['UPLOAD_FOLDER'] = str(config.UPLOAD_FOLDER)
app.config['MAX_CONTENT_LENGTH'] = config.MAX_CONTENT_LENGTH

# Configure CORS dynamically based on environment configuration
cors_origins = [o.strip() for o in config.CORS_ORIGINS.split(",") if o.strip()] if config.CORS_ORIGINS != "*" else "*"
CORS(app, resources={r"/api/*": {"origins": cors_origins}}, supports_credentials=True)

@app.after_request
def after_request_cors(response):
    req_origin = request.headers.get("Origin")
    if config.CORS_ORIGINS == "*":
        response.headers["Access-Control-Allow-Origin"] = "*"
    elif req_origin and (req_origin in cors_origins or "*" in cors_origins):
        response.headers["Access-Control-Allow-Origin"] = req_origin
        response.headers["Vary"] = "Origin"
    elif not response.headers.get("Access-Control-Allow-Origin"):
        response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response

# In-memory session cache for active ongoing interviews before completion
ACTIVE_SESSIONS = {}

# Built-in high quality sample resumes for immediate 1-click testing
SAMPLE_RESUMES = {
    "fullstack": {
        "id": "fullstack",
        "title": "Alex Morgan - Senior Full Stack Engineer (React, Node, PostgreSQL, AWS)",
        "candidate_name": "Alex Morgan",
        "email": "alex.morgan.dev@example.com",
        "phone": "+1 (555) 349-8821",
        "target_role": "Senior Full Stack Engineer",
        "raw_text": """Alex Morgan
alex.morgan.dev@example.com | +1 (555) 349-8821 | github.com/alexm-dev | linkedin.com/in/alexmorgan-eng
Seattle, WA

PROFESSIONAL SUMMARY
Senior Full Stack Engineer with 5+ years of experience designing scalable web platforms, distributed microservices, and reactive user interfaces. Proven track record optimizing high-throughput APIs and leading cross-functional delivery.

TECHNICAL SKILLS
Languages: TypeScript, JavaScript, Python, SQL, HTML5, CSS3, Go
Frameworks & Libraries: React, Next.js, Node.js, Express, Tailwind CSS, Redux Toolkit, FastAPI
Databases: PostgreSQL, Redis, MongoDB, Elasticsearch
DevOps & Cloud: AWS (EC2, S3, RDS, Lambda, ECS), Docker, Kubernetes, GitHub Actions, Terraform
Tools & Architecture: REST APIs, GraphQL, Microservices, Jest, Cypress, Git, Agile/Scrum

PROFESSIONAL EXPERIENCE
Senior Software Engineer | CloudScale Systems | Jan 2022 - Present
- Architected and delivered customer analytics portal using React 18, TypeScript, and Node.js microservices serving 450,000 monthly active users.
- Redesigned backend query execution on PostgreSQL and implemented a multi-tiered Redis caching layer, decreasing p95 latency from 850ms to 110ms.
- Mentored 4 junior engineers on test-driven development (TDD), resulting in an increase of test coverage from 62% to 88% across our core billing service.
- Automated CI/CD pipelines with GitHub Actions and AWS ECS, trimming release cycle times by 40%.

Software Engineer | FinEdge Technologies | Jun 2019 - Dec 2021
- Developed interactive portfolio dashboard using React, Tailwind CSS, and WebSockets for real-time stock and crypto price tracking.
- Built authentication and role-based access control (RBAC) microservice using Node.js, JWT, and PostgreSQL.
- Resolved memory leak in WebSocket connection pooling that reduced server crash incidence to 0% over 18 consecutive months.

PROJECTS
E-Commerce Microservices Platform | React, Node.js, PostgreSQL, Docker, Kafka
- Engineered an event-driven e-commerce platform with decoupled ordering, inventory, and payment services communicating via Apache Kafka.
- Implemented optimistic UI updates and idempotency keys to eliminate duplicate transaction risks.

Real-Time Collaborative Code Editor | TypeScript, Next.js, WebSockets, Redis
- Created browser-based code workspace with operational transformation (OT) and syntax highlighting supporting up to 50 concurrent writers per room.

EDUCATION
B.S. in Computer Science | University of Washington | 2015 - 2019
"""
    },
    "ml_engineer": {
        "id": "ml_engineer",
        "title": "Dr. Sarah Chen - Machine Learning & AI Engineer (PyTorch, Python, Docker, GCP)",
        "candidate_name": "Dr. Sarah Chen",
        "email": "sarah.chen.ai@example.com",
        "phone": "+1 (555) 812-4091",
        "target_role": "Machine Learning Engineer",
        "raw_text": """Dr. Sarah Chen
sarah.chen.ai@example.com | github.com/sarahchen-ml | San Francisco, CA

PROFESSIONAL SUMMARY
Machine Learning Engineer with strong background in NLP, LLM fine-tuning, and scalable inference infrastructure. Experienced in taking deep learning models from research prototyping into production serving.

TECHNICAL SKILLS
Languages: Python, C++, SQL, Bash, R
Frameworks & Tools: PyTorch, TensorFlow, Hugging Face Transformers, LangChain, vLLM, Triton Inference Server
Databases: PostgreSQL, Pinecone, Milvus, Redis
DevOps & Cloud: GCP (Vertex AI, GKE, BigQuery), Docker, Kubernetes, MLflow, Ray, Git
Concepts: Retrieval-Augmented Generation (RAG), Fine-Tuning (LoRA/QLoRA), Model Quantization, Distributed Training

PROFESSIONAL EXPERIENCE
Senior Machine Learning Engineer | CogniTech AI | Mar 2022 - Present
- Spearheaded the design and deployment of enterprise RAG pipeline utilizing LangChain, Hugging Face embeddings, and Pinecone vector database.
- Fine-tuned open-source 7B parameter LLMs using QLoRA on domain-specific support transcripts, improving response relevancy from 71% to 89%.
- Deployed distributed inference engine on Kubernetes with Triton and vLLM, doubling throughput while lowering GPU hosting costs by 32%.

Data Scientist & ML Developer | DataVantage Analytics | Aug 2020 - Feb 2022
- Built automated customer churn prediction system in Python and scikit-learn processing 2M customer records weekly.
- Implemented real-time anomaly detection pipeline on GCP BigQuery and Kafka to alert operations teams of transaction fraud spikes.

PROJECTS
Multilingual Semantic Search Engine | PyTorch, Hugging Face, Milvus, FastAPI
- Developed semantic document retrieval system supporting 14 languages with sub-50ms query response times over 5 million indexed documents.
- Containerized inference service with Docker and orchestrated deployment via Helm charts.

EDUCATION
Ph.D. in Computer Science (Machine Learning) | Stanford University | 2016 - 2020
B.S. in Mathematics & Computer Science | UC Berkeley | 2012 - 2016
"""
    },
    "devops": {
        "id": "devops",
        "title": "Marcus Brody - DevOps & Cloud Infrastructure Engineer (Kubernetes, AWS, Terraform)",
        "candidate_name": "Marcus Brody",
        "email": "marcus.brody.ops@example.com",
        "phone": "+1 (555) 904-7712",
        "target_role": "DevOps / Cloud Architect",
        "raw_text": """Marcus Brody
marcus.brody.ops@example.com | Austin, TX | github.com/mbrody-ops

SUMMARY
DevOps Engineer with 6+ years specializing in Kubernetes cluster orchestration, Infrastructure as Code (Terraform), and secure automated CI/CD pipelines.

TECHNICAL SKILLS
Cloud Platforms: AWS (EKS, VPC, IAM, CloudFront, Route53, RDS), Azure
Container & Orchestration: Docker, Kubernetes, Helm, ArgoCD, Istio Service Mesh
IaC & Configuration: Terraform, Ansible, CloudFormation
CI/CD & Observability: GitHub Actions, Jenkins, Prometheus, Grafana, Datadog, ELK Stack
Languages: Python, Go, Bash, YAML

EXPERIENCE
Lead DevOps Engineer | Nexus Global Infrastructure | 2021 - Present
- Migrated legacy monolithic architecture to containerized microservices on AWS EKS across 4 global regions, maintaining 99.99% uptime SLA.
- Standardized infrastructure provisioning across 12 development teams using modular Terraform repositories and automated GitOps with ArgoCD.
- Implemented centralized observability with Prometheus, Grafana, and OpenTelemetry, reducing Mean Time to Detection (MTTD) from 45 min to under 4 min.

Cloud Operations Engineer | StrataScale Systems | 2018 - 2021
- Automated zero-downtime blue-green deployments for 20+ microservices using Jenkins and Helm.
- Engineered automated disaster recovery and RDS snapshot backup verification routines across multiple AWS availability zones.

PROJECTS
Zero-Trust Kubernetes Hardening Framework | Go, Kubernetes, Falco, OPA Gatekeeper
- Authored custom Kubernetes admission controller enforcing container security standards and least-privilege RBAC.

EDUCATION
B.S. in Information Systems | University of Texas at Austin | 2014 - 2018
"""
    },
    "fresher_cs": {
        "id": "fresher_cs",
        "title": "Aarav Sharma - Computer Science Graduate / Fresher (React, Python, SQL, Academic Projects)",
        "candidate_name": "Aarav Sharma",
        "email": "aarav.sharma.cs@example.com",
        "phone": "+1 (555) 720-3341",
        "target_role": "Software Engineer",
        "raw_text": """Aarav Sharma
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
- Collaborated in daily agile stand-ups with senior mentors and used Git for code reviews and branch management.

ACADEMIC & PERSONAL PROJECTS
Campus Event Hub | React, Node.js, Express, MongoDB
- Designed and built a full-stack campus event management web application for student clubs.
- Implemented JWT authentication, role-based access for club coordinators, and interactive event calendar.
- Integrated search and filtering by event categories with sub-100ms client-side response times.

Smart Attendance System | Python, OpenCV, SQLite
- Created a classroom attendance tracker utilizing OpenCV for facial detection and local SQLite database logging.
- Built a streamlined Tkinter desktop interface allowing professors to export attendance CSV summaries.

Algorithmic Pathfinding Visualizer | JavaScript, HTML5 Canvas, CSS3
- Implemented an interactive graph algorithm visualizer demonstrating Dijkstra's algorithm and A* search on custom mazes.
- Optimized canvas rendering to run smoothly at 60 FPS across desktop and tablet browsers.

ACHIEVEMENTS & EXTRACURRICULAR
- Team Lead, Annual College 24-Hour Hackathon (Placed 2nd out of 35 teams).
- Peer Tutor for undergraduate Data Structures and Algorithms lab sessions.
"""
    }
}

@app.route('/api/health', methods=['GET'])
def health_check():
    ai_status = config.get_ai_status()
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ai_status": ai_status,
        "database": "connected"
    })

@app.route('/api/settings', methods=['GET', 'POST'])
def handle_settings():
    if request.method == 'POST':
        data = request.json or {}
        gemini_key = data.get("gemini_api_key")
        openai_key = data.get("openai_api_key")

        if gemini_key is not None:
            config.GEMINI_API_KEY = gemini_key.strip()
            os.environ["GEMINI_API_KEY"] = config.GEMINI_API_KEY
        if openai_key is not None:
            config.OPENAI_API_KEY = openai_key.strip()
            os.environ["OPENAI_API_KEY"] = config.OPENAI_API_KEY

        return jsonify({
            "success": True,
            "message": "API key configuration updated.",
            "ai_status": config.get_ai_status()
        })

    return jsonify({
        "ai_status": config.get_ai_status(),
        "has_gemini": bool(config.GEMINI_API_KEY),
        "has_openai": bool(config.OPENAI_API_KEY)
    })

@app.route('/api/sample-resumes', methods=['GET'])
def list_sample_resumes():
    samples_list = []
    for k, v in SAMPLE_RESUMES.items():
        parsed = parse_resume_structure(v["raw_text"])
        samples_list.append({
            "id": v["id"],
            "title": v["title"],
            "target_role": v["target_role"],
            "candidate_name": v["candidate_name"],
            "skills_count": len(parsed.get("all_skills", [])),
            "projects_count": len(parsed.get("projects", []))
        })
    return jsonify({"samples": samples_list})

@app.route('/api/load-sample-resume', methods=['POST'])
def load_sample():
    data = request.json or {}
    sample_id = data.get("sample_id", "fullstack")
    if sample_id not in SAMPLE_RESUMES:
        return jsonify({"error": f"Sample '{sample_id}' not found."}), 404

    sample = SAMPLE_RESUMES[sample_id]
    parsed_profile = parse_resume_structure(sample["raw_text"])
    resume_id = str(uuid.uuid4())

    return jsonify({
        "resume_id": resume_id,
        "filename": f"{sample_id}_resume.pdf",
        "candidate_profile": parsed_profile,
        "default_target_role": sample["target_role"],
        "source": "sample"
    })

@app.route('/api/upload-resume', methods=['POST'])
def upload_resume():
    # Supports multipart file upload OR direct text upload
    if 'file' in request.files:
        file = request.files['file']
        if not file or file.filename == '':
            return jsonify({"error": "No file selected."}), 400

        validation = validate_file(file.filename)
        if not validation["valid"]:
            return jsonify({"error": validation["error"]}), 400

        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex[:8]}_{filename}"
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(save_path)

        # Check file size
        file_size = os.path.getsize(save_path)
        validation_size = validate_file(filename, file_size)
        if not validation_size["valid"]:
            os.remove(save_path)
            return jsonify({"error": validation_size["error"]}), 400

        # Extract text based on file type
        try:
            if validation["extension"] == 'pdf':
                extracted_text = extract_text_from_pdf(save_path)
            else:
                extracted_text = extract_text_from_docx(save_path)
        except Exception as e:
            if os.path.exists(save_path):
                os.remove(save_path)
            return jsonify({"error": f"Failed to extract text: {str(e)}"}), 422

    elif request.is_json and 'raw_text' in request.json:
        extracted_text = request.json['raw_text']
        filename = request.json.get('filename', 'pasted_resume.txt')
        unique_filename = f"{uuid.uuid4().hex[:8]}_{filename}"
    else:
        return jsonify({"error": "Please provide a file or raw_text."}), 400

    if not extracted_text or len(extracted_text.strip()) < 50:
        return jsonify({"error": "Resume content was empty or contained insufficient text to analyze."}), 400

    parsed_profile = parse_resume_structure(extracted_text)
    resume_id = str(uuid.uuid4())

    return jsonify({
        "resume_id": resume_id,
        "filename": filename,
        "candidate_profile": parsed_profile
    })

@app.route('/api/generate-questions', methods=['POST'])
def api_generate_questions():
    try:
        data = request.json or {}
        resume_data = data.get("resume_data")

        # If resume_data is missing or empty, fall back gracefully to sample fullstack resume
        if not resume_data or not isinstance(resume_data, dict) or not resume_data.get("all_skills"):
            sample = SAMPLE_RESUMES["fullstack"]
            resume_data = parse_resume_structure(sample["raw_text"])

        target_role = data.get("target_role", "Software Engineer")
        interview_type = data.get("interview_type", "Mixed")
        difficulty = data.get("difficulty", "Mid-Level")
        experience_level = data.get("experience_level", "Mid-Level")
        question_count = int(data.get("question_count", 5))
        candidate_name = data.get("candidate_name") or resume_data.get("candidate_name", "Candidate")
        prefer_fresh = data.get("prefer_fresh", True)
        include_review = data.get("include_review", False)
        practice_weak_areas = data.get("practice_weak_areas", False)
        job_description = data.get("job_description", "")

        result = generate_questions(
            resume_data=resume_data,
            target_role=target_role,
            interview_type=interview_type,
            difficulty=difficulty,
            experience_level=experience_level,
            question_count=question_count,
            candidate_name=candidate_name,
            prefer_fresh=prefer_fresh,
            include_review=include_review,
            practice_weak_areas=practice_weak_areas,
            job_description=job_description
        )
        return jsonify(result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to generate questions: {str(e)}"}), 500

@app.route('/api/candidate-questions', methods=['GET'])
def api_candidate_questions():
    try:
        candidate_name = request.args.get("candidate_name", "")
        limit = int(request.args.get("limit", 200))
        records = database.get_previously_asked_questions(candidate_name, limit=limit)
        return jsonify({
            "status": "success",
            "candidate_name": candidate_name or "All",
            "total_asked": len(records),
            "questions": records
        })
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve question history: {str(e)}"}), 500

@app.route('/api/generate-follow-up', methods=['POST'])
def api_generate_follow_up():
    try:
        data = request.json or {}
        question = data.get("question")
        candidate_answer = data.get("candidate_answer", "")
        resume_data = data.get("resume_data") or {}
        target_role = data.get("target_role", "Software Engineer")
        difficulty = data.get("difficulty", "Mid-Level")

        if not question or not candidate_answer:
            return jsonify({"error": "Missing question or candidate_answer"}), 400

        result = generate_follow_up_question(
            question=question,
            candidate_answer=candidate_answer,
            resume_data=resume_data,
            target_role=target_role,
            difficulty=difficulty
        )
        return jsonify(result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to generate follow-up question: {str(e)}"}), 500

@app.route('/api/assistant/command', methods=['POST'])
def api_assistant_command():
    try:
        data = request.json or {}
        command_text = data.get("command", "")
        candidate_data = data.get("candidate_data")
        current_session = data.get("current_session")

        result = process_assistant_command(command_text, candidate_data, current_session)
        return jsonify(result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Assistant command failure: {str(e)}"}), 500

@app.route('/api/evaluate-answer', methods=['POST'])
def api_evaluate_answer():
    try:
        data = request.json or {}
        question = data.get("question")
        candidate_answer = data.get("candidate_answer", "")
        resume_data = data.get("resume_data", {})
        target_role = data.get("target_role", "Software Engineer")
        difficulty = data.get("difficulty") or (question.get("difficulty") if isinstance(question, dict) else None) or "Mid-Level"

        if not question:
            return jsonify({"error": "Missing question payload."}), 400

        evaluation = evaluate_answer(
            question=question,
            candidate_answer=candidate_answer,
            resume_data=resume_data,
            target_role=target_role,
            difficulty=difficulty
        )
        return jsonify(evaluation)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to evaluate answer: {str(e)}"}), 500

@app.route('/api/complete-session', methods=['POST'])
def api_complete_session():
    try:
        data = request.json or {}
        session_id = data.get("session_id") or str(uuid.uuid4())
        candidate_name = data.get("candidate_name", "Candidate")
        target_role = data.get("target_role", "Software Engineer")
        interview_type = data.get("interview_type", "Mixed")
        difficulty = data.get("difficulty", "Mid-Level")
        resume_filename = data.get("resume_filename", "resume.pdf")
        questions = data.get("questions", [])
        resume_data = data.get("resume_data") or {}

        processed_questions = []
        scores = []
        all_strengths = []
        all_weaknesses = []
        all_suggestions = []
        all_weak_topics = []
        all_drills = []

        for idx, q in enumerate(questions):
            q_copy = dict(q)
            cand_ans = (q_copy.get("candidate_answer") or "").strip()
            ev = q_copy.get("evaluation")

            # If the candidate answered but evaluation is missing, auto-evaluate now
            if cand_ans and (not ev or not isinstance(ev, dict) or "score" not in ev):
                try:
                    ev = evaluate_answer(
                        question=q_copy,
                        candidate_answer=cand_ans,
                        resume_data=resume_data,
                        target_role=target_role,
                        difficulty=difficulty
                    )
                except Exception as auto_err:
                    print(f"Auto-eval failed for Q{idx+1}: {auto_err}")
                    ev = None

            # If question was unattempted / blank
            if not ev or not isinstance(ev, dict):
                ev = {
                    "score": 0.0,
                    "relevance_score": 0.0,
                    "accuracy_score": 0.0,
                    "clarity_score": 0.0,
                    "evidence_score": 0.0,
                    "strengths": ["None - question left unattempted."],
                    "weaknesses": ["No answer submitted for this question."],
                    "suggestion": "Attempt every question in the interview using the STAR method.",
                    "improved_answer": "Provide a structured response detailing your technical approach and outcomes.",
                    "weak_topics": ["Complete Answer Delivery"],
                    "recommended_drills": []
                }

            q_copy["evaluation"] = ev
            processed_questions.append(q_copy)

            score_val = float(ev.get("score", 0))
            scores.append(score_val)

            all_strengths.extend(ev.get("strengths", []))
            all_weaknesses.extend(ev.get("weaknesses", []))
            if ev.get("suggestion"):
                all_suggestions.append(ev.get("suggestion"))
            all_weak_topics.extend(ev.get("weak_topics", []))
            for dr in ev.get("recommended_drills", []):
                if isinstance(dr, dict):
                    all_drills.append(dr)

        overall_score = round(sum(scores) / max(len(scores), 1), 1) if scores else 0.0

        def dedupe(seq):
            seen = set()
            return [x for x in seq if not (x in seen or seen.add(x))]

        ai_status = config.get_ai_status()

        # Deduplicate drills safely
        unique_drills = []
        seen_topics = set()
        for d in all_drills:
            if isinstance(d, dict) and d.get("topic") and d.get("topic") not in seen_topics:
                seen_topics.add(d.get("topic"))
                unique_drills.append(d)

        session_payload = {
            "id": session_id,
            "candidate_name": candidate_name,
            "target_role": target_role,
            "interview_type": interview_type,
            "difficulty": difficulty,
            "resume_filename": resume_filename,
            "overall_score": overall_score,
            "evaluation_mode": ai_status["mode"],
            "strengths": dedupe(all_strengths)[:5],
            "weaknesses": dedupe(all_weaknesses)[:5],
            "actionable_suggestions": dedupe(all_suggestions)[:4],
            "weak_topics": dedupe(all_weak_topics)[:4],
            "questions": processed_questions,
            "drills": unique_drills[:4]
        }

        database.save_session(session_payload)

        return jsonify({
            "success": True,
            "session_id": session_id,
            "overall_score": overall_score,
            "summary": session_payload
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to complete session: {str(e)}"}), 500

@app.route('/api/history', methods=['GET'])
def api_get_history():
    limit = int(request.args.get("limit", 50))
    sessions = database.get_recent_sessions(limit=limit)
    return jsonify({"sessions": sessions})

@app.route('/api/history/<session_id>', methods=['GET'])
def api_get_session_details(session_id):
    details = database.get_session_details(session_id)
    if not details:
        return jsonify({"error": "Session not found."}), 404
    return jsonify({"session": details})

@app.route('/api/history/<session_id>', methods=['DELETE'])
def api_delete_session(session_id):
    database.delete_session(session_id)
    return jsonify({"success": True, "message": "Session deleted."})

@app.route('/api/dashboard-stats', methods=['GET'])
def api_dashboard_stats():
    stats = database.get_dashboard_analytics()
    return jsonify(stats)

@app.route('/api/history/<session_id>/pdf', methods=['GET'])
def api_download_session_pdf(session_id):
    try:
        session_data = database.get_session_details(session_id)
        if not session_data:
            return jsonify({"error": "Session not found."}), 404

        pdf_bytes = generate_pdf_report(session_data)
        cand_name = re.sub(r'[^a-zA-Z0-9_-]', '_', session_data.get("candidate_name", "Candidate").strip())
        filename = f"PrepForge_Report_{cand_name}_{session_id[:8]}.pdf"

        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to generate PDF: {str(e)}"}), 500

@app.route('/api/export-pdf', methods=['POST'])
def api_export_pdf():
    try:
        data = request.json or {}
        session_data = data.get("session") or data
        session_id = data.get("session_id") or session_data.get("id")

        # If session data is minimal but session_id exists, fetch from DB
        if (not session_data or not session_data.get("questions")) and session_id:
            db_session = database.get_session_details(session_id)
            if db_session:
                session_data = db_session

        if not session_data:
            return jsonify({"error": "No session data provided for PDF export."}), 400

        pdf_bytes = generate_pdf_report(session_data)
        cand_name = re.sub(r'[^a-zA-Z0-9_-]', '_', session_data.get("candidate_name", "Candidate").strip())
        short_id = str(session_id)[:8] if session_id else "export"
        filename = f"PrepForge_Report_{cand_name}_{short_id}.pdf"

        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to generate PDF: {str(e)}"}), 500

@app.route('/api/match-job', methods=['POST'])
def api_match_job():
    try:
        data = request.json or {}
        resume_data = data.get("resume_data") or {}
        jd_text = data.get("job_description", "")
        target_role = data.get("target_role", "Software Engineer")

        if not jd_text.strip():
            return jsonify({"error": "Please provide a job description to analyze."}), 400

        # Extract skills from JD using COMMON_SKILLS_CATALOG
        from extractor import COMMON_SKILLS_CATALOG
        lower_jd = jd_text.lower()
        jd_skills_set = set()
        for cat, skill_list in COMMON_SKILLS_CATALOG.items():
            for sk in skill_list:
                pattern = r'(?:\b|_)' + re.escape(sk) + r'(?:\b|_)'
                if re.search(pattern, lower_jd):
                    jd_skills_set.add(sk.capitalize() if len(sk) > 3 else sk.upper())

        if not jd_skills_set:
            words = re.findall(r'\b[A-Z][a-zA-Z0-9+#.-]{1,15}\b', jd_text)
            for w in words[:10]:
                if w.lower() not in {"the", "and", "with", "for", "you", "will", "our", "team", "role", "work"}:
                    jd_skills_set.add(w)

        jd_skills = sorted(list(jd_skills_set))

        # Get resume skills
        res_skills_raw = resume_data.get("all_skills", []) or []
        res_skills_lower = {s.lower(): s for s in res_skills_raw}

        matched_skills = []
        missing_skills = []

        for sk in jd_skills:
            if sk.lower() in res_skills_lower:
                evidence = ""
                for proj in resume_data.get("projects", []):
                    if sk.lower() in (proj.get("title", "") + " " + proj.get("tools", "") + " " + proj.get("summary", "")).lower():
                        evidence = f"Applied in project '{proj.get('title')}': {proj.get('summary', '')[:90]}..."
                        break
                if not evidence:
                    for exp in resume_data.get("experience", []):
                        if sk.lower() in (exp.get("role_header", "") + " " + exp.get("summary", "")).lower():
                            evidence = f"Demonstrated at '{exp.get('role_header')}': {exp.get('summary', '')[:90]}..."
                            break
                if not evidence:
                    evidence = f"Listed as a verified technical competency on candidate resume."
                matched_skills.append({
                    "skill": sk,
                    "evidence": evidence,
                    "level": "Verified in Resume"
                })
            else:
                missing_skills.append({
                    "skill": sk,
                    "importance": "High" if sk.lower() in {"react", "python", "aws", "docker", "sql", "node.js"} else "Medium",
                    "suggestion": f"Prepare a practical demonstration or review fundamentals of {sk}."
                })

        total_jd = len(jd_skills) if jd_skills else 1
        alignment_score = round((len(matched_skills) / total_jd) * 100, 1)

        roadmap = []
        if missing_skills:
            for item in missing_skills[:4]:
                roadmap.append({
                    "topic": item["skill"],
                    "action": f"Review core architectural patterns and build a proof-of-concept integrating {item['skill']}.",
                    "timeline": "1-3 days"
                })
        else:
            roadmap.append({
                "topic": "System Architecture & Deep Dive",
                "action": "Focus on system trade-offs, scaling bottlenecks, and production observability.",
                "timeline": "Immediate"
            })

        first_matched = matched_skills[0]['skill'] if matched_skills else 'core technologies'
        first_missing = missing_skills[0]['skill'] if missing_skills else 'distributed scaling'
        recommended_questions = [
            f"How would you architect a production service for {target_role} using {first_matched} to ensure resilience?",
            f"Describe an instance where you resolved an unexpected production failure or scalability bottleneck.",
            f"If our engineering team introduces {first_missing}, how would you approach rapid adoption and testing?"
        ]

        return jsonify({
            "target_role": target_role,
            "alignment_score": alignment_score,
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "jd_skills_count": len(jd_skills),
            "roadmap": roadmap,
            "recommended_questions": recommended_questions,
            "disclaimer": "This score represents technical entity keyword alignment and is not a hiring probability or guarantee."
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to match job description: {str(e)}"}), 500

# -----------------------------------------------------------------------------
# RAG & Knowledge Base Endpoints
# -----------------------------------------------------------------------------
@app.route('/api/rag/status', methods=['GET'])
def api_rag_status():
    try:
        vs = get_vector_store()
        return jsonify(vs.get_status())
    except Exception as e:
        return jsonify({"error": f"Failed to get RAG status: {str(e)}"}), 500

@app.route('/api/rag/documents', methods=['GET'])
def api_rag_documents():
    try:
        vs = get_vector_store()
        return jsonify({"documents": vs.list_documents()})
    except Exception as e:
        return jsonify({"error": f"Failed to list documents: {str(e)}"}), 500

@app.route('/api/rag/retrieve', methods=['POST'])
def api_rag_retrieve():
    try:
        data = request.get_json(silent=True) or {}
        if not isinstance(data, dict):
            data = {}
        query = (data.get("query") or "").strip()
        if not query:
            return jsonify({"error": "Query string is required."}), 400
        top_k = int(data.get("top_k", config.RAG_TOP_K))
        category = data.get("category")
        min_sim = float(data.get("min_similarity", getattr(config, "RAG_MIN_SIMILARITY", 0.28)))

        vs = get_vector_store()
        chunks = vs.search(query=query, top_k=top_k, category_filter=category, score_threshold=min_sim)
        return jsonify({
            "query": query,
            "chunks": chunks,
            "count": len(chunks)
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to retrieve knowledge chunks: {str(e)}"}), 500

@app.route('/api/rag/query', methods=['POST'])
def api_rag_query():
    try:
        data = request.get_json(silent=True) or {}
        if not isinstance(data, dict):
            data = {}
        query = (data.get("query") or "").strip()
        if not query:
            return jsonify({"error": "Question is required."}), 400
        top_k = int(data.get("top_k", config.RAG_TOP_K))
        category = data.get("category")
        min_sim = float(data.get("min_similarity", getattr(config, "RAG_MIN_SIMILARITY", 0.28)))

        result = answer_query_with_rag(query=query, top_k=top_k, category_filter=category, min_similarity=min_sim)
        return jsonify(result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"RAG query generation failed: {str(e)}"}), 500

@app.route('/api/rag/ingest', methods=['POST'])
def api_rag_ingest():
    try:
        vs = get_vector_store()

        # Action 1: Reindex knowledge base directory
        if request.is_json and request.json.get("action") == "reindex_all":
            force = bool(request.json.get("force", False))
            res = vs.index_knowledge_base(force_reindex=force)
            return jsonify({"success": True, "result": res})

        # Action 2: File upload (PDF, DOCX, TXT, MD)
        if 'file' in request.files:
            file = request.files['file']
            if not file or file.filename == '':
                return jsonify({"error": "No file selected."}), 400

            ext = Path(file.filename).suffix.lower()
            if ext not in {".txt", ".md", ".pdf", ".docx"}:
                return jsonify({"error": f"Unsupported file type '{ext}'. Allowed: .pdf, .docx, .txt, .md"}), 400

            filename = secure_filename(file.filename)
            category = request.form.get("category")
            save_path = config.KNOWLEDGE_BASE_DIR / filename
            file.save(str(save_path))

            # Validate file size (max 10MB)
            if save_path.stat().st_size > config.MAX_CONTENT_LENGTH:
                save_path.unlink(missing_ok=True)
                return jsonify({"error": "File exceeds 10MB size limit."}), 400

            res = vs.index_document(save_path, category=category, force_reindex=True)
            return jsonify({"success": True, "result": res}), 201

        # Action 3: JSON payload with direct text content
        if request.is_json and "content" in request.json:
            doc_name = secure_filename(request.json.get("document_name", "custom_note.txt"))
            if not doc_name.endswith((".txt", ".md")):
                doc_name += ".txt"
            content = request.json.get("content", "").strip()
            if not content:
                return jsonify({"error": "Content cannot be empty."}), 400
            category = request.json.get("category", "Custom Reference")
            save_path = config.KNOWLEDGE_BASE_DIR / doc_name
            with open(save_path, "w", encoding="utf-8") as f:
                f.write(f"Category: {category}\n\n{content}")

            res = vs.index_document(save_path, category=category, force_reindex=True)
            return jsonify({"success": True, "result": res}), 201

        return jsonify({"error": "Please provide a file or text content to ingest."}), 400
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to ingest knowledge document: {str(e)}"}), 500

# -----------------------------------------------------------------------------
# Production SPA Static File Server
# -----------------------------------------------------------------------------
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_production_frontend(path):
    # Pass through API requests that didn't match any route
    if path.startswith("api/") or path == "api":
        return jsonify({"error": "API route not found", "path": path}), 404

    if os.path.exists(FRONTEND_DIST):
        target_path = os.path.join(FRONTEND_DIST, path)
        if path and os.path.exists(target_path) and not os.path.isdir(target_path):
            return send_from_directory(FRONTEND_DIST, path)
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.exists(index_file):
            return send_from_directory(FRONTEND_DIST, "index.html")

    return jsonify({
        "status": "online",
        "app": "AI Powered Interview Preparation Platform API",
        "health": "/api/health",
        "message": "Frontend distribution build not found in frontend/dist. Build it using 'npm run build' inside frontend/, or run the Vite dev server on port 3000."
    })

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5001))
    print(f"Starting Flask Interview Prep Server on port {port} (0.0.0.0 & 127.0.0.1)...")
    app.run(host='0.0.0.0', port=port, debug=False, use_reloader=False)
