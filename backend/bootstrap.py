"""Database bootstrap helpers for container startup."""
from pathlib import Path
from typing import Dict, Optional

from backend.config import DATABASE_URL
from backend.data.seed_data import seed_database
from backend.db.database import SessionLocal, init_db
from backend.db.models import Alert, Claim, Supplier


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

    if _is_effectively_empty(counts):
        state = "effectively empty" if sqlite_exists else "absent"
        print(f"[Bootstrap] Database is {state}; running initial seed...")
        seed_database()
        return True

    print(
        "[Bootstrap] Existing database detected; "
        f"suppliers={counts['suppliers']}, claims={counts['claims']}, alerts={counts['alerts']}. "
        "Skipping seed."
    )
    return False


if __name__ == "__main__":
    seeded = bootstrap_database()
    print(f"[Bootstrap] Seed {'completed' if seeded else 'not required'}.")
