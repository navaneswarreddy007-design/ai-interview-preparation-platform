# ==============================================================================
# Multi-Stage Dockerfile for AI POWERED INTERVIEW PREPARATION PLATFORM
# Stage 1: Build React 18 + Vite 5 + Tailwind CSS SPA
# Stage 2: Production Python 3.11 + Gunicorn WSGI Server + SQLite + ReportLab
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Frontend Builder
# ------------------------------------------------------------------------------
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy npm manifests and install dependencies
COPY frontend/package*.json ./
RUN npm install --include=optional

# Copy frontend source and compile static assets to /app/frontend/dist
COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Python Runtime
# ------------------------------------------------------------------------------
FROM python:3.11-slim AS production

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HOST=0.0.0.0 \
    FLASK_ENV=production \
    HF_HOME=/app/backend/.cache/huggingface

WORKDIR /app

# Install system dependencies (curl for healthchecks, fonts for ReportLab if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python production dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r ./backend/requirements.txt gunicorn

# Copy backend source code
COPY backend/ ./backend/

# Copy compiled frontend SPA assets from Stage 1 into frontend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create storage directories for persistent volumes and local model cache
RUN mkdir -p ./backend/uploads ./backend/sample_resumes ./backend/data ./backend/chroma_db ./backend/knowledge_base ./backend/.cache/huggingface

# Pre-index RAG knowledge base into ChromaDB during Docker build using ONNX Runtime INT8
# This bakes the persistent vector store and cached ONNX model weights directly into the production image.
RUN cd backend && python -c "from rag.vector_store import get_vector_store; vs = get_vector_store(); vs.index_knowledge_base(force_reindex=True)" && \
    chmod -R u=rwX,go=rX /app/backend/chroma_db /app/backend/uploads /app/backend/.cache

# Configure environment defaults
ENV DATABASE_PATH=/app/backend/interview_prep.db \
    UPLOAD_FOLDER=/app/backend/uploads

EXPOSE 10000

# Docker Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-10000}/api/health || exit 1

WORKDIR /app/backend

# Run with Gunicorn production WSGI server (Memory-optimized: 1 worker, 2 threads, gthread)
CMD ["sh", "-c", "exec gunicorn --workers=${WEB_CONCURRENCY:-1} --threads=${GUNICORN_THREADS:-2} --worker-class=gthread --bind=0.0.0.0:${PORT:-10000} --timeout=120 --access-logfile=- --error-logfile=- wsgi:app"]
