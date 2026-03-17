"""Alert endpoints — ranked list, summary, actions."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from backend.db.database import get_db
from backend.db.models import Alert, InvestigatorAction, Supplier

router = APIRouter()


class AlertActionRequest(BaseModel):
    action: str  # valid_concern | false_positive | monitor | escalate
    notes: str = ""
    investigator: str = "Analyst"


@router.get("")
def list_alerts(
    risk_level: str = Query(None),
    status: str = Query(None),
    state: str = Query(None),
    limit: int = Query(50),
    offset: int = Query(0),
    db: Session = Depends(get_db),
):
    """Ranked alert list with filters."""
    q = db.query(Alert, Supplier).join(Supplier, Alert.supplier_npi == Supplier.npi)

    if risk_level:
        q = q.filter(Alert.risk_level == risk_level)
    if status:
        q = q.filter(Alert.status == status)
    if state:
        q = q.filter(Supplier.state == state)

    total = q.count()
    rows = q.order_by(desc(Alert.risk_score)).offset(offset).limit(limit).all()

    return {
        "total": total,
        "alerts": [
            {
                "id": a.id,
                "supplier_npi": a.supplier_npi,
                "supplier_name": s.name,
                "supplier_state": s.state,
                "alert_type": a.alert_type,
                "risk_score": round(a.risk_score, 1),
                "risk_level": a.risk_level,
                "title": a.title,
                "summary": a.summary,
                "top_reasons": a.top_reasons,
                "status": a.status,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a, s in rows
        ],
    }


@router.get("/summary")
def alert_summary(db: Session = Depends(get_db)):
    """High-level summary for dashboard cards."""
    from sqlalchemy import func

    total = db.query(Alert).count()
    by_level = dict(
        db.query(Alert.risk_level, func.count(Alert.id))
        .group_by(Alert.risk_level)
        .all()
    )
    by_status = dict(
        db.query(Alert.status, func.count(Alert.id))
        .group_by(Alert.status)
        .all()
    )

    return {
        "total": total,
        "by_risk_level": by_level,
        "by_status": by_status,
    }


@router.post("/{alert_id}/action")
def alert_action(alert_id: int, req: AlertActionRequest, db: Session = Depends(get_db)):
    """Record an investigator action on an alert."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        return {"error": "Alert not found"}

    alert.status = {
        "valid_concern": "escalated",
        "false_positive": "dismissed",
        "monitor": "reviewed",
        "escalate": "escalated",
    }.get(req.action, "reviewed")
    alert.reviewed_at = datetime.utcnow()
    alert.reviewed_by = req.investigator

    action_log = InvestigatorAction(
        alert_id=alert_id,
        supplier_npi=alert.supplier_npi,
        action=req.action,
        notes=req.notes,
        investigator=req.investigator,
    )
    db.add(action_log)
    db.commit()

    return {"status": "success", "alert_status": alert.status}
