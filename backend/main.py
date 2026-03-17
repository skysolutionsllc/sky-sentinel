"""Sky Sentinel FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import CORS_ORIGINS
from backend.db.database import init_db

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
