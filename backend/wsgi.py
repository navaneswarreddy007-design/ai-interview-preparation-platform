"""
Production WSGI Entrypoint for AI POWERED INTERVIEW PREPARATION PLATFORM.

Compatible with:
- Gunicorn (Linux/Container):
    gunicorn --workers=4 --bind=0.0.0.0:5000 wsgi:app
- Waitress (Windows/Cross-platform):
    python wsgi.py
    waitress-serve --port=5000 wsgi:app
"""

import os
import sys

# Ensure backend directory is in python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import app
import database

# Ensure database tables exist on WSGI initialization
database.init_db()

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"================================================================")
    print(f" AI POWERED INTERVIEW PREPARATION PLATFORM — PRODUCTION WSGI   ")
    print(f" Serving on http://{host}:{port}                               ")
    print(f"================================================================")
    try:
        from waitress import serve
        print(f"Starting Waitress production WSGI server with 8 worker threads...")
        serve(app, host=host, port=port, threads=8)
    except ImportError:
        print("Waitress not detected. Running standard WSGI runner...")
        app.run(host=host, port=port, debug=False, use_reloader=False)
