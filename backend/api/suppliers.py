"""Supplier endpoints — list, detail, peers, timeline."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.db.database import get_db
from backend.db.models import (
    Supplier, AnomalyScore, Alert, Claim, SupplierMetrics, SupplierCluster
)

router = APIRouter()


@router.get("")
def list_suppliers(
    risk_level: str = Query(None),
    state: str = Query(None),
    limit: int = Query(50),
    offset: int = Query(0),
    sort_by: str = Query("risk_score"),
    db: Session = Depends(get_db),
):
    """List suppliers with risk scores, filterable."""
    q = (
        db.query(Supplier, AnomalyScore)
        .outerjoin(AnomalyScore, AnomalyScore.supplier_npi == Supplier.npi)
    )

    if risk_level:
        q = q.filter(AnomalyScore.risk_level == risk_level)
    if state:
        q = q.filter(Supplier.state == state)

    if sort_by == "risk_score":
        q = q.order_by(desc(AnomalyScore.composite_score))
    else:
        q = q.order_by(Supplier.name)

    total = q.count()
    rows = q.offset(offset).limit(limit).all()

    return {
        "total": total,
        "suppliers": [
            {
                "npi": s.npi,
                "name": s.name,
                "state": s.state,
                "city": s.city,
                "specialty": s.specialty,
                "entity_type": s.entity_type,
                "risk_score": round(a.composite_score, 1) if a else 0,
                "risk_level": a.risk_level if a else "low",
            }
            for s, a in rows
        ],
    }


@router.get("/{npi}")
def supplier_detail(npi: str, db: Session = Depends(get_db)):
    """Full supplier drill-down."""
    supplier = db.query(Supplier).filter(Supplier.npi == npi).first()
    if not supplier:
        return {"error": "Supplier not found"}

    score = (
        db.query(AnomalyScore)
        .filter(AnomalyScore.supplier_npi == npi)
        .order_by(desc(AnomalyScore.computed_at))
        .first()
    )

    alert = (
        db.query(Alert)
        .filter(Alert.supplier_npi == npi)
        .order_by(desc(Alert.created_at))
        .first()
    )

    recent_claims = (
        db.query(Claim)
        .filter(Claim.supplier_npi == npi)
        .order_by(desc(Claim.service_date))
        .limit(20)
        .all()
    )

    cluster = (
        db.query(SupplierCluster)
        .filter(SupplierCluster.supplier_npi == npi)
        .first()
    )

    return {
        "supplier": {
            "npi": supplier.npi,
            "name": supplier.name,
            "state": supplier.state,
            "city": supplier.city,
            "specialty": supplier.specialty,
            "entity_type": supplier.entity_type,
            "enrollment_date": supplier.enrollment_date.isoformat() if supplier.enrollment_date else None,
        },
        "risk_score": {
            "composite": round(score.composite_score, 1) if score else 0,
            "risk_level": score.risk_level if score else "low",
            "factors": {
                "billing_volume": round(score.billing_volume_score, 1) if score else 0,
                "growth_rate": round(score.growth_rate_score, 1) if score else 0,
                "hcpcs_mix": round(score.hcpcs_mix_score, 1) if score else 0,
                "geographic_spread": round(score.geographic_spread_score, 1) if score else 0,
                "llm_context": round(score.llm_context_score, 1) if score else 0,
                "cluster_association": round(score.cluster_association_score, 1) if score else 0,
            },
        } if score else None,
        "alert": {
            "id": alert.id,
            "title": alert.title,
            "summary": alert.summary,
            "llm_narrative": alert.llm_narrative,
            "top_reasons": alert.top_reasons,
            "evidence": alert.evidence,
            "status": alert.status,
        } if alert else None,
        "cluster_id": cluster.cluster_id if cluster else None,
        "recent_claims": [
            {
                "claim_id": c.claim_id,
                "hcpcs_code": c.hcpcs_code,
                "hcpcs_description": c.hcpcs_description,
                "billed_amount": c.billed_amount,
                "service_date": c.service_date.isoformat() if c.service_date else None,
                "status": c.status,
                "medical_necessity_text": c.medical_necessity_text,
            }
            for c in recent_claims
        ],
    }


@router.get("/{npi}/timeline")
def supplier_timeline(npi: str, db: Session = Depends(get_db)):
    """Time-series billing data for trend charts."""
    metrics = (
        db.query(SupplierMetrics)
        .filter(SupplierMetrics.supplier_npi == npi)
        .order_by(SupplierMetrics.period)
        .all()
    )
    return [
        {
            "period": m.period,
            "total_claims": m.total_claims,
            "total_billed": round(m.total_billed, 2),
            "unique_beneficiaries": m.unique_beneficiaries,
            "growth_rate": round(m.growth_rate, 1) if m.growth_rate else None,
        }
        for m in metrics
    ]


@router.get("/{npi}/peers")
def supplier_peers(npi: str, db: Session = Depends(get_db)):
    """Peer comparison data — same specialty + state suppliers."""
    supplier = db.query(Supplier).filter(Supplier.npi == npi).first()
    if not supplier:
        return {"error": "Supplier not found"}

    peers = (
        db.query(Supplier, AnomalyScore)
        .outerjoin(AnomalyScore, AnomalyScore.supplier_npi == Supplier.npi)
        .filter(Supplier.state == supplier.state)
        .filter(Supplier.npi != npi)
        .order_by(desc(AnomalyScore.composite_score))
        .limit(10)
        .all()
    )

    return {
        "peer_group": f"{supplier.specialty or 'DME'} — {supplier.state}",
        "peers": [
            {
                "npi": s.npi,
                "name": s.name,
                "risk_score": round(a.composite_score, 1) if a else 0,
                "risk_level": a.risk_level if a else "low",
            }
            for s, a in peers
        ],
    }
