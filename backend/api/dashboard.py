"""Dashboard aggregate endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.db.database import get_db
from backend.db.models import Alert, Supplier, Claim, SupplierCluster, AnomalyScore

router = APIRouter()


@router.get("/stats")
def dashboard_stats(db: Session = Depends(get_db)):
    """Top-level dashboard statistics."""
    total_alerts = db.query(Alert).count()
    critical = db.query(Alert).filter(Alert.risk_level == "critical").count()
    high = db.query(Alert).filter(Alert.risk_level == "high").count()
    medium = db.query(Alert).filter(Alert.risk_level == "medium").count()
    low = db.query(Alert).filter(Alert.risk_level == "low").count()
    new_alerts = db.query(Alert).filter(Alert.status == "new").count()
    total_claims = db.query(Claim).count()
    flagged_claims = db.query(Claim).filter(Claim.status == "flagged").count()
    total_suppliers = db.query(Supplier).count()
    clusters = db.query(func.count(func.distinct(SupplierCluster.cluster_id))).scalar() or 0

    return {
        "total_alerts": total_alerts,
        "risk_distribution": {
            "critical": critical,
            "high": high,
            "medium": medium,
            "low": low,
        },
        "new_alerts": new_alerts,
        "total_claims": total_claims,
        "flagged_claims": flagged_claims,
        "total_suppliers": total_suppliers,
        "active_clusters": clusters,
    }


@router.get("/geo-risk")
def geo_risk(db: Session = Depends(get_db)):
    """State-level risk aggregation for heatmap."""
    rows = (
        db.query(
            Supplier.state,
            func.count(Alert.id).label("alert_count"),
            func.avg(Alert.risk_score).label("avg_risk"),
            func.count(Supplier.npi).label("supplier_count"),
        )
        .join(Alert, Alert.supplier_npi == Supplier.npi, isouter=True)
        .group_by(Supplier.state)
        .all()
    )
    return [
        {
            "state": r.state,
            "alert_count": r.alert_count,
            "avg_risk": round(r.avg_risk, 1) if r.avg_risk else 0,
            "supplier_count": r.supplier_count,
        }
        for r in rows
    ]


@router.get("/trends")
def trends(db: Session = Depends(get_db)):
    """Monthly trends for the dashboard charts."""
    rows = (
        db.query(
            func.strftime("%Y-%m", Claim.service_date).label("month"),
            func.count(Claim.id).label("total_claims"),
            func.sum(Claim.billed_amount).label("total_billed"),
            func.count(
                func.nullif(Claim.status != "flagged", True)
            ).label("flagged_count"),
        )
        .group_by("month")
        .order_by("month")
        .all()
    )
    return [
        {
            "month": r.month,
            "total_claims": r.total_claims,
            "total_billed": round(r.total_billed or 0, 2),
            "flagged_count": r.flagged_count,
        }
        for r in rows
    ]


@router.get("/hcpcs-distribution")
def hcpcs_distribution(db: Session = Depends(get_db)):
    """Top HCPCS codes by claim volume and amount."""
    rows = (
        db.query(
            Claim.hcpcs_code,
            Claim.hcpcs_description,
            func.count(Claim.id).label("claim_count"),
            func.sum(Claim.billed_amount).label("total_billed"),
        )
        .group_by(Claim.hcpcs_code, Claim.hcpcs_description)
        .order_by(func.sum(Claim.billed_amount).desc())
        .limit(10)
        .all()
    )
    return [
        {
            "code": r.hcpcs_code,
            "description": r.hcpcs_description or r.hcpcs_code,
            "claim_count": r.claim_count,
            "total_billed": round(r.total_billed or 0, 2),
        }
        for r in rows
    ]
