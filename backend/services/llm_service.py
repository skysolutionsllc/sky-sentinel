"""LLM service — abstract interface with swappable providers.

Supports: Anthropic Claude (primary), OpenAI (fallback), Mock (demo resilience).
"""
import json
from abc import ABC, abstractmethod
from backend.config import (
    ANTHROPIC_API_KEY, OPENAI_API_KEY, LLM_PROVIDER, LLM_MODEL,
    LLM_MODEL_BATCH, LLM_MODEL_INTERACTIVE,
)


class BaseLLMProvider(ABC):
    """Abstract LLM provider interface."""

    @abstractmethod
    def analyze_supplier(self, supplier_data: dict, claims: list, peer_baseline: dict) -> str:
        """Generate a narrative risk assessment for a supplier."""
        ...

    @abstractmethod
    def analyze_cluster(self, cluster_data: dict) -> str:
        """Generate a narrative explaining a coordinated supplier cluster."""
        ...

    @abstractmethod
    def process_query(self, question: str, context: dict) -> str:
        """Answer an investigator's natural language query."""
        ...

    @abstractmethod
    def detect_text_similarity(self, narratives: list) -> dict:
        """Analyze text similarity across claim narratives."""
        ...


class AnthropicProvider(BaseLLMProvider):
    """Claude Sonnet provider — best for multi-step investigative reasoning."""

    def __init__(self, model_name: str = None, api_key: str = None):
        import anthropic
        key = api_key or ANTHROPIC_API_KEY
        self.client = anthropic.Anthropic(api_key=key)
        self.model = model_name or LLM_MODEL

    def _call(self, system: str, prompt: str, max_tokens: int = 1500) -> str:
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                system=system,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.content[0].text
        except Exception as e:
            return f"[Anthropic LLM analysis unavailable: {str(e)[:100]}]"

    def analyze_supplier(self, supplier_data: dict, claims: list, peer_baseline: dict) -> str:
        system = (
            "You are a Medicare program integrity analyst AI assistant. "
            "Analyze DME supplier billing patterns and generate a clear, evidence-based "
            "risk assessment narrative. Be specific about what data points are concerning "
            "and why. Reference specific claim patterns, billing anomalies, and comparison "
            "to peer baselines. Format your response as a structured assessment with "
            "KEY CONCERNS, EVIDENCE SUMMARY, and RECOMMENDED ACTIONS sections."
        )
        prompt = (
            f"Analyze this DME supplier for potential fraud, waste, or abuse:\n\n"
            f"SUPPLIER PROFILE:\n{json.dumps(supplier_data, indent=2, default=str)}\n\n"
            f"RECENT CLAIMS SAMPLE ({len(claims)} shown):\n{json.dumps(claims[:10], indent=2, default=str)}\n\n"
            f"PEER BASELINE:\n{json.dumps(peer_baseline, indent=2, default=str)}\n\n"
            f"Generate a detailed risk assessment narrative focused on DME-specific fraud indicators."
        )
        return self._call(system, prompt)

    def analyze_cluster(self, cluster_data: dict) -> str:
        system = (
            "You are a Medicare program integrity analyst AI assistant specializing in "
            "coordinated fraud detection. Analyze a group of behaviorally similar DME "
            "suppliers and explain why they appear to be operating as a coordinated "
            "network. Focus on shared patterns that individual analysis would miss. "
            "Be specific about the coordination evidence."
        )
        prompt = (
            f"Analyze this cluster of DME suppliers for coordinated fraud patterns:\n\n"
            f"CLUSTER DATA:\n{json.dumps(cluster_data, indent=2, default=str)}\n\n"
            f"Explain why these suppliers appear coordinated and what this pattern "
            f"suggests about potential fraud."
        )
        return self._call(system, prompt, max_tokens=1200)

    def process_query(self, question: str, context: dict) -> str:
        system = (
            "You are Sky Sentinel, an AI assistant for Medicare DME fraud investigation. "
            "Answer investigator questions using the provided data context. Be precise, "
            "reference specific suppliers and data points when possible, and always "
            "explain your reasoning. If the data doesn't fully answer the question, "
            "say so clearly."
        )
        prompt = (
            f"INVESTIGATOR QUESTION: {question}\n\n"
            f"AVAILABLE DATA CONTEXT:\n{json.dumps(context, indent=2, default=str)}\n\n"
            f"Provide a helpful, data-driven response."
        )
        return self._call(system, prompt)

    def detect_text_similarity(self, narratives: list) -> dict:
        system = (
            "You are analyzing medical necessity narratives from multiple DME claims "
            "to detect templated or suspiciously similar language. Identify common "
            "phrases, boilerplate language, and textual patterns that suggest "
            "coordinated or fraudulent documentation."
        )
        prompt = (
            f"Analyze these {len(narratives)} medical necessity narratives for "
            f"suspicious similarity patterns:\n\n"
            + "\n---\n".join(narratives[:20])
            + "\n\nProvide a similarity score (0-100) and explain the patterns found."
        )
        result = self._call(system, prompt)
        return {"analysis": result, "narrative_count": len(narratives)}


class OpenAIProvider(BaseLLMProvider):
    """OpenAI provider — primary LLM for fraud detection and investigation."""

    def __init__(self, model_name: str = None, api_key: str = None):
        import openai
        key = api_key or OPENAI_API_KEY
        self.client = openai.OpenAI(api_key=key)
        self.model = model_name or LLM_MODEL or "chatgpt-5.4-mini"

    def _call(self, system: str, prompt: str, max_tokens: int = 1500) -> str:
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt}
        ]
        try:
            # ChatGPT 5.4 Mini and all newer OpenAI models use max_completion_tokens
            # (max_tokens is explicitly unsupported and returns a 400 error)
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_completion_tokens=max_tokens,
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"[OpenAI LLM analysis unavailable: {str(e)[:100]}]"

    def analyze_supplier(self, supplier_data: dict, claims: list, peer_baseline: dict) -> str:
        system = (
            "You are a Medicare program integrity analyst AI assistant. "
            "Analyze DME supplier billing patterns and generate a clear, evidence-based "
            "risk assessment narrative. Be specific about what data points are concerning "
            "and why. Reference specific claim patterns, billing anomalies, and comparison "
            "to peer baselines. Format your response as a structured assessment with "
            "KEY CONCERNS, EVIDENCE SUMMARY, and RECOMMENDED ACTIONS sections."
        )
        prompt = (
            f"Analyze this DME supplier for potential fraud, waste, or abuse:\n\n"
            f"SUPPLIER PROFILE:\n{json.dumps(supplier_data, indent=2, default=str)}\n\n"
            f"RECENT CLAIMS SAMPLE ({len(claims)} shown):\n{json.dumps(claims[:10], indent=2, default=str)}\n\n"
            f"PEER BASELINE:\n{json.dumps(peer_baseline, indent=2, default=str)}\n\n"
            f"Generate a detailed risk assessment narrative focused on DME-specific fraud indicators."
        )
        return self._call(system, prompt)

    def analyze_cluster(self, cluster_data: dict) -> str:
        system = (
            "You are a Medicare program integrity analyst AI assistant specializing in "
            "coordinated fraud detection. Analyze a group of behaviorally similar DME "
            "suppliers and explain why they appear to be operating as a coordinated "
            "network. Focus on shared patterns that individual analysis would miss. "
            "Be specific about the coordination evidence."
        )
        prompt = (
            f"Analyze this cluster of DME suppliers for coordinated fraud patterns:\n\n"
            f"CLUSTER DATA:\n{json.dumps(cluster_data, indent=2, default=str)}\n\n"
            f"Explain why these suppliers appear coordinated and what this pattern "
            f"suggests about potential fraud."
        )
        return self._call(system, prompt, max_tokens=1200)

    def process_query(self, question: str, context: dict) -> str:
        system = (
            "You are Sky Sentinel, an AI assistant for Medicare DME fraud investigation. "
            "Answer investigator questions using the provided data context. Be precise, "
            "reference specific suppliers and data points when possible, and always "
            "explain your reasoning. If the data doesn't fully answer the question, "
            "say so clearly."
        )
        prompt = (
            f"INVESTIGATOR QUESTION: {question}\n\n"
            f"AVAILABLE DATA CONTEXT:\n{json.dumps(context, indent=2, default=str)}\n\n"
            f"Provide a helpful, data-driven response."
        )
        return self._call(system, prompt)

    def detect_text_similarity(self, narratives: list) -> dict:
        system = (
            "You are analyzing medical necessity narratives from multiple DME claims "
            "to detect templated or suspiciously similar language. Identify common "
            "phrases, boilerplate language, and textual patterns that suggest "
            "coordinated or fraudulent documentation."
        )
        prompt = (
            f"Analyze these {len(narratives)} medical necessity narratives for "
            f"suspicious similarity patterns:\n\n"
            + "\n---\n".join(narratives[:20])
            + "\n\nProvide a similarity score (0-100) and explain the patterns found."
        )
        result = self._call(system, prompt)
        return {"analysis": result, "narrative_count": len(narratives)}


class LocalProvider(OpenAIProvider):
    """Local inference provider (Ollama, vLLM, LMStudio) using OpenAI API compatibility."""

    def __init__(self, model_name: str = None, api_key: str = None):
        import openai
        # Local LLM endpoint typically points to localhost via OpenAI compatibility layer
        base_url = "http://localhost:11434/v1" # ollama default API base
        key = api_key or "local-key"
        self.client = openai.OpenAI(base_url=base_url, api_key=key)
        self.model = model_name or "llama3"

    def _call(self, system: str, prompt: str, max_tokens: int = 1500) -> str:
        try:
            return super()._call(system, prompt, max_tokens)
        except Exception as e:
            return f"[Local LLM analysis unavailable ({self.model}): {str(e)[:100]}]"


class MockLLMProvider(BaseLLMProvider):
    """Pre-cached responses for demo resilience — works without API keys."""

    def analyze_supplier(self, supplier_data: dict, claims: list, peer_baseline: dict) -> str:
        name = supplier_data.get("name", "Unknown Supplier")
        npi = supplier_data.get("npi", "N/A")
        state = supplier_data.get("state", "N/A")
        return (
            f"## Risk Assessment: {name} (NPI: {npi})\n\n"
            f"### KEY CONCERNS\n"
            f"1. **Billing Volume Anomaly**: This supplier's total billing is significantly "
            f"above the peer average for DME suppliers in {state}. The volume-to-referring-physician "
            f"ratio suggests potential order generation beyond organic patient demand.\n\n"
            f"2. **Documentation Patterns**: Analysis of medical necessity narratives across "
            f"multiple claims reveals highly similar language patterns (estimated 87% textual "
            f"similarity), suggesting templated documentation rather than individualized "
            f"clinical assessments.\n\n"
            f"3. **Geographic Dispersion**: Beneficiaries are spread across an unusually wide "
            f"geographic area relative to the supplier's listed service region, which is "
            f"inconsistent with legitimate DME delivery patterns.\n\n"
            f"### EVIDENCE SUMMARY\n"
            f"- Billing growth: 280%+ over prior quarter vs. peer median of 5-8%\n"
            f"- Unique beneficiary states: 12 (peer avg: 1-2)\n"
            f"- Referring physicians: 2 physicians account for 89% of orders\n"
            f"- HCPCS concentration: Top 3 codes represent 94% of volume\n\n"
            f"### RECOMMENDED ACTIONS\n"
            f"1. Escalate for detailed claim-level review\n"
            f"2. Cross-reference referring physicians for additional supplier relationships\n"
            f"3. Request beneficiary verification sample for geographic outliers"
        )

    def analyze_cluster(self, cluster_data: dict) -> str:
        members = cluster_data.get("members", [])
        shared = cluster_data.get("shared_attributes", {})
        return (
            f"## Coordinated Pattern Analysis\n\n"
            f"### CLUSTER OVERVIEW\n"
            f"This cluster of {len(members)} DME suppliers exhibits strong behavioral "
            f"coordination indicators that suggest potential organized fraudulent activity.\n\n"
            f"### COORDINATION EVIDENCE\n"
            f"1. **Synchronized Growth**: All cluster members show billing growth patterns "
            f"that began within 30 days of each other, inconsistent with independent "
            f"business development.\n\n"
            f"2. **Shared HCPCS Focus**: Members concentrate on overlapping DME categories "
            f"({', '.join(shared.get('shared_hcpcs', ['orthotics', 'wheelchairs', 'CPAP']))}), "
            f"with identical product mix ratios.\n\n"
            f"3. **Template Documentation**: Medical necessity narratives across all cluster "
            f"members contain near-identical language patterns, suggesting a common template source.\n\n"
            f"4. **Geographic Pattern**: Members are clustered in the same metropolitan area "
            f"with overlapping service territories.\n\n"
            f"### RISK ASSESSMENT\n"
            f"**No single member exceeds traditional detection thresholds individually.** "
            f"However, the collective pattern strongly suggests coordinated billing that "
            f"traditional analytics would not detect.\n\n"
            f"### RECOMMENDED ACTIONS\n"
            f"1. Investigate common ownership or management relationships\n"
            f"2. Review incorporation dates and registered agents\n"
            f"3. Expand search for additional entities matching this pattern"
        )

    def process_query(self, question: str, context: dict) -> str:
        stats = context.get("stats", {})
        top = context.get("top_suppliers", [])[:5]
        top_list = "\n".join(
            f"- **{s['name']}** (NPI: {s['npi']}, {s['state']}) — Risk Score: {s['risk_score']}"
            for s in top
        )
        return (
            f"Based on the current Sky Sentinel analysis:\n\n"
            f"**Database Overview:**\n"
            f"- Total suppliers monitored: {stats.get('total_suppliers', 'N/A')}\n"
            f"- Suppliers flagged: {stats.get('total_flagged', 'N/A')}\n"
            f"- States with alerts: {', '.join(stats.get('states_with_alerts', []))}\n\n"
            f"**Top Risk Suppliers:**\n{top_list}\n\n"
            f"Regarding your question: *\"{question}\"*\n\n"
            f"The analysis indicates patterns consistent with DME fraud schemes "
            f"documented in recent enforcement actions. The highest-risk suppliers "
            f"show combinations of billing anomalies, geographic dispersion, and "
            f"documentation irregularities that warrant further investigation."
        )

    def detect_text_similarity(self, narratives: list) -> dict:
        return {
            "analysis": (
                f"Analysis of {len(narratives)} medical necessity narratives reveals "
                f"significant textual similarity. Approximately 78% of narratives share "
                f"common boilerplate phrases including 'patient requires equipment for "
                f"daily mobility assistance' and 'medical necessity established per "
                f"physician evaluation.' This level of templating exceeds normal clinical "
                f"documentation variation and suggests coordinated claim generation."
            ),
            "similarity_score": 78,
            "narrative_count": len(narratives),
        }


def get_llm_provider(
    provider_name: str = None, 
    model: str = None, 
    api_key: str = None,
    tier: str = None,  # 'batch' | 'interactive' | None
) -> BaseLLMProvider:
    """Factory — returns the configured LLM provider.
    
    Tier-based model routing:
      - 'batch': Uses LLM_MODEL_BATCH (cheaper/faster) for seed-time narrative generation
      - 'interactive': Uses LLM_MODEL_INTERACTIVE (premium) for user-facing queries
      - None: Uses the explicitly passed model, or LLM_MODEL default
    """
    provider_name = provider_name or LLM_PROVIDER

    # Resolve model from tier if not explicitly provided
    if model is None and tier:
        model = LLM_MODEL_BATCH if tier == 'batch' else LLM_MODEL_INTERACTIVE

    if provider_name == 'openai' and (api_key or OPENAI_API_KEY):
        try:
            return OpenAIProvider(model_name=model, api_key=api_key)
        except Exception:
            pass
            
    if provider_name == 'local':
        try:
            return LocalProvider(model_name=model, api_key=api_key)
        except Exception:
            pass

    if provider_name == 'anthropic' and (api_key or ANTHROPIC_API_KEY):
        try:
            return AnthropicProvider(model_name=model, api_key=api_key)
        except Exception:
            pass

    # Fallback to mock
    return MockLLMProvider()
