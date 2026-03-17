"""Sky Sentinel FastAPI application entry point."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.config import CORS_ORIGINS
from backend.db.database import init_db
from backend.auth import (
    LoginRequest, TokenResponse, authenticate_user, create_token,
    get_current_user,
)

app = FastAPI(
    title="Sky Sentinel API",
    description="AI-Augmented DME Fraud Detection for Medicare Program Integrity",
    version="1.0.0",
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


# --- Auth endpoints ---
@app.post("/api/auth/login", response_model=TokenResponse, tags=["Auth"])
def login(body: LoginRequest):
    user = authenticate_user(body.username, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_token(user)
    return TokenResponse(access_token=token, user=user)


@app.get("/api/auth/me", tags=["Auth"])
def get_me(user: dict = Depends(get_current_user)):
    return user


# --- Mount API routers ---
from backend.api import dashboard, suppliers, alerts, clusters, claims, investigation  # noqa: E402

app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(suppliers.router, prefix="/api/suppliers", tags=["Suppliers"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(clusters.router, prefix="/api/clusters", tags=["Clusters"])
app.include_router(claims.router, prefix="/api/claims", tags=["Claims"])
app.include_router(investigation.router, prefix="/api/investigation", tags=["Investigation"])


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "sky-sentinel"}


# --- Serve built frontend (production / Docker) ---
def _resolve_frontend_dist_dir() -> Optional[Path]:
    """Locate the built frontend for single-container and local smoke-test runs."""
    project_root = Path(__file__).resolve().parent.parent
    configured_dir = os.getenv("FRONTEND_DIST_DIR")

    candidates: list[Path] = []
    if configured_dir:
        configured_path = Path(configured_dir)
        if not configured_path.is_absolute():
            configured_path = project_root / configured_path
        candidates.append(configured_path)

    candidates.extend([
        project_root / "static",
        project_root / "dist",
    ])

    for candidate in candidates:
        resolved_candidate = candidate.resolve()
        if resolved_candidate.is_dir() and (resolved_candidate / "index.html").is_file():
            return resolved_candidate

    return None


_FRONTEND_DIST_DIR = _resolve_frontend_dist_dir()

if _FRONTEND_DIST_DIR is not None:
    assets_dir = _FRONTEND_DIST_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend-assets")

    @app.get("/", include_in_schema=False)
    async def spa_index():
        return FileResponse(_FRONTEND_DIST_DIR / "index.html")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        """Serve built assets directly and fall back to index.html for SPA routes."""
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")

        requested_path = (_FRONTEND_DIST_DIR / full_path).resolve()
        if requested_path.is_relative_to(_FRONTEND_DIST_DIR) and requested_path.is_file():
            return FileResponse(requested_path)

        if Path(full_path).suffix:
            raise HTTPException(status_code=404, detail="Not Found")

        return FileResponse(_FRONTEND_DIST_DIR / "index.html")
