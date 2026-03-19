"""Investigation endpoints — pattern builder, hypothesis testing, AI query."""
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional, List
from datetime import datetime
from backend.db.database import get_db
from backend.db.models import (
    PatternDefinition, Supplier, AnomalyScore, SupplierMetrics,
    QueryHistory, Alert, SupplierCluster
)

router = APIRouter()


class PatternRequest(BaseModel):
    name: str
    growth_rate_min: Optional[float] = None
    billing_volume_min: Optional[float] = None
    risk_score_min: Optional[float] = None
    states: Optional[List[str]] = None
    hcpcs_codes: Optional[List[str]] = None
    enrollment_months_max: Optional[int] = None
    created_by: str = "Investigator"


class QueryRequest(BaseModel):
    query: str


class ThresholdTestRequest(BaseModel):
    billing_volume_weight: float = 20.0
    growth_rate_weight: float = 20.0
    hcpcs_mix_weight: float = 15.0
    geographic_spread_weight: float = 15.0
    llm_context_weight: float = 15.0
    cluster_association_weight: float = 15.0
    risk_threshold: float = 50.0


@router.post("/patterns")
def create_pattern(req: PatternRequest, db: Session = Depends(get_db)):
    """Create an investigator-defined detection pattern."""
    criteria = {
        "growth_rate_min": req.growth_rate_min,
        "billing_volume_min": req.billing_volume_min,
        "risk_score_min": req.risk_score_min,
        "states": req.states,
        "hcpcs_codes": req.hcpcs_codes,
        "enrollment_months_max": req.enrollment_months_max,
    }

    pattern = PatternDefinition(
        name=req.name,
        criteria={k: v for k, v in criteria.items() if v is not None},
        created_by=req.created_by,
    )
    db.add(pattern)
    db.commit()
    db.refresh(pattern)

    # Run the pattern against current data
    matches = _run_pattern(pattern.criteria, db)
    pattern.match_count = len(matches)
    db.commit()

    return {
        "pattern_id": pattern.id,
        "name": pattern.name,
        "match_count": len(matches),
        "matches": matches[:20],
    }


@router.post("/patterns/{pattern_id}/test")
def test_pattern(pattern_id: int, db: Session = Depends(get_db)):
    """Re-run an existing pattern."""
    pattern = db.query(PatternDefinition).filter(PatternDefinition.id == pattern_id).first()
    if not pattern:
        return {"error": "Pattern not found"}

    matches = _run_pattern(pattern.criteria, db)
    pattern.match_count = len(matches)
    db.commit()

    return {
        "pattern_id": pattern.id,
        "match_count": len(matches),
        "matches": matches[:50],
    }


@router.get("/patterns")
def list_patterns(db: Session = Depends(get_db)):
    """List all saved patterns."""
    patterns = db.query(PatternDefinition).order_by(PatternDefinition.created_at.desc()).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "criteria": p.criteria,
            "match_count": p.match_count,
            "created_by": p.created_by,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in patterns
    ]


@router.post("/threshold-test")
def threshold_test(req: ThresholdTestRequest, db: Session = Depends(get_db)):
    """What-if threshold test — recompute alert population with new weights."""
    scores = db.query(AnomalyScore, Supplier).join(
        Supplier, AnomalyScore.supplier_npi == Supplier.npi
    ).all()

    total_weight = (
        req.billing_volume_weight + req.growth_rate_weight +
        req.hcpcs_mix_weight + req.geographic_spread_weight +
        req.llm_context_weight + req.cluster_association_weight
    )

    results = []
    for score, supplier in scores:
        new_composite = (
            (score.billing_volume_score * req.billing_volume_weight +
             score.growth_rate_score * req.growth_rate_weight +
             score.hcpcs_mix_score * req.hcpcs_mix_weight +
             score.geographic_spread_score * req.geographic_spread_weight +
             score.llm_context_score * req.llm_context_weight +
             score.cluster_association_score * req.cluster_association_weight)
            / total_weight
        )

        if new_composite >= req.risk_threshold:
            results.append({
                "npi": supplier.npi,
                "name": supplier.name,
                "state": supplier.state,
                "original_score": round(score.composite_score, 1),
                "new_score": round(new_composite, 1),
                "risk_level": _risk_level(new_composite),
            })

    results.sort(key=lambda x: x["new_score"], reverse=True)

    return {
        "threshold": req.risk_threshold,
        "total_flagged": len(results),
        "results": results[:50],
    }


@router.post("/query")
def ai_query(req: QueryRequest, request: Request, db: Session = Depends(get_db)):
    """Natural language query processed by LLM."""
    from backend.services.llm_service import get_llm_provider

    provider_name = request.headers.get("x-llm-provider")
    model_name = request.headers.get("x-llm-model")
    api_key = request.headers.get("x-llm-api-key")

    provider = get_llm_provider(
        provider_name=provider_name,
        model=model_name,
        api_key=api_key,
        tier='interactive',  # Premium model for user-facing queries
    )

    # Build context from database
    from sqlalchemy import func
    stats = {
        "total_suppliers": db.query(Supplier).count(),
        "total_flagged": db.query(AnomalyScore).filter(AnomalyScore.composite_score >= 50).count(),
        "states_with_alerts": [
            r[0] for r in db.query(Supplier.state).join(
                AnomalyScore, AnomalyScore.supplier_npi == Supplier.npi
            ).filter(AnomalyScore.composite_score >= 50).distinct().all()
        ],
    }

    # Get top flagged suppliers with full scoring details
    top_flagged = (
        db.query(Supplier, AnomalyScore)
        .join(AnomalyScore, AnomalyScore.supplier_npi == Supplier.npi)
        .order_by(AnomalyScore.composite_score.desc())
        .limit(20)
        .all()
    )

    # Get cluster info for flagged suppliers
    cluster_npis = [s.npi for s, _ in top_flagged]
    clusters = db.query(SupplierCluster).filter(
        SupplierCluster.supplier_npi.in_(cluster_npis)
    ).all()
    cluster_map = {c.supplier_npi: c.cluster_id for c in clusters}

    # Get alert evidence for flagged suppliers
    alerts = db.query(Alert).filter(
        Alert.supplier_npi.in_(cluster_npis)
    ).all()
    alert_map = {a.supplier_npi: {
        "top_reasons": a.top_reasons,
        "evidence": a.evidence,
        "alert_type": a.alert_type,
    } for a in alerts}

    # State-level risk summary
    state_risk = db.query(
        Supplier.state,
        func.count(Supplier.npi).label("count"),
        func.avg(AnomalyScore.composite_score).label("avg_risk"),
    ).join(
        AnomalyScore, AnomalyScore.supplier_npi == Supplier.npi
    ).filter(
        AnomalyScore.composite_score >= 50
    ).group_by(Supplier.state).order_by(func.avg(AnomalyScore.composite_score).desc()).all()

    context = {
        "stats": stats,
        "top_suppliers": [
            {
                "npi": s.npi, "name": s.name, "state": s.state,
                "risk_score": round(a.composite_score, 1),
                "risk_level": a.risk_level,
                "scoring_factors": {
                    "billing_volume": round(a.billing_volume_score, 1),
                    "growth_rate": round(a.growth_rate_score, 1),
                    "hcpcs_mix": round(a.hcpcs_mix_score, 1),
                    "geographic_spread": round(a.geographic_spread_score, 1),
                    "llm_context": round(a.llm_context_score, 1),
                    "cluster_association": round(a.cluster_association_score, 1),
                },
                "cluster_id": cluster_map.get(s.npi),
                "alert_info": alert_map.get(s.npi),
            }
            for s, a in top_flagged
        ],
        "state_risk_summary": [
            {"state": st, "flagged_count": cnt, "avg_risk": round(avg, 1)}
            for st, cnt, avg in state_risk
        ],
    }

    response = provider.process_query(req.query, context)

    # Log the query
    log = QueryHistory(
        query_text=req.query,
        response_text=response,
        query_type="analysis",
    )
    db.add(log)
    db.commit()

    return {
        "query": req.query,
        "response": response,
    }


@router.get("/query-history")
def query_history(db: Session = Depends(get_db)):
    """Recent query history."""
    queries = db.query(QueryHistory).order_by(QueryHistory.created_at.desc()).limit(20).all()
    return [
        {
            "id": q.id,
            "query": q.query_text,
            "response": q.response_text,
            "created_at": q.created_at.isoformat() if q.created_at else None,
        }
        for q in queries
    ]


def _run_pattern(criteria: dict, db: Session) -> list:
    """Execute a pattern against the supplier database — all 6 criteria."""
    from datetime import datetime, timedelta

    q = db.query(Supplier, AnomalyScore).outerjoin(
        AnomalyScore, AnomalyScore.supplier_npi == Supplier.npi
    )

    if criteria.get("risk_score_min"):
        q = q.filter(AnomalyScore.composite_score >= criteria["risk_score_min"])
    if criteria.get("states"):
        q = q.filter(Supplier.state.in_(criteria["states"]))
    if criteria.get("enrollment_months_max"):
        cutoff = datetime.utcnow() - timedelta(days=30 * criteria["enrollment_months_max"])
        q = q.filter(Supplier.enrollment_date >= cutoff)

    results = q.all()
    matches = []
    for supplier, score in results:
        # Additional per-row filtering against metrics
        if criteria.get("growth_rate_min") or criteria.get("billing_volume_min") or criteria.get("hcpcs_codes"):
            from backend.db.models import SupplierMetrics, Claim
            m = (
                db.query(SupplierMetrics)
                .filter(SupplierMetrics.supplier_npi == supplier.npi)
                .order_by(SupplierMetrics.period.desc())
                .first()
            )

            if criteria.get("growth_rate_min"):
                if not m or (m.growth_rate or 0) < criteria["growth_rate_min"]:
                    continue

            if criteria.get("billing_volume_min"):
                if not m or (m.total_billed or 0) < criteria["billing_volume_min"]:
                    continue

            if criteria.get("hcpcs_codes"):
                supplier_codes = [
                    r[0] for r in
                    db.query(Claim.hcpcs_code)
                    .filter(Claim.supplier_npi == supplier.npi)
                    .distinct()
                    .all()
                ]
                if not any(c in supplier_codes for c in criteria["hcpcs_codes"]):
                    continue

        matches.append({
            "npi": supplier.npi,
            "name": supplier.name,
            "state": supplier.state,
            "risk_score": round(score.composite_score, 1) if score else 0,
        })

    return matches


def _risk_level(score: float) -> str:
    if score >= 80:
        return "critical"
    if score >= 60:
        return "high"
    if score >= 40:
        return "medium"
    return "low"
