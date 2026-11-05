import os
import threading
from typing import List, Union, Optional, Tuple
from pathlib import Path
import numpy as np
import config

os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

class EmbeddingManager:
    """
    Thread-safe Singleton ONNX Embedding Manager for PrepForge.
    Loads Xenova/all-MiniLM-L6-v2 INT8 quantized ONNX model lazily into memory
    with zero PyTorch runtime dependency. Produces 384-dimensional normalized vectors
    with masked mean pooling and L2 normalization in ~140 MB peak RSS.
    """
    _instance = None
    _lock = threading.Lock()
    _session = None
    _tokenizer = None
    _model_name = "sentence-transformers/all-MiniLM-L6-v2 (ONNX INT8 Quantized)"
    _model_repo = "Xenova/all-MiniLM-L6-v2"
    _model_filename = "onnx/model_quantized.onnx"
    _tokenizer_filename = "tokenizer.json"

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(EmbeddingManager, cls).__new__(cls)
        return cls._instance

    @classmethod
    def is_model_loaded(cls) -> bool:
        """Check if the ONNX session and tokenizer are currently initialized and resident in memory."""
        return cls._session is not None and cls._tokenizer is not None

    @classmethod
    def _resolve_paths(cls) -> Tuple[str, str]:
        """Resolve model and tokenizer file paths from local cache or download on demand."""
        from huggingface_hub import hf_hub_download

        # Try offline local files first to avoid remote network checks
        try:
            model_path = hf_hub_download(
                repo_id=cls._model_repo,
                filename=cls._model_filename,
                local_files_only=True
            )
            tokenizer_path = hf_hub_download(
                repo_id=cls._model_repo,
                filename=cls._tokenizer_filename,
                local_files_only=True
            )
            return model_path, tokenizer_path
        except Exception:
            pass

        # Fallback to standard download if not in local cache
        model_path = hf_hub_download(
            repo_id=cls._model_repo,
            filename=cls._model_filename,
            local_files_only=False
        )
        tokenizer_path = hf_hub_download(
            repo_id=cls._model_repo,
            filename=cls._tokenizer_filename,
            local_files_only=False
        )
        return model_path, tokenizer_path

    @classmethod
    def get_model(cls):
        """
        Thread-safe lazy initialization of ONNX Runtime inference session and Tokenizer.
        Sets single-threaded sequential execution for minimal memory footprint.
        """
        if cls._session is None or cls._tokenizer is None:
            with cls._lock:
                if cls._session is None or cls._tokenizer is None:
                    import onnxruntime as ort
                    from tokenizers import Tokenizer

                    print(f"[PrepForge RAG] Initializing ONNX INT8 embedding session ({cls._model_repo})...")
                    model_path, tokenizer_path = cls._resolve_paths()

                    # Configure ONNX session options for minimal memory on CPU
                    opts = ort.SessionOptions()
                    opts.intra_op_num_threads = 1
                    opts.inter_op_num_threads = 1
                    opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
                    opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

                    cls._session = ort.InferenceSession(
                        model_path,
                        sess_options=opts,
                        providers=["CPUExecutionProvider"]
                    )

                    # Initialize Rust-based WordPiece tokenizer
                    tok = Tokenizer.from_file(tokenizer_path)
                    tok.enable_padding(length=256)
                    tok.enable_truncation(max_length=256)
                    cls._tokenizer = tok

                    print(f"[PrepForge RAG] ONNX INT8 embedding session and tokenizer initialized successfully.")
        return cls._session, cls._tokenizer

    @classmethod
    def embed_text(cls, text: str) -> List[float]:
        """Generate normalized 384-dimensional embedding vector for a single text string."""
        clean = text.strip() if text else ""
        if not clean:
            return [0.0] * cls.get_dimension()

        session, tokenizer = cls.get_model()

        enc = tokenizer.encode(clean)
        inputs = {
            "input_ids": np.array([enc.ids], dtype=np.int64),
            "attention_mask": np.array([enc.attention_mask], dtype=np.int64),
            "token_type_ids": np.array([enc.type_ids], dtype=np.int64)
        }

        # Run ONNX inference
        outputs = session.run(None, inputs)
        token_embeddings = outputs[0]  # shape: [1, seq_len, 384]

        # Masked mean pooling
        mask = np.expand_dims(inputs["attention_mask"], -1).astype(float)
        sum_embeddings = np.sum(token_embeddings * mask, axis=1)
        sum_mask = np.clip(mask.sum(axis=1), a_min=1e-9, a_max=None)
        mean_pooled = sum_embeddings / sum_mask

        # L2 normalization
        norm = np.clip(np.linalg.norm(mean_pooled, axis=1, keepdims=True), a_min=1e-12, a_max=None)
        normalized = mean_pooled / norm

        return normalized[0].tolist()

    @classmethod
    def embed_batch(cls, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        """Batch encode multiple document chunks efficiently using ONNX Runtime with masked mean pooling."""
        if not texts:
            return []

        session, tokenizer = cls.get_model()
        results: List[List[float]] = []

        for i in range(0, len(texts), batch_size):
            batch_slice = texts[i:i + batch_size]
            clean_batch = [t.strip() if (t and t.strip()) else " " for t in batch_slice]

            encodings = tokenizer.encode_batch(clean_batch)
            input_ids = np.array([e.ids for e in encodings], dtype=np.int64)
            attention_mask = np.array([e.attention_mask for e in encodings], dtype=np.int64)
            token_type_ids = np.array([e.type_ids for e in encodings], dtype=np.int64)

            outputs = session.run(None, {
                "input_ids": input_ids,
                "attention_mask": attention_mask,
                "token_type_ids": token_type_ids
            })
            token_embeddings = outputs[0]  # shape: [batch, seq_len, 384]

            # Masked mean pooling across sequence dimension
            mask = np.expand_dims(attention_mask, -1).astype(float)
            sum_embeddings = np.sum(token_embeddings * mask, axis=1)
            sum_mask = np.clip(mask.sum(axis=1), a_min=1e-9, a_max=None)
            mean_pooled = sum_embeddings / sum_mask

            # L2 normalization
            norm = np.clip(np.linalg.norm(mean_pooled, axis=1, keepdims=True), a_min=1e-12, a_max=None)
            normalized = mean_pooled / norm
            results.extend(normalized.tolist())

        return results

    @classmethod
    def get_dimension(cls) -> int:
        """Return vector dimensionality (384)."""
        return 384

    @classmethod
    def get_model_name(cls) -> str:
        return cls._model_name
