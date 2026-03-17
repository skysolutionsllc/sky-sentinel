import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Save, Key, Cpu, Server, CheckCircle } from 'lucide-react'

const PROVIDER_MODELS = {
  anthropic: [
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (Latest)', isDefault: true },
    { value: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
    { value: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
  ],
  openai: [
    { value: 'gpt-4.1-2025-04-14', label: 'GPT-4.1', isDefault: true },
    { value: 'gpt-4.1-mini-2025-04-14', label: 'GPT-4.1 Mini' },
    { value: 'gpt-4.1-nano-2025-04-14', label: 'GPT-4.1 Nano' },
    { value: 'o3-2025-04-16', label: 'o3 (Reasoning)' },
    { value: 'o4-mini-2025-04-16', label: 'o4-mini (Reasoning)' },
    { value: 'gpt-4o-2024-11-20', label: 'GPT-4o' },
    { value: 'gpt-4o-mini-2024-07-18', label: 'GPT-4o Mini' },
  ],
  local: [
    { value: 'llama3', label: 'Llama 3 (Ollama)', isDefault: true },
    { value: 'mistral', label: 'Mistral (Ollama)' },
    { value: 'deepseek-r1', label: 'DeepSeek R1 (Ollama)' },
    { value: 'qwen2.5', label: 'Qwen 2.5 (Ollama)' },
    { value: 'phi-4', label: 'Phi-4 (Ollama)' },
    { value: 'gemma3', label: 'Gemma 3 (Ollama)' },
  ],
}

export default function Settings() {
  const [provider, setProvider] = useState('anthropic')
  const [model, setModel] = useState('claude-sonnet-4-20250514')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setProvider(localStorage.getItem('llm_provider') || 'anthropic')
    setModel(localStorage.getItem('llm_model') || 'claude-sonnet-4-20250514')
    setAnthropicKey(localStorage.getItem('llm_api_key_anthropic') || '')
    setOpenaiKey(localStorage.getItem('llm_api_key_openai') || '')
  }, [])

  const handleSave = () => {
    localStorage.setItem('llm_provider', provider)
    localStorage.setItem('llm_model', model)
    // Save provider-specific keys
    localStorage.setItem('llm_api_key_anthropic', anthropicKey)
    localStorage.setItem('llm_api_key_openai', openaiKey)

    // Also write the active key based on selected provider
    if (provider === 'anthropic') {
      localStorage.setItem('llm_api_key', anthropicKey)
    } else if (provider === 'openai') {
      localStorage.setItem('llm_api_key', openaiKey)
    } else {
      localStorage.setItem('llm_api_key', '')
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleProviderChange = (newProvider) => {
    setProvider(newProvider)
    const defaultModel = PROVIDER_MODELS[newProvider]?.find(m => m.isDefault) || PROVIDER_MODELS[newProvider]?.[0]
    if (defaultModel) setModel(defaultModel.value)
  }

  const modelOptions = PROVIDER_MODELS[provider] || []

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="flex-center gap-2">
          <SettingsIcon size={28} className="text-sky-light" />
          Settings
        </h1>
        <p>Configure Sky Sentinel's AI model provider for risk analysis and investigative queries.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640 }}>
        {/* Provider & Model */}
        <div className="glass-card">
          <h2 style={{ fontSize: 18, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--sky-border-bright)' }}>
            LLM Configuration
          </h2>

          <div className="control-group">
            <label className="control-label flex-center gap-2"><Server size={16} /> Provider</label>
            <select
              className="query-input"
              style={{ width: '100%' }}
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value)}
            >
              <option value="anthropic">Anthropic</option>
              <option value="openai">OpenAI</option>
              <option value="local">Local (Ollama / Custom)</option>
            </select>
          </div>

          <div className="control-group">
            <label className="control-label flex-center gap-2"><Cpu size={16} /> Model</label>
            <select
              className="query-input"
              style={{ width: '100%' }}
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {modelOptions.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            {provider === 'local' && (
              <p style={{ fontSize: 12, color: 'var(--sky-text-muted)', marginTop: 8 }}>
                Ensure Ollama is running locally on port 11434 with the selected model pulled.
              </p>
            )}
          </div>
        </div>

        {/* API Keys */}
        <div className="glass-card">
          <h2 style={{ fontSize: 18, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--sky-border-bright)' }}>
            API Keys
          </h2>
          <p style={{ fontSize: 13, color: 'var(--sky-text-secondary)', marginBottom: 20 }}>
            Enter API keys for each provider. Keys are stored locally in your browser and sent securely via request headers.
          </p>

          <div className="control-group">
            <label className="control-label flex-center gap-2"><Key size={16} /> Anthropic API Key</label>
            <input
              type="password"
              className="query-input"
              style={{ width: '100%' }}
              placeholder="sk-ant-api03-..."
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
            />
            <p style={{ fontSize: 11, color: 'var(--sky-text-muted)', marginTop: 6 }}>
              Shared across all Anthropic Claude models.
            </p>
          </div>

          <div className="control-group">
            <label className="control-label flex-center gap-2"><Key size={16} /> OpenAI API Key</label>
            <input
              type="password"
              className="query-input"
              style={{ width: '100%' }}
              placeholder="sk-..."
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
            />
            <p style={{ fontSize: 11, color: 'var(--sky-text-muted)', marginTop: 6 }}>
              Shared across all OpenAI GPT and o-series models.
            </p>
          </div>
        </div>

        {/* Save */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button className="btn-primary flex-center gap-2" onClick={handleSave}>
            <Save size={16} />
            Save Settings
          </button>
          {saved && (
            <span className="flex-center gap-2" style={{ color: 'var(--status-clean)', fontSize: 14, fontWeight: 600 }}>
              <CheckCircle size={16} /> Settings Saved!
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
