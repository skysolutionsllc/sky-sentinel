"""Cluster detection endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.db.database import get_db
from backend.db.models import SupplierCluster, Supplier, AnomalyScore, Alert

router = APIRouter()


@router.get("")
def list_clusters(db: Session = Depends(get_db)):
    """All detected clusters with aggregate info."""
    cluster_ids = (
        db.query(SupplierCluster.cluster_id)
        .distinct()
        .all()
    )

    clusters = []
    for (cid,) in cluster_ids:
        members = (
            db.query(SupplierCluster, Supplier, AnomalyScore)
            .join(Supplier, SupplierCluster.supplier_npi == Supplier.npi)
            .outerjoin(AnomalyScore, AnomalyScore.supplier_npi == Supplier.npi)
            .filter(SupplierCluster.cluster_id == cid)
            .all()
        )

        if not members:
            continue

        avg_risk = sum(
            a.composite_score for _, _, a in members if a
        ) / max(len([m for m in members if m[2]]), 1)

        first_cluster = members[0][0]
        shared = first_cluster.shared_attributes or {}

        # Get the cluster-level alert if exists
        cluster_alert = (
            db.query(Alert)
            .filter(Alert.alert_type == "cluster")
            .filter(Alert.supplier_npi == members[0][1].npi)
            .first()
        )

        clusters.append({
            "cluster_id": cid,
            "member_count": len(members),
            "avg_risk_score": round(avg_risk, 1),
            "cluster_risk_score": round(first_cluster.cluster_risk_score or avg_risk, 1),
            "shared_attributes": shared,
            "llm_narrative": cluster_alert.llm_narrative if cluster_alert else None,
            "members": [
                {
                    "npi": s.npi,
                    "name": s.name,
                    "state": s.state,
                    "risk_score": round(a.composite_score, 1) if a else 0,
                    "risk_level": a.risk_level if a else "low",
                }
                for _, s, a in members
            ],
        })

    return {"clusters": sorted(clusters, key=lambda c: c["cluster_risk_score"], reverse=True)}


@router.get("/{cluster_id}")
def cluster_detail(cluster_id: int, db: Session = Depends(get_db)):
    """Detailed cluster view with member drill-down."""
    members = (
        db.query(SupplierCluster, Supplier, AnomalyScore)
        .join(Supplier, SupplierCluster.supplier_npi == Supplier.npi)
        .outerjoin(AnomalyScore, AnomalyScore.supplier_npi == Supplier.npi)
        .filter(SupplierCluster.cluster_id == cluster_id)
        .all()
    )

    if not members:
        return {"error": "Cluster not found"}

    first_cluster = members[0][0]

    return {
        "cluster_id": cluster_id,
        "member_count": len(members),
        "cluster_risk_score": round(first_cluster.cluster_risk_score or 0, 1),
        "shared_attributes": first_cluster.shared_attributes,
        "members": [
            {
                "npi": s.npi,
                "name": s.name,
                "state": s.state,
                "city": s.city,
                "specialty": s.specialty,
                "enrollment_date": s.enrollment_date.isoformat() if s.enrollment_date else None,
                "risk_score": round(a.composite_score, 1) if a else 0,
                "risk_level": a.risk_level if a else "low",
            }
            for _, s, a in members
        ],
    }
