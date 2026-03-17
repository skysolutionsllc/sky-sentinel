# IBM Fraud Detection Research — Ensemble of AI Models

**Source:** [Fraud Detection with AI: Ensemble of AI Models Improve Precision & Speed](https://youtu.be/Mo7JMC_oDlI) — IBM Technology (YouTube)

**Researched:** 2026-03-17

---

## Video Summary

IBM presents a **two-stage ensemble AI architecture** for detecting fraud in real-time — combining fast, cheap predictive ML models with deeper LLM-based contextual analysis. The key insight: **no single model is enough.** Different types of AI excel at different fraud signals, and combining them dramatically reduces false positives while catching novel schemes.

---

## IBM's Core Architecture: Two-Stage Ensemble

### Stage 1: Predictive ML (Structured Data)

| Aspect | Detail |
|---|---|
| **Models** | Logistic Regression, Decision Trees, Random Forest, Gradient Boosting |
| **Input** | Structured data: transaction amounts, timestamps, locations, merchant categories, user history |
| **Speed** | Microsecond latency — processes 300 billion inference requests/day |
| **Role** | Handles straightforward cases. Clear fraud or clear legitimate transactions are auto-adjudicated immediately |

### Stage 2: Encoder LLMs (Unstructured Data)

| Aspect | Detail |
|---|---|
| **Models** | Non-generative transformers: BERT, RoBERTa (NOT generative like GPT/Claude) |
| **Input** | Unstructured data: wire memos, free-form text descriptions, merchant addresses, claim narratives |
| **Speed** | Slower but still sub-second, handled by dedicated hardware (IBM Spyre Accelerator) |
| **Role** | Borderline/ambiguous cases from Stage 1 get escalated here. The LLM "reads between the lines" for linguistic patterns |

### Ensemble Decision Engine

The final fraud score combines outputs from **both stages**. This achieves:
- **Higher precision** — fewer false positives because ambiguous cases get the LLM's contextual judgment
- **Novel fraud detection** — LLMs catch patterns traditional ML has never seen before (e.g., urgency language in wire transfer memos like "Refund for overpayment. Please rush.")
- **Speed** — 95% of cases never hit the expensive LLM; they're handled in microseconds by the ML stage

---

## IBM's Broader Fraud Ecosystem

Beyond the ensemble, IBM's complete counter-fraud stack includes:

### FAMS (Fraud and Abuse Management System)
- Deployed across state Medicaid programs, federal agencies, and private insurers
- **Next Generation Entity Profiling System** — cloud-based historical profiling + real-time detection
- Uses supervised and unsupervised ML on Spark
- North Carolina DHHS used FAMS to investigate Medicaid fraud across millions of patients/providers

### InfoSphere Identity Insight (Entity Resolution)
- **Identity resolution** — determines if providers using different names on billing statements are the same entity
- **Knowledge graph construction** — builds relationship networks: shared addresses, phone numbers, owners, referring physicians
- Uncovers "hidden associations" — e.g., 5 DME suppliers that share a registered agent but use different business names

### Ontology-Guided Policy Extraction
- IBM Research project that uses **domain ontologies** to extract entities and relationships from unstructured policy text
- Builds auditing rules automatically from CMS policy documents
- Semi-automates detection of improper payments by comparing claims against extracted policy rules

---

## Key Concepts We Should Know About

### Entity Resolution
The process of determining that two records (e.g., "Metro Medical Group" and "Metro Med Grp LLC") refer to the same real-world entity. In healthcare fraud, this catches:
- Providers who re-incorporate under new names after sanctions
- Nominee owners operating multiple shell companies
- Shared addresses/phone numbers across seemingly unrelated suppliers

### Knowledge Graphs (vs. our DBSCAN Clustering)
| Aspect | Our DBSCAN Clustering | IBM Knowledge Graphs |
|---|---|---|
| **What it finds** | Behavioral similarity (similar billing patterns) | Explicit relationships (shared owner, address, phone) |
| **Data needed** | Billing/claims data only | + Ownership records, addresses, phone numbers, referring physician networks |
| **Strength** | Finds unknown patterns | Proves known connections |
| **Weakness** | Can't explain *why* suppliers are connected | Requires rich relational data that may not be available |

### Encoder LLMs vs. Generative LLMs
IBM uses **encoder-only** models (BERT/RoBERTa) for classification, NOT generative models (Claude/GPT):
- **Encoder LLMs**: Fast, cheap, good at classification ("is this text suspicious?"), named entity recognition, sentiment analysis
- **Generative LLMs**: Slower, expensive, good at reasoning and explanation ("explain why this is suspicious")
- **IBM's approach**: Use encoder LLMs for speed in the detection pipeline, generative LLMs for post-hoc analysis/reporting

---

## Comparison: IBM vs. Sky Sentinel

| Capability | IBM Solution | Sky Sentinel (Current) | Gap? |
|---|---|---|---|
| **Multi-model ML** | Random Forest + Gradient Boosting + Logistic Regression | Isolation Forest + Z-Score + DBSCAN | ✅ We have this — different algorithms but same multi-method philosophy |
| **LLM integration** | Encoder LLMs (BERT) for classification + Generative for reporting | Claude for narrative generation + contextual analysis | ✅ We have this — we use generative LLM for narratives |
| **Two-tier model routing** | Fast ML → Expensive LLM escalation | Batch (Haiku) vs. Interactive (Sonnet) tiers | ✅ We have this — different implementation but same cost/speed optimization |
| **Real-time pre-payment detection** | Sub-millisecond scoring before payment | Post-payment batch analysis | ⚠️ Gap — we analyze after the fact |
| **Entity resolution** | InfoSphere Identity Insight resolves duplicate/alias entities | Not implemented | ❌ Gap — we don't detect re-incorporated or aliased suppliers |
| **Knowledge graph** | Explicit relationship mapping (shared addresses, owners, phones) | DBSCAN behavioral clustering (implicit similarity) | ⚠️ Partial — our clustering finds behavioral groups, not explicit connections |
| **Unstructured text analysis** | BERT/RoBERTa on claim notes, medical necessity docs | LLM reads claims data but not free-text documents | ⚠️ Gap — we don't analyze medical necessity justification text |
| **Hardware acceleration** | IBM z17 mainframe + Spyre Accelerator | Standard cloud compute | N/A — not relevant for hackathon demo |
| **Human-in-the-Loop** | Not emphasized in the video | Core feature — adjustable thresholds, pattern builder, dismiss workflow | ✅ We exceed IBM here |
| **Fairness monitoring** | Not mentioned in research | Built-in geographic bias monitoring | ✅ We exceed IBM here |
| **Explainability** | Not emphasized (enterprise focus) | Full AI-generated narratives per supplier | ✅ We exceed IBM here |

---

## Recommendations: How Sky Sentinel Could Improve

### 🟢 Quick Wins (Could implement in hours)

**1. Rename our architecture to "Ensemble AI"**
IBM calls their multi-model approach an "ensemble" — this is credible industry terminology. We should adopt it in the README and UI. Our Isolation Forest + Z-Score + DBSCAN + LLM is genuinely an ensemble approach.

**2. Add "Pre-Payment Detection" language to the Path to CMS Pilot**
IBM's biggest selling point is catching fraud *before* payment. Our current README describes post-payment analysis. We should explicitly call out pre-payment detection as Phase 2 of our CMS Pilot path, even if the current demo is post-payment.

**3. Reference IBM FAMS as industry validation**
In the README's "why this matters" section, mention that IBM's FAMS follows the same multi-model ensemble philosophy — lending credibility to our approach.

### 🟡 Medium Effort (Could add to demo with significant work)

**4. Entity Resolution Layer**
Add a simple entity resolution module that checks for:
- Suppliers sharing the same address
- Suppliers with similar names (Levenshtein distance)
- Suppliers sharing a phone number or registered agent

This would transform our DBSCAN behavioral clustering into a **dual-layer detection system**: behavioral similarity + explicit connections. This is the single highest-impact improvement we could make.

**5. Unstructured Text Analysis**
Add a feature where the LLM analyzes "medical necessity documentation" text for templated/generic language patterns. Even with synthetic data, we could demonstrate the concept of detecting copy-paste documentation across suppliers.

### 🔴 Major Redesign (Not recommended before hackathon)

**6. Pre-Payment Real-Time API**
Build a `/api/claims/pre-check` endpoint that scores a single incoming claim in real-time before payment. This would involve restructuring the scoring pipeline to work on individual claims rather than batch supplier profiles. Impressive but significant engineering.

**7. Full Knowledge Graph**
Replace or augment DBSCAN with a graph database (Neo4j) storing explicit entity relationships. Requires ownership/address/phone data that we'd need to synthesize. High impact but heavy lift.

---

## Bottom Line

**We don't need to redo our solution.** Sky Sentinel already implements the same core philosophy as IBM's approach — multi-model ensemble, LLM integration, and tiered model routing. Where IBM exceeds us (entity resolution, real-time pre-payment, encoder LLMs) are enterprise-scale features that aren't expected in a hackathon demo.

Where **we exceed IBM**: Human-in-the-Loop controls, algorithmic fairness monitoring, and full AI explainability. These are the differentiators that matter for a CMS hackathon focused on responsible AI.

**Highest-impact quick action:** Adopt "ensemble AI" terminology and reference IBM FAMS as industry validation of our approach. This costs zero development time and adds significant credibility.
