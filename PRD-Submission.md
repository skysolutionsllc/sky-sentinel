# 🛡️ Sky Sentinel — Product Requirements Document (PRD)

## AI-Augmented Fraud, Waste & Abuse Detection for Medicare DME Claims

---

| Field | Detail |
|---|---|
| **Product Name** | Sky Sentinel |
| **Hackathon** | ACT-IAC AI Hackathon: AI in Action |
| **Event Date** | March 27, 2026 — Carahsoft Conference Center, Reston VA |
| **Sprint Period** | March 12 – March 26, 2026 (14-day build) |
| **Team** | Team 1 — CMS Support Staff |
| **Use Case** | CMS Proactive Program Integrity: Provider Behavior Pattern Detection |
| **Scope** | Durable Medical Equipment (DME) Supplier Fraud Detection |
| **Demo Format** | 5-minute live demo + GitHub repository presentation |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Criteria](#3-goals--success-criteria)
4. [Target Users](#4-target-users)
5. [Solution Overview](#5-solution-overview)
6. [What LLMs Can Catch That Traditional ML Cannot](#6-what-llms-can-catch-that-traditional-ml-cannot)
7. [System Architecture](#7-system-architecture)
8. [Application 1: DME Claims Portal (Claim Simulator)](#8-application-1-dme-claims-portal)
9. [Application 2: Sky Sentinel Platform (AI Dashboard)](#9-application-2-sky-sentinel-platform)
10. [Data Model & Database Design](#10-data-model--database-design)
11. [AI/ML Pipeline](#11-aiml-pipeline)
12. [Core Use Cases](#12-core-use-cases)
13. [Human-in-the-Loop Workflow](#13-human-in-the-loop-workflow)
14. [Functional Requirements](#14-functional-requirements)
15. [Non-Functional Requirements](#15-non-functional-requirements)
16. [Demo Storyline](#16-demo-storyline)
17. [Hackathon Judging Alignment](#17-hackathon-judging-alignment)
18. [Technology Stack](#18-technology-stack)
19. [Repository Structure & README Strategy](#19-repository-structure--readme-strategy)
20. [Risk Register](#20-risk-register)
21. [Future Roadmap](#21-future-roadmap)

---

## 1. Executive Summary

**Sky Sentinel** is a hackathon MVP that demonstrates how modern AI — specifically Large Language Models (LLMs) and advanced anomaly detection — can **proactively detect fraud, waste, and abuse (FWA)** in Medicare Durable Medical Equipment (DME) claims.

Today's fraud detection landscape in Medicare relies heavily on traditional machine learning — statistical models, rule-based systems, and threshold-based outlier detection. These approaches, well-documented in [GAO reports](https://www.gao.gov/products/gao-17-710) and [CMS program integrity publications](https://www.cms.gov/about-cms/components/cpi), are effective at finding **individual providers with obvious billing spikes**. However, as noted by the HHS Office of Inspector General and academic research, they struggle to detect **complex, evolving, and coordinated fraud schemes** specifically designed to fly under per-supplier thresholds.

Sky Sentinel is designed to **complement existing detection infrastructure** — not replace it — by adding a modern AI intelligence layer that:

- Uses **LLMs to analyze unstructured context** (claim narratives, medical necessity justifications, policy documents)
- Employs **cluster-based anomaly detection** to expose coordinated billing patterns distributed across multiple NPIs
- Puts **investigators in control** through a Human-in-the-Loop interface where they can define patterns, adjust thresholds, test hypotheses, and make final decisions
- Generates **explainable, evidence-backed alerts** that integrate into program integrity workflows

The project consists of **two web applications** designed to tell a compelling demo story:

1. **DME Claims Portal** — A simplified claim submission interface that simulates how DME claims enter the system
2. **Sky Sentinel Dashboard** — The AI-powered investigation platform where analysts review alerts, explore patterns, and take action

---

## 2. Problem Statement

### 2a. The Scale of the Problem

Medicare fraud, waste, and abuse cost the U.S. government an estimated **$60+ billion annually** ([CMS National Health Expenditure Data](https://www.cms.gov/data-research/statistics-trends-and-reports/national-health-expenditure-data)). DME fraud is one of the most targeted categories because:

- DME items (wheelchairs, oxygen equipment, CPAP machines, orthotics) are **high-value, easy to fabricate claims for**
- Beneficiaries are often **elderly or mobility-impaired** and less likely to detect fraudulent orders
- **Telemedicine exploitation** has created a pipeline where cold-call marketers solicit seniors for "free" equipment, then bill Medicare using fraudulent prescriptions
- Suppliers can operate as **shell companies** that bill aggressively and dissolve before detection

### 2b. Limitations of Traditional ML-Based Fraud Detection

Per publicly available research from the GAO, HHS-OIG, and academic literature, traditional machine learning approaches to Medicare fraud detection have well-documented limitations:

| Limitation | Description |
|---|---|
| **Black-box models** | Algorithms produce flags without clear reasoning, making it hard for investigators to trust, validate, or build legal cases |
| **High false positive rate** | Without clinical or contextual understanding, legitimate high-cost providers get flagged alongside true bad actors |
| **Static rules** | Predefined thresholds can't adapt quickly to evolving fraud schemes without manual reprogramming |
| **Structured data only** | Traditional systems analyze billing codes and dollar amounts but cannot understand claim narratives, medical justifications, or policy language |
| **Single-supplier focus** | Traditional models flag individual providers exceeding thresholds but miss coordinated fraud distributed across multiple NPIs |
| **Reactive posture** | Many improper payments are identified only after payment ("pay and chase"), leading to costly recovery efforts |
| **Data imbalance** | Fraudulent claims represent a tiny fraction of total volume, making it hard for standard ML to train effectively |

> **Sources:** GAO-17-710, HHS-OIG Semi-Annual Reports, Florida Atlantic University ML research (2024), Milliman/CMS explainable AI publications

### 2c. The Opportunity for AI Augmentation

Modern AI — particularly LLMs and advanced clustering — can address these gaps by:

- **Understanding context and semantics** in unstructured data (claim notes, medical necessity language, policy documents)
- **Identifying multi-entity coordination** through behavioral similarity analysis across supplier clusters
- **Generating human-readable explanations** for every alert
- **Adapting dynamically** to new fraud patterns without manual rule creation
- **Reducing false positives** by incorporating broader context (geography, specialty, patient demographics)

---

## 3. Goals & Success Criteria

### Primary Goals

| Goal | Metric |
|---|---|
| Detect obvious individual supplier anomalies | System surfaces high-risk suppliers with explainable risk scores |
| Detect coordinated multi-NPI fraud patterns | System identifies behaviorally similar supplier clusters that collectively exceed concern levels |
| Demonstrate LLM-powered contextual analysis | System uses LLMs to analyze claim narratives and generate natural-language explanations |
| Enable Human-in-the-Loop investigation | Investigators can define patterns, adjust thresholds, test hypotheses, and validate alerts |
| Tell a compelling 5-minute demo story | Demo walks through both simple and complex fraud scenarios with clear narrative flow |
| Produce a strong GitHub repository | README is comprehensive with architecture diagrams, setup instructions, and demo walkthrough |

### Success Criteria for Hackathon

- [ ] Working live demo with two connected applications
- [ ] At least 2 distinct fraud scenarios demonstrated (individual + coordinated)
- [ ] Explainable AI outputs on every alert
- [ ] Human-in-the-Loop controls are functional and demo-ready
- [ ] Repository README is presentation-quality

---

## 4. Target Users

| User Persona | Role | How They Use Sky Sentinel |
|---|---|---|
| **Program Integrity Analyst** | CMS / contracted integrity staff | Reviews ranked supplier alerts, drills into risk scores, validates or dismisses flagged suppliers |
| **Senior Investigator** | Supervisory / lead analyst | Defines suspicious patterns, tests hypotheses, adjusts anomaly thresholds, manages case escalation |
| **CMS Leadership** | Program managers and executives | Views dashboard summaries, understands AI-driven detection ROI, makes decisions about system deployment |

---

## 5. Solution Overview

Sky Sentinel operates as a **complementary intelligence layer** that enhances existing fraud detection capabilities:

```
┌─────────────────────────────────────────────────────────────────┐
│                     MEDICARE CLAIMS ECOSYSTEM                    │
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐ │
│  │  DME Claims   │────▶│  Existing    │────▶│  Case Management │ │
│  │  Portal       │     │  Detection   │     │  & Investigation │ │
│  │  (Hackathon   │     │  Systems     │     │  Workflows       │ │
│  │   Simulator)  │     │  (Trad. ML)  │     │                  │ │
│  └──────┬───────┘     └──────────────┘     └──────────────────┘ │
│         │                                                        │
│         │  Claims also flow to...                                │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    SKY SENTINEL                            │   │
│  │                                                            │   │
│  │  ┌────────────┐  ┌─────────────┐  ┌───────────────────┐  │   │
│  │  │ AI Engine  │  │ LLM Context │  │ Human-in-the-Loop │  │   │
│  │  │ Anomaly    │  │ Analysis    │  │ Investigation     │  │   │
│  │  │ Detection  │  │ Engine      │  │ Controls          │  │   │
│  │  └────────────┘  └─────────────┘  └───────────────────┘  │   │
│  │                                                            │   │
│  │  ┌────────────────────────────────────────────────────┐   │   │
│  │  │  Explainable Alert Dashboard with Risk Scores      │   │   │
│  │  └────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### How Sky Sentinel Enhances Traditional Detection

| Capability | Traditional ML Systems | Sky Sentinel (LLM-Augmented AI) |
|---|---|---|
| Individual outlier detection | ✅ Core strength | ✅ Also does this |
| Coordinated multi-NPI detection | ❌ Not designed for this | ✅ **Key differentiator** |
| Unstructured data analysis | ❌ Structured claims only | ✅ LLM reads narratives, justifications, policy |
| Explainable outputs | ❌ Black-box scores | ✅ Natural-language reasoning |
| Dynamic pattern definition | ❌ Static rules | ✅ Investigator-defined patterns |
| Hypothesis testing | ❌ Not available | ✅ "What-if" scenario analysis |
| Adaptive learning | ❌ Requires manual retraining | ✅ LLMs can reason about novel patterns |

---

## 6. What LLMs Can Catch That Traditional ML Cannot

This is the **core thesis of Sky Sentinel** — that modern LLMs bring capabilities fundamentally beyond what traditional ML offers. Here are the specific fraud patterns and detection methods LLMs unlock:

### 6a. Semantic Analysis of Claim Narratives

**What traditional systems do:** Look at HCPCS codes and dollar amounts.
**What LLMs add:** Read the actual text of claims — medical necessity justifications, physician notes, prior authorization language — and identify inconsistencies.

> **Example:** A claim for a power wheelchair (HCPCS K0856, ~$30,000) includes a medical necessity statement that says "patient needs mobility assistance for daily activities." An LLM can flag that this generic justification doesn't match the clinical threshold required for a Group 3 power wheelchair, which requires documentation of specific neuromuscular conditions.

### 6b. Cross-Referencing Claims Against CMS Policy Documents

**What traditional systems do:** Apply static coded rules.
**What LLMs add:** Ingest CMS Local Coverage Determinations (LCDs), National Coverage Determinations (NCDs), and DME MAC policies, then check whether a claim's documentation actually satisfies the policy requirements.

> **Example:** An LLM can read the LCD for Oxygen Equipment (L33797) and determine that a supplier's claim doesn't include the required qualifying arterial blood gas test results, even though the ICD-10 code on the claim technically maps to a covered condition.

### 6c. Detecting Coordinated Language Patterns Across Suppliers

**What traditional systems do:** Analyze each supplier independently.
**What LLMs add:** Compare the text and language patterns across claims from multiple suppliers and flag when different NPIs are submitting suspiciously similar or templated justification language.

> **Example:** Three different DME suppliers in the same metro area all submit claims with nearly identical medical necessity statements — word-for-word or with minor variations. This suggests a shared template or common fraudulent operation behind multiple shell companies. An LLM can detect this textual similarity that structured ML would never see.

### 6d. Contextual Anomaly Scoring

**What traditional systems do:** Generate a numeric risk score with limited explanation.
**What LLMs add:** Produce a **narrative risk assessment** that explains in plain English why a supplier or cluster is suspicious, what specific evidence supports the flag, and what an investigator should look for next.

> **Example output from Sky Sentinel:**
> *"DME Supplier NPI-1234567 is flagged as HIGH RISK (score: 87/100). Key concerns: (1) 340% increase in CPAP equipment billing over 90 days with no corresponding increase in referring physicians, (2) 94% of beneficiaries are located 100+ miles from the supplier's listed address, (3) Medical necessity justifications across 47 claims use nearly identical language suggesting templated documentation. Recommended action: Escalate for coordinated review with NPIs 2345678 and 3456789, which show similar behavioral patterns."*

### 6e. Emerging Scheme Detection Through Reasoning

**What traditional systems do:** Detect patterns they were trained on.
**What LLMs add:** Can **reason about novel patterns** by understanding the underlying logic of fraud — even patterns never seen before.

> **Example:** A new fraud scheme emerges where suppliers bill for Continuous Glucose Monitors (CGMs) under DME codes but the beneficiaries have no diabetes diagnosis in their claims history. An LLM can cross-reference the DME claim against the beneficiary's diagnosis history and flag the logical inconsistency, even if this specific pattern was never in the training data.

### 6f. Investigator Query Interface (Natural Language)

**What traditional systems provide:** Dashboards with predefined filters.
**What LLMs add:** Investigators can ask questions in natural language:
- *"Show me all DME suppliers in Florida that started billing for Group 3 power wheelchairs in the last 90 days and were incorporated less than 12 months ago"*
- *"Which supplier clusters in Texas show synchronized billing growth for the same HCPCS codes?"*
- *"Compare this supplier's medical necessity documentation against the LCD requirements for this procedure"*

---

## 7. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                        │
│                                                          │
│  ┌───────────────────┐    ┌───────────────────────────┐ │
│  │  DME Claims Portal │    │  Sky Sentinel Dashboard   │ │
│  │  (React/Vite)      │    │  (React/Vite)             │ │
│  │                     │    │                           │ │
│  │  • Claim Form       │    │  • Alert Rankings         │ │
│  │  • Claim History    │    │  • Risk Heatmap           │ │
│  │  • Status Tracking  │    │  • Supplier Drill-Down    │ │
│  │                     │    │  • Cluster View           │ │
│  │                     │    │  • HITL Controls          │ │
│  │                     │    │  • Natural Language Query  │ │
│  └────────┬────────────┘    └────────────┬──────────────┘ │
│           │                              │                │
└───────────┼──────────────────────────────┼────────────────┘
            │          REST API            │
            ▼                              ▼
┌─────────────────────────────────────────────────────────┐
│                    BACKEND LAYER                         │
│                    (Python + FastAPI)                     │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ Claims API   │  │ Analytics    │  │ AI/LLM        │ │
│  │              │  │ Engine       │  │ Service        │ │
│  │ • Submit     │  │              │  │               │ │
│  │ • Query      │  │ • Peer Group │  │ • Anomaly     │ │
│  │ • Status     │  │ • Baselines  │  │   Detection   │ │
│  │              │  │ • Trends     │  │ • LLM Context │ │
│  │              │  │ • Scoring    │  │   Analysis    │ │
│  │              │  │              │  │ • Cluster     │ │
│  │              │  │              │  │   Detection   │ │
│  │              │  │              │  │ • NL Query    │ │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘ │
│         │                 │                   │         │
│         ▼                 ▼                   ▼         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              SQLite Database                      │   │
│  │  Claims | Suppliers | Alerts | Patterns | Scores  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Application 1: DME Claims Portal

### Purpose

A **simplified claim submission web app** that simulates how DME claims enter the Medicare ecosystem. This exists to **tell the demo story** — an investigator shows how a claim is filed, then switches to Sky Sentinel to show how the AI catches problems.

### Pages & Features

| Page | Features |
|---|---|
| **Claim Submission Form** | Provider NPI, Beneficiary ID, HCPCS code(s), diagnosis codes, billing amounts, medical necessity narrative, referring physician |
| **Claim History** | List of submitted claims with status (Pending, Approved, Flagged, Denied) |
| **Claim Detail** | Full claim view showing all fields, AI processing status, and link to Sky Sentinel alert (if flagged) |

### Key Design Decisions

- **Realistic but simplified** — Uses real CMS field names and HCPCS codes but doesn't require real provider enrollment
- **Pre-seeded data** — Database comes pre-loaded with synthetic claims including clean claims and embedded fraud scenarios
- **Real-time integration** — When a claim is submitted, it's immediately analyzed by Sky Sentinel's AI engine, and the status updates in real-time
- **Visual status indicators** — Green (clean), Yellow (monitoring), Red (flagged) badges on claims

---

## 9. Application 2: Sky Sentinel Platform

### Purpose

The **core AI-powered investigation dashboard** where analysts review alerts, explore patterns, and take action. This is where Sky Sentinel's intelligence lives.

### Pages & Features

#### 9a. Alert Dashboard (Home)

- **Ranked alert cards** — Suppliers sorted by composite risk score (0–100)
- **Risk distribution heatmap** — Geographic visualization of risk concentration
- **Summary statistics** — Total alerts, high/medium/low risk counts, new alerts since last session
- **Quick filters** — By risk level, geography, HCPCS category, time period
- **Alert cards show:**
  - Supplier name and NPI
  - Risk score with color coding
  - Top 3 anomaly reasons (one-line summaries)
  - Trend sparkline (billing over time)
  - Action buttons (Review, Dismiss, Escalate)

#### 9b. Supplier Drill-Down View

- **Provider profile** — NPI, name, specialty, geography, enrollment date
- **Risk score breakdown** — Visual decomposition of what's contributing to the score
  - Billing volume vs. peers
  - Growth rate anomaly
  - HCPCS mix deviation
  - Geographic beneficiary spread
  - LLM contextual findings
- **Time-series charts** — Billing trends overlaid with peer baselines
- **Peer comparison** — Side-by-side metrics against similar suppliers
- **Claim samples** — Drill into individual claims that triggered alerts
- **LLM Narrative Analysis** — AI-generated explanation of why this supplier is suspicious, written in plain English
- **Action panel** — Classify as Valid Concern / False Positive / Monitor; add investigator notes; escalate for further investigation

#### 9c. Cluster Detection View

- **Cluster map** — Visual network of behaviorally similar suppliers
- **Cluster risk score** — Collective score for the group
- **Shared attributes** — What makes these suppliers similar (geography, HCPCS overlap, growth trajectory, language patterns)
- **Cluster timeline** — Synchronized billing patterns across cluster members
- **Individual member drill-down** available from cluster view
- **LLM cluster narrative** — AI explains the cluster pattern in natural language

#### 9d. Human-in-the-Loop Investigation Controls

- **Pattern Builder** — Define suspicious patterns using configurable criteria:
  - Growth rate thresholds
  - HCPCS category focus
  - Geographic concentration
  - Billing volume thresholds
  - Supplier age filters
  - Peer deviation sensitivity
- **Threshold Tuner** — Slider controls to adjust anomaly sensitivity for each dimension
- **Hypothesis Tester** — "What-if" mode where investigators define a pattern and the system shows which suppliers match
- **Before/After Comparison** — Side-by-side view of alert populations before and after threshold changes
- **Decision Logger** — Records investigator decisions for future model refinement

#### 9e. AI Query Interface

- **Natural language search bar** where investigators can ask questions in plain English
- LLM processes the query and returns relevant suppliers, patterns, or analytics
- Query history sidebar for reference
- Suggested queries based on current alert population

---

## 10. Data Model & Database Design

### SQLite Schema Overview

```sql
-- Core entities
suppliers        -- DME supplier profiles (NPI, name, specialty, geography, enrollment date)
beneficiaries    -- Medicare beneficiary profiles (synthetic)
claims           -- Individual claim records
claim_lines      -- Line items within claims (HCPCS, amounts, dates)

-- Analytics
supplier_metrics     -- Aggregated supplier-level metrics per period
peer_groups          -- Peer cohort definitions
peer_baselines       -- Baseline metrics for each peer group
anomaly_scores       -- Composite risk scores per supplier per period

-- Cluster Detection
supplier_clusters    -- Cluster assignments
cluster_scores       -- Cluster-level risk scores
cluster_attributes   -- Shared attributes defining each cluster

-- Human-in-the-Loop
investigation_patterns  -- Investigator-defined pattern criteria
pattern_results         -- Results of pattern tests
investigator_actions    -- Decision log (valid/false positive/monitor)
threshold_configs       -- Saved threshold configurations

-- AI/LLM
llm_analyses         -- LLM-generated narrative analyses per supplier/cluster
alert_explanations   -- Explainable AI outputs tied to alerts
query_history        -- Natural language query log
```

### Synthetic Data Strategy

The database will be **pre-seeded with synthetic data** that includes:

1. **~300 clean DME suppliers** with normal billing patterns across various geographies
2. **~15 suppliers with individually suspicious patterns** (billing spikes, unusual HCPCS mix, geographic anomalies)
3. **~20 suppliers forming 3-4 coordinated clusters** (synchronized growth, shared HCPCS categories, geographic overlap, similar incorporation dates)
4. **~5,000 synthetic claims** distributed across all suppliers
5. **Synthetic medical necessity narratives** — including both legitimate and templated/suspicious text

---

## 11. AI/ML Pipeline

### 11a. Anomaly Detection Layer (Statistical/ML)

| Method | Purpose |
|---|---|
| **Isolation Forest** | Detects individual supplier outliers based on billing patterns |
| **Z-score / Peer Deviation** | Measures how far a supplier deviates from their specialty-geography peer group |
| **Time-series anomaly detection** | Identifies sudden billing spikes, trend breaks, and seasonal deviations |
| **DBSCAN / Hierarchical clustering** | Groups behaviorally similar suppliers to detect coordinated patterns |

### 11b. LLM Analysis Layer

| Capability | Implementation |
|---|---|
| **Claim narrative analysis** | LLM reads medical necessity text and flags templated, generic, or inconsistent language |
| **Policy compliance check** | LLM cross-references claims against CMS LCD/NCD requirements |
| **Cross-supplier text similarity** | LLM compares justification language across multiple NPIs to detect shared templates |
| **Explainable alert generation** | LLM produces natural-language explanations for each alert |
| **Natural language query processing** | LLM converts investigator questions into database queries and returns results |
| **Cluster narrative generation** | LLM explains why a group of suppliers appears coordinated |

### 11c. Composite Risk Scoring

The risk score (0–100) is a weighted combination of:

| Factor | Weight | Source |
|---|---|---|
| Billing volume vs. peers | 20% | Statistical analysis |
| Growth rate anomaly | 20% | Time-series analysis |
| HCPCS mix deviation | 15% | Peer comparison |
| Geographic spread anomaly | 15% | Geographic analysis |
| LLM contextual findings | 15% | LLM analysis |
| Cluster association score | 15% | Cluster detection |

---

## 12. Core Use Cases

### Use Case 1: Individual Supplier Anomaly Detection

**Scenario:** A single DME supplier shows a 340% increase in CPAP equipment billing over 90 days with no corresponding increase in referring physicians. Their beneficiaries are geographically scattered across 15 states despite the supplier being located in a single metro area.

**Sky Sentinel detects:**
- Billing volume 4.3x peer average (Isolation Forest + Z-score)
- Growth rate exceeds 99th percentile for peer group
- Beneficiary geographic dispersion ratio: 0.89 (peers average 0.15)
- Medical necessity narratives are 92% textually similar across claims (LLM detection)

**Investigator action:** Reviews the alert, sees the evidence, classifies as Valid Concern, escalates for further investigation with the AI-generated evidence package.

### Use Case 2: Coordinated Multi-NPI Billing Pattern (Inspired by Public DOJ Case)

**Scenario:** Based on publicly reported DOJ enforcement actions — criminal organizations have been known to purchase dozens of DME companies, use nominee owners, and rapidly bill through those entities. When one is shut down, they replace it with another.

**Sky Sentinel detects:**
- DBSCAN identifies a cluster of 7 DME suppliers incorporated within 4 months of each other
- All 7 bill overlapping HCPCS categories (orthotics, wheelchairs, CGMs)
- Synchronized 500%+ growth trajectory across all 7 entities
- No single supplier exceeds traditional detection thresholds individually
- LLM finds near-identical medical necessity language across all 7 NPIs
- Collective cluster risk score: 94/100

**Investigator action:** Uses HITL controls to test the cluster pattern against the broader dataset, finds 3 additional NPIs matching the pattern that weren't in the initial cluster. Escalates the full group for further investigation.

### Use Case 3: Telemedicine-Linked DME Fraud

**Scenario:** A DME supplier's claims show that 85% of their referring physicians are telemedicine-only providers. The LLM analysis reveals that the medical necessity documentation references "virtual consultation" but includes physical examination findings that could not have been obtained remotely.

**Sky Sentinel detects:**
- High telemedicine referral concentration (statistical)
- Documentation inconsistency (LLM: references physical exam findings in telehealth context)
- Referring physician network is suspiciously narrow (3 physicians account for 90% of referrals)

---

## 13. Human-in-the-Loop Workflow

```
┌──────────────────────────────────────────────────────────┐
│                    INVESTIGATION WORKFLOW                  │
│                                                            │
│  ┌─────────┐    ┌──────────┐    ┌──────────┐             │
│  │ AI/ML   │───▶│ Ranked   │───▶│ Analyst  │             │
│  │ Engine  │    │ Alerts   │    │ Review   │             │
│  │ detects │    │ surface  │    │ + HITL   │             │
│  └─────────┘    └──────────┘    └────┬─────┘             │
│                                      │                    │
│                    ┌─────────────────┼──────────────┐    │
│                    ▼                 ▼              ▼    │
│              ┌──────────┐    ┌──────────┐    ┌────────┐ │
│              │ Valid     │    │ False    │    │Monitor │ │
│              │ Concern   │    │ Positive │    │        │ │
│              └────┬─────┘    └────┬─────┘    └───┬────┘ │
│                   │               │               │      │
│                   ▼               ▼               ▼      │
│              ┌──────────┐   ┌──────────┐   ┌──────────┐ │
│              │ Escalate │   │ Dismiss  │   │ Continue │ │
│              │ for      │   │ + Log    │   │ Tracking │ │
│              │ Review   │   │          │   │          │ │
│              └──────────┘   └──────────┘   └──────────┘ │
│                                                          │
│  All decisions feed back into model refinement ◀────────│
└──────────────────────────────────────────────────────────┘
```

### Key HITL Principles

1. **AI suggests, humans decide** — The system never auto-blocks or auto-approves; every action requires investigator confirmation
2. **Transparent reasoning** — Every AI output includes its evidence and reasoning chain
3. **Adjustable sensitivity** — Investigators control the aggressiveness of detection
4. **Hypothesis testing** — Investigators can test "what-if" scenarios before committing to threshold changes
5. **Decision audit trail** — Every investigator action is logged for compliance and model improvement

---

## 14. Functional Requirements

### 14a. Claims Portal (App 1)

| ID | Requirement | Priority |
|---|---|---|
| CP-01 | Submit a new DME claim with all required fields | Must Have |
| CP-02 | View claim submission history with status indicators | Must Have |
| CP-03 | Display real-time status updates (Pending → Processing → Flagged/Clean) | Must Have |
| CP-04 | Pre-seed database with synthetic claims including fraud scenarios | Must Have |
| CP-05 | Support HCPCS code lookup/autocomplete | Nice to Have |

### 14b. Sky Sentinel Dashboard (App 2)

| ID | Requirement | Priority |
|---|---|---|
| SS-01 | Display ranked supplier alerts with composite risk scores | Must Have |
| SS-02 | Supplier drill-down with risk score breakdown and trend charts | Must Have |
| SS-03 | LLM-generated narrative explanations for each flagged supplier | Must Have |
| SS-04 | Cluster detection view showing coordinated supplier groups | Must Have |
| SS-05 | HITL pattern builder for investigator-defined detection criteria | Must Have |
| SS-06 | HITL threshold tuner with real-time result preview | Must Have |
| SS-07 | Hypothesis testing mode ("what-if" scenarios) | Must Have |
| SS-08 | Investigator action panel (Valid/False Positive/Monitor + notes) | Must Have |
| SS-09 | Geographic risk heatmap | Should Have |
| SS-10 | Time-series peer comparison charts | Should Have |
| SS-11 | Natural language query interface | Should Have |
| SS-12 | Before/after threshold comparison view | Should Have |
| SS-13 | Decision audit log | Nice to Have |

### 14c. Backend / AI

| ID | Requirement | Priority |
|---|---|---|
| BE-01 | FastAPI REST API serving both frontend apps | Must Have |
| BE-02 | SQLite database with pre-seeded synthetic data | Must Have |
| BE-03 | Anomaly detection pipeline (Isolation Forest + Z-score) | Must Have |
| BE-04 | Supplier peer grouping by specialty and geography | Must Have |
| BE-05 | Cluster detection for multi-NPI pattern identification (DBSCAN) | Must Have |
| BE-06 | LLM integration for claim narrative analysis | Must Have |
| BE-07 | LLM integration for explainable alert generation | Must Have |
| BE-08 | Composite risk scoring engine | Must Have |
| BE-09 | LLM natural language query processing | Should Have |
| BE-10 | Policy document ingestion for compliance checking | Nice to Have |

---

## 15. Non-Functional Requirements

| Requirement | Specification |
|---|---|
| **Performance** | Dashboard loads in < 3 seconds; alert ranking computes in < 5 seconds |
| **Data Privacy** | No real PHI or PII — all synthetic data |
| **Explainability** | Every AI output includes reasoning chain visible to user |
| **Accessibility** | Basic WCAG compliance (color contrast, keyboard navigation) |
| **Portability** | Runs locally with `docker-compose up` or `npm run dev` + `uvicorn` |
| **Responsible AI** | Fairness review across geography and specialty; no automated enforcement actions |

---

## 16. Demo Storyline

> **Designed for a 5-minute live demo that tells a compelling story**

### Act 1: "The Claim" (1 minute)

*Narrator opens the DME Claims Portal*

> "Every day, thousands of DME claims flow into Medicare. Let me show you one."

- Submits a DME claim for a power wheelchair with a generic medical necessity statement
- Shows the claim appearing in the system as "Processing"
- Cuts to Sky Sentinel to show it being analyzed in real-time

### Act 2: "The Obvious Bad Actor" (1.5 minutes)

*Narrator opens Sky Sentinel Dashboard*

> "Traditional detection systems are great at catching this — a single supplier with a billing spike. But let me show you what our AI adds on top."

- Shows the top alert: a supplier with 340% billing growth
- Drills into the supplier view — risk score breakdown, peer comparison, trend chart
- Highlights the **LLM narrative explanation**: "This supplier's medical necessity statements are 92% textually identical across 47 claims, suggesting templated documentation."
- Shows the AI's recommended next action

### Act 3: "The Hidden Network" (2 minutes)

*Narrator navigates to Cluster Detection*

> "But here's what traditional systems miss. None of these 7 suppliers individually look suspicious. Each one is just below the threshold. But together..."

- Shows the cluster view: 7 connected suppliers
- Highlights shared attributes: same geography, overlapping HCPCS codes, synchronized growth
- Shows the LLM's cluster narrative explaining the coordinated pattern
- **This is the key differentiator moment** — shows what traditional ML couldn't detect

### Act 4: "Investigator in Control" (0.5 minutes)

*Narrator uses HITL controls*

> "The investigator isn't just reviewing alerts. They're shaping the detection."

- Adjusts a threshold, shows the cluster expanding to include 3 more NPIs
- Classifies the pattern as Valid Concern
- Clicks "Escalate" — the investigation package is ready

---

## 17. Hackathon Judging Alignment

| Judging Criteria | How Sky Sentinel Addresses It |
|---|---|
| **Mission Alignment** | Directly addresses CMS Program Integrity's #1 challenge — proactive DME fraud detection. Designed to complement existing detection infrastructure. |
| **Responsible AI** | Full explainability on every alert. Human-in-the-loop design ensures no automated enforcement. Fairness considerations built in. |
| **Scalability** | Cloud-native architecture (containerized). SQLite for hackathon, designed for PostgreSQL/cloud DB in production. API-first design supports future integration. |
| **Innovation** | First-of-kind LLM integration for Medicare fraud — analyzes unstructured claim narratives, detects cross-supplier language patterns, enables natural language investigation queries. |
| **Technical Soundness** | Multi-layer detection (statistical + ML + LLM). Composite risk scoring with transparent weights. Peer grouping and baseline methodology grounded in CMS data practices. |
| **Demo Clarity** | Clear narrative arc: claim → individual detection → coordinated detection → investigator control. Visual, interactive, memorable. |

---

## 18. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | React (Vite) | Fast setup, component-based UI, excellent for dashboards |
| **Styling** | Vanilla CSS with CSS variables | Maximum control, no framework overhead |
| **Charts** | Recharts or Chart.js | Simple, well-documented charting for trends and comparisons |
| **Map** | react-simple-maps or Leaflet | Geographic heatmap for risk distribution |
| **Backend** | Python + FastAPI | Fast to build, excellent for AI/ML integration, async support |
| **Database** | SQLite | Zero-config, single-file, perfect for hackathon portability |
| **ORM** | SQLAlchemy | Pythonic database access, easy migration to PostgreSQL later |
| **AI/ML** | scikit-learn | Isolation Forest, DBSCAN, statistical analysis |
| **LLM** | OpenAI API (GPT-4) or Claude API | Narrative analysis, explainability, NL query processing |
| **Data** | Pandas + NumPy | Data processing, synthetic data generation |
| **Containerization** | Docker + docker-compose | One-command setup for judges and demo |

---

## 19. Repository Structure & README Strategy

### Proposed Repository Structure

```
sky-sentinel/
├── README.md                    # Comprehensive, presentation-quality README
├── docker-compose.yml           # One-command startup
├── .env.example                 # Environment variables template
│
├── claims-portal/               # App 1: DME Claims Portal
│   ├── package.json
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.jsx
│   └── public/
│
├── dashboard/                   # App 2: Sky Sentinel Dashboard  
│   ├── package.json
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.jsx
│   └── public/
│
├── backend/                     # FastAPI Backend
│   ├── requirements.txt
│   ├── main.py                  # App entry point
│   ├── api/                     # Route handlers
│   │   ├── claims.py
│   │   ├── alerts.py
│   │   ├── suppliers.py
│   │   ├── clusters.py
│   │   └── investigation.py
│   ├── models/                  # SQLAlchemy models
│   ├── services/                # Business logic
│   │   ├── anomaly_detection.py
│   │   ├── cluster_detection.py
│   │   ├── risk_scoring.py
│   │   └── llm_service.py
│   ├── data/                    # Synthetic data generation
│   │   ├── seed_data.py
│   │   └── synthetic_claims.py
│   └── db/
│       └── sky_sentinel.db      # SQLite database
│
├── docs/                        # Documentation
│   ├── architecture.md
│   ├── data-model.md
│   └── demo-script.md
│
└── assets/                      # Source documents and images
    ├── architecture-diagram.png
    └── ...
```

### README Strategy

The README must be **presentation-quality** — judges will browse it. Key sections:

1. **Hero section** — Project name, one-line description, key visual
2. **Problem Statement** — Why this matters (with public data points)
3. **Solution Overview** — What Sky Sentinel does (with architecture diagram)
4. **What Makes This Different** — The LLM advantage (the selling point)
5. **Quick Start** — `docker-compose up` and you're running
6. **Demo Walkthrough** — Screenshots of each demo step
7. **Technology Stack** — Clean table format
8. **Architecture Deep Dive** — Link to detailed architecture doc
9. **Team** — Contributors and roles
10. **Future Roadmap** — MVP → Pilot → Enterprise path
11. **Acknowledgments** — ACT-IAC, CMS, hackathon organizers

---

## 20. Risk Register

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| LLM API rate limits during demo | High | Medium | Pre-cache LLM responses for demo scenarios; implement fallback to cached results |
| Scope creep beyond DME | High | High | Strict scope discipline — DME suppliers only, 2 use cases |
| Dashboard UI not finished | Medium | Medium | Prioritize alert ranking + drill-down first; cluster view second; NL query last |
| Data doesn't look realistic | High | Medium | Invest time in realistic synthetic data; use real CMS HCPCS codes and geography |
| Live demo failure | High | Low | Pre-load all demo data; have backup screenshots and slides ready |
| LLM generates hallucinated content | Medium | Medium | Constrain LLM outputs to reference only data in the database; implement guardrails |
| Business impact unclear to judges | High | Medium | Tie every feature to "earlier detection, less waste, investigator efficiency" narrative |

---

## 21. Future Roadmap

> *How Sky Sentinel evolves from hackathon MVP to production system*

### Phase 1: Hackathon MVP (Current)
- DME supplier-level anomaly detection
- Coordinated cluster detection
- LLM narrative analysis
- HITL investigation controls
- Synthetic data demonstration

### Phase 2: Expanded Pilot
- Integration with real CMS Provider Utilization Data (public datasets)
- Claims-level real-time scoring (pre-payment)
- Beneficiary-level analysis
- DMEPOS fee schedule integration
- Expanded fraud scenarios beyond DME

### Phase 3: Production System
- FedRAMP-compliant deployment
- API integration with existing CMS detection and case management infrastructure
- Investigator feedback loops for continuous model improvement
- Network graph analysis of provider-beneficiary-physician relationships
- Multi-channel monitoring (Part B, Part D, DME)

### Phase 4: Enterprise Intelligence
- AI-assisted auto-documentation for investigations
- Predictive modeling for emerging fraud geography hotspots
- Cross-agency data fusion capabilities
- Real-time beneficiary protection alerts
- Policy impact analysis — how coverage determinations affect fraud patterns

---

> **Sky Sentinel: Moving Medicare program integrity from reactive review to proactive prevention — where AI amplifies human expertise, not replaces it.**
