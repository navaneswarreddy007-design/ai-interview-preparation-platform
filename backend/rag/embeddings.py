import os
import threading
from typing import List, Union, Optional
import config

# Configure PyTorch & HuggingFace environment defaults
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

class EmbeddingManager:
    """
    Thread-safe Singleton Embedding Manager for PrepForge.
    Loads sentence-transformers/all-MiniLM-L6-v2 lazily into memory only when
    embedding operations are performed, preserving low memory footprint on boot.
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
    def is_model_loaded(cls) -> bool:
        """Check if the embedding model is currently initialized and resident in memory."""
        return cls._model is not None

    @classmethod
    def get_model(cls):
        """
        Thread-safe lazy initialization of SentenceTransformer model.
        Restricts PyTorch CPU threads to 1 and sets model to evaluation mode.
        """
        if cls._model is None:
            with cls._lock:
                if cls._model is None:
                    import torch

                    # Limit PyTorch CPU threads to 1 to reduce thread pool memory overhead
                    try:
                        torch.set_num_threads(1)
                    except Exception:
                        pass
                    try:
                        if hasattr(torch, "set_num_interop_threads"):
                            torch.set_num_interop_threads(1)
                    except Exception:
                        pass

                    from sentence_transformers import SentenceTransformer

                    # Choose optimal acceleration device (mps on Mac, cuda if GPU, else cpu)
                    if torch.backends.mps.is_available():
                        device = "mps"
                    elif torch.cuda.is_available():
                        device = "cuda"
                    else:
                        device = "cpu"

                    print(f"[PrepForge RAG] Loading embedding model '{cls._model_name}' on device '{device}' (PyTorch CPU threads: 1)...")
                    model = SentenceTransformer(cls._model_name, device=device)
                    model.eval()
                    cls._model = model
                    print(f"[PrepForge RAG] Embedding model initialized successfully.")
        return cls._model

    @classmethod
    def embed_text(cls, text: str) -> List[float]:
        """Generate normalized embedding vector for a single text query or document chunk."""
        clean = text.strip() if text else ""
        if not clean:
            # Fallback zero vector for empty strings
            return [0.0] * cls.get_dimension()
        model = cls.get_model()
        import torch
        with torch.no_grad():
            embedding = model.encode(clean, convert_to_numpy=True, normalize_embeddings=True)
        return embedding.tolist()

    @classmethod
    def embed_batch(cls, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        """Batch encode multiple document chunks efficiently with gradient tracking disabled."""
        if not texts:
            return []
        model = cls.get_model()
        clean_texts = [t.strip() if t.strip() else " " for t in texts]
        import torch
        with torch.no_grad():
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
