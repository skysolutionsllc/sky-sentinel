import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { api } from '../services/api'
import { Bot, ShieldAlert, Loader2, Search, Lightbulb, History } from 'lucide-react'

const SUGGESTED_QUERIES = [
  "Which states have the highest concentration of critical-risk DME suppliers?",
  "Show me all suppliers in Florida with risk scores above 70 and explain what makes them risky",
  "Which suppliers are linked to coordinated fraud clusters and what patterns do they share?",
  "List the top 5 riskiest suppliers and break down which scoring factors contribute most to their risk",
  "Compare billing volume outliers vs. growth anomaly outliers — are they the same suppliers?",
  "What are the most common alert evidence patterns across high-risk suppliers?",
]

export default function AIQuery() {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])

  useEffect(() => {
    api.queryHistory().then(setHistory).catch(console.error)
  }, [])

  const handleSubmit = async (q = query) => {
    if (!q.trim()) return
    setLoading(true)

    const userMessage = { role: 'user', content: q, time: new Date() }
    setMessages(prev => [...prev, userMessage])
    setQuery('')

    try {
      const data = await api.aiQuery(q)
      const aiMessage = { role: 'assistant', content: data.response, time: new Date() }
      setMessages(prev => [...prev, aiMessage])
      setHistory(prev => [{ query: q, response: data.response, created_at: new Date().toISOString() }, ...prev])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error processing query. Please check your API key settings or try again.', time: new Date() }])
    }
    setLoading(false)
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="flex-center gap-2">
          <Bot size={28} className="text-sky-light" />
          AI Investigation Query
        </h1>
        <p>Ask questions in natural language — powered by LLMs for investigative reasoning</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        {/* Main Chat */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', minHeight: 600 }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
                <div style={{ marginBottom: 16 }}><ShieldAlert size={56} color="var(--sky-text-muted)" /></div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--sky-text-primary)' }}>
                  Sky Sentinel AI Assistant
                </div>
                <div style={{ fontSize: 14, color: 'var(--sky-text-secondary)', textAlign: 'center', maxWidth: 400 }}>
                  Ask any question about DME suppliers, fraud patterns, risk analysis, or investigation strategies.
                  I'll analyze the data and provide evidence-based insights using your configured LLM.
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div style={{
                    maxWidth: '80%',
                    padding: '14px 18px',
                    borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: m.role === 'user'
                      ? 'linear-gradient(135deg, #1565C0, #2196F3)'
                      : 'rgba(15, 40, 71, 0.7)',
                    border: `1px solid ${m.role === 'user' ? 'transparent' : 'var(--sky-border)'}`,
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}>
                    {m.role === 'assistant' && (
                      <div className="flex-center gap-2" style={{ fontSize: 11, color: 'var(--sky-light)', fontWeight: 600, marginBottom: 8 }}>
                        <Bot size={12} /> Sky Sentinel AI
                      </div>
                    )}
                    {m.role === 'assistant' ? (
                      <div className="llm-narrative" style={{ padding: 0, background: 'none', border: 'none' }}>
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : m.content}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div style={{ display: 'flex', gap: 8, padding: 16, alignItems: 'center' }}>
                <Loader2 size={16} className="text-sky-muted animate-spin" />
                <span style={{ color: 'var(--sky-text-muted)', fontSize: 13 }}>Analyzing data...</span>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="query-input-container">
            <input
              type="text"
              className="query-input"
              placeholder="Ask a question about DME suppliers, fraud patterns, or risk analysis..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              disabled={loading}
            />
            <button className="btn-primary flex-center gap-2" onClick={() => handleSubmit()} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Ask
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Suggested Queries */}
          <div className="glass-card-sm">
            <div className="chart-title flex-center gap-2" style={{ fontSize: 14, marginBottom: 12 }}>
              <Lightbulb size={16} /> Suggested Queries
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SUGGESTED_QUERIES.map((sq, i) => (
                <button
                  key={i}
                  className="btn-secondary"
                  style={{ textAlign: 'left', fontSize: 12, padding: '8px 12px', lineHeight: 1.4 }}
                  onClick={() => handleSubmit(sq)}
                >
                  {sq}
                </button>
              ))}
            </div>
          </div>

          {/* History */}
          <div className="glass-card-sm" style={{ flex: 1 }}>
            <div className="chart-title flex-center gap-2" style={{ fontSize: 14, marginBottom: 12 }}>
              <History size={16} /> Query History
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
              {history.slice(0, 10).map((h, i) => (
                <div
                  key={i}
                  style={{
                    padding: '8px 10px', borderRadius: 8, fontSize: 12,
                    background: 'rgba(10,22,40,0.5)', border: '1px solid var(--sky-border)',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleSubmit(h.query)}
                >
                  <div style={{ fontWeight: 500, marginBottom: 2 }}>{h.query}</div>
                  <div style={{ color: 'var(--sky-text-muted)', fontSize: 10 }}>
                    {h.created_at ? new Date(h.created_at).toLocaleString() : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
