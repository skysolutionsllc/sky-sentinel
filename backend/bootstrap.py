"""Database bootstrap helpers for container startup."""
from __future__ import annotations

import argparse
import fcntl
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Dict, Optional

from sqlalchemy import desc, func, or_

from backend.config import DATABASE_URL
from backend.db.database import SessionLocal, init_db
from backend.db.models import Alert, Claim, PeerGroup, Supplier, SupplierCluster, SupplierMetrics
from backend.services.llm_service import get_llm_provider, is_usable_llm_text


HIGH_RISK_NARRATIVE_THRESHOLD = 60.0
UNUSABLE_NARRATIVE_SQL_PATTERN = "%LLM analysis unavailable%"
AUTO_BOOTSTRAP_ENV = "SKY_SENTINEL_AUTO_BOOTSTRAP"
BOOTSTRAP_LOCK_PATH_ENV = "SKY_SENTINEL_BOOTSTRAP_LOCK_FILE"
BOOTSTRAP_STATE_PATH_ENV = "SKY_SENTINEL_BOOTSTRAP_STATE_FILE"
SEED_STATE_INCOMPLETE = "seed_incomplete"
SEED_STATE_COMPLETE = "seed_complete"


def _resolve_sqlite_path(database_url: str) -> Optional[Path]:
    if not database_url.startswith("sqlite"):
        return None

    normalized_path = database_url.replace("sqlite:///", "", 1).replace("sqlite://", "", 1)
    if normalized_path in {"", ":memory:"}:
        return None

    return Path(normalized_path)


def _env_flag_enabled(name: str, default: str = "0") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}


def _resolve_bootstrap_artifact_path(*, env_var: str, suffix: str) -> Path:
    configured_path = os.getenv(env_var)
    if configured_path:
        return Path(configured_path)

    sqlite_path = _resolve_sqlite_path(DATABASE_URL)
    if sqlite_path is not None:
        stem = sqlite_path.stem or "sky_sentinel"
        return sqlite_path.parent / f".{stem}.bootstrap.{suffix}"

    return Path(tempfile.gettempdir()) / f"sky-sentinel.bootstrap.{suffix}"


def _resolve_bootstrap_lock_path() -> Path:
    return _resolve_bootstrap_artifact_path(
        env_var=BOOTSTRAP_LOCK_PATH_ENV,
        suffix="lock",
    )


def _resolve_bootstrap_state_path() -> Path:
    return _resolve_bootstrap_artifact_path(
        env_var=BOOTSTRAP_STATE_PATH_ENV,
        suffix="state",
    )


def _read_seed_state() -> str:
    state_path = _resolve_bootstrap_state_path()
    try:
        return state_path.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        return ""


def _write_seed_state(state: str) -> None:
    state_path = _resolve_bootstrap_state_path()
    state_path.parent.mkdir(parents=True, exist_ok=True)
    state_path.write_text(f"{state}\n", encoding="utf-8")


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


def prepare_runtime() -> Dict[str, int]:
    """Create schema quickly and return the current core table counts."""
    init_db()
    return _get_core_record_counts()


def _is_effectively_empty(counts: Dict[str, int]) -> bool:
    return all(count == 0 for count in counts.values())


def _has_missing_alert_narratives() -> bool:
    db = SessionLocal()
    try:
        return (
            db.query(Alert.id)
            .filter(Alert.risk_score >= HIGH_RISK_NARRATIVE_THRESHOLD)
            .filter(
                or_(
                    Alert.llm_narrative.is_(None),
                    func.trim(Alert.llm_narrative) == "",
                    Alert.llm_narrative.like(UNUSABLE_NARRATIVE_SQL_PATTERN),
                )
            )
            .first()
            is not None
        )
    finally:
        db.close()


def should_run_bootstrap(counts: Optional[Dict[str, int]] = None) -> bool:
    """Return True when startup should launch the background bootstrap worker."""
    current_counts = counts if counts is not None else prepare_runtime()

    if _is_effectively_empty(current_counts):
        return True

    if _read_seed_state() == SEED_STATE_INCOMPLETE:
        return True

    return _has_missing_alert_narratives()


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


def _run_initial_seed(reason: str) -> None:
    print(reason)
    _write_seed_state(SEED_STATE_INCOMPLETE)

    try:
        from backend.data.seed_data import seed_database

        seed_database()
    except Exception:
        _write_seed_state(SEED_STATE_INCOMPLETE)
        raise
    else:
        _write_seed_state(SEED_STATE_COMPLETE)


def bootstrap_database() -> bool:
    """Create schema quickly, seed when needed, and repair narratives."""
    sqlite_path = _resolve_sqlite_path(DATABASE_URL)
    sqlite_exists = bool(
        sqlite_path is not None
        and sqlite_path.exists()
        and sqlite_path.stat().st_size > 0
    )

    counts = prepare_runtime()
    seed_state = _read_seed_state()

    seeded = False

    if _is_effectively_empty(counts):
        state = "effectively empty" if sqlite_exists else "absent"
        _run_initial_seed(f"[Bootstrap] Database is {state}; running initial seed...")
        seeded = True
    elif seed_state == SEED_STATE_INCOMPLETE:
        _run_initial_seed("[Bootstrap] Previous bootstrap did not finish; rerunning initial seed...")
        seeded = True
    else:
        print(
            "[Bootstrap] Existing database detected; "
            f"suppliers={counts['suppliers']}, claims={counts['claims']}, alerts={counts['alerts']}. "
            "Skipping seed."
        )
        if all(count > 0 for count in counts.values()):
            _write_seed_state(SEED_STATE_COMPLETE)

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


def run_bootstrap_with_lock() -> bool:
    """Run bootstrap work once, guarded by an inter-process file lock."""
    lock_path = _resolve_bootstrap_lock_path()
    lock_path.parent.mkdir(parents=True, exist_ok=True)

    with lock_path.open("a+", encoding="utf-8") as lock_file:
        try:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print(
                "[Bootstrap] Another bootstrap worker is already running; "
                f"skipping duplicate launch ({lock_path})."
            )
            return False

        lock_file.seek(0)
        lock_file.truncate()
        lock_file.write(f"{os.getpid()}\n")
        lock_file.flush()
        os.fsync(lock_file.fileno())

        seeded = bootstrap_database()
        print(f"[Bootstrap] Seed {'completed' if seeded else 'not required'}.")
        return seeded


def launch_background_bootstrap_if_enabled(
    counts: Optional[Dict[str, int]] = None,
) -> Optional[subprocess.Popen]:
    """Launch the background bootstrap worker when runtime policy requires it."""
    if not _env_flag_enabled(AUTO_BOOTSTRAP_ENV):
        return None

    if not should_run_bootstrap(counts):
        return None

    process = subprocess.Popen([sys.executable, "-m", "backend.bootstrap", "--run-with-lock"])
    print(f"[Bootstrap] Background bootstrap launched (pid={process.pid}).")
    return process


def _build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Sky Sentinel bootstrap helpers")
    parser.add_argument(
        "--prepare-runtime",
        action="store_true",
        help="Create the schema quickly without running seed or repair work.",
    )
    parser.add_argument(
        "--run-with-lock",
        action="store_true",
        help="Run seed/repair work once under the bootstrap lock.",
    )
    return parser


def main() -> None:
    args = _build_arg_parser().parse_args()

    if args.prepare_runtime:
        counts = prepare_runtime()
        print(
            "[Bootstrap] Runtime prepared; "
            f"suppliers={counts['suppliers']}, claims={counts['claims']}, alerts={counts['alerts']}."
        )
        return

    if args.run_with_lock:
        run_bootstrap_with_lock()
        return

    seeded = bootstrap_database()
    print(f"[Bootstrap] Seed {'completed' if seeded else 'not required'}.")


if __name__ == "__main__":
    main()
