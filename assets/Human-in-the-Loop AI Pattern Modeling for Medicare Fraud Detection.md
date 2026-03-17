# **Human-in-the-Loop AI Pattern Modeling for Medicare Fraud Detection**

## Mission Context

Medicare fraud, waste, and abuse represent a major challenge for healthcare program integrity. Government oversight organizations such as the Centers for Medicare & Medicaid Services (CMS) and program integrity contractors rely on data analytics to identify suspicious billing behaviors across providers.

However, fraud patterns are constantly evolving. Traditional rule-based detection systems struggle to adapt to new fraud schemes because they rely on predefined rules and static thresholds.

Investigators and analysts often need tools that allow them to explore data, identify emerging patterns, and refine detection models while maintaining human oversight.

AI-assisted analytics could enable investigators to **dynamically generate and evaluate fraud detection patterns**, combining machine learning insights with human expertise.

## Challenge Overview

Design and demonstrate a **Human-in-the-Loop AI Fraud Pattern Modeling prototype** that helps analysts explore Medicare billing data and identify suspicious patterns.

The system should:

* analyze healthcare claims data  
* detect anomalous billing patterns  
* allow investigators to interactively refine detection models  
* generate explainable insights about suspicious provider behavior  
* incorporate human feedback to improve detection accuracy

The goal is to demonstrate how AI can **augment investigators in identifying emerging fraud schemes**.

## Suggested Public Datasets

Teams may use the following publicly available datasets:

**CMS Medicare Provider Utilization Data**  
[https://data.cms.gov](https://data.cms.gov)

**Medicare Part B Provider Summary Data**  
[https://data.cms.gov/provider-summary-by-type-of-service](https://data.cms.gov/provider-summary-by-type-of-service)

**Healthcare Cost and Utilization Project (HCUP)**  
[https://www.hcup-us.ahrq.gov](https://www.hcup-us.ahrq.gov)

**Open Healthcare Claims Datasets**  
[https://healthdata.gov](https://healthdata.gov)

Teams may also generate **synthetic claims datasets** to simulate fraud scenarios.

## Required MVP Capabilities (2-Week Scope)

A functional MVP should demonstrate:

### **1️⃣ Healthcare Claims Data Ingestion**

Import claims datasets including fields such as:

* provider identifiers  
* procedure codes  
* billing amounts  
* service frequency

### **2️⃣ Anomaly Detection**

Use AI techniques to detect unusual patterns such as:

* abnormal billing frequencies  
* unusual combinations of procedure codes  
* extreme billing amounts

### **3️⃣ Human-in-the-Loop Pattern Modeling**

Allow investigators to:

* define suspicious patterns  
* refine anomaly thresholds  
* test pattern hypotheses

### **4️⃣ Fraud Pattern Insights**

Generate outputs showing:

* providers with suspicious patterns  
* detected anomalies  
* supporting evidence from claims data

### **5️⃣ Explainable Outputs**

Provide transparent reasoning showing:

* which patterns triggered alerts  
* why the behavior is considered anomalous

## Technical Constraints

Solutions should:

* rely on **public healthcare datasets or synthetic examples**  
* demonstrate **explainable AI outputs**  
* avoid reliance on proprietary vendor platforms  
* remain feasible within a **two-week MVP sprint**

Integration with live healthcare systems is **not required**.

## Judging Criteria

Solutions will be evaluated on:

| Criteria | Weight |
| :---- | :---- |
| Mission Relevance | High |
| Technical Soundness | High |
| Explainability & Responsible AI | High |
| Feasibility for Agency Adoption | High |
| Innovation | Medium |
| Demo Clarity | Medium |

## Deliverables

Teams should demonstrate:

* a working prototype  
* healthcare claims analysis workflows  
* fraud pattern detection results  
* explainable anomaly detection outputs

Teams should also describe how the prototype could evolve into a **production-grade fraud detection system** supporting healthcare program integrity.

## Expected Outcome

Successful solutions will demonstrate how AI can:

* help investigators identify emerging fraud patterns  
* analyze large healthcare claims datasets  
* improve fraud detection accuracy  
* support human investigators with explainable insights

These capabilities could significantly strengthen **healthcare program integrity operations**.

