import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Shield, Eye, UserCheck, Lock, AlertCircle } from 'lucide-react'

const DEMO_ACCOUNTS = [
  { username: 'admin', password: 'admin123', role: 'Admin', desc: 'Full access — settings, models, thresholds' },
  { username: 'investigator', password: 'invest123', role: 'Investigator', desc: 'AI assist, data queries, investigation tools' },
  { username: 'viewer', password: 'viewer123', role: 'Viewer', desc: 'Read-only dashboard and alert views' },
]

export default function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const handleQuickLogin = async (acct) => {
    setError('')
    setLoading(true)
    try {
      await login(acct.username, acct.password)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #0c1220 100%)',
      padding: 20,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 440,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}>
        {/* Logo + Title */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            marginBottom: 16,
            boxShadow: '0 8px 32px rgba(59,130,246,0.3)',
          }}>
            <Shield size={32} color="#fff" />
          </div>
          <h1 style={{
            fontSize: 28,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #60a5fa, #22d3ee)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
          }}>
            Sky Sentinel
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 8 }}>
            AI-Augmented Medicare DME Fraud Detection
          </p>
        </div>

        {/* Login Form */}
        <div className="glass-card" style={{ padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                Username
              </label>
              <input
                type="text"
                className="query-input"
                style={{ width: '100%' }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                Password
              </label>
              <input
                type="password"
                className="query-input"
                style={{ width: '100%' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171',
                fontSize: 13,
              }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '12px 0', fontSize: 15 }}
            >
              <Lock size={16} style={{ marginRight: 8 }} />
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Quick Login */}
        <div className="glass-card" style={{ padding: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
            Demo Quick Access
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DEMO_ACCOUNTS.map((acct) => (
              <button
                key={acct.username}
                onClick={() => handleQuickLogin(acct)}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--sky-border)',
                  background: 'rgba(255,255,255,0.02)',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  fontSize: 13,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(59,130,246,0.08)'
                  e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                  e.currentTarget.style.borderColor = 'var(--sky-border)'
                }}
              >
                {acct.role === 'Admin' && <UserCheck size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />}
                {acct.role === 'Investigator' && <Shield size={18} style={{ color: '#3b82f6', flexShrink: 0 }} />}
                {acct.role === 'Viewer' && <Eye size={18} style={{ color: '#22c55e', flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{acct.role}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{acct.desc}</div>
                </div>
                <span style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>
                  {acct.username}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
