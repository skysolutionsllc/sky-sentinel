"""Claims feed and submission endpoints."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List
import uuid
import datetime
from backend.db.database import get_db
from backend.db.models import Claim

router = APIRouter()


class ClaimSubmission(BaseModel):
    supplier_npi: str
    beneficiary_id: str
    hcpcs_code: str
    hcpcs_description: Optional[str] = None
    diagnosis_codes: Optional[List[str]] = None
    billed_amount: float
    medical_necessity_text: Optional[str] = None
    referring_physician_npi: Optional[str] = None


@router.get("/feed")
def claims_feed(
    limit: int = Query(20),
    offset: int = Query(0),
    status: str = Query(None),
    db: Session = Depends(get_db),
):
    """Paginated claim feed — most recent first."""
    q = db.query(Claim)
    if status:
        q = q.filter(Claim.status == status)

    total = q.count()
    claims = q.order_by(desc(Claim.submission_date)).offset(offset).limit(limit).all()

    return {
        "total": total,
        "claims": [
            {
                "claim_id": c.claim_id,
                "supplier_npi": c.supplier_npi,
                "beneficiary_id": c.beneficiary_id,
                "hcpcs_code": c.hcpcs_code,
                "hcpcs_description": c.hcpcs_description,
                "billed_amount": c.billed_amount,
                "status": c.status,
                "service_date": c.service_date.isoformat() if c.service_date else None,
                "submission_date": c.submission_date.isoformat() if c.submission_date else None,
            }
            for c in claims
        ],
    }


@router.post("")
def submit_claim(req: ClaimSubmission, db: Session = Depends(get_db)):
    """Submit a new claim — triggers processing."""
    claim = Claim(
        claim_id=f"CLM-{uuid.uuid4().hex[:8].upper()}",
        supplier_npi=req.supplier_npi,
        beneficiary_id=req.beneficiary_id,
        hcpcs_code=req.hcpcs_code,
        hcpcs_description=req.hcpcs_description,
        diagnosis_codes=req.diagnosis_codes,
        billed_amount=req.billed_amount,
        medical_necessity_text=req.medical_necessity_text,
        referring_physician_npi=req.referring_physician_npi,
        service_date=datetime.datetime.utcnow(),
        submission_date=datetime.datetime.utcnow(),
        status="processing",
        is_synthetic=False,
    )
    db.add(claim)
    db.commit()
    db.refresh(claim)

    return {
        "claim_id": claim.claim_id,
        "status": claim.status,
        "message": "Claim submitted and queued for AI analysis",
    }


@router.get("/{claim_id}")
def claim_detail(claim_id: str, db: Session = Depends(get_db)):
    """Single claim detail."""
    claim = db.query(Claim).filter(Claim.claim_id == claim_id).first()
    if not claim:
        return {"error": "Claim not found"}

    return {
        "claim_id": claim.claim_id,
        "supplier_npi": claim.supplier_npi,
        "beneficiary_id": claim.beneficiary_id,
        "hcpcs_code": claim.hcpcs_code,
        "hcpcs_description": claim.hcpcs_description,
        "diagnosis_codes": claim.diagnosis_codes,
        "billed_amount": claim.billed_amount,
        "allowed_amount": claim.allowed_amount,
        "paid_amount": claim.paid_amount,
        "medical_necessity_text": claim.medical_necessity_text,
        "referring_physician_npi": claim.referring_physician_npi,
        "service_date": claim.service_date.isoformat() if claim.service_date else None,
        "status": claim.status,
    }
