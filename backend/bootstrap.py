"""Database bootstrap helpers for container startup."""
from pathlib import Path
from typing import Dict, Optional

from sqlalchemy import desc, func, or_

from backend.config import DATABASE_URL
from backend.data.seed_data import seed_database
from backend.db.database import SessionLocal, init_db
from backend.db.models import Alert, Claim, PeerGroup, Supplier, SupplierCluster, SupplierMetrics
from backend.services.llm_service import get_llm_provider, is_usable_llm_text


HIGH_RISK_NARRATIVE_THRESHOLD = 60.0
UNUSABLE_NARRATIVE_SQL_PATTERN = "%LLM analysis unavailable%"


def _resolve_sqlite_path(database_url: str) -> Optional[Path]:
    if not database_url.startswith("sqlite"):
        return None

    normalized_path = database_url.replace("sqlite:///", "", 1).replace("sqlite://", "", 1)
    if normalized_path in {"", ":memory:"}:
        return None

    return Path(normalized_path)


def _get_core_record_counts() -> Dict[str, int]:
    db = SessionLocal()
    try:
        return {
            "suppliers": db.query(Supplier).count(),
            "claims": db.query(Claim).count(),
            "alerts": db.query(Alert).count(),
        }
    finally:
        db.close()


def _is_effectively_empty(counts: Dict[str, int]) -> bool:
    return all(count == 0 for count in counts.values())


def _build_supplier_narrative_inputs(db, supplier: Supplier) -> tuple[dict, list, dict]:
    latest_metrics = (
        db.query(SupplierMetrics)
        .filter(SupplierMetrics.supplier_npi == supplier.npi)
        .order_by(desc(SupplierMetrics.period), desc(SupplierMetrics.id))
        .first()
    )
    peer_group = (
        db.query(PeerGroup)
        .filter(PeerGroup.state == supplier.state)
        .order_by(desc(PeerGroup.id))
        .first()
    )
    cluster = (
        db.query(SupplierCluster)
        .filter(SupplierCluster.supplier_npi == supplier.npi)
        .first()
    )

    supplier_data = {
        "npi": supplier.npi,
        "name": supplier.name,
        "state": supplier.state,
        "city": supplier.city,
        "specialty": supplier.specialty,
        "entity_type": supplier.entity_type,
        "enrollment_date": supplier.enrollment_date.isoformat() if supplier.enrollment_date else None,
    }

    if cluster:
        supplier_data["cluster_id"] = cluster.cluster_id

    if latest_metrics:
        supplier_data["latest_metrics"] = {
            "period": latest_metrics.period,
            "total_claims": latest_metrics.total_claims,
            "total_billed": latest_metrics.total_billed,
            "unique_beneficiaries": latest_metrics.unique_beneficiaries,
            "unique_hcpcs": latest_metrics.unique_hcpcs,
            "unique_referring_physicians": latest_metrics.unique_referring_physicians,
            "avg_billed_per_claim": latest_metrics.avg_billed_per_claim,
            "growth_rate": latest_metrics.growth_rate,
            "geographic_spread": latest_metrics.geographic_spread,
            "top_hcpcs_codes": latest_metrics.top_hcpcs_codes,
        }

    claims = (
        db.query(Claim)
        .filter(Claim.supplier_npi == supplier.npi)
        .order_by(desc(Claim.service_date), desc(Claim.id))
        .limit(10)
        .all()
    )
    claims_data = [
        {
            "claim_id": claim.claim_id,
            "service_date": claim.service_date.isoformat() if claim.service_date else None,
            "hcpcs": claim.hcpcs_code,
            "hcpcs_description": claim.hcpcs_description,
            "billed": claim.billed_amount,
            "allowed": claim.allowed_amount,
            "paid": claim.paid_amount,
            "diagnosis_codes": claim.diagnosis_codes,
            "referring_physician_npi": claim.referring_physician_npi,
            "narrative": claim.medical_necessity_text,
        }
        for claim in claims
    ]

    peer_baseline = {
        "peer_group": peer_group.name if peer_group else f"DME Suppliers — {supplier.state}",
        "state": supplier.state,
        "member_count": peer_group.member_count if peer_group else None,
        "avg_billed": peer_group.avg_billed if peer_group and peer_group.avg_billed is not None else 0,
        "avg_claims": peer_group.avg_claims if peer_group and peer_group.avg_claims is not None else None,
        "avg_beneficiaries": (
            peer_group.avg_beneficiaries
            if peer_group and peer_group.avg_beneficiaries is not None else None
        ),
        "median_growth_rate": (
            peer_group.median_growth_rate
            if peer_group and peer_group.median_growth_rate is not None else None
        ),
    }

    return supplier_data, claims_data, peer_baseline


def _repair_missing_alert_narratives() -> Dict[str, int]:
    db = SessionLocal()
    repair_counts = {
        "scanned": 0,
        "missing": 0,
        "repaired": 0,
        "failed": 0,
        "skipped": 0,
    }

    try:
        high_risk_query = db.query(Alert).filter(Alert.risk_score >= HIGH_RISK_NARRATIVE_THRESHOLD)
        repair_counts["scanned"] = high_risk_query.count()

        missing_alerts = (
            high_risk_query
            .filter(
                or_(
                    Alert.llm_narrative.is_(None),
                    func.trim(Alert.llm_narrative) == "",
                    Alert.llm_narrative.like(UNUSABLE_NARRATIVE_SQL_PATTERN),
                )
            )
            .order_by(desc(Alert.risk_score), desc(Alert.created_at), desc(Alert.id))
            .all()
        )
        repair_counts["missing"] = len(missing_alerts)

        if not missing_alerts:
            return repair_counts

        alerts_by_supplier = {}
        for alert in missing_alerts:
            alerts_by_supplier.setdefault(alert.supplier_npi, []).append(alert)

        llm = get_llm_provider(tier='batch')

        for supplier_npi, supplier_alerts in alerts_by_supplier.items():
            supplier = db.query(Supplier).filter(Supplier.npi == supplier_npi).first()
            if not supplier:
                repair_counts["skipped"] += len(supplier_alerts)
                continue

            try:
                supplier_data, claims_data, peer_baseline = _build_supplier_narrative_inputs(db, supplier)
                narrative = llm.analyze_supplier(supplier_data, claims_data, peer_baseline)
            except Exception as exc:
                repair_counts["failed"] += len(supplier_alerts)
                print(
                    f"[Bootstrap] Narrative repair failed for supplier {supplier_npi}: "
                    f"{str(exc)[:160]}"
                )
                continue

            if not is_usable_llm_text(narrative):
                repair_counts["failed"] += len(supplier_alerts)
                print(
                    f"[Bootstrap] Narrative repair produced unusable content for supplier "
                    f"{supplier_npi}."
                )
                continue

            try:
                normalized_narrative = narrative.strip()
                for alert in supplier_alerts:
                    alert.llm_narrative = normalized_narrative
                db.commit()
                repair_counts["repaired"] += len(supplier_alerts)
            except Exception as exc:
                db.rollback()
                repair_counts["failed"] += len(supplier_alerts)
                print(
                    f"[Bootstrap] Narrative repair persistence failed for supplier {supplier_npi}: "
                    f"{str(exc)[:160]}"
                )

        return repair_counts
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def bootstrap_database() -> bool:
    """Create tables and seed only when the database is absent or empty."""
    sqlite_path = _resolve_sqlite_path(DATABASE_URL)
    sqlite_exists = bool(
        sqlite_path is not None
        and sqlite_path.exists()
        and sqlite_path.stat().st_size > 0
    )

    init_db()
    counts = _get_core_record_counts()

    seeded = False

    if _is_effectively_empty(counts):
        state = "effectively empty" if sqlite_exists else "absent"
        print(f"[Bootstrap] Database is {state}; running initial seed...")
        seed_database()
        seeded = True
    else:
        print(
            "[Bootstrap] Existing database detected; "
            f"suppliers={counts['suppliers']}, claims={counts['claims']}, alerts={counts['alerts']}. "
            "Skipping seed."
        )

    try:
        repair_counts = _repair_missing_alert_narratives()
        print(
            "[Bootstrap] Narrative repair scan: "
            f"high_risk_alerts={repair_counts['scanned']}, missing={repair_counts['missing']}."
        )
        print(
            "[Bootstrap] Narrative repair results: "
            f"repaired={repair_counts['repaired']}, failed={repair_counts['failed']}, "
            f"skipped={repair_counts['skipped']}."
        )
    except Exception as exc:
        print(f"[Bootstrap] Narrative repair skipped after error: {str(exc)[:160]}")

    return seeded


if __name__ == "__main__":
    seeded = bootstrap_database()
    print(f"[Bootstrap] Seed {'completed' if seeded else 'not required'}.")
