"""
PrepForge Structured Question Bank
Contains categorized interview questions tagged by role, experience level,
interview type, difficulty, skill keywords, and canonical concept IDs for diversity.
"""

from typing import List, Dict, Any

STRUCTURED_QUESTION_BANK: List[Dict[str, Any]] = [
    # -------------------------------------------------------------
    # 1. SOFTWARE ENGINEER / BACKEND / ARCHITECTURE
    # -------------------------------------------------------------
    {
        "id": "se_db_indexing_01",
        "concept_id": "db_indexing_optimization",
        "topic": "Database Architecture",
        "roles": ["Software Engineer", "Senior Full Stack Engineer", "Backend Engineer"],
        "experience_levels": ["Fresher", "0–2 years", "3–5 years", "5+ years"],
        "difficulty": "Mid-Level",
        "interview_types": ["Technical", "Mixed"],
        "skills": ["SQL", "PostgreSQL", "MySQL", "Database"],
        "question_text": "How do B-tree and Hash database indexes differ internally, and in what query scenarios would an index actually degrade database write performance?",
        "focus_areas": ["Index internal structures", "Write amplification & locking", "Covering index vs full scan"]
    },
    {
        "id": "se_concurrency_01",
        "concept_id": "concurrency_race_conditions",
        "topic": "Concurrency & Threading",
        "roles": ["Software Engineer", "Senior Full Stack Engineer", "Backend Engineer"],
        "experience_levels": ["3–5 years", "5+ years"],
        "difficulty": "Senior",
        "interview_types": ["Technical", "Mixed"],
        "skills": ["Python", "Node.js", "Go", "Java", "Redis"],
        "question_text": "In a high-throughput distributed environment, how do you prevent race conditions and dirty reads when two worker processes update the same bank balance or inventory counter concurrently?",
        "focus_areas": ["Optimistic vs pessimistic locking", "Distributed locks with Redis/Redlock", "Idempotency keys"]
    },
    {
        "id": "se_caching_01",
        "concept_id": "caching_invalidation_strategies",
        "topic": "Distributed Caching",
        "roles": ["Software Engineer", "Senior Full Stack Engineer", "Backend Engineer", "Web Developer"],
        "experience_levels": ["0–2 years", "3–5 years", "5+ years"],
        "difficulty": "Mid-Level",
        "interview_types": ["Technical", "Mixed", "System Design"],
        "skills": ["Redis", "Memcached", "Caching", "System Design"],
        "question_text": "Explain the trade-offs between Write-Through, Write-Back, and Cache-Aside caching patterns. How do you mitigate the Cache Stampede (Thundering Herd) phenomenon when a popular key expires?",
        "focus_areas": ["Cache patterns trade-offs", "Mutex / probabilistic early expiration", "Stale-while-revalidate"]
    },
    {
        "id": "se_microservices_01",
        "concept_id": "microservices_eventual_consistency",
        "topic": "Distributed Systems",
        "roles": ["Software Engineer", "Senior Full Stack Engineer", "Backend Engineer"],
        "experience_levels": ["3–5 years", "5+ years"],
        "difficulty": "Senior",
        "interview_types": ["Technical", "Mixed", "System Design"],
        "skills": ["Kafka", "RabbitMQ", "Microservices", "Docker"],
        "question_text": "When transitioning a monolithic service to an event-driven microservices architecture, how do you maintain data consistency across distributed boundaries without relying on blocking two-phase commits?",
        "focus_areas": ["Saga pattern (orchestration vs choreography)", "Outbox pattern", "Compensating transactions"]
    },
    {
        "id": "se_api_idempotency_01",
        "concept_id": "api_idempotency_resilience",
        "topic": "API Design & Resilience",
        "roles": ["Software Engineer", "Senior Full Stack Engineer", "Web Developer"],
        "experience_levels": ["Fresher", "0–2 years", "3–5 years", "5+ years"],
        "difficulty": "Mid-Level",
        "interview_types": ["Technical", "Mixed"],
        "skills": ["REST", "FastAPI", "Express", "Node.js"],
        "question_text": "Why is HTTP idempotency essential in payment and order processing APIs, and how would you design an idempotency key verification layer in your backend service?",
        "focus_areas": ["HTTP method idempotency (POST vs PUT)", "Atomic check-and-set in Redis/DB", "Handling retries during network timeouts"]
    },
    {
        "id": "se_memory_profiling_01",
        "concept_id": "memory_profiling_leak_isolation",
        "topic": "Systems & Performance",
        "roles": ["Software Engineer", "Senior Full Stack Engineer", "Backend Engineer"],
        "experience_levels": ["0–2 years", "3–5 years", "5+ years"],
        "difficulty": "Mid-Level",
        "interview_types": ["Technical", "Mixed"],
        "skills": ["Python", "Node.js", "Java", "C++"],
        "question_text": "Suppose a production microservice shows a steady 20MB per hour memory climb without dropping after requests finish. Walk me through the profiling tools and methodology you would use to isolate the leak.",
        "focus_areas": ["Heap snapshots and diffing", "Event listener / closure retention", "Profiling in staging under load"]
    },

    # -------------------------------------------------------------
    # 2. AI / MACHINE LEARNING ENGINEER
    # -------------------------------------------------------------
    {
        "id": "ml_overfitting_01",
        "concept_id": "ml_overfitting_regularization",
        "topic": "Machine Learning Fundamentals",
        "roles": ["AI/ML Engineer", "Machine Learning & AI Engineer", "Data Scientist"],
        "experience_levels": ["Fresher", "0–2 years", "3–5 years", "5+ years"],
        "difficulty": "Mid-Level",
        "interview_types": ["Technical", "Mixed"],
        "skills": ["Python", "PyTorch", "TensorFlow", "Scikit-Learn"],
        "question_text": "Explain overfitting in machine learning models. How do L1 (Lasso) and L2 (Ridge) weight decay regularization techniques mathematically discourage models from memorizing training noise?",
        "focus_areas": ["Bias-variance tradeoff", "L1 sparsity vs L2 weight shrinkage", "Validation loss divergence detection"]
    },
    {
        "id": "ml_rag_embeddings_01",
        "concept_id": "ml_rag_vector_search",
        "topic": "LLMs & Retrieval Systems",
        "roles": ["AI/ML Engineer", "Machine Learning & AI Engineer"],
        "experience_levels": ["0–2 years", "3–5 years", "5+ years"],
        "difficulty": "Mid-Level",
        "interview_types": ["Technical", "Mixed"],
        "skills": ["Python", "PyTorch", "Hugging Face", "Pinecone", "Vector DB"],
        "question_text": "In a Retrieval-Augmented Generation (RAG) system, what strategies do you employ to resolve the 'lost in the middle' context window issue and evaluate the semantic fidelity of retrieved document chunks?",
        "focus_areas": ["Chunking strategies (sliding window / semantic split)", "Reranking with cross-encoders", "RAG evaluation metrics (RAGAS / context recall)"]
    },
    {
        "id": "ml_gradient_descent_01",
        "concept_id": "ml_optimization_gradient_vanishing",
        "topic": "Deep Learning Optimization",
        "roles": ["AI/ML Engineer", "Machine Learning & AI Engineer"],
        "experience_levels": ["Fresher", "0–2 years", "3–5 years", "5+ years"],
        "difficulty": "Mid-Level",
        "interview_types": ["Technical", "Mixed"],
        "skills": ["PyTorch", "Deep Learning", "TensorFlow"],
        "question_text": "What causes the vanishing and exploding gradient problem in deep neural networks, and how did modern architectures like ResNets and Transformers structurally solve it?",
        "focus_areas": ["Backpropagation chain rule", "Residual skip connections", "Layer normalization and residual scaling"]
    },
    {
        "id": "ml_data_leakage_01",
        "concept_id": "ml_data_leakage_validation",
        "topic": "ML Pipeline Engineering",
        "roles": ["AI/ML Engineer", "Data Analyst", "Machine Learning & AI Engineer"],
        "experience_levels": ["Fresher", "0–2 years", "3–5 years", "5+ years"],
        "difficulty": "Junior",
        "interview_types": ["Technical", "Mixed"],
        "skills": ["Python", "Pandas", "Scikit-Learn"],
        "question_text": "Describe a subtle form of data leakage that can artificially inflate validation metrics during feature preprocessing, and how do you enforce strict separation inside training pipelines?",
        "focus_areas": ["Fitting scalers/imputers before train-test split", "Temporal / target leakage in time-series", "Scikit-Learn Pipeline encapsulation"]
    },
    {
        "id": "ml_model_serving_01",
        "concept_id": "ml_inference_quantization_latency",
        "topic": "MLOps & Model Serving",
        "roles": ["AI/ML Engineer", "Machine Learning & AI Engineer"],
        "experience_levels": ["3–5 years", "5+ years"],
        "difficulty": "Senior",
        "interview_types": ["Technical", "Mixed"],
        "skills": ["vLLM", "Docker", "PyTorch", "FastAPI"],
        "question_text": "When serving an open-weights LLM in a production API, what are the primary trade-offs between dynamic quantization (e.g. 4-bit AWQ/GPTQ) and model accuracy, and how does KV-caching impact GPU memory footprint under concurrent streams?",
        "focus_areas": ["Quantization precision loss vs throughput", "PagedAttention and KV-cache sizing", "Continuous batching with vLLM/TGI"]
    },

    # -------------------------------------------------------------
    # 3. DATA ANALYST & BUSINESS INTELLIGENCE
    # -------------------------------------------------------------
    {
        "id": "da_sql_window_01",
        "concept_id": "data_sql_window_functions",
        "topic": "SQL & Analytical Querying",
        "roles": ["Data Analyst", "Software Engineer"],
        "experience_levels": ["Fresher", "0–2 years", "3–5 years", "5+ years"],
        "difficulty": "Mid-Level",
        "interview_types": ["Technical", "Mixed"],
        "skills": ["SQL", "PostgreSQL", "Snowflake", "BigQuery"],
        "question_text": "Explain the operational difference between ROW_NUMBER(), RANK(), and DENSE_RANK() in SQL. In what business analytics scenario would you use a rolling cumulative window over an aggregate GROUP BY?",
        "focus_areas": ["Handling ties in ranking", "PARTITION BY and ORDER BY semantics", "Running totals & moving averages"]
    },
    {
        "id": "da_ab_testing_01",
        "concept_id": "data_ab_testing_statistics",
        "topic": "Statistical Inference & Experimentation",
        "roles": ["Data Analyst", "Product Manager"],
        "experience_levels": ["0–2 years", "3–5 years", "5+ years"],
        "difficulty": "Mid-Level",
        "interview_types": ["Technical", "Mixed"],
        "skills": ["Python", "Pandas", "Statistics"],
        "question_text": "When designing an A/B test for a core product feature, how do you determine the required sample size and statistical power upfront, and how do you guard against the multiple comparisons problem (p-hacking)?",
        "focus_areas": ["Type I vs Type II errors", "Minimum detectable effect (MDE)", "Bonferroni correction / false discovery rate"]
    },
    {
        "id": "da_data_hygiene_01",
        "concept_id": "data_cleaning_missing_imputation",
        "topic": "Data Cleaning & Quality",
        "roles": ["Data Analyst", "AI/ML Engineer"],
        "experience_levels": ["Fresher", "0–2 years", "3–5 years", "5+ years"],
        "difficulty": "Junior",
        "interview_types": ["Technical", "Mixed"],
        "skills": ["SQL", "Python", "Pandas"],
        "question_text": "When analyzing a transactional dataset with missing values, how do you assess whether the missingness is MCAR (Missing Completely at Random) or MNAR (Missing Not at Random), and how does that influence your decision to drop versus impute?",
        "focus_areas": ["Mechanisms of missing data", "Mean/median vs model-based imputation", "Bias introduction through row deletion"]
    },
    {
        "id": "da_dimensional_modeling_01",
        "concept_id": "data_warehousing_star_schema",
        "topic": "Data Warehousing",
        "roles": ["Data Analyst", "Data Engineer"],
        "experience_levels": ["0–2 years", "3–5 years", "5+ years"],
        "difficulty": "Mid-Level",
        "interview_types": ["Technical", "Mixed"],
        "skills": ["SQL", "Snowflake", "BigQuery"],
        "question_text": "Contrast a Star Schema with a 3NF normalized schema in a modern analytical warehouse. Why do analytical engines prefer denormalized dimensional tables for BI reporting queries?",
        "focus_areas": ["Fact vs Dimension tables", "Minimizing join costs in columnar storage", "Slowly changing dimensions (SCD Type 2)"]
    },

    # -------------------------------------------------------------
    # 4. WEB DEVELOPER & FRONTEND ARCHITECTURE
    # -------------------------------------------------------------
    {
        "id": "fe_react_state_01",
        "concept_id": "react_state_rerendering_lifecycles",
        "topic": "Frontend Architecture",
        "roles": ["Web Developer", "Software Engineer", "Senior Full Stack Engineer"],
        "experience_levels": ["Fresher", "0–2 years", "3–5 years", "5+ years"],
        "difficulty": "Mid-Level",
        "interview_types": ["Technical", "Mixed"],
        "skills": ["React", "JavaScript", "TypeScript"],
        "question_text": "How does React's virtual DOM reconciliation algorithm decide when to re-render a subtree, and how do you diagnose and eliminate unnecessary re-renders using useMemo, useCallback, and React.memo?",
        "focus_areas": ["Fiber reconciliation & shallow comparison", "Reference equality in props and dependencies", "Profiling render durations with React DevTools"]
    },
    {
        "id": "fe_web_performance_01",
        "concept_id": "web_performance_core_vitals",
        "topic": "Web Performance",
        "roles": ["Web Developer", "Senior Full Stack Engineer"],
        "experience_levels": ["0–2 years", "3–5 years", "5+ years"],
        "difficulty": "Mid-Level",
        "interview_types": ["Technical", "Mixed"],
        "skills": ["React", "Next.js", "CSS", "JavaScript"],
        "question_text": "What steps would you take to optimize a web application scoring poorly on Core Web Vitals (specifically LCP and CLS)? Walk through code-splitting, font optimization, and image asset strategies.",
        "focus_areas": ["Largest Contentful Paint (LCP) bottlenecks", "Cumulative Layout Shift (CLS) dimensions", "Dynamic imports and critical CSS extraction"]
    },
    {
        "id": "fe_security_01",
        "concept_id": "web_security_xss_csrf",
        "topic": "Web Application Security",
        "roles": ["Web Developer", "Software Engineer", "Senior Full Stack Engineer"],
        "experience_levels": ["Fresher", "0–2 years", "3–5 years", "5+ years"],
        "difficulty": "Junior",
        "interview_types": ["Technical", "Mixed"],
        "skills": ["JavaScript", "Security", "TypeScript"],
        "question_text": "Explain the difference between Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF). How do modern frameworks, SameSite cookies, and Content Security Policy (CSP) headers protect user sessions?",
        "focus_areas": ["Stored vs reflected XSS vectors", "CSRF anti-forgery tokens & SameSite=Strict/Lax", "Sanitization and CSP directives"]
    },

    # -------------------------------------------------------------
    # 5. CORE CS FOUNDATIONS & DATA STRUCTURES (FRESHER / JUNIOR)
    # -------------------------------------------------------------
    {
        "id": "cs_oop_principles_01",
        "concept_id": "cs_oop_polymorphism_encapsulation",
        "topic": "Object-Oriented Programming",
        "roles": ["Software Engineer", "Web Developer", "AI/ML Engineer"],
        "experience_levels": ["Fresher", "0–2 years"],
        "difficulty": "Junior",
        "interview_types": ["Technical", "Mixed"],
        "skills": ["Java", "Python", "C++", "TypeScript", "Data Structures"],
        "question_text": "Explain the four core principles of Object-Oriented Programming with a practical code design example. How does runtime polymorphism differ from compile-time method overloading?",
        "focus_areas": ["Encapsulation, Abstraction, Inheritance, Polymorphism", "Virtual method dispatch", "Interface vs abstract class"]
    },
    {
        "id": "cs_dsa_trees_01",
        "concept_id": "cs_dsa_hash_collision_search",
        "topic": "Data Structures & Algorithms",
        "roles": ["Software Engineer", "AI/ML Engineer", "Web Developer"],
        "experience_levels": ["Fresher", "0–2 years"],
        "difficulty": "Junior",
        "interview_types": ["Technical", "Mixed"],
        "skills": ["Data Structures", "Algorithms", "Python", "Java", "C++"],
        "question_text": "How do Hash Tables achieve average O(1) lookup time, and what happens internally during a hash collision? Compare separate chaining with open addressing.",
        "focus_areas": ["Hash function distribution", "Chaining vs Linear Probing", "Worst-case O(n) degradation and rehashing"]
    },

    # -------------------------------------------------------------
    # 6. HR / BEHAVIORAL & LEADERSHIP (STAR FRAMEWORK)
    # -------------------------------------------------------------
    # A. FRESHER & JUNIOR ACADEMIC / TEAMWORK BEHAVIORAL QUESTIONS
    {
        "id": "star_fresher_teamwork_01",
        "concept_id": "star_academic_peer_collaboration",
        "topic": "Academic Teamwork & Collaboration",
        "roles": ["Software Engineer", "AI/ML Engineer", "Data Analyst", "Web Developer"],
        "experience_levels": ["Fresher", "0–2 years"],
        "difficulty": "Junior",
        "interview_types": ["HR / Behavioral", "Mixed"],
        "skills": [],
        "question_text": "Describe an academic group project, lab assignment, or hackathon where you and your teammates had different viewpoints on how to divide tasks or implement a feature. How did you resolve the disagreement and deliver on time?",
        "focus_areas": ["Academic collaboration", "Constructive peer discussion", "Meeting assignment deliverables"]
    },
    {
        "id": "star_fresher_deadline_01",
        "concept_id": "star_academic_deadline_triage",
        "topic": "Project Execution & Time Management",
        "roles": ["Software Engineer", "AI/ML Engineer", "Data Analyst", "Web Developer"],
        "experience_levels": ["Fresher", "0–2 years"],
        "difficulty": "Junior",
        "interview_types": ["HR / Behavioral", "Mixed"],
        "skills": [],
        "question_text": "Tell me about a challenging project deadline or coursework submission where you ran into unexpected technical roadblocks. How did you prioritize what features to finish first to ensure a working project?",
        "focus_areas": ["Prioritization under time pressure", "MVP scoping", "Delivering working software"]
    },
    {
        "id": "star_fresher_debugging_01",
        "concept_id": "star_academic_debugging_ownership",
        "topic": "Problem Solving & Debugging",
        "roles": ["Software Engineer", "AI/ML Engineer", "Data Analyst", "Web Developer"],
        "experience_levels": ["Fresher", "0–2 years"],
        "difficulty": "Junior",
        "interview_types": ["HR / Behavioral", "Mixed"],
        "skills": [],
        "question_text": "Walk me through a difficult bug or logic error in one of your college or personal coding projects that took significant effort to solve. What was your debugging methodology, and what did you learn?",
        "focus_areas": ["Systematic debugging", "Reproducing edge cases", "Testing safeguards"]
    },
    {
        "id": "star_fresher_learning_01",
        "concept_id": "star_self_directed_learning",
        "topic": "Continuous Learning & Adaptability",
        "roles": ["Software Engineer", "AI/ML Engineer", "Data Analyst", "Web Developer"],
        "experience_levels": ["Fresher", "0–2 years"],
        "difficulty": "Junior",
        "interview_types": ["HR / Behavioral", "Mixed"],
        "skills": [],
        "question_text": "Describe a tool, framework, or programming language you had to learn completely independently for a project outside your regular coursework. How did you structure your learning and apply it effectively?",
        "focus_areas": ["Documentation & tutorial learning", "Hands-on prototype building", "Fast adaptation"]
    },

    # B. EXPERIENCED PROFESSIONAL BEHAVIORAL QUESTIONS
    {
        "id": "star_conflict_01",
        "concept_id": "star_conflict_resolution",
        "topic": "Behavioral Leadership",
        "roles": ["Software Engineer", "AI/ML Engineer", "Data Analyst", "Web Developer"],
        "experience_levels": ["3–5 years", "5+ years"],
        "difficulty": "Mid-Level",
        "interview_types": ["HR / Behavioral", "Mixed"],
        "skills": [],
        "question_text": "Tell me about a time when you strongly disagreed with a teammate or technical lead regarding an architectural direction or code design. How did you handle the discussion, and what was the resolution?",
        "focus_areas": ["De-escalation and active listening", "Anchoring arguments in objective data and user impact", "Committing to the final consensus"]
    },
    {
        "id": "star_deadline_01",
        "concept_id": "star_tight_deadline_prioritization",
        "topic": "Execution & Ownership",
        "roles": ["Software Engineer", "AI/ML Engineer", "Data Analyst", "Web Developer"],
        "experience_levels": ["3–5 years", "5+ years"],
        "difficulty": "Mid-Level",
        "interview_types": ["HR / Behavioral", "Mixed"],
        "skills": [],
        "question_text": "Describe a situation where you were faced with an impending release deadline alongside ambiguous requirements. How did you prioritize deliverables, communicate risk, and ensure quality was not compromised?",
        "focus_areas": ["Scope triage and MVP negotiation", "Transparent stakeholder status updates", "Preventing regressions under pressure"]
    },
    {
        "id": "star_mistake_01",
        "concept_id": "star_incident_ownership",
        "topic": "Accountability & Continuous Learning",
        "roles": ["Software Engineer", "AI/ML Engineer", "Data Analyst", "Web Developer"],
        "experience_levels": ["3–5 years", "5+ years"],
        "difficulty": "Senior",
        "interview_types": ["HR / Behavioral", "Mixed"],
        "skills": [],
        "question_text": "Walk me through a significant mistake or production outage you were directly responsible for. How did you triage the issue, communicate with the team, and what preventive safeguards did you put in place afterward?",
        "focus_areas": ["Immediate ownership without deflecting blame", "Blameless post-mortem analysis", "Automated regression tests / CI guardrails"]
    },
    {
        "id": "star_tech_debt_01",
        "concept_id": "star_advocating_tech_debt",
        "topic": "Engineering Stewardship",
        "roles": ["Software Engineer", "AI/ML Engineer", "Web Developer"],
        "experience_levels": ["3–5 years", "5+ years"],
        "difficulty": "Senior",
        "interview_types": ["HR / Behavioral", "Mixed"],
        "skills": [],
        "question_text": "Describe an instance where you successfully advocated for refactoring critical technical debt when non-technical stakeholders were pushing exclusively for new product features. How did you frame the business case?",
        "focus_areas": ["Translating technical risk into business velocity", "Incremental refactoring strategies", "Measurable uptime and developer ergonomics"]
    }
]
