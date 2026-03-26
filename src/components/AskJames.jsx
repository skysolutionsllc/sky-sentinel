import { useState, useRef, useEffect } from 'react'
import { HelpCircle, X, Send, Loader2 } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function getLLMHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-llm-provider': localStorage.getItem('sky_llm_provider') || 'openai',
    'x-llm-api-key': localStorage.getItem('sky_llm_api_key') || '',
  }
}

export default function AskJames() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hey! I'm James — ask me anything about Sky Sentinel and I'll help you answer it. Architecture, data sources, AI explainability, judge questions — I've got you." }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const newMessages = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/ask-james`, {
        method: 'POST',
        headers: getLLMHeaders(),
        body: JSON.stringify({
          messages: newMessages.filter(m => m.role !== 'system'),
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response || "Hmm, I couldn't get an answer. Try rephrasing?" }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting. Check that the backend is running and an API key is configured in Settings." }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      {/* Help Button — bottom left, cohesive with app nav */}
      <button
        className="ask-james-bubble"
        onClick={() => setOpen(!open)}
        title="Need help? Ask James"
      >
        {open ? <X size={20} /> : <HelpCircle size={22} />}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="ask-james-panel">
          {/* Header with James's photo */}
          <div className="ask-james-header">
            <img src="/james.png" alt="James" className="ask-james-header-avatar" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Ask James</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Sky Sentinel Technical Lead</div>
            </div>
            <button
              className="ask-james-close"
              onClick={() => setOpen(false)}
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="ask-james-messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`ask-james-msg ${m.role}`}>
                {m.role === 'assistant' && (
                  <img src="/james.png" alt="" className="ask-james-msg-avatar" />
                )}
                <div className={`ask-james-msg-bubble ${m.role}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="ask-james-msg assistant">
                <img src="/james.png" alt="" className="ask-james-msg-avatar" />
                <div className="ask-james-msg-bubble assistant" style={{ display: 'flex', alignItems: 'center' }}>
                  <Loader2 size={16} className="ask-james-spinner" />
                  <span style={{ marginLeft: 8, opacity: 0.6 }}>Thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="ask-james-input-area">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about architecture, data, AI..."
              className="ask-james-input"
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="ask-james-send"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
