"""SQLAlchemy ORM models for Sky Sentinel."""
import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime, Boolean,
    ForeignKey, JSON, Index
)
from sqlalchemy.orm import relationship
from backend.db.database import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    npi = Column(String(10), primary_key=True)
    name = Column(String(200), nullable=False)
    entity_type = Column(String(20))  # Individual / Organization
    state = Column(String(2), nullable=False)
    city = Column(String(100))
    zip_code = Column(String(10))
    specialty = Column(String(200))
    enrollment_date = Column(DateTime)
    is_synthetic = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    claims = relationship("Claim", back_populates="supplier")
    metrics = relationship("SupplierMetrics", back_populates="supplier")
    anomaly_scores = relationship("AnomalyScore", back_populates="supplier")
    alerts = relationship("Alert", back_populates="supplier")

    __table_args__ = (
        Index("ix_suppliers_state", "state"),
        Index("ix_suppliers_specialty", "specialty"),
    )


class Claim(Base):
    __tablename__ = "claims"

    id = Column(Integer, primary_key=True, autoincrement=True)
    claim_id = Column(String(20), unique=True, nullable=False)
    supplier_npi = Column(String(10), ForeignKey("suppliers.npi"), nullable=False)
    beneficiary_id = Column(String(15), nullable=False)
    hcpcs_code = Column(String(10), nullable=False)
    hcpcs_description = Column(String(200))
    diagnosis_codes = Column(JSON)  # list of ICD-10 codes
    billed_amount = Column(Float, nullable=False)
    allowed_amount = Column(Float)
    paid_amount = Column(Float)
    medical_necessity_text = Column(Text)
    referring_physician_npi = Column(String(10))
    service_date = Column(DateTime, nullable=False)
    submission_date = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(20), default="pending")  # pending|processing|clean|flagged|denied
    is_synthetic = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    supplier = relationship("Supplier", back_populates="claims")

    __table_args__ = (
        Index("ix_claims_supplier_npi", "supplier_npi"),
        Index("ix_claims_hcpcs", "hcpcs_code"),
        Index("ix_claims_status", "status"),
        Index("ix_claims_service_date", "service_date"),
    )


class SupplierMetrics(Base):
    __tablename__ = "supplier_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    supplier_npi = Column(String(10), ForeignKey("suppliers.npi"), nullable=False)
    period = Column(String(10), nullable=False)  # YYYY-QN or YYYY-MM
    total_claims = Column(Integer, default=0)
    total_billed = Column(Float, default=0.0)
    total_allowed = Column(Float, default=0.0)
    total_paid = Column(Float, default=0.0)
    unique_beneficiaries = Column(Integer, default=0)
    unique_hcpcs = Column(Integer, default=0)
    unique_referring_physicians = Column(Integer, default=0)
    avg_billed_per_claim = Column(Float, default=0.0)
    growth_rate = Column(Float)  # % change from prior period
    geographic_spread = Column(Float)  # ratio of states served
    top_hcpcs_codes = Column(JSON)  # list of {code, count, amount}

    supplier = relationship("Supplier", back_populates="metrics")

    __table_args__ = (
        Index("ix_metrics_npi_period", "supplier_npi", "period"),
    )


class PeerGroup(Base):
    __tablename__ = "peer_groups"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    specialty = Column(String(200))
    state = Column(String(2))
    member_count = Column(Integer, default=0)
    avg_billed = Column(Float)
    avg_claims = Column(Float)
    avg_beneficiaries = Column(Float)
    median_growth_rate = Column(Float)
    std_billed = Column(Float)
    std_claims = Column(Float)


class AnomalyScore(Base):
    __tablename__ = "anomaly_scores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    supplier_npi = Column(String(10), ForeignKey("suppliers.npi"), nullable=False)
    composite_score = Column(Float, nullable=False)  # 0-100
    risk_level = Column(String(10))  # critical|high|medium|low
    billing_volume_score = Column(Float, default=0.0)
    growth_rate_score = Column(Float, default=0.0)
    hcpcs_mix_score = Column(Float, default=0.0)
    geographic_spread_score = Column(Float, default=0.0)
    llm_context_score = Column(Float, default=0.0)
    cluster_association_score = Column(Float, default=0.0)
    isolation_forest_score = Column(Float)
    z_score = Column(Float)
    computed_at = Column(DateTime, default=datetime.datetime.utcnow)

    supplier = relationship("Supplier", back_populates="anomaly_scores")

    __table_args__ = (
        Index("ix_anomaly_npi", "supplier_npi"),
        Index("ix_anomaly_risk", "risk_level"),
    )


class SupplierCluster(Base):
    __tablename__ = "supplier_clusters"

    id = Column(Integer, primary_key=True, autoincrement=True)
    cluster_id = Column(Integer, nullable=False)
    supplier_npi = Column(String(10), ForeignKey("suppliers.npi"), nullable=False)
    cluster_risk_score = Column(Float)
    shared_attributes = Column(JSON)  # {hcpcs_overlap, geo_overlap, growth_sync}
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (
        Index("ix_cluster_id", "cluster_id"),
    )


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    supplier_npi = Column(String(10), ForeignKey("suppliers.npi"), nullable=False)
    alert_type = Column(String(30))  # individual|cluster|narrative
    risk_score = Column(Float, nullable=False)
    risk_level = Column(String(10))
    title = Column(String(200))
    summary = Column(Text)
    evidence = Column(JSON)  # list of evidence items
    llm_narrative = Column(Text)
    top_reasons = Column(JSON)  # list of one-line reasons
    status = Column(String(20), default="new")  # new|reviewed|dismissed|escalated
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    reviewed_at = Column(DateTime)
    reviewed_by = Column(String(100))

    supplier = relationship("Supplier", back_populates="alerts")

    __table_args__ = (
        Index("ix_alerts_risk", "risk_level"),
        Index("ix_alerts_status", "status"),
    )


class InvestigatorAction(Base):
    __tablename__ = "investigator_actions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"))
    supplier_npi = Column(String(10))
    action = Column(String(30))  # valid_concern|false_positive|monitor|escalate
    notes = Column(Text)
    investigator = Column(String(100))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class PatternDefinition(Base):
    __tablename__ = "pattern_definitions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    criteria = Column(JSON, nullable=False)  # {growth_rate_min, hcpcs_codes, states, ...}
    created_by = Column(String(100))
    match_count = Column(Integer)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class QueryHistory(Base):
    __tablename__ = "query_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    query_text = Column(Text, nullable=False)
    response_text = Column(Text)
    result_count = Column(Integer)
    query_type = Column(String(30))  # supplier_search|pattern|analysis
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
