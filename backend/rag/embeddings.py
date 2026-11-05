import os
import threading
from typing import List, Union
import torch
from sentence_transformers import SentenceTransformer
import config

# Avoid slow remote network checks when model weights are already cached locally
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

class EmbeddingManager:
    """
    Thread-safe Singleton Embedding Manager for PrepForge.
    Loads sentence-transformers/all-MiniLM-L6-v2 once into memory and provides
    fast, consistent vector representations for indexing and retrieval.
    """
    _instance = None
    _lock = threading.Lock()
    _model = None
    _model_name = getattr(config, "EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(EmbeddingManager, cls).__new__(cls)
        return cls._instance

    @classmethod
    def get_model(cls) -> SentenceTransformer:
        if cls._model is None:
            with cls._lock:
                if cls._model is None:
                    # Choose optimal acceleration device (mps on Mac, cuda if GPU, else cpu)
                    if torch.backends.mps.is_available():
                        device = "mps"
                    elif torch.cuda.is_available():
                        device = "cuda"
                    else:
                        device = "cpu"

                    print(f"[PrepForge RAG] Loading embedding model '{cls._model_name}' on device '{device}'...")
                    cls._model = SentenceTransformer(cls._model_name, device=device)
                    print(f"[PrepForge RAG] Embedding model initialized successfully.")
        return cls._model

    @classmethod
    def embed_text(cls, text: str) -> List[float]:
        """Generate normalized embedding vector for a single text query or document chunk."""
        model = cls.get_model()
        clean = text.strip() if text else ""
        if not clean:
            # Fallback zero vector for empty strings
            return [0.0] * cls.get_dimension()
        embedding = model.encode(clean, convert_to_numpy=True, normalize_embeddings=True)
        return embedding.tolist()

    @classmethod
    def embed_batch(cls, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        """Batch encode multiple document chunks efficiently."""
        if not texts:
            return []
        model = cls.get_model()
        clean_texts = [t.strip() if t.strip() else " " for t in texts]
        embeddings = model.encode(
            clean_texts,
            batch_size=batch_size,
            show_progress_bar=False,
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        return embeddings.tolist()

    @classmethod
    def get_dimension(cls) -> int:
        """Return the vector dimensionality (384 for all-MiniLM-L6-v2)."""
        return 384

    @classmethod
    def get_model_name(cls) -> str:
        return cls._model_name

