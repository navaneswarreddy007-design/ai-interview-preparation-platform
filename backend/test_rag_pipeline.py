"""
Comprehensive Test Suite for PrepForge RAG Pipeline
Validates:
1. PDF Document Extraction (pypdf)
2. DOCX Document Extraction (python-docx)
3. Text Chunking (recursive boundary-aware splitting, metadata retention)
4. Embedding Generation (all-MiniLM-L6-v2 singleton, vector dimension 384)
5. ChromaDB Persistent Indexing
6. Semantic Similarity Retrieval
7. Relevant Source Retrieval & Provenance Tracking
8. RAG Response Generation & Citation Formatting
9. Missing-Context Handling (out-of-domain rejection)
10. Gemini Unavailable Fallback (transparent rule-based synthesis)
11. Duplicate Document Ingestion (idempotency & hash skipping)
12. Existing Interview Workflow Regression (interview generation & evaluation intact)
"""

import unittest
import os
import shutil
import tempfile
from pathlib import Path

try:
    from app import app
    import config
    from rag.document_loader import load_document, extract_from_pdf, extract_from_docx, extract_from_txt
    from rag.chunker import recursive_split_text, chunk_document
    from rag.embeddings import EmbeddingManager
    from rag.vector_store import get_vector_store
    from rag.generator import answer_query_with_rag, generate_grounded_fallback_synthesis
    from question_generator import generate_questions
    from evaluator import evaluate_answer
except ImportError:
    from backend.app import app
    import backend.config as config
    from backend.rag.document_loader import load_document, extract_from_pdf, extract_from_docx, extract_from_txt
    from backend.rag.chunker import recursive_split_text, chunk_document
    from backend.rag.embeddings import EmbeddingManager
    from backend.rag.vector_store import get_vector_store
    from backend.rag.generator import answer_query_with_rag, generate_grounded_fallback_synthesis
    from backend.question_generator import generate_questions
    from backend.evaluator import evaluate_answer


class TestPrepForgeRAGPipeline(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = app.test_client()
        cls.vs = get_vector_store()
        # Ensure knowledge base is populated
        cls.vs.index_knowledge_base()

    def test_01_pdf_document_extraction(self):
        """Test 1: Verify PDF text and page extraction using pypdf."""
        pdf_path = config.KNOWLEDGE_BASE_DIR / "system_design_interview_handbook.pdf"
        self.assertTrue(pdf_path.exists(), f"PDF file not found: {pdf_path}")
        
        extracted = extract_from_pdf(pdf_path)
        self.assertIn("full_text", extracted)
        self.assertIn("sections", extracted)
        self.assertGreater(len(extracted["full_text"]), 100)
        self.assertTrue(any("scaling" in s["content"].lower() for s in extracted["sections"]))
        print("[Test 01 PASS] PDF extraction succeeded with", len(extracted["sections"]), "sections")

    def test_02_docx_document_extraction(self):
        """Test 2: Verify DOCX paragraph and table extraction using python-docx."""
        docx_path = config.KNOWLEDGE_BASE_DIR / "distributed_systems_patterns.docx"
        self.assertTrue(docx_path.exists(), f"DOCX file not found: {docx_path}")
        
        extracted = extract_from_docx(docx_path)
        self.assertIn("full_text", extracted)
        self.assertIn("sections", extracted)
        self.assertGreater(len(extracted["full_text"]), 100)
        self.assertTrue(any("circuit breaker" in s["content"].lower() for s in extracted["sections"]))
        print("[Test 02 PASS] DOCX extraction succeeded with", len(extracted["sections"]), "sections")

    def test_03_text_chunking(self):
        """Test 3: Verify boundary-aware recursive chunking with metadata preservation."""
        sample_doc = {
            "document_name": "test_chunking_doc.txt",
            "file_hash": "testhash123456",
            "file_path": "/path/to/test.txt",
            "category": "Operating Systems",
            "sections": [
                {
                    "title": "Process Scheduling",
                    "content": "A process scheduler is an OS kernel module that decides which runnable process is assigned CPU time. Common scheduling algorithms include First-Come First-Served, Shortest Job First, Round Robin, and Multi-Level Feedback Queues. Fair sharing guarantees prevent starvation.",
                    "page": 1
                }
            ]
        }
        chunks = chunk_document(sample_doc, chunk_size=150, chunk_overlap=30)
        self.assertGreaterEqual(len(chunks), 1)
        for c in chunks:
            self.assertIn("id", c)
            self.assertIn("content", c)
            self.assertEqual(c["metadata"]["document_name"], "test_chunking_doc.txt")
            self.assertEqual(c["metadata"]["category"], "Operating Systems")
            self.assertEqual(c["metadata"]["section_title"], "Process Scheduling")
        print("[Test 03 PASS] Chunking created", len(chunks), "attributed chunks")

    def test_04_embedding_generation(self):
        """Test 4: Verify HuggingFace sentence-transformers/all-MiniLM-L6-v2 embedding generation."""
        text = "What are ACID properties in database management systems?"
        vec = EmbeddingManager.embed_text(text)
        self.assertIsInstance(vec, list)
        self.assertEqual(len(vec), 384, f"Expected 384 dimensions, got {len(vec)}")

        batch_vecs = EmbeddingManager.embed_batch(["First sentence", "Second query"])
        self.assertEqual(len(batch_vecs), 2)
        self.assertEqual(len(batch_vecs[0]), 384)
        print("[Test 04 PASS] EmbeddingManager generated 384-dimensional normalized vectors")

    def test_05_chromadb_indexing(self):
        """Test 5: Verify persistent ChromaDB storage and status reporting."""
        status = self.vs.get_status()
        self.assertEqual(status["status"], "operational")
        self.assertGreater(status["total_chunks"], 50)
        self.assertGreater(status["total_documents"], 5)
        self.assertEqual(status["vector_dimension"], 384)
        print(f"[Test 05 PASS] ChromaDB status: {status['total_documents']} documents, {status['total_chunks']} chunks")

    def test_06_semantic_similarity_retrieval(self):
        """Test 6: Verify semantic similarity search retrieves relevant content with cosine distance."""
        query = "Explain B-Tree vs Hash index performance for range scans"
        results = self.vs.search(query, top_k=3)
        self.assertGreater(len(results), 0)
        top_match = results[0]
        self.assertIn("similarity_score", top_match)
        self.assertGreater(top_match["similarity_score"], 0.40)
        self.assertIn("dbms_and_sql_concepts.txt", [r["document_name"] for r in results])
        print(f"[Test 06 PASS] Top match score: {top_match['similarity_score']} from {top_match['document_name']}")

    def test_07_relevant_source_retrieval(self):
        """Test 7: Verify specific known concept retrieval matches the correct source document."""
        # Query known concept: STAR method
        star_results = self.vs.search("How should I structure a behavioral answer using the STAR method?", top_k=2)
        self.assertGreater(len(star_results), 0)
        self.assertEqual(star_results[0]["document_name"], "hr_and_behavioral_star_method.txt")

        # Query known concept: TCP 3-way handshake
        tcp_results = self.vs.search("Explain SYN and ACK packets in TCP 3-way handshake", top_k=2)
        self.assertGreater(len(tcp_results), 0)
        self.assertEqual(tcp_results[0]["document_name"], "computer_networks_fundamentals.txt")
        print("[Test 07 PASS] Known queries retrieved correct source documents (HR STAR & Computer Networks)")

    def test_08_rag_response_generation(self):
        """Test 8: Verify end-to-end RAG response generation and citation formatting."""
        query = "Explain the difference between a Process and a Thread in operating systems."
        response = answer_query_with_rag(query, top_k=3)
        self.assertTrue(response["is_grounded"])
        self.assertGreater(response["sources_count"], 0)
        self.assertIn("answer", response)
        self.assertTrue(any("operating_systems" in s["document_name"] for s in response["retrieved_sources"]))
        print(f"[Test 08 PASS] RAG query completed via mode: {response['mode']}")

    def test_09_missing_context_handling(self):
        """Test 9: Verify out-of-domain query is correctly flagged without hallucination."""
        # Ask something completely absent from software engineering interview materials
        obscure_query = "What is the breeding migration pattern of monarch butterflies in Antarctica?"
        response = answer_query_with_rag(obscure_query, min_similarity=0.35)
        # Should detect no relevant chunks meet threshold
        self.assertFalse(response["is_grounded"])
        self.assertEqual(response["sources_count"], 0)
        self.assertIn("does not currently contain sufficient reference material", response["answer"])
        print("[Test 09 PASS] Missing context safely handled with clear insufficiency notice")

    def test_10_gemini_unavailable_fallback(self):
        """Test 10: Verify transparent rule-based synthesis works when GEMINI_API_KEY is unset."""
        query = "What are ACID properties in relational databases?"
        chunks = self.vs.search(query, top_k=2)
        self.assertGreater(len(chunks), 0)
        
        fallback_text = generate_grounded_fallback_synthesis(query, chunks)
        self.assertIn("Knowledge Base Synthesis (Rule-Based Grounded Retrieval)", fallback_text)
        self.assertIn("dbms_and_sql_concepts.txt", fallback_text)
        print("[Test 10 PASS] Fallback synthesis formatted transparent citations and summaries")

    def test_11_duplicate_document_ingestion(self):
        """Test 11: Verify duplicate ingestion detects identical content hash and skips re-indexing."""
        doc_path = config.KNOWLEDGE_BASE_DIR / "dbms_and_sql_concepts.txt"
        initial_res = self.vs.index_document(doc_path, force_reindex=False)
        self.assertEqual(initial_res["status"], "skipped")
        self.assertEqual(initial_res["reason"], "already_indexed_identical_hash")
        print("[Test 11 PASS] Duplicate document indexing skipped via content hash verification")

    def test_12_interview_workflow_regression(self):
        """Test 12: Verify that existing interview question generation and answer evaluation remain 100% functional."""
        sample_resume = {
            "candidate_name": "Alex Morgan",
            "all_skills": ["Python", "React", "PostgreSQL", "Docker", "AWS"],
            "experience": [{"role_header": "Senior Software Engineer | CloudScale Systems", "summary": "Architected portals."}],
            "projects": [{"title": "E-Commerce", "tools": "React, PostgreSQL", "summary": "Built services."}]
        }
        gen_res = generate_questions(
            resume_data=sample_resume,
            target_role="Software Engineer",
            interview_type="Technical",
            difficulty="Mid-Level",
            question_count=2,
            candidate_name="Alex Morgan"
        )
        self.assertIn("questions", gen_res)
        self.assertEqual(len(gen_res["questions"]), 2)

        q = gen_res["questions"][0]
        eval_res = evaluate_answer(
            question=q,
            candidate_answer="In PostgreSQL, indexes such as B-Trees accelerate lookup queries by traversing balanced tree nodes instead of sequential scans.",
            resume_data=sample_resume,
            target_role="Software Engineer",
            difficulty="Mid-Level"
        )
        self.assertIn("score", eval_res)
        self.assertGreater(eval_res["score"], 0)
        self.assertIn("suggestion", eval_res)
        self.assertIn("strengths", eval_res)
        print(f"[Test 12 PASS] Core interview question generation and answer evaluation verified intact (Score: {eval_res['score']})")

    def test_13_flask_api_endpoints(self):
        """Test 13: Verify all new /api/rag/* Flask endpoints through HTTP test client."""
        # GET /api/rag/status
        r_stat = self.client.get('/api/rag/status')
        self.assertEqual(r_stat.status_code, 200)
        self.assertEqual(r_stat.get_json()["status"], "operational")

        # GET /api/rag/documents
        r_docs = self.client.get('/api/rag/documents')
        self.assertEqual(r_docs.status_code, 200)
        self.assertGreater(len(r_docs.get_json()["documents"]), 5)

        # POST /api/rag/retrieve
        r_retr = self.client.post('/api/rag/retrieve', json={"query": "What is the Global Interpreter Lock in Python?", "top_k": 2})
        self.assertEqual(r_retr.status_code, 200)
        self.assertGreater(r_retr.get_json()["count"], 0)

        # POST /api/rag/query
        r_qry = self.client.post('/api/rag/query', json={"query": "Explain OSI 7-layer model vs TCP/IP"})
        self.assertEqual(r_qry.status_code, 200)
        self.assertTrue(r_qry.get_json()["is_grounded"])
        print("[Test 13 PASS] Flask API endpoints (/status, /documents, /retrieve, /query) verified successfully")

    def test_14_acid_properties_quality_and_noise_filtering(self):
        """Test 14: Verify ACID query produces complete structured answer with bank example, zero SQL optimization noise, non-empty chunk content, and no duplicate citations."""
        query = "Explain ACID properties in DBMS"
        response = answer_query_with_rag(query, top_k=4)
        
        self.assertTrue(response["is_grounded"])
        self.assertGreater(response["sources_count"], 0)
        
        # 1. Verify source documents & NO unrelated DSA or SQL optimization join content returned
        doc_names = [s["document_name"] for s in response["retrieved_sources"]]
        sec_titles = [s["section_title"] for s in response["retrieved_sources"]]
        self.assertIn("dbms_and_sql_concepts.txt", doc_names)
        self.assertNotIn("dsa_fundamentals.txt", doc_names, "Unrelated DSA content must NOT be retrieved for ACID queries")
        for st in sec_titles:
            self.assertNotIn("Query Optimization", st, "Unrelated SQL Join/Optimization chunks must NOT be retrieved for ACID queries")

        # 2. Verify all retrieved sources have valid, non-empty content and no duplicate section citations
        seen_secs = set()
        for s in response["retrieved_sources"]:
            self.assertTrue(bool(s.get("content")), "Retrieved chunk must contain non-empty content")
            self.assertGreater(len(s.get("content", "")), 50, "Retrieved chunk content must be substantial")
            sec_key = (s["document_name"], s["section_title"])
            self.assertNotIn(sec_key, seen_secs, f"Duplicate section citation detected: {sec_key}")
            seen_secs.add(sec_key)
        
        # 3. Verify all 4 ACID properties are explicitly covered in the generated answer
        answer = response["answer"]
        self.assertIn("Atomicity", answer)
        self.assertIn("Consistency", answer)
        self.assertIn("Isolation", answer)
        self.assertIn("Durability", answer)
        
        # 4. Verify bank transaction example is included (supported by retrieved context)
        self.assertTrue("bank" in answer.lower() or "account a" in answer.lower(), "Bank transaction example must be included when supported by context")
        
        # 5. Verify transparent mode distinction
        if not config.GEMINI_API_KEY:
            self.assertFalse(response["is_ai"])
            self.assertIn("Knowledge Base Synthesis", response["mode"])
        else:
            self.assertTrue(response["is_ai"])
            self.assertIn("Gemini", response["mode"])
            
        print("[Test 14 PASS] ACID properties query generated complete answer with bank example, zero SQL join noise, non-empty content, and no duplicate citations")

    def test_15_dbms_joins_retrieval(self):
        """Test 15: Verify SQL join strategies query retrieves DBMS documentation and details physical joins without ACID noise."""
        query = "What are SQL joins: nested loop, hash join, and merge join?"
        response = answer_query_with_rag(query, top_k=3)
        
        self.assertTrue(response["is_grounded"])
        doc_names = [s["document_name"] for s in response["retrieved_sources"]]
        sec_titles = [s["section_title"] for s in response["retrieved_sources"]]
        self.assertIn("dbms_and_sql_concepts.txt", doc_names)
        
        # Verify no ACID noise in SQL joins query
        for st in sec_titles:
            self.assertNotIn("ACID", st, "ACID chunks must not contaminate SQL join queries")

        # Verify non-empty content in all chunks
        for s in response["retrieved_sources"]:
            self.assertTrue(bool(s.get("content")), "Retrieved join chunk must contain non-empty content")

        answer = response["answer"]
        self.assertIn("Nested Loop", answer)
        self.assertIn("Hash Join", answer)
        self.assertIn("Merge Join", answer)
        print("[Test 15 PASS] DBMS joins query correctly retrieved and detailed Nested Loop, Hash Join, and Merge Join without ACID contamination")

    def test_16_os_deadlocks_coffman_conditions(self):
        """Test 16: Verify OS deadlock query retrieves OS handbook and details all 4 Coffman conditions."""
        query = "What are the 4 Coffman conditions required for deadlocks?"
        response = answer_query_with_rag(query, top_k=3)
        
        self.assertTrue(response["is_grounded"])
        doc_names = [s["document_name"] for s in response["retrieved_sources"]]
        self.assertIn("operating_systems_concepts.txt", doc_names)
        for s in response["retrieved_sources"]:
            self.assertTrue(bool(s.get("content")), "Retrieved OS chunk must contain non-empty content")
        
        answer = response["answer"]
        self.assertIn("Mutual Exclusion", answer)
        self.assertIn("Hold and Wait", answer)
        self.assertIn("No Preemption", answer)
        self.assertIn("Circular Wait", answer)
        print("[Test 16 PASS] OS deadlock query correctly retrieved and detailed all 4 Coffman conditions")

    def test_17_python_gil_and_concurrency(self):
        """Test 17: Verify Python GIL query retrieves language fundamentals and details memory & concurrency."""
        query = "What is the Global Interpreter Lock in Python and how does memory management work?"
        response = answer_query_with_rag(query, top_k=3)
        
        self.assertTrue(response["is_grounded"])
        doc_names = [s["document_name"] for s in response["retrieved_sources"]]
        self.assertIn("python_and_java_fundamentals.txt", doc_names)
        for s in response["retrieved_sources"]:
            self.assertTrue(bool(s.get("content")), "Retrieved Python chunk must contain non-empty content")
        
        answer = response["answer"]
        self.assertIn("Global Interpreter Lock", answer)
        self.assertTrue("reference counting" in answer.lower())
        self.assertTrue("multiprocessing" in answer.lower())
        print("[Test 17 PASS] Python GIL query correctly retrieved and detailed GIL, reference counting, and multiprocessing")

    def test_18_cap_and_pacelc_theorem(self):
        """Test 18: Verify distributed systems query retrieves DOCX handbook and details CAP and PACELC."""
        query = "Explain CAP theorem and PACELC in distributed systems"
        response = answer_query_with_rag(query, top_k=3)
        
        self.assertTrue(response["is_grounded"])
        doc_names = [s["document_name"] for s in response["retrieved_sources"]]
        self.assertIn("distributed_systems_patterns.docx", doc_names)
        for s in response["retrieved_sources"]:
            self.assertTrue(bool(s.get("content")), "Retrieved distributed systems chunk must contain non-empty content")
        
        answer = response["answer"]
        self.assertIn("Consistency", answer)
        self.assertIn("Availability", answer)
        self.assertIn("Partition", answer)
        self.assertIn("PACELC", answer)
        print("[Test 18 PASS] CAP theorem and PACELC query correctly retrieved and detailed distributed trade-offs")


if __name__ == '__main__':
    unittest.main()
