import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

# Configurable storage paths for containerization & cloud mounts
UPLOAD_FOLDER = Path(os.getenv("UPLOAD_FOLDER", str(BASE_DIR / "uploads")))
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

SAMPLE_RESUMES_FOLDER = BASE_DIR / "sample_resumes"
SAMPLE_RESUMES_FOLDER.mkdir(parents=True, exist_ok=True)

DATABASE_PATH = Path(os.getenv("DATABASE_PATH", str(BASE_DIR / "interview_prep.db")))
DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)

# RAG & Knowledge Base Configuration
KNOWLEDGE_BASE_DIR = Path(os.getenv("KNOWLEDGE_BASE_DIR", str(BASE_DIR / "knowledge_base"))).resolve()
KNOWLEDGE_BASE_DIR.mkdir(parents=True, exist_ok=True)

CHROMA_PERSIST_DIRECTORY = Path(os.getenv("CHROMA_PERSIST_DIRECTORY", str(BASE_DIR / "chroma_db"))).resolve()
CHROMA_PERSIST_DIRECTORY.mkdir(parents=True, exist_ok=True)

EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
RAG_TOP_K = int(os.getenv("RAG_TOP_K", "4"))
RAG_CHUNK_SIZE = int(os.getenv("RAG_CHUNK_SIZE", "1200"))
RAG_CHUNK_OVERLAP = int(os.getenv("RAG_CHUNK_OVERLAP", "200"))
RAG_MIN_SIMILARITY = float(os.getenv("RAG_MIN_SIMILARITY", "0.28"))
RAG_RELATIVE_DROP_THRESHOLD = float(os.getenv("RAG_RELATIVE_DROP_THRESHOLD", "0.10"))

# Security & environment
SECRET_KEY = os.getenv("SECRET_KEY", "prepforge-production-auth-secret-key-2026")
FLASK_ENV = os.getenv("FLASK_ENV", "production")
# CORS Allowed Origins: comma-separated list of allowed origins, or '*' for any origin
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").strip()

# File upload limits
ALLOWED_EXTENSIONS = {"pdf", "docx"}
MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB limit

# API Keys
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()

# Check active AI engine
def get_ai_status():
    if GEMINI_API_KEY:
        return {"enabled": True, "provider": "Gemini", "mode": "AI-Powered (Gemini)"}
    elif OPENAI_API_KEY:
        return {"enabled": True, "provider": "OpenAI", "mode": "AI-Powered (OpenAI)"}
    else:
        return {"enabled": False, "provider": None, "mode": "Demo Mode (Rule-Based Evaluation)"}

def get_available_provider():
    return get_ai_status().get("provider")
