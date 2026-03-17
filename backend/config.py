"""Sky Sentinel configuration — loads from .env"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

# LLM
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai")  # openai | anthropic | local | mock
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4.1")

# Three-tier model routing — ML ensemble (local) → encoder-proxy (batch) → decoder (interactive)
LLM_MODEL_BATCH = os.getenv("LLM_MODEL_BATCH", "gpt-5.4-mini")          # Used during seed (analyze_supplier, detect_text_similarity)
LLM_MODEL_INTERACTIVE = os.getenv("LLM_MODEL_INTERACTIVE", "gpt-4.1")   # Used for AI Query, cluster analysis

# Database
_DEFAULT_DB_DIR = Path(__file__).resolve().parent / "db"
_DEFAULT_DB_DIR.mkdir(parents=True, exist_ok=True)
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{_DEFAULT_DB_DIR / 'sky_sentinel.db'}")

# Ensure parent directory exists for the SQLite file (handles /data/ in Docker)
if DATABASE_URL.startswith("sqlite"):
    _db_path = DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")
    try:
        Path(_db_path).parent.mkdir(parents=True, exist_ok=True)
    except OSError:
        pass  # /data may not be writable outside Docker; SQLAlchemy will error at connect time

# CMS API
CMS_API_BASE = os.getenv("CMS_API_BASE_URL", "https://data.cms.gov/data-api/v1/dataset")

# Known CMS dataset IDs (DME-related)
CMS_DATASETS = {
    "dme_by_supplier": "a2d56d3f-3531-4315-9d87-e29986516b41",
    "part_b_summary": "e4bbfb15-65e0-4474-b801-dcb4b1b41ba6",
}

# Server
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))
FRONTEND_PORT = int(os.getenv("FRONTEND_PORT", "5173"))
CORS_ORIGINS = [
    f"http://localhost:{FRONTEND_PORT}",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
