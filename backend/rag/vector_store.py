import os
import re
import hashlib
import threading
from pathlib import Path
from typing import Dict, Any, List, Optional
import chromadb
from chromadb.config import Settings

import config
from rag.document_loader import load_document, compute_file_hash, SUPPORTED_EXTENSIONS
from rag.chunker import chunk_document
from rag.embeddings import EmbeddingManager

COLLECTION_NAME = "prepforge_interview_knowledge"

class VectorStoreManager:
    """
    Manages persistent ChromaDB vector storage for PrepForge RAG.
    Ensures safe document ingestion, deduplication, metadata preservation,
    and semantic similarity retrieval.
    """
    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        self.persist_dir = Path(config.CHROMA_PERSIST_DIRECTORY)
        self.persist_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize persistent ChromaDB client
        self.client = chromadb.PersistentClient(
            path=str(self.persist_dir),
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        self._init_collection()

    def _init_collection(self):
        """Get or create the persistent knowledge base collection with cosine similarity."""
        self.collection = self.client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine", "description": "PrepForge Technical Interview Reference Corpus"}
        )

    def get_status(self) -> Dict[str, Any]:
        """Return operational health, chunk counts, and storage metrics."""
        count = self.collection.count()
        docs = self.list_documents()
        return {
            "status": "operational",
            "collection_name": COLLECTION_NAME,
            "total_chunks": count,
            "total_indexed_chunks": count,
            "total_documents": len(docs),
            "documents": docs,
            "persist_directory": str(self.persist_dir),
            "embedding_model": EmbeddingManager.get_model_name(),
            "vector_dimension": EmbeddingManager.get_dimension(),
            "vector_store": {
                "status": "operational",
                "total_indexed_chunks": count,
                "total_documents": len(docs),
                "persist_directory": str(self.persist_dir)
            }
        }

    def list_documents(self) -> List[Dict[str, Any]]:
        """List all unique documents currently indexed in the vector store with chunk counts."""
        count = self.collection.count()
        if count == 0:
            return []

        # Retrieve all metadata entries from collection
        results = self.collection.get(include=["metadatas"])
        metadatas = results.get("metadatas") or []

        doc_map: Dict[str, Dict[str, Any]] = {}
        for meta in metadatas:
            if not meta:
                continue
            doc_name = meta.get("document_name", "Unknown")
            if doc_name not in doc_map:
                doc_map[doc_name] = {
                    "document_name": doc_name,
                    "category": meta.get("category", "General"),
                    "document_hash": meta.get("document_hash", ""),
                    "source": meta.get("source", ""),
                    "chunk_count": 0
                }
            doc_map[doc_name]["chunk_count"] += 1

        return sorted(list(doc_map.values()), key=lambda d: d["document_name"])

    def is_document_indexed(self, doc_name: str, doc_hash: Optional[str] = None) -> bool:
        """Check if a document is already indexed, optionally matching file content hash."""
        results = self.collection.get(
            where={"document_name": doc_name},
            include=["metadatas"]
        )
        metas = results.get("metadatas") or []
        if not metas:
            return False
        if doc_hash:
            return any(m.get("document_hash") == doc_hash for m in metas if m)
        return True

    def delete_document(self, document_name: str) -> bool:
        """Remove all chunks associated with a specific document."""
        try:
            self.collection.delete(where={"document_name": document_name})
            return True
        except Exception as e:
            print(f"[PrepForge RAG] Error deleting document '{document_name}': {e}")
            return False

    def index_document(
        self,
        file_path: Path,
        category: Optional[str] = None,
        force_reindex: bool = False
    ) -> Dict[str, Any]:
        """
        Extract, chunk, embed, and index a single document into ChromaDB.
        Avoids redundant re-indexing if file hash matches existing index.
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {path}")

        file_hash = compute_file_hash(path)
        doc_name = path.name

        # Check duplicate indexing
        if not force_reindex and self.is_document_indexed(doc_name, file_hash):
            return {
                "status": "skipped",
                "reason": "already_indexed_identical_hash",
                "document_name": doc_name,
                "document_hash": file_hash
            }

        # If document exists but hash differs or force requested, delete old chunks
        if self.is_document_indexed(doc_name):
            self.delete_document(doc_name)

        # 1. Load Document
        doc_data = load_document(path)
        if category:
            doc_data["category"] = category

        # 2. Chunk Document
        chunk_size = getattr(config, "RAG_CHUNK_SIZE", 600)
        chunk_overlap = getattr(config, "RAG_CHUNK_OVERLAP", 120)
        chunks = chunk_document(doc_data, chunk_size=chunk_size, chunk_overlap=chunk_overlap)

        if not chunks:
            return {
                "status": "warning",
                "reason": "no_chunks_extracted",
                "document_name": doc_name,
                "chunks_indexed": 0
            }

        # 3. Generate Embeddings
        chunk_texts = [c["content"] for c in chunks]
        embeddings = EmbeddingManager.embed_batch(chunk_texts)

        # 4. Upsert into ChromaDB
        ids = [c["id"] for c in chunks]
        metadatas = [c["metadata"] for c in chunks]

        self.collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=chunk_texts,
            metadatas=metadatas
        )

        return {
            "status": "success",
            "document_name": doc_name,
            "category": doc_data["category"],
            "chunks_indexed": len(chunks),
            "file_size": doc_data["file_size"],
            "document_hash": file_hash
        }

    def index_knowledge_base(
        self,
        directory: Optional[Path] = None,
        force_reindex: bool = False
    ) -> Dict[str, Any]:
        """
        Batch index all legitimate reference documents in the knowledge base directory.
        """
        kb_dir = Path(directory or config.KNOWLEDGE_BASE_DIR)
        if not kb_dir.exists():
            return {"status": "error", "message": f"Knowledge base directory '{kb_dir}' not found."}

        files = [
            f for f in kb_dir.iterdir()
            if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS
        ]

        results = []
        indexed_count = 0
        skipped_count = 0
        total_chunks = 0

        for file_path in sorted(files, key=lambda f: f.name):
            try:
                res = self.index_document(file_path, force_reindex=force_reindex)
                results.append(res)
                if res.get("status") == "success":
                    indexed_count += 1
                    total_chunks += res.get("chunks_indexed", 0)
                elif res.get("status") == "skipped":
                    skipped_count += 1
            except Exception as e:
                results.append({
                    "status": "error",
                    "document_name": file_path.name,
                    "error": str(e)
                })

        return {
            "total_files_scanned": len(files),
            "indexed": indexed_count,
            "skipped": skipped_count,
            "total_new_chunks": total_chunks,
            "details": results
        }

    def search(
        self,
        query: str,
        top_k: int = 4,
        category_filter: Optional[str] = None,
        score_threshold: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Convert query into embedding and retrieve semantically relevant document chunks.
        Applies:
        1. Exact topic-to-chunk relevance filtering (preferring topic over broad file name matches).
        2. Unrelated cross-section noise exclusion.
        3. Document, section, and content hash deduplication.
        4. Does not force Top-K if fewer relevant chunks pass the threshold.
        """
        clean_query = query.strip() if query else ""
        if not clean_query or self.collection.count() == 0:
            return []

        # Determine effective minimum similarity threshold
        default_thresh = getattr(config, "RAG_MIN_SIMILARITY", 0.28)
        effective_threshold = float(score_threshold) if score_threshold is not None else default_thresh

        # Generate query embedding with same model
        query_embedding = EmbeddingManager.embed_text(clean_query)

        where_filter = None
        if category_filter and category_filter.lower() != "all":
            where_filter = {"category": category_filter}

        # Query a candidate pool to allow re-ranking, filtering, and deduplication
        total_in_coll = self.collection.count()
        pool_size = min(max(top_k * 4, 16), total_in_coll)

        query_params = {
            "query_embeddings": [query_embedding],
            "n_results": pool_size,
            "include": ["documents", "metadatas", "distances"]
        }
        if where_filter:
            query_params["where"] = where_filter

        results = self.collection.query(**query_params)

        docs_list = results.get("documents") or [[]]
        metas_list = results.get("metadatas") or [[]]
        dists_list = results.get("distances") or [[]]
        ids_list = results.get("ids") or [[]]

        docs = docs_list[0] if (docs_list and len(docs_list) > 0 and docs_list[0] is not None) else []
        metas = metas_list[0] if (metas_list and len(metas_list) > 0 and metas_list[0] is not None) else []
        dists = dists_list[0] if (dists_list and len(dists_list) > 0 and dists_list[0] is not None) else []
        ids = ids_list[0] if (ids_list and len(ids_list) > 0 and ids_list[0] is not None) else []

        if not docs:
            return []

        # Substantive keyword and topic extraction
        stop_words = {
            "what", "is", "are", "the", "in", "for", "a", "an", "and", "or", "to", "how", "does", "of", "with",
            "explain", "describe", "tell", "me", "about", "can", "you", "please", "why", "when", "where", "which",
            "common", "all", "between", "difference"
        }
        generic_domain_words = {
            "dbms", "database", "databases", "sql", "system", "systems", "operating", "network", "networks",
            "networking", "python", "java", "dsa", "interview", "concept", "concepts", "fundamentals", "overview"
        }
        raw_tokens = set(re.findall(r'\b[a-zA-Z0-9_\-]{3,}\b', clean_query.lower()))
        query_words = raw_tokens - stop_words
        topic_words = query_words - generic_domain_words
        if not topic_words:
            topic_words = query_words

        # First pass: parse candidates and compute cosine similarities
        raw_candidates = []
        for i in range(len(docs)):
            dist = float(dists[i]) if (dists and i < len(dists) and dists[i] is not None) else 1.0
            similarity = max(0.0, round(1.0 - dist, 4))
            meta = metas[i] if (metas and i < len(metas) and isinstance(metas[i], dict)) else {}
            content = str(docs[i]) if (docs and i < len(docs) and docs[i] is not None) else ""
            doc_name = meta.get("document_name", "Unknown Source")
            sec_title = meta.get("section_title", "General")
            category = meta.get("category", "General Technical")

            # Check keyword presence strictly on chunk content and section title (NOT generic document/category name)
            chunk_searchable = f"{content} {sec_title}".lower()
            topic_matches = sum(1 for kw in topic_words if re.search(r'\b' + re.escape(kw) + r'\b', chunk_searchable))
            kw_matches = sum(1 for kw in query_words if re.search(r'\b' + re.escape(kw) + r'\b', chunk_searchable))

            raw_candidates.append({
                "id": ids[i] if (ids and i < len(ids) and ids[i] is not None) else f"chunk_{i}",
                "content": content,
                "similarity_score": similarity,
                "distance": round(dist, 4),
                "document_name": doc_name,
                "section_title": sec_title,
                "page": meta.get("page", 1),
                "category": category,
                "source": meta.get("source", ""),
                "topic_matches": topic_matches,
                "kw_matches": kw_matches
            })

        if not raw_candidates:
            return []

        # Find top candidate prioritized by topic match and cosine similarity
        top_candidate = max(raw_candidates, key=lambda c: (c.get("topic_matches", 0) > 0, c.get("similarity_score", 0.0)))
        top_has_topic = top_candidate.get("topic_matches", 0) > 0
        top_doc = top_candidate.get("document_name", "")
        top_cat = top_candidate.get("category", "")
        top_sec = top_candidate.get("section_title", "")
        max_sim = top_candidate.get("similarity_score", 0.0)

        if max_sim < effective_threshold:
            return []

        filtered_chunks = []
        for c in raw_candidates:
            if not isinstance(c, dict):
                continue
            sim = c.get("similarity_score", 0.0)
            if sim < effective_threshold:
                continue

            # Strict topic-relevance filter:
            # If the best match contains specific topic words (e.g., 'acid' or 'deadlock'),
            # exclude candidate chunks that possess zero matches for the specific query topic.
            if top_has_topic and c.get("topic_matches", 0) == 0:
                continue

            # Cross-domain noise suppression:
            if c.get("document_name") != top_doc and c.get("category") != top_cat:
                if c.get("topic_matches", 0) == 0 or sim < (max_sim - 0.08):
                    continue

            # Alignment score boost for ranking
            boost = 0.0
            if c.get("section_title") == top_sec:
                boost += 0.04
            if c.get("topic_matches", 0) > 0:
                boost += min(0.08, 0.03 * c["topic_matches"])

            c["effective_score"] = round(sim + boost, 4)
            filtered_chunks.append(c)

        # Sort filtered candidates descending by effective ranking score
        filtered_chunks.sort(key=lambda x: (x.get("effective_score", x["similarity_score"]), x["similarity_score"]), reverse=True)

        # Deduplicate and consolidate chunks by (document_name, section_title) and content hash
        deduped_chunks = []
        seen_sections = {}  # (document_name, section_title) -> index in deduped_chunks
        seen_hashes = set()

        for c in filtered_chunks:
            content_text = c.get("content", "").strip()
            chash = hashlib.sha256(content_text.encode("utf-8")).hexdigest()[:16]
            if chash in seen_hashes:
                continue
            seen_hashes.add(chash)

            sec_key = (c.get("document_name", ""), c.get("section_title", ""))
            if sec_key in seen_sections:
                existing_idx = seen_sections[sec_key]
                existing_c = deduped_chunks[existing_idx]
                existing_text = existing_c.get("content", "")

                # Merge unique paragraphs from this chunk into existing chunk
                new_paras = [p.strip() for p in content_text.split("\n\n") if p.strip() and p.strip()[:80] not in existing_text]
                if new_paras:
                    existing_c["content"] = existing_text + "\n\n" + "\n\n".join(new_paras)

                # Maintain highest similarity score
                if c.get("similarity_score", 0.0) > existing_c.get("similarity_score", 0.0):
                    existing_c["similarity_score"] = c.get("similarity_score", 0.0)
                if c.get("distance", 1.0) < existing_c.get("distance", 1.0):
                    existing_c["distance"] = c.get("distance", 1.0)
            else:
                seen_sections[sec_key] = len(deduped_chunks)
                deduped_chunks.append(dict(c))

        # Clean internal scoring attributes before returning
        final_chunks = []
        for c in deduped_chunks[:top_k]:
            c_copy = dict(c)
            c_copy.pop("topic_matches", None)
            c_copy.pop("kw_matches", None)
            c_copy.pop("effective_score", None)
            final_chunks.append(c_copy)

        return final_chunks

    def clear_all(self) -> bool:
        """Reset and clear entire knowledge base collection."""
        try:
            self.client.delete_collection(COLLECTION_NAME)
            self._init_collection()
            return True
        except Exception as e:
            print(f"[PrepForge RAG] Error clearing collection: {e}")
            return False

# Global singleton instance
_vector_store_instance = None
_vs_lock = threading.Lock()

def get_vector_store() -> VectorStoreManager:
    global _vector_store_instance
    if _vector_store_instance is None:
        with _vs_lock:
            if _vector_store_instance is None:
                _vector_store_instance = VectorStoreManager()
    return _vector_store_instance

