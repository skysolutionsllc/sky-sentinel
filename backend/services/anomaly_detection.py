"""Ensemble AI anomaly detection pipeline — Isolation Forest, Z-score, DBSCAN clustering."""
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
from sqlalchemy.orm import Session
from backend.db.models import Supplier, SupplierMetrics, AnomalyScore, SupplierCluster, PeerGroup


def run_anomaly_detection(db: Session):
    """Run the full anomaly detection pipeline.

    Pipeline stages:
      1. Peer groups   — group suppliers by state, compute baseline stats
      2. Isolation Forest — 100-tree ensemble, 7 features, contamination=10%
      3. Z-Score        — deviation from state peer group mean billing
      4. DBSCAN         — behavioral clustering, eps=1.0, min_samples=5
      5. Composite      — weighted combination of all signals (0-100 scale)
      6. Cluster risk   — average composite score per cluster
    """
    print("[Anomaly Detection] Starting pipeline...")

    # 1. Compute peer group baselines
    _compute_peer_groups(db)

    # 2. Run Isolation Forest
    isolation_scores = _run_isolation_forest(db)

    # 3. Run Z-score peer deviation
    z_scores = _run_z_score_analysis(db)

    # 4. Run DBSCAN clustering
    _run_cluster_detection(db)

    # 5. Compute composite risk scores
    _compute_composite_scores(db, isolation_scores, z_scores)

    # 6. Update cluster-level risk scores (requires composite scores)
    _update_cluster_risk_scores(db)

    db.commit()
    print("[Anomaly Detection] Pipeline complete.")


def _compute_peer_groups(db: Session):
    """Group suppliers by state and compute baselines."""
    from sqlalchemy import func

    states = db.query(Supplier.state).distinct().all()

    for (state,) in states:
        suppliers_in_state = (
            db.query(Supplier)
            .filter(Supplier.state == state)
            .all()
        )

        # Get latest metrics for these suppliers
        metrics = []
        for s in suppliers_in_state:
            m = (
                db.query(SupplierMetrics)
                .filter(SupplierMetrics.supplier_npi == s.npi)
                .order_by(SupplierMetrics.period.desc())
                .first()
            )
            if m:
                metrics.append(m)

        if not metrics:
            continue

        billings = [m.total_billed for m in metrics]
        claims_counts = [m.total_claims for m in metrics]
        beneficiary_counts = [m.unique_beneficiaries for m in metrics]
        growth_rates = [m.growth_rate for m in metrics if m.growth_rate is not None]

        pg = PeerGroup(
            name=f"DME Suppliers — {state}",
            state=state,
            member_count=len(metrics),
            avg_billed=float(np.mean(billings)) if billings else 0,
            avg_claims=float(np.mean(claims_counts)) if claims_counts else 0,
            avg_beneficiaries=float(np.mean(beneficiary_counts)) if beneficiary_counts else 0,
            median_growth_rate=float(np.median(growth_rates)) if growth_rates else 0,
            std_billed=float(np.std(billings)) if billings else 0,
            std_claims=float(np.std(claims_counts)) if claims_counts else 0,
        )
        db.add(pg)

    db.flush()


def _run_isolation_forest(db: Session) -> dict:
    """Isolation Forest for individual supplier outlier detection.

    How it works: builds 100 random decision trees. Each tree randomly
    selects a feature and a split value, recursively isolating data
    points. Anomalies are data points that are easy to isolate — they
    require fewer splits. The decision_function returns a score where
    lower values = more anomalous.

    Features used (7 dimensions):
      - total_billed, total_claims, unique_beneficiaries
      - unique_hcpcs, avg_billed_per_claim
      - growth_rate, geographic_spread

    contamination=0.1 tells the model to expect ~10% anomalies.
    Output is normalized to 0-100 (100 = most anomalous).
    """
    metrics = db.query(SupplierMetrics).all()

    if len(metrics) < 5:
        return {}

    # Build feature matrix
    npi_list = []
    features = []
    for m in metrics:
        npi_list.append(m.supplier_npi)
        features.append([
            m.total_billed or 0,
            m.total_claims or 0,
            m.unique_beneficiaries or 0,
            m.unique_hcpcs or 0,
            m.avg_billed_per_claim or 0,
            m.growth_rate or 0,
            m.geographic_spread or 0,
        ])

    X = np.array(features)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    iso_forest = IsolationForest(
        contamination=0.1,
        random_state=42,
        n_estimators=100,
    )
    iso_forest.fit(X_scaled)
    raw_scores = iso_forest.decision_function(X_scaled)

    # Normalize to 0-100 (lower decision_function = more anomalous)
    min_s, max_s = raw_scores.min(), raw_scores.max()
    if max_s > min_s:
        normalized = 100 * (1 - (raw_scores - min_s) / (max_s - min_s))
    else:
        normalized = np.zeros_like(raw_scores)

    return {npi: float(score) for npi, score in zip(npi_list, normalized)}


def _run_z_score_analysis(db: Session) -> dict:
    """Z-score deviation from peer group baselines.

    How it works: for each state's peer group, compute the mean and
    standard deviation of total billing. Then for each supplier,
    calculate how many std devs their billing is from the mean.

    Formula: Z = |billing - peer_mean| / peer_std_dev

    A Z-score of 3+ means the supplier is 3 standard deviations
    from the peer average — statistically extremely unlikely.
    Score is capped at 100 (Z × 25).
    """
    peer_groups = db.query(PeerGroup).all()
    z_scores = {}

    for pg in peer_groups:
        if not pg.state or pg.std_billed == 0:
            continue

        # Get suppliers in this peer group
        suppliers = db.query(Supplier).filter(Supplier.state == pg.state).all()
        for s in suppliers:
            m = (
                db.query(SupplierMetrics)
                .filter(SupplierMetrics.supplier_npi == s.npi)
                .order_by(SupplierMetrics.period.desc())
                .first()
            )
            if not m:
                continue

            z = abs((m.total_billed - pg.avg_billed) / pg.std_billed) if pg.std_billed else 0
            # Normalize Z-score to 0-100 range (Z=3+ is critical)
            z_scores[s.npi] = min(float(z) * 25, 100)

    return z_scores


def _run_cluster_detection(db: Session):
    """DBSCAN clustering for coordinated multi-NPI pattern detection.

    DBSCAN (Density-Based Spatial Clustering of Applications with Noise)
    groups suppliers that are close together in a 5-dimensional behavioral
    feature space. Unlike K-Means, it does not require specifying the
    number of clusters in advance — it discovers them automatically.

    The two key parameters:
      - eps=1.0: suppliers within 1.0 standard deviations are "neighbors"
      - min_samples=5: a cluster needs at least 5 core members

    Points that don't belong to any cluster are labeled as noise (-1).
    """
    from collections import Counter

    metrics_list = db.query(SupplierMetrics).all()

    if len(metrics_list) < 5:
        return

    # Use latest-period metrics per NPI (most recent quarter)
    latest_metrics = {}
    for m in metrics_list:
        existing = latest_metrics.get(m.supplier_npi)
        if existing is None or m.period > existing.period:
            latest_metrics[m.supplier_npi] = m

    unique_metrics = list(latest_metrics.values())
    npi_list = [m.supplier_npi for m in unique_metrics]
    features = []
    for m in unique_metrics:
        features.append([
            m.total_billed or 0,
            m.total_claims or 0,
            m.growth_rate or 0,
            m.unique_hcpcs or 0,
            m.geographic_spread or 0,
        ])

    X = np.array(features)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    dbscan = DBSCAN(eps=1.0, min_samples=5)
    labels = dbscan.fit_predict(X_scaled)

    # Clear existing clusters
    db.query(SupplierCluster).delete()

    # Build per-cluster member lists for shared attribute computation
    # Filter out very large clusters (>50 members) — these are the
    # legitimate-supplier baseline population, not fraud rings.
    cluster_members = {}  # cluster_id -> list of NPIs
    for npi, label in zip(npi_list, labels):
        if label == -1:  # noise
            continue
        cluster_members.setdefault(int(label), []).append(npi)

    # Remove baseline clusters (too large to be coordinated fraud)
    cluster_members = {
        cid: npis for cid, npis in cluster_members.items()
        if len(npis) <= 50
    }

    # Compute ACTUAL shared attributes for each cluster
    for cid, member_npis in cluster_members.items():
        # Find genuinely shared HCPCS codes across cluster members
        from backend.db.models import Claim
        member_hcpcs = {}  # npi -> set of hcpcs codes
        all_hcpcs_counts = Counter()
        for npi in member_npis:
            codes = [
                r[0] for r in
                db.query(Claim.hcpcs_code)
                .filter(Claim.supplier_npi == npi)
                .distinct()
                .all()
            ]
            member_hcpcs[npi] = set(codes)
            for c in codes:
                all_hcpcs_counts[c] += 1

        # Shared HCPCS = codes billed by at least 50% of cluster members
        threshold = max(2, len(member_npis) // 2)
        shared_hcpcs = sorted(
            [code for code, count in all_hcpcs_counts.items() if count >= threshold],
            key=lambda c: all_hcpcs_counts[c],
            reverse=True,
        )[:5]  # Top 5 shared codes

        # Check for synchronized growth patterns
        growth_rates = [
            latest_metrics[npi].growth_rate
            for npi in member_npis
            if npi in latest_metrics and latest_metrics[npi].growth_rate is not None
        ]
        growth_sync = False
        if len(growth_rates) >= 2:
            # If most members have high growth, they're synchronized
            high_growth = sum(1 for g in growth_rates if abs(g) > 100)
            growth_sync = high_growth >= len(growth_rates) * 0.5

        # Check for geographic overlap
        geo_spreads = [
            latest_metrics[npi].geographic_spread
            for npi in member_npis
            if npi in latest_metrics and latest_metrics[npi].geographic_spread is not None
        ]
        geo_overlap = False
        if len(geo_spreads) >= 2:
            # If most members have high geo spread, there's overlap
            high_geo = sum(1 for g in geo_spreads if g > 0.5)
            geo_overlap = high_geo >= len(geo_spreads) * 0.5

        # Store cluster entries with computed attributes
        for npi in member_npis:
            cluster_entry = SupplierCluster(
                cluster_id=cid,
                supplier_npi=npi,
                shared_attributes={
                    "detection_method": "DBSCAN",
                    "shared_hcpcs": shared_hcpcs,
                    "geo_overlap": geo_overlap,
                    "growth_sync": growth_sync,
                },
            )
            db.add(cluster_entry)

    db.flush()


def _compute_composite_scores(db: Session, isolation_scores: dict, z_scores: dict):
    """Combine all signals into composite risk scores (0-100)."""
    suppliers = db.query(Supplier).all()

    # Clear existing scores
    db.query(AnomalyScore).delete()

    for supplier in suppliers:
        npi = supplier.npi
        iso = isolation_scores.get(npi, 30)
        z = z_scores.get(npi, 20)

        # Check for cluster membership
        cluster = db.query(SupplierCluster).filter(
            SupplierCluster.supplier_npi == npi
        ).first()
        cluster_score = 70 if cluster else 10

        # Get latest metrics for growth-based scoring
        m = (
            db.query(SupplierMetrics)
            .filter(SupplierMetrics.supplier_npi == npi)
            .order_by(SupplierMetrics.period.desc())
            .first()
        )

        growth_score = min(abs(m.growth_rate or 0) * 3.0, 100) if m else 20
        geo_score = min((m.geographic_spread or 0) * 100, 100) if m else 15
        hcpcs_score = min((m.unique_hcpcs or 1) * 12, 100) if m else 20

        # Weighted composite
        composite = (
            iso * 0.20 +
            growth_score * 0.20 +
            hcpcs_score * 0.15 +
            geo_score * 0.15 +
            z * 0.15 +  # stands in for LLM context score
            cluster_score * 0.15
        )
        composite = min(max(composite, 0), 100)

        risk_level = (
            "critical" if composite >= 80 else
            "high" if composite >= 60 else
            "medium" if composite >= 40 else
            "low"
        )

        score = AnomalyScore(
            supplier_npi=npi,
            composite_score=composite,
            risk_level=risk_level,
            billing_volume_score=iso,
            growth_rate_score=growth_score,
            hcpcs_mix_score=hcpcs_score,
            geographic_spread_score=geo_score,
            llm_context_score=z,
            cluster_association_score=cluster_score,
            isolation_forest_score=iso,
            z_score=z,
        )
        db.add(score)

    db.flush()


def _update_cluster_risk_scores(db: Session):
    """Update cluster-level risk scores as the average composite score of members."""
    cluster_ids = [
        r[0] for r in db.query(SupplierCluster.cluster_id).distinct().all()
    ]

    for cid in cluster_ids:
        member_npis = [
            r[0] for r in
            db.query(SupplierCluster.supplier_npi)
            .filter(SupplierCluster.cluster_id == cid)
            .all()
        ]
        member_scores = (
            db.query(AnomalyScore.composite_score)
            .filter(AnomalyScore.supplier_npi.in_(member_npis))
            .all()
        )
        avg_score = float(np.mean([s[0] for s in member_scores])) if member_scores else 50.0

        db.query(SupplierCluster).filter(
            SupplierCluster.cluster_id == cid
        ).update({"cluster_risk_score": avg_score})

    db.flush()
