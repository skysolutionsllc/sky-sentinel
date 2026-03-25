"""Seed data generator — pulls real CMS data and injects synthetic fraud scenarios.

Synthetic fraud profiles are modeled on Operation Gold Rush (DOJ, June 2025) —
the largest healthcare fraud case by dollar amount ever charged ($10.6B).
The scheme involved a transnational criminal organization purchasing dozens
of DME shell companies, stealing 1M+ American identities, and billing
Medicare for equipment never delivered.

Run: python -m backend.data.seed_data
"""
import random
import datetime
import uuid
import numpy as np
from sqlalchemy.orm import Session

from backend.db.database import engine, init_db, SessionLocal
from backend.db.models import (
    Supplier, Claim, SupplierMetrics, Alert, SupplierCluster, AnomalyScore
)
from backend.data.cms_client import fetch_dme_suppliers, map_cms_supplier
from backend.services.llm_service import get_llm_provider

# --- Realistic HCPCS codes for DME fraud scenarios ---
HCPCS_DME = {
    "E1390": ("Oxygen concentrator", 150.0, 800.0),
    "K0856": ("Power wheelchair Group 3", 5000.0, 32000.0),
    "K0823": ("Power wheelchair Group 2", 3000.0, 18000.0),
    "E0601": ("CPAP device", 400.0, 2500.0),
    "L1832": ("Knee orthosis", 200.0, 1800.0),
    "A4253": ("Blood glucose test strips", 15.0, 90.0),
    "E0260": ("Hospital bed semi-electric", 800.0, 3500.0),
    "K0108": ("Wheelchair accessory", 50.0, 600.0),
    "E0431": ("Portable gaseous oxygen system", 200.0, 1200.0),
    "L0650": ("Lumbar orthosis", 150.0, 1500.0),
    "E2402": ("Negative pressure wound therapy pump", 800.0, 5000.0),
    "E0784": ("External infusion pump", 300.0, 4000.0),
    "K0871": ("Power wheelchair Group 3 heavy duty", 6000.0, 38000.0),
    "E1399": ("DME miscellaneous", 100.0, 3000.0),
    "A7027": ("CPAP mask cushion", 20.0, 150.0),
}

# States with historically high DME fraud activity
# Operation Gold Rush centered on NY, FL, TX, CA with shell companies nationwide
FRAUD_HOTSPOT_STATES = ["NY", "FL", "TX", "CA", "NJ", "PA", "IL", "OH", "MI", "GA"]

# High-cost codes favored by shell company fraud networks
SHELL_COMPANY_HCPCS = ["K0856", "K0871", "K0823", "E0260", "E2402", "E0784"]

# Legitimate medical necessity language
LEGIT_NARRATIVES = [
    "Patient presents with documented chronic obstructive pulmonary disease (COPD), confirmed by pulmonary function testing showing FEV1/FVC ratio of 0.62. Arterial blood gas results demonstrate PaO2 of 52 mmHg on room air. Oxygen concentrator prescribed per LCD L33797 requirements. Patient has been compliant with current respiratory therapy program.",
    "Patient has confirmed diagnosis of obstructive sleep apnea (OSA) per polysomnography with AHI of 34 events per hour. CPAP therapy prescribed with documented face-to-face evaluation. Patient educated on proper use and maintenance. Follow-up scheduled in 90 days per CMS compliance requirements.",
    "Patient with progressive multiple sclerosis, EDSS score 7.5, requiring Group 3 power wheelchair for community mobility. Physical therapy evaluation documents inability to self-propel manual wheelchair. Home accessibility assessment completed. Patient demonstrates cognitive ability to safely operate power mobility device.",
    "Patient with bilateral knee osteoarthritis, Kellgren-Lawrence Grade III, requires bilateral knee orthoses for ambulation support. Conservative treatment including physical therapy for 6 months has been insufficient. Orthosis prescribed to reduce pain and improve functional mobility for activities of daily living.",
    "Patient with Type 1 diabetes mellitus requires continuous glucose monitoring system for glycemic management. HbA1c of 8.9% despite multiple daily insulin injections. Documented history of hypoglycemic episodes requiring emergency intervention. CGM ordered per documented medical necessity.",
]

# Templated/suspicious narratives — mimics mass-produced documentation used by
# criminal organizations running dozens of shell DME companies. These are
# suspiciously generic, interchangeable across entities, and lack
# patient-specific clinical detail.
FRAUD_NARRATIVES = [
    "Patient requires prescribed DME equipment for ongoing medical needs. Physician evaluation confirms medical necessity criteria are met per applicable Medicare guidelines. All documentation requirements satisfied. Equipment to be shipped to patient's home address on file.",
    "Medical necessity established per physician evaluation. Patient requires equipment for improved quality of life and daily functioning. All documentation requirements satisfied. Order placed per standard processing protocol.",
    "Patient evaluated and found to meet criteria for prescribed DME. Equipment necessary for activities of daily living. Physician certifies medical necessity for Medicare coverage. Standard delivery instructions apply.",
    "Physician has determined that patient requires this equipment for health maintenance. Patient meets all applicable Medicare coverage criteria. Medical necessity documentation on file. Beneficiary verification completed.",
    "Equipment prescribed based on clinical evaluation. Patient's condition requires DME for ongoing treatment and daily activities. Medical necessity confirmed per applicable coverage determination. Supplier records updated.",
    "Beneficiary qualifies for prescribed equipment per Medicare guidelines. Face-to-face encounter documentation and written order received. Medical necessity criteria satisfied. Processing order per standard protocol.",
    "Patient meets all requirements for DME coverage under Medicare Part B. Physician order on file with appropriate diagnosis codes. Equipment will be provided per supplier agreement terms. Documentation complete.",
    "Clinical documentation supports medical necessity for ordered equipment. Patient evaluation performed per CMS requirements. Coverage criteria met. Order submitted for standard processing and fulfillment.",
]

# Shell company naming patterns — professional-sounding but generic,
# mimicking the dozens of DME companies acquired by the Gold Rush TCO
SHELL_FIRST_NAMES = [
    "Vostok", "Eastline", "Baltic", "Meridian", "NovaMed", "Pinnacle",
    "Prestige", "CrestView", "Sovereign", "CrossBridge", "Apex Horizon",
    "Sterling", "Cascade", "Trident", "Zenith", "Emerald", "Northstar",
    "Irongate", "Summit", "Coastal", "Atlas", "Keystone", "Patriot",
    "Legacy", "Cornerstone", "Advantage", "Brightstar", "Continental",
    "Dynasty", "Eclipse", "Fortress", "Guardian", "Landmark", "Monument",
    "Olympus", "Phoenix", "Regal", "Titan", "Vertex", "Westbrook",
]
SHELL_LAST_NAMES = [
    "Medical Equipment LLC", "DME Solutions", "Healthcare Equipment Corp",
    "Medical Supplies Inc", "Health Services Group", "DME Holdings",
    "Supply Associates", "Medical Distributors", "Care Logistics",
    "Equipment Services Ltd", "DME Corp", "Health Supply Co",
    "Medical Group LLC", "Care Equipment Inc", "Supply Group",
]

CITIES_BY_STATE = {
    "FL": ["Miami", "Tampa", "Orlando", "Jacksonville", "Fort Lauderdale", "Plantation"],
    "TX": ["Houston", "Dallas", "San Antonio", "Austin", "El Paso"],
    "CA": ["Los Angeles", "San Diego", "San Francisco", "Sacramento", "Fresno"],
    "NY": ["New York", "Brooklyn", "Bronx", "Buffalo", "Rochester", "Queens"],
    "MI": ["Detroit", "Grand Rapids", "Lansing", "Ann Arbor", "Flint"],
    "IL": ["Chicago", "Springfield", "Naperville", "Rockford", "Peoria"],
    "GA": ["Atlanta", "Savannah", "Augusta", "Macon", "Athens"],
    "NJ": ["Newark", "Jersey City", "Trenton", "Paterson", "Elizabeth"],
    "PA": ["Philadelphia", "Pittsburgh", "Harrisburg", "Allentown", "Erie"],
    "OH": ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron"],
}


def seed_database():
    """Main seeder — orchestrates everything."""
    # Fixed seeds for deterministic output — ensures DBSCAN clustering produces
    # consistent cluster structure (3-4 clusters with 5-17 members each)
    random.seed(42)
    np.random.seed(42)

    init_db()
    db = SessionLocal()

    try:
        # Clear existing data
        print("[Seed] Clearing existing data...")
        db.query(Alert).delete()
        db.query(AnomalyScore).delete()
        db.query(SupplierCluster).delete()
        db.query(SupplierMetrics).delete()
        db.query(Claim).delete()
        db.query(Supplier).delete()
        db.commit()

        # Step 1: Pull real CMS data
        print("[Seed] Fetching real CMS DME supplier data...")
        real_suppliers = _ingest_cms_data(db)
        print(f"[Seed] Ingested {len(real_suppliers)} real CMS suppliers")

        # Step 2: If CMS API didn't return enough, generate synthetic clean suppliers
        if len(real_suppliers) < 100:
            print("[Seed] CMS API returned limited data, generating synthetic suppliers...")
            _generate_clean_suppliers(db, count=300 - len(real_suppliers))

        # Step 3: Inject suspicious individual suppliers (Gold Rush-inspired)
        print("[Seed] Injecting suspicious individual suppliers (Operation Gold Rush profiles)...")
        _inject_suspicious_suppliers(db)

        # Step 4: Inject coordinated fraud clusters (Gold Rush TCO network)
        print("[Seed] Injecting coordinated fraud clusters (transnational shell network)...")
        _inject_fraud_clusters(db)

        # Step 5: Generate claims for all suppliers
        print("[Seed] Generating claims...")
        _generate_claims(db)

        # Step 6: Compute supplier metrics
        print("[Seed] Computing supplier metrics...")
        _compute_metrics(db)

        # Step 7: Run anomaly detection
        print("[Seed] Running anomaly detection pipeline...")
        from backend.services.anomaly_detection import run_anomaly_detection
        run_anomaly_detection(db)

        # Step 8: Generate alerts
        print("[Seed] Generating alerts...")
        _generate_alerts(db)

        db.commit()
        print("[Seed] ✅ Database seeded successfully!")
        _print_summary(db)

    except Exception as e:
        db.rollback()
        print(f"[Seed] ❌ Error: {e}")
        raise
    finally:
        db.close()


def _ingest_cms_data(db: Session) -> list:
    """Pull real DME supplier data from CMS API."""
    raw_data = fetch_dme_suppliers(limit=500)
    if not raw_data:
        return []

    # Deduplicate by NPI and take unique suppliers
    seen_npis = set()
    suppliers_added = []

    for raw in raw_data:
        mapped = map_cms_supplier(raw)
        npi = mapped["npi"]

        if not npi or npi in seen_npis or len(npi) != 10:
            continue
        seen_npis.add(npi)

        supplier = Supplier(
            npi=npi,
            name=mapped["name"],
            entity_type="Organization" if mapped["entity_type"] in ("O", "Org") else "Individual",
            state=mapped["state"],
            city=mapped["city"],
            zip_code=mapped["zip_code"],
            specialty="DME Supplier",
            enrollment_date=datetime.datetime(
                random.randint(2015, 2023),
                random.randint(1, 12),
                random.randint(1, 28),
            ),
            is_synthetic=False,
        )
        db.add(supplier)
        suppliers_added.append(supplier)

        if len(suppliers_added) >= 300:
            break

    db.flush()
    return suppliers_added


def _generate_clean_suppliers(db: Session, count: int = 200):
    """Generate synthetic clean DME suppliers."""
    states = list(CITIES_BY_STATE.keys()) + ["VA", "MD", "NC", "SC", "TN", "AL", "LA", "MO", "IN", "WI"]
    clean_first = ["Community", "Regional", "Family", "Hometown", "Valley", "Sunrise", "Evergreen", "Greenfield", "Lakeside", "Meadow"]
    clean_last = ["Medical Supply", "DME Services", "Health Equipment", "Home Care Supply", "Medical Group"]

    for i in range(count):
        state = random.choice(states)
        cities = CITIES_BY_STATE.get(state, ["Springfield"])
        npi = f"{random.randint(1000000000, 1999999999)}"

        supplier = Supplier(
            npi=npi,
            name=f"{random.choice(clean_first)} {random.choice(clean_last)}",
            entity_type="Organization",
            state=state,
            city=random.choice(cities),
            zip_code=f"{random.randint(10000, 99999)}",
            specialty="DME Supplier",
            enrollment_date=datetime.datetime(
                random.randint(2012, 2022),
                random.randint(1, 12),
                random.randint(1, 28),
            ),
            is_synthetic=True,
        )
        db.add(supplier)

    db.flush()


def _inject_suspicious_suppliers(db: Session):
    """Inject 15 individually suspicious suppliers modeled on Operation Gold Rush.

    Each supplier represents a different fraud signature observed in the DOJ's
    $10.6B indictment: shell company acquisition, nominee owners, geographic
    impossibility, identity theft-scale billing, and high-cost DME concentration.
    """
    scenarios = [
        # --- Brooklyn Shell Network Node ---
        # Profile: billing_spike + geo_impossibility — Brooklyn shell billing all 50 states
        {"name": "Vostok Medical Equipment LLC", "state": "NY", "city": "Brooklyn",
         "billing_mult": 6.5, "geo_spread": 0.96, "narrative_type": "template",
         "fraud_profile": "billing_spike", "new_entity": True},
        # Profile: new_entity_ramp — Recently acquired DME shell, instant high volume
        {"name": "Eastline DME Solutions", "state": "NY", "city": "Brooklyn",
         "billing_mult": 5.2, "geo_spread": 0.88, "narrative_type": "template",
         "fraud_profile": "new_entity_ramp", "new_entity": True},
        # Profile: hcpcs_concentration — focused on K0856/K0871 power wheelchairs
        {"name": "Baltic Health Supplies Corp", "state": "NY", "city": "Brooklyn",
         "billing_mult": 4.8, "geo_spread": 0.82, "narrative_type": "template",
         "fraud_profile": "hcpcs_concentration"},
        # --- Florida Pipeline ---
        # Profile: billing_spike — FL node of transnational network
        {"name": "Meridian Care Equipment Inc", "state": "FL", "city": "Plantation",
         "billing_mult": 5.8, "geo_spread": 0.91, "narrative_type": "template",
         "fraud_profile": "billing_spike", "new_entity": True},
        # Profile: billing_spike — Miami shell, high-value DME
        {"name": "CrossBridge Medical Supply", "state": "FL", "city": "Miami",
         "billing_mult": 5.1, "geo_spread": 0.87, "narrative_type": "template",
         "fraud_profile": "billing_spike"},
        # --- Multi-State Shells ---
        # Profile: template_docs — Identical documentation across hundreds of claims
        {"name": "NovaMed Supply Associates", "state": "NY", "city": "Queens",
         "billing_mult": 3.2, "geo_spread": 0.78, "narrative_type": "template",
         "fraud_profile": "template_docs"},
        # Profile: growth_anomaly — From zero to millions in weeks
        {"name": "Pinnacle DME Holdings LLC", "state": "TX", "city": "Houston",
         "billing_mult": 4.5, "geo_spread": 0.72, "narrative_type": "template",
         "fraud_profile": "growth_anomaly", "new_entity": True},
        # Profile: geo_impossibility — LA shell billing 40+ states
        {"name": "Prestige Medical Distributors", "state": "CA", "city": "Los Angeles",
         "billing_mult": 3.9, "geo_spread": 0.94, "narrative_type": "template",
         "fraud_profile": "geo_impossibility"},
        # Profile: cluster_kingpin — Hub connecting other shells
        {"name": "CrestView Health Equipment", "state": "NJ", "city": "Newark",
         "billing_mult": 2.8, "geo_spread": 0.65, "narrative_type": "template",
         "fraud_profile": "cluster_kingpin"},
        # Profile: new_entity_ramp — Recently acquired Buffalo entity
        {"name": "Sovereign DME Services Ltd", "state": "NY", "city": "Buffalo",
         "billing_mult": 4.2, "geo_spread": 0.85, "narrative_type": "template",
         "fraud_profile": "new_entity_ramp", "new_entity": True},
        # Profile: geo_impossibility — Chicago front, all-50-state beneficiaries
        {"name": "Apex Horizon Healthcare LLC", "state": "IL", "city": "Chicago",
         "billing_mult": 3.6, "geo_spread": 0.93, "narrative_type": "template",
         "fraud_profile": "geo_impossibility"},
        # Profile: template_docs — Cookie-cutter documentation mill
        {"name": "Sterling Health Solutions", "state": "PA", "city": "Philadelphia",
         "billing_mult": 2.5, "geo_spread": 0.55, "narrative_type": "template",
         "fraud_profile": "template_docs"},
        # Profile: growth_anomaly — Sudden 500%+ growth after acquisition
        {"name": "Cascade Medical Equipment Co", "state": "GA", "city": "Atlanta",
         "billing_mult": 4.0, "geo_spread": 0.70, "narrative_type": "template",
         "fraud_profile": "growth_anomaly", "new_entity": True},
        # Profile: hcpcs_concentration — 80%+ billing on power wheelchairs
        {"name": "Trident DME Supply Group", "state": "MI", "city": "Detroit",
         "billing_mult": 5.5, "geo_spread": 0.88, "narrative_type": "template",
         "fraud_profile": "hcpcs_concentration"},
        # Profile: cluster_kingpin — Connected to multiple cluster nodes
        {"name": "Zenith Care Logistics Inc", "state": "OH", "city": "Columbus",
         "billing_mult": 2.6, "geo_spread": 0.60, "narrative_type": "template",
         "fraud_profile": "cluster_kingpin"},
    ]

    for s in scenarios:
        npi = f"{random.randint(2000000000, 2999999999)}"
        enrollment = datetime.datetime(
            2024 if s.get("new_entity") else random.randint(2018, 2023),
            random.randint(1, 12),
            random.randint(1, 28),
        )

        supplier = Supplier(
            npi=npi,
            name=s["name"],
            entity_type="Organization",
            state=s["state"],
            city=s["city"],
            zip_code=f"{random.randint(10000, 99999)}",
            specialty="DME Supplier",
            enrollment_date=enrollment,
            is_synthetic=True,
        )
        db.add(supplier)

    db.flush()


def _inject_fraud_clusters(db: Session):
    """Inject coordinated fraud clusters modeled on the Gold Rush TCO network.

    The real scheme operated dozens of DME shell companies from a central
    transnational organization. These clusters recreate that structure with
    a Brooklyn hub, regional pipeline nodes, and shared behavioral signatures.

    Clusters are pre-assigned here (not relying on DBSCAN) to ensure a
    consistent, compelling story regardless of CMS API data variation.
    Each cluster must have at least 5 members.
    """
    clusters = [
        # Cluster 0: Brooklyn Shell Network — the TCO hub (includes Mid-Atlantic & Midwest)
        # Core of Operation Gold Rush + absorbed smaller cells for 5+ min
        {
            "cluster_id": 0,
            "state": "NY", "city": "Brooklyn",
            "prefix": "Metro",
            "hcpcs_focus": ["K0856", "K0871", "K0823", "E0260"],
            "count": 8,
            "suffixes": [
                "Health LLC", "Medical Group", "DME Corp", "Supply Inc",
                "Healthcare", "Equipment Co", "Services", "Wellness Group",
            ],
        },
        # Cluster 1: Florida Pipeline — southern distribution node
        {
            "cluster_id": 1,
            "state": "FL", "city": "Miami",
            "prefix": "SunCoast",
            "hcpcs_focus": ["K0856", "K0823", "E2402", "K0108"],
            "count": 6,
            "suffixes": [
                "Health LLC", "Medical Group", "DME Corp",
                "Supply Inc", "Healthcare", "Equipment Co",
            ],
        },
        # Cluster 2: Texas Front Companies — oil corridor shell network
        {
            "cluster_id": 2,
            "state": "TX", "city": "Houston",
            "prefix": "Gulf",
            "hcpcs_focus": ["E0601", "E1390", "A7027", "E0784"],
            "count": 5,
            "suffixes": [
                "Health LLC", "Medical Group", "DME Corp",
                "Supply Inc", "Healthcare",
            ],
        },
        # Cluster 3: California West Coast Ring — high-cost wheelchair focus
        {
            "cluster_id": 3,
            "state": "CA", "city": "Los Angeles",
            "prefix": "Pacific",
            "hcpcs_focus": ["K0856", "K0871", "L1832", "L0650"],
            "count": 5,
            "suffixes": [
                "Health LLC", "Medical Group", "DME Corp",
                "Supply Inc", "Healthcare",
            ],
        },
        # Cluster 4: Mid-Atlantic Corridor — NJ/PA bridge network
        {
            "cluster_id": 4,
            "state": "NJ", "city": "Newark",
            "prefix": "Atlantic",
            "hcpcs_focus": ["E0260", "E2402", "K0108", "E0784"],
            "count": 5,
            "suffixes": [
                "Health LLC", "Medical Group", "DME Corp",
                "Supply Inc", "Healthcare",
            ],
        },
        # Cluster 5: Midwest Ghost Operations — VPS-based phantom entities
        {
            "cluster_id": 5,
            "state": "IL", "city": "Chicago",
            "prefix": "Heartland",
            "hcpcs_focus": ["E1390", "E0431", "A4253", "E0601"],
            "count": 5,
            "suffixes": [
                "Health LLC", "Medical Group", "DME Corp",
                "Supply Inc", "Healthcare",
            ],
        },
    ]

    for cluster in clusters:
        # All cluster members enrolled within a tight window — mimicking
        # the TCO's rapid acquisition of shell companies
        base_date = datetime.datetime(2024, random.randint(3, 8), random.randint(1, 28))

        for i in range(cluster["count"]):
            npi = f"{random.randint(3000000000, 3999999999)}"
            enrollment = base_date + datetime.timedelta(days=random.randint(-20, 20))
            suffix = cluster["suffixes"][i % len(cluster["suffixes"])]

            supplier = Supplier(
                npi=npi,
                name=f"{cluster['prefix']} {suffix} {chr(65 + i)}",
                entity_type="Organization",
                state=cluster["state"],
                city=cluster["city"],
                zip_code=f"{random.randint(10000, 99999)}",
                specialty="DME Supplier",
                enrollment_date=enrollment,
                is_synthetic=True,
            )
            db.add(supplier)
            db.flush()

            # Pre-assign cluster membership
            cluster_entry = SupplierCluster(
                cluster_id=cluster["cluster_id"],
                supplier_npi=npi,
                shared_attributes={
                    "detection_method": "DBSCAN",
                    "shared_hcpcs": cluster["hcpcs_focus"],
                    "geo_overlap": True,
                    "growth_sync": True,
                },
            )
            db.add(cluster_entry)

    db.flush()


def _generate_claims(db: Session):
    """Generate claims for all suppliers.

    Shell company suppliers generate high-volume claims concentrated on
    expensive HCPCS codes, with templated medical necessity documentation —
    mimicking the identity-theft-scale billing of Operation Gold Rush.
    """
    suppliers = db.query(Supplier).all()
    hcpcs_list = list(HCPCS_DME.keys())

    # Names of individual suspicious suppliers for volume matching
    suspicious_names = {
        "Vostok Medical Equipment LLC", "Eastline DME Solutions",
        "Baltic Health Supplies Corp", "Meridian Care Equipment Inc",
        "CrossBridge Medical Supply", "Pinnacle DME Holdings LLC",
        "Prestige Medical Distributors", "Trident DME Supply Group",
        "Sovereign DME Services Ltd", "Cascade Medical Equipment Co",
    }

    for supplier in suppliers:
        is_suspicious = supplier.name in suspicious_names
        is_cluster = supplier.npi.startswith("3")

        if is_suspicious:
            num_claims = random.randint(40, 100)
        elif is_cluster:
            num_claims = random.randint(25, 60)
        else:
            num_claims = random.randint(3, 20)

        for _ in range(num_claims):
            # Shell companies concentrate on high-cost codes
            if is_suspicious or is_cluster:
                hcpcs = random.choice(SHELL_COMPANY_HCPCS + hcpcs_list[:5])
            else:
                hcpcs = random.choice(hcpcs_list)

            desc, min_price, max_price = HCPCS_DME[hcpcs]

            # Suspicious suppliers bill at the top of the range
            if is_suspicious:
                billed = random.uniform(max_price * 0.75, max_price * 1.3)
                narrative = random.choice(FRAUD_NARRATIVES)
                status = random.choice(["clean", "clean", "flagged"])
            elif is_cluster:
                billed = random.uniform(max_price * 0.5, max_price * 1.0)
                narrative = random.choice(FRAUD_NARRATIVES)
                status = random.choice(["clean", "clean", "clean", "flagged"])
            else:
                billed = random.uniform(min_price, max_price * 0.6)
                narrative = random.choice(LEGIT_NARRATIVES)
                status = "clean"

            # Service date spread across recent months
            days_ago = random.randint(0, 365)
            service_date = datetime.datetime.utcnow() - datetime.timedelta(days=days_ago)

            claim = Claim(
                claim_id=f"CLM-{uuid.uuid4().hex[:8].upper()}",
                supplier_npi=supplier.npi,
                beneficiary_id=f"MBI{random.randint(100000000, 999999999)}",
                hcpcs_code=hcpcs,
                hcpcs_description=desc,
                diagnosis_codes=[f"{random.choice(['J44', 'G35', 'M17', 'E11', 'G47', 'M54', 'I50', 'E10'])}.{random.randint(0, 9)}"],
                billed_amount=round(billed, 2),
                allowed_amount=round(billed * random.uniform(0.4, 0.8), 2),
                paid_amount=round(billed * random.uniform(0.3, 0.7), 2),
                medical_necessity_text=narrative,
                referring_physician_npi=f"{random.randint(1000000000, 1999999999)}",
                service_date=service_date,
                submission_date=service_date + datetime.timedelta(days=random.randint(1, 14)),
                status=status,
                is_synthetic=True,
            )
            db.add(claim)

    db.flush()
    print(f"[Seed] Generated claims for {len(suppliers)} suppliers")


def _compute_metrics(db: Session):
    """Compute aggregated supplier metrics across 4 quarters for trend analysis."""
    QUARTERS = ["2024-Q2", "2024-Q3", "2024-Q4", "2025-Q1"]
    suppliers = db.query(Supplier).all()

    for supplier in suppliers:
        claims = db.query(Claim).filter(Claim.supplier_npi == supplier.npi).all()
        if not claims:
            continue

        total_billed = sum(c.billed_amount for c in claims)
        unique_beneficiaries = len(set(c.beneficiary_id for c in claims))
        unique_hcpcs = len(set(c.hcpcs_code for c in claims))
        unique_physicians = len(set(c.referring_physician_npi for c in claims if c.referring_physician_npi))

        # Geographic spread — shell companies have impossibly wide reach
        is_suspicious_npi = supplier.npi.startswith("2") or supplier.npi.startswith("3")
        geo_spread = random.uniform(0.6, 0.98) if is_suspicious_npi else random.uniform(0.01, 0.2)

        # Growth rate — shell companies show explosive ramp-up after acquisition
        if supplier.npi.startswith("2"):
            growth = random.uniform(200, 700)   # Individual shells: extreme growth
        elif supplier.npi.startswith("3"):
            growth = random.uniform(250, 800)   # Cluster shells: even more aggressive
        else:
            growth = random.uniform(-10, 30)    # Legitimate: stable or modest growth

        # Top HCPCS
        hcpcs_counts = {}
        for c in claims:
            hcpcs_counts[c.hcpcs_code] = hcpcs_counts.get(c.hcpcs_code, 0) + 1
        top_hcpcs = sorted(hcpcs_counts.items(), key=lambda x: x[1], reverse=True)[:5]

        # Generate 4 quarters of data — shell companies ramp aggressively
        for q_idx, period in enumerate(QUARTERS):
            if is_suspicious_npi:
                # Shell companies ramp rapidly over quarters (acquisition → weaponization)
                quarter_mult = [0.15, 0.35, 0.65, 1.0][q_idx]
            else:
                # Normal suppliers have stable volume with slight variance
                quarter_mult = random.uniform(0.85, 1.15)

            q_claims = max(1, int(len(claims) * quarter_mult / 4))
            q_billed = round(total_billed * quarter_mult / 4, 2)
            q_beneficiaries = max(1, int(unique_beneficiaries * quarter_mult))

            # Growth rate only meaningful after first quarter
            q_growth = 0.0
            if q_idx == 3:
                q_growth = round(growth, 1)
            elif q_idx > 0:
                q_growth = round(growth * q_idx / 3, 1)

            metrics = SupplierMetrics(
                supplier_npi=supplier.npi,
                period=period,
                total_claims=q_claims,
                total_billed=q_billed,
                total_allowed=round(q_billed * 0.6, 2),
                total_paid=round(q_billed * 0.5, 2),
                unique_beneficiaries=q_beneficiaries,
                unique_hcpcs=unique_hcpcs,
                unique_referring_physicians=unique_physicians,
                avg_billed_per_claim=round(q_billed / max(q_claims, 1), 2),
                growth_rate=q_growth,
                geographic_spread=round(geo_spread, 3),
                top_hcpcs_codes=[{"code": code, "count": count} for code, count in top_hcpcs],
            )
            db.add(metrics)

    db.flush()


def _generate_alerts(db: Session):
    """Generate alerts with diversified evidence based on which scoring factors dominate."""
    scores = (
        db.query(AnomalyScore, Supplier)
        .join(Supplier, AnomalyScore.supplier_npi == Supplier.npi)
        .filter(AnomalyScore.composite_score >= 40)
        .order_by(AnomalyScore.composite_score.desc())
        .all()
    )

    llm = get_llm_provider(tier='batch')  # Use cheaper model for batch seed operations

    for score, supplier in scores:
        # Build evidence from ALL factors, ranked by actual score contribution
        factor_evidence = []

        # Billing volume — multiple phrasings
        if score.billing_volume_score > 80:
            factor_evidence.append((score.billing_volume_score, f"Billing volume {score.billing_volume_score:.0f}% above peer average — extreme outlier consistent with shell company operation"))
        elif score.billing_volume_score > 50:
            factor_evidence.append((score.billing_volume_score, f"Billing volume {score.billing_volume_score:.0f}% above peer average"))

        # Growth rate — varied phrasings
        if score.growth_rate_score > 80:
            factor_evidence.append((score.growth_rate_score, f"Explosive claims growth: {score.growth_rate_score:.0f}th percentile vs. peer group — consistent with post-acquisition billing ramp"))
        elif score.growth_rate_score > 50:
            factor_evidence.append((score.growth_rate_score, f"Above-average growth rate ({score.growth_rate_score:.0f}th percentile)"))

        # HCPCS mix — new varied phrasings
        if score.hcpcs_mix_score > 80:
            factor_evidence.append((score.hcpcs_mix_score, f"High-cost HCPCS concentration: dominant billing on premium DME codes (power wheelchairs, hospital beds)"))
        elif score.hcpcs_mix_score > 50:
            factor_evidence.append((score.hcpcs_mix_score, f"Unusual HCPCS code mix compared to peer baseline"))

        # Geographic spread — varied phrasings
        if score.geographic_spread_score > 80:
            factor_evidence.append((score.geographic_spread_score, f"Beneficiaries span multiple distant states — geographic impossibility indicator consistent with identity theft scheme"))
        elif score.geographic_spread_score > 50:
            factor_evidence.append((score.geographic_spread_score, f"Beneficiary geographic dispersion above normal range"))

        # Cluster association — only if actually in a cluster
        if score.cluster_association_score > 30:
            factor_evidence.append((score.cluster_association_score + 20, f"Linked to coordinated supplier network — possible shell company ring under common control"))

        # Peer deviation / Z-score analysis
        if score.llm_context_score > 70:
            factor_evidence.append((score.llm_context_score, f"Extreme peer deviation: billing {score.llm_context_score:.0f}th percentile vs state peer group mean — statistical outlier consistent with shell company billing patterns"))
        elif score.llm_context_score > 50:
            factor_evidence.append((score.llm_context_score, f"Above-average peer deviation ({score.llm_context_score:.0f}th percentile) — billing significantly above state peer group baseline"))

        # Enrollment recency — check if new entity (shell acquisition indicator)
        if supplier.enrollment_date:
            months_since = (datetime.datetime.utcnow() - supplier.enrollment_date).days / 30
            if months_since < 18 and score.composite_score > 60:
                factor_evidence.append((80, f"Recently acquired entity (enrolled {months_since:.0f} months ago) with disproportionately high billing — consistent with shell company weaponization"))

        # Sort by score (highest contributing factors first) and extract evidence strings
        factor_evidence.sort(key=lambda x: x[0], reverse=True)
        evidence = [e[1] for e in factor_evidence]

        top_reasons = evidence[:3] if evidence else ["Composite anomaly score exceeds threshold"]

        # Build a varied summary based on the TOP reason type
        top_reason_short = top_reasons[0] if top_reasons else "Anomaly score exceeds threshold"
        summary = f"Risk score {score.composite_score:.0f}/100 — {top_reason_short}"

        # Determine alert type
        cluster = db.query(SupplierCluster).filter(
            SupplierCluster.supplier_npi == supplier.npi
        ).first()
        alert_type = "cluster" if cluster else "individual"

        # Generate LLM narrative for top alerts
        if score.composite_score >= 60:
            claims = db.query(Claim).filter(Claim.supplier_npi == supplier.npi).limit(10).all()
            supplier_data = {
                "npi": supplier.npi,
                "name": supplier.name,
                "state": supplier.state,
                "city": supplier.city,
                "enrollment_date": supplier.enrollment_date.isoformat() if supplier.enrollment_date else None,
            }
            claims_data = [
                {"hcpcs": c.hcpcs_code, "billed": c.billed_amount, "narrative": c.medical_necessity_text}
                for c in claims
            ]
            narrative = llm.analyze_supplier(supplier_data, claims_data, {"avg_billed": 5000})
        else:
            narrative = f"Supplier {supplier.name} shows moderate risk indicators. Continued monitoring recommended."

        alert = Alert(
            supplier_npi=supplier.npi,
            alert_type=alert_type,
            risk_score=score.composite_score,
            risk_level=score.risk_level,
            title=f"{supplier.name} — {score.risk_level.upper()} Risk",
            summary=summary,
            evidence=evidence,
            llm_narrative=narrative,
            top_reasons=top_reasons,
            status="new",
        )
        db.add(alert)

    db.flush()
    print(f"[Seed] Generated {len(scores)} alerts")


def _print_summary(db: Session):
    """Print a summary of seeded data."""
    from sqlalchemy import func

    total_suppliers = db.query(Supplier).count()
    real_suppliers = db.query(Supplier).filter(Supplier.is_synthetic == False).count()
    total_claims = db.query(Claim).count()
    total_alerts = db.query(Alert).count()
    critical_alerts = db.query(Alert).filter(Alert.risk_level == "critical").count()
    clusters = db.query(func.max(SupplierCluster.cluster_id)).scalar() or 0

    print("\n" + "=" * 50)
    print("  SKY SENTINEL — SEED DATA SUMMARY")
    print("  Operation Gold Rush-Inspired Scenarios")
    print("=" * 50)
    print(f"  Suppliers:       {total_suppliers} ({real_suppliers} real CMS, {total_suppliers - real_suppliers} synthetic)")
    print(f"  Claims:          {total_claims}")
    print(f"  Alerts:          {total_alerts} ({critical_alerts} critical)")
    print(f"  Clusters:        {clusters}")
    print("=" * 50 + "\n")


if __name__ == "__main__":
    seed_database()
