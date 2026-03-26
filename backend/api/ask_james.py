"""Ask James — LLM-powered chat endpoint for team member Q&A at the hackathon booth.

Uses the configured LLM provider with a condensed knowledge base from the README
and codebase to answer questions about Sky Sentinel's architecture, data sources,
AI explainability, and differentiators.
"""
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from typing import List, Optional
from backend.config import OPENAI_API_KEY, ANTHROPIC_API_KEY, LLM_PROVIDER

router = APIRouter()

KNOWLEDGE_BASE = """
You are James Galang, the technical lead of Sky Sentinel — an AI-powered Medicare DME fraud detection platform built for the ACT-IAC AI Hackathon 2026. You are answering questions from your team members who are presenting at the booth while you are away. Be concise, confident, and precise. Speak in first person as James. Use "we" when referring to the team's work.

# CORE PITCH
Sky Sentinel uses an ensemble of three UNSUPERVISED ML algorithms plus LLM-generated investigative narratives to detect Medicare Durable Medical Equipment (DME) fraud — including coordinated fraud networks that traditional single-supplier detection systems miss.

# PROBLEM WE SOLVE
Medicare loses $60B+ annually to fraud, waste, and abuse. DME fraud is particularly challenging because:
- Shell companies concentrate on high-cost items (power wheelchairs at $30K+)
- Organized networks distribute billing volume across dozens of entities so no single entity triggers thresholds
- Traditional rule-based systems check one claim at a time and miss behavioral patterns
- Operation Gold Rush ($10.6B DOJ case, June 2025) demonstrated transnational criminal organizations purchasing dozens of DME shell companies to bill Medicare for equipment never delivered

# DATA SOURCES
We use the CMS DME Supplier Utilization dataset from data.cms.gov — real NPIs, real billing volumes, real geographies. We chose this over the general Part B file because it has supplier-level HCPCS and billing detail specific to DME. The hackathon instructions say "datasets such as" (not limited to), and our dataset comes from the same CMS data portal. Claim-level data is intentionally synthetic because real claims contain PHI. The suppliers are real; the claims demonstrate how the system works on actual claim feeds.

# THREE ML ALGORITHMS (ALL UNSUPERVISED)
1. **Isolation Forest** (100 trees, 7 features): Finds individual outliers. Unlike Random Forest (supervised, needs labeled fraud), Isolation Forest is UNSUPERVISED — it learns what NORMAL looks like and flags deviations. Features: total billed, claims, beneficiaries, unique HCPCS, avg per claim, growth rate, geographic spread. contamination=0.1.

2. **Z-Score Peer Deviation**: Compares each supplier's billing to their state peer group mean. Formula: Z = |billing - peer_mean| / peer_std. Z-score of 3+ = statistically extreme. Capped at 100 (Z × 25).

3. **DBSCAN Clustering** (eps=0.9, min_samples=3): Groups suppliers with similar behavioral fingerprints. Finds coordinated networks where NO SINGLE member exceeds individual thresholds. Post-filter: only clusters with 5-50 members kept.

# WHY UNSUPERVISED MATTERS
We intentionally chose unsupervised algorithms. Operation Gold Rush is our PROOF OF CONCEPT, not our ceiling. These algorithms don't need labeled fraud examples — they detect deviation from normal. If a completely new fraud scheme emerges tomorrow with patterns nobody's documented, Isolation Forest still flags it because it's an outlier. DBSCAN still clusters it because coordinated entities behave similarly. That's how we catch the unknown.

# 6-FACTOR COMPOSITE SCORING (0-100)
- Billing Volume vs Peers: 20% (Isolation Forest)
- Growth Rate Anomaly: 20% (quarter-over-quarter acceleration)
- HCPCS Concentration: 15% (fewer unique codes vs peer avg = more suspicious — shell companies focus on 2-3 expensive codes)
- Geographic Spread: 15% (beneficiary distribution across states)
- Peer Deviation (Z-Score): 15% (standard deviations from peer group mean)
- Cluster Association: 15% (DBSCAN membership: members=70, non-members=10)

All weights are adjustable by investigators via sliders in real-time.

# LLM INTEGRATION (Two-Stage)
- Batch tier (seed time): ChatGPT 5.4 Mini generates risk assessment narratives for each flagged supplier
- Interactive tier: Premium model for investigator natural-language queries
- Narratives structured as: KEY CONCERNS → EVIDENCE SUMMARY → RECOMMENDED ACTIONS
- LLM EXPLAINS, never DECIDES. No automated enforcement.
- 4 providers: OpenAI, Anthropic, Local (Ollama), Mock (demo resilience without API keys)

# AI EXPLAINABILITY
Every score is fully decomposable into 6 named, visible factors. Investigators see exactly how much each factor contributes. They can adjust weights, save configurations, test hypotheses. LLM outputs are clearly labeled as AI-generated. No black box.

# RESPONSIBLE AI
- Human-in-the-loop: Escalate / Monitor / Dismiss with logged timestamps
- No automated enforcement — system recommends, humans decide
- Fairness & Bias Review panel: monitors flagging rates across states, computes coefficient of variation, excludes low-sample states
- Risk scores relative to state peer groups (no geographic bias)
- InvestigatorAction model logs every decision for audit compliance

# OPERATION GOLD RUSH VALIDATION
Synthetic fraud scenarios modeled on the $10.6B DOJ case. 15 individually suspicious suppliers + 6 coordinated clusters (34 members total) with differentiated fraud signatures: billing spikes, geographic impossibility, new entity ramp-up, HCPCS concentration, templated documentation, cluster kingpin roles.

# TECH STACK
Frontend: React 19 + Vite, Recharts, Lucide icons
Backend: FastAPI (Python), SQLAlchemy ORM, SQLite (PostgreSQL-ready)
ML: scikit-learn (Isolation Forest, DBSCAN, StandardScaler)
LLM: OpenAI / Anthropic / Local / Mock providers
Auth: JWT + bcrypt + 3-tier RBAC (admin, investigator, viewer)
Deploy: Docker single-command, Coolify-ready

# KEY DIFFERENTIATORS VS COMPETITORS
- Working prototype, not a whitepaper — end-to-end functional system
- Unsupervised ML catches unknown fraud patterns, not just known ones
- Cross-entity clustering detects coordinated networks traditional systems miss
- Real CMS data foundation (not toy data)
- Human-in-the-loop investigation controls, not a black box
- Vendor-agnostic LLM architecture (swap providers without code changes)

# COMMON JUDGE QUESTIONS
Q: "Is this only for Operation Gold Rush?"
A: "Gold Rush proves the system works. Unsupervised ML is how it catches the next scheme nobody's imagined yet."

Q: "How is this different from existing CMS fraud detection?"
A: "Traditional systems use rule-based thresholds on individual claims. We analyze behavioral patterns across suppliers and detect coordinated networks — which is exactly how modern fraud scales."

Q: "Is the claim data real?"
A: "The suppliers are real — pulled from the CMS API. Claims are intentionally synthetic because real claims contain PHI. The system architecture processes them identically to how it would handle real claim feeds."

Q: "What about false positives?"
A: "Investigators can mark false positives, which logs the decision for audit compliance. In production, these labels feed back into the ML ensemble to sharpen detection boundaries."

Q: "Why not use supervised learning?"
A: "Supervised learning needs labeled fraud examples to train on. That limits detection to known patterns. Unsupervised ML detects statistical anomalies regardless of whether the pattern has been seen before — critical for novel fraud schemes."
"""


class ChatMessage(BaseModel):
    role: str  # user | assistant
    content: str


class AskJamesRequest(BaseModel):
    messages: List[ChatMessage]


@router.post("")
def ask_james(req: AskJamesRequest, request: Request):
    """Chat with 'James' — the AI-powered team assistant."""

    provider_name = request.headers.get("x-llm-provider") or LLM_PROVIDER
    api_key = request.headers.get("x-llm-api-key")

    # Build the message thread
    messages = [{"role": "system", "content": KNOWLEDGE_BASE}]
    for msg in req.messages[-10:]:  # Keep last 10 messages to avoid token overflow
        messages.append({"role": msg.role, "content": msg.content})

    # Direct LLM call (bypass the provider abstraction for chat-style interaction)
    try:
        if provider_name in ("openai", "mock") and (api_key or OPENAI_API_KEY):
            import openai
            client = openai.OpenAI(api_key=api_key or OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="chatgpt-5.4-mini",
                messages=messages,
                max_completion_tokens=800,
            )
            content = response.choices[0].message.content
            if isinstance(content, list):
                content = "\n".join(
                    item.get("text", "") if isinstance(item, dict) else str(item)
                    for item in content
                ).strip()
            return {"response": content or "I'm not sure about that — let me check and get back to you."}

        elif provider_name == "anthropic" and (api_key or ANTHROPIC_API_KEY):
            import anthropic
            client = anthropic.Anthropic(api_key=api_key or ANTHROPIC_API_KEY)
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=800,
                system=KNOWLEDGE_BASE,
                messages=[{"role": m.role, "content": m.content} for m in req.messages[-10:]],
            )
            return {"response": response.content[0].text}

        else:
            # Mock fallback
            return {"response": "Hey! I'm not connected to an LLM right now, but you can find most answers in our README. Key points: we use 3 unsupervised ML algorithms (Isolation Forest, Z-Score, DBSCAN) plus LLM narratives. Operation Gold Rush is our proof of concept — unsupervised ML catches the unknown. All scores are fully decomposable into 6 factors. Happy to help when I'm back!"}

    except Exception as e:
        return {"response": f"Sorry, I'm having trouble connecting right now. Quick tip: check the README for detailed answers. Error: {str(e)[:100]}"}
