# PrepForge AI — Resume-Based AI Interview Preparation Platform with Personalized Feedback

**PrepForge AI** is an intelligent, grounded interview preparation platform that analyzes candidate resumes (PDF & DOCX) to generate tailored, highly realistic interview questions. Rather than hallucinating credentials or asking generic canned questions, the platform strictly roots every interview question in the candidate's verified skills, real projects, tools, and professional experience.

---

## 🏛️ System Architecture & Technology Stack (College Viva Overview)

```
┌────────────────────────────────────────────────────────┐
│               REACT 18 + VITE FRONTEND                 │
│  - Tailwind CSS + Lucide Icons                         │
│  - Web Speech API (Microphone voice dictation)         │
│  - Dual-Resilient Fetch (/api proxy + 127.0.0.1:5000)  │
│  - Session & Profile state persistence (localStorage)   │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / JSON
┌──────────────────────────▼─────────────────────────────┐
│                 PYTHON FLASK BACKEND                   │
│  - REST API Routes (/api/*) + CORS Preflight           │
│  - Document Extractor (pypdf, python-docx)             │
│  - Dual-Engine Question Generator (Grounded Heuristic) │
│  - Dual-Engine Evaluator (4-Pillar STAR Rubric)        │
│  - Auto-Evaluation & Partial Session Completion Engine │
└──────────────────────────┬─────────────────────────────┘
                           │ SQLite3 (Local file-based)
┌──────────────────────────▼─────────────────────────────┐
│                   interview_prep.db                    │
│  - sessions (id, role, score, strengths, weaknesses)   │
│  - session_questions (answers, rubric scores, STAR)    │
│  - practice_drills (weak topic follow-up questions)    │
└────────────────────────────────────────────────────────┘
```

| Component | Technology | Technical Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | **React 18 + Vite** | Fast SPA rendering, component modularity, instant sub-600ms dev startup. |
| **Design System** | **Tailwind CSS + Lucide** | Responsive utility styling, custom progress bars, score badges, clean typography. |
| **Backend REST API**| **Python Flask + CORS** | Lightweight, robust WSGI server handling file uploads, text parsing, and evaluation. |
| **Document Parsers**| **pypdf + python-docx** | Secure local text extraction from PDF and DOCX files with a strict 10MB limit. |
| **Persistence** | **SQLite3** | Native, zero-setup relational persistence for sessions, evaluations, and drills. |
| **AI Integration** | **Dual Engine** | Supports Gemini (`GEMINI_API_KEY`) and OpenAI (`OPENAI_API_KEY`). Automatically falls back to a transparent, deterministic rule-based engine when no key is present. |
| **Speech Dictation**| **Web Speech API** | Browser-native speech recognition enabling hands-free spoken answer practice. |

---

## 🐛 Root Causes & Confirmed Fixes Applied

### 1. "Failed to fetch on the interview setup page"
- **Cause**: On Windows systems, Node.js 18+ resolves `localhost` to IPv6 `::1`. Vite dev proxy attempted to connect to `http://localhost:5000` via IPv6, but Python Flask was bound to IPv4 `127.0.0.1`. When the backend task was interrupted or accessed via proxy, `fetch()` threw `TypeError: Failed to fetch`.
- **Fix**: 
  - Updated [`vite.config.js`](file:///C:/Users/209x1/.gemini/antigravity/scratch/ai-interview-prep/frontend/vite.config.js) to explicitly target IPv4 `http://127.0.0.1:5000`.
  - Built `resilientFetch` in [`frontend/src/services/api.js`](file:///C:/Users/209x1/.gemini/antigravity/scratch/ai-interview-prep/frontend/src/services/api.js) which automatically falls back to direct `http://127.0.0.1:5000/api` if the proxy ever disconnects.
  - Added `@app.after_request` CORS headers to all backend responses.

### 2. "The interview page displays '0 of 3 questions evaluated' when finishing"
- **Cause**: Questions were only evaluated when the candidate manually clicked the secondary "Evaluate This Answer" button on each individual question. If a user typed their answers and navigated using "Next Question", `evaluations` remained empty (`{}`), causing the counter to show `0 of 3 evaluated`.
- **Fix**:
  - In [`InterviewWorkspace.jsx`](file:///C:/Users/209x1/.gemini/antigravity/scratch/ai-interview-prep/frontend/src/components/InterviewWorkspace.jsx), the status bar now tracks both metrics: `X of Y answered • Z of Y evaluated`.
  - When the candidate clicks **"Finish & View Full Report"**, any answered question that has not yet been individually evaluated is **automatically evaluated** before finalizing the report, displaying a clean progress overlay.

### 3. "Failed to save interview session: Failed to complete session"
- **Cause**: In `backend/app.py` and `backend/database.py`, questions with skipped or un-evaluated answers had `q.get("evaluation") == None`. Code like `ev = q.get("evaluation", {})` returned `None` instead of a dict, causing `ev.get("strengths")` to crash with `AttributeError: 'NoneType' object has no attribute 'get'`. This triggered an unhandled HTTP 500 error on the server.
- **Fix**:
  - In [`backend/app.py`](file:///C:/Users/209x1/.gemini/antigravity/scratch/ai-interview-prep/backend/app.py), `/api/complete-session` now auto-evaluates any answered question where evaluation was missing, and honestly assigns an unattempted rubric score (`0.0`) with actionable feedback to skipped questions.
  - In [`backend/database.py`](file:///C:/Users/209x1/.gemini/antigravity/scratch/ai-interview-prep/backend/database.py), `save_session` uses `q.get("evaluation") or {}` and guards drill records against string/dict parsing errors, ensuring persistence always succeeds.

---

## 🚀 Windows Startup Instructions

Open two separate Windows PowerShell windows:

### Terminal 1 — Backend (Python Flask)
```powershell
$env:PATH = "C:\Users\209x1\AppData\Local\Programs\Python\Python311;C:\Users\209x1\AppData\Local\Programs\Python\Python311\Scripts;" + $env:PATH
cd C:\Users\209x1\.gemini\antigravity\scratch\ai-interview-prep\backend
python app.py
```
*Backend runs on `http://127.0.0.1:5000`.*

### Terminal 2 — Frontend (React Vite)
```powershell
$env:PATH = "C:\Users\209x1\AppData\Local\Programs\nodejs;C:\Users\209x1\AppData\Local\Programs\Python\Python311;" + $env:PATH
cd C:\Users\209x1\.gemini\antigravity\scratch\ai-interview-prep\frontend
npm run dev
```
*Frontend runs on `http://localhost:3000`.*

---

## 📡 Complete REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Returns backend health status, database connectivity, and active AI mode. |
| `GET` | `/api/sample-resumes` | Returns list of pre-loaded candidate resumes (Full-Stack, ML, DevOps). |
| `POST`| `/api/load-sample-resume` | Loads and extracts a pre-loaded profile by ID without file upload. |
| `POST`| `/api/upload-resume` | Uploads PDF/DOCX or raw text, parses skills, projects, and work history. |
| `POST`| `/api/generate-questions` | Generates questions grounded strictly in candidate resume entities. |
| `POST`| `/api/evaluate-answer` | Evaluates a single answer across the 4-pillar rubric and returns STAR feedback. |
| `POST`| `/api/complete-session` | Finalizes session, auto-evaluates pending answers, and saves to SQLite. |
| `GET` | `/api/history` | Retrieves list of all past practice sessions with scores and dates. |
| `GET` | `/api/history/<id>` | Retrieves full question-by-question breakdown, answers, and evaluations. |
| `DELETE`| `/api/history/<id>` | Deletes a session from local history. |
| `GET` | `/api/dashboard-stats` | Returns aggregate statistics (total sessions, avg score, weak topics, drills). |
| `POST`| `/api/settings` | Updates LLM API key dynamically (`gemini_api_key` or `openai_api_key`). |

---

## 🧪 Automated Test Execution

Run the backend unit tests and live end-to-end integration suite:

```powershell
cd C:\Users\209x1\.gemini\antigravity\scratch\ai-interview-prep\backend

# 1. Pipeline Unit Tests
python test_pipeline.py

# 2. Complete Session Edge-Case Tests (Fixed Bug Verification)
python test_complete_session_bug.py

# 3. Full End-to-End Test Suite
python e2e_test.py
```

All tests pass with exit code `0`.

---

## 🌐 Production Deployment Guide

PrepForge supports unified production deployment: building the React frontend (`frontend/dist`) allows the production WSGI server to serve both the frontend SPA at `/` and the REST API at `/api/*`.

### Option 1: Docker & Docker Compose (Recommended for Cloud / VPS)
```bash
# Build and run the multi-stage production container in the background
docker compose up --build -d

# Verify container health and logs
docker compose ps
docker compose logs -f
```
*Application is live at `http://localhost:5000` with persistent SQLite and upload volumes.*

### Option 2: Linux Production Server (Gunicorn + Nginx HTTPS)
```bash
# 1. Build frontend assets
cd frontend && npm ci && npm run build && cd ..

# 2. Install backend dependencies including Gunicorn
cd backend && pip install -r requirements.txt gunicorn

# 3. Run with Gunicorn WSGI (4 workers, 120s timeout)
gunicorn --workers=4 --bind=0.0.0.0:5000 --timeout=120 wsgi:app
```
*Configure Nginx using the provided `nginx.conf` with Let's Encrypt SSL. **HTTPS is mandatory** for browser microphone voice dictation.*

### Option 3: Windows Production Server (Waitress WSGI)
```powershell
# 1. Build frontend static assets
cd frontend
npm run build
cd ..\backend

# 2. Run Waitress production WSGI server (multi-threaded)
python wsgi.py
```
*Waitress serves both the React SPA and the REST API on `http://0.0.0.0:5000` with 8 worker threads.*

---

## 🎓 College Project Viva Defense Points

1. **Why Resume Grounding Matters**: Standard LLMs hallucinate questions about technologies candidates never used. PrepForge uses entity-level extraction so that every question has a verifiable resume anchor.
2. **Transparent AI Evaluation**: If no API key is provided, PrepForge runs in **Demo Mode (Rule-Based Evaluation)** analyzing keyword relevance, STAR structure, and metrics. It never falsely claims rule-based feedback is from an LLM.
3. **Closing the Prep Loop**: Evaluation identifies specific weak areas (e.g. *Database Indexing Tradeoffs*, *Quantifying Business Impact*) and automatically populates the **Targeted Drills** tab for focused follow-up sessions.
4. **Duplicate Prevention Engine**: Employs canonical technical acronym expansion, stopword/boilerplate removal, token Jaccard similarity, and SQLite historical tracking to guarantee zero repetitive questions across interview practice sessions.
