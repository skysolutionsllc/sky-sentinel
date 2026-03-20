"""Cluster detection endpoints."""
import re
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.db.database import get_db
from backend.db.models import SupplierCluster, Supplier, AnomalyScore, Alert
from backend.services.llm_service import is_usable_llm_text

router = APIRouter()


def _narrative_snippet(text: str, sentence_limit: int = 2) -> str:
    cleaned = re.sub(r"#+\s*", "", text or "")
    cleaned = cleaned.replace("**", "").replace("`", "")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    if not cleaned:
        return ""

    sentences = re.findall(r"[^.!?]+[.!?]+", cleaned)
    if sentences:
        return " ".join(sentence.strip() for sentence in sentences[:sentence_limit]).strip()

    return cleaned[:220] + ("…" if len(cleaned) > 220 else "")


def _aggregate_cluster_narrative(db: Session, members: list[tuple], shared_attributes: Optional[dict]):
    if not members:
        return None

    member_npis = [supplier.npi for _, supplier, _ in members]
    member_lookup = {supplier.npi: supplier for _, supplier, _ in members}
    shared = shared_attributes or {}

    cluster_alerts = (
        db.query(Alert)
        .filter(Alert.supplier_npi.in_(member_npis))
        .order_by(Alert.supplier_npi, desc(Alert.created_at), desc(Alert.id))
        .all()
    )

    narratives_by_npi = {}
    for alert in cluster_alerts:
        narrative = (alert.llm_narrative or "").strip()
        if is_usable_llm_text(narrative) and alert.supplier_npi not in narratives_by_npi:
            narratives_by_npi[alert.supplier_npi] = narrative

    if not narratives_by_npi:
        return None

    coordination_signals = []
    shared_hcpcs = shared.get("shared_hcpcs") or []
    if shared_hcpcs:
        coordination_signals.append(
            f"Shared HCPCS concentration across the cluster: {', '.join(shared_hcpcs[:5])}."
        )
    if shared.get("growth_sync"):
        coordination_signals.append("Multiple members show synchronized billing growth spikes.")
    if shared.get("geo_overlap"):
        coordination_signals.append("Members exhibit overlapping geographic reach patterns.")
    if not coordination_signals:
        coordination_signals.append(
            "Member narratives and anomaly signals show overlapping DME billing behaviors."
        )

    states = sorted({supplier.state for _, supplier, _ in members if supplier.state})
    member_evidence = "\n".join(
        f"- **{member_lookup[npi].name}** ({npi}, {member_lookup[npi].state}) — "
        f"{_narrative_snippet(narratives_by_npi[npi])}"
        for npi in member_npis
        if npi in narratives_by_npi
    )

    geography = f" across {', '.join(states)}" if states else ""
    return (
        "## Coordinated Pattern Summary\n\n"
        "### Cluster Overview\n"
        f"This cluster links {len(member_npis)} suppliers{geography}. "
        "The combined supplier narratives and DBSCAN signals indicate coordinated billing "
        "behavior rather than isolated outliers.\n\n"
        "### Coordination Signals\n"
        + "\n".join(f"- {signal}" for signal in coordination_signals)
        + "\n\n### Member Evidence\n"
        + member_evidence
        + "\n\n### Recommended Actions\n"
        + "1. Review common ownership, incorporators, or registered agents across members\n"
        + "2. Compare shared HCPCS ordering patterns and beneficiary geography across the network\n"
        + "3. Escalate the highest-risk members for claim-level review while preserving the full cluster context"
    )


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

        combined_narrative = _aggregate_cluster_narrative(db, members, shared)

        clusters.append({
            "cluster_id": cid,
            "member_count": len(members),
            "avg_risk_score": round(avg_risk, 1),
            "cluster_risk_score": round(first_cluster.cluster_risk_score or avg_risk, 1),
            "shared_attributes": shared,
            "llm_narrative": combined_narrative,
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
        "llm_narrative": _aggregate_cluster_narrative(db, members, first_cluster.shared_attributes),
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
