import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Lock, AlertCircle, ArrowRight } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password')
      return
    }
    setLoading(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      {/* Ambient background elements */}
      <div className="login-bg-orb login-bg-orb-1" />
      <div className="login-bg-orb login-bg-orb-2" />
      <div className="login-bg-orb login-bg-orb-3" />

      <div className="login-container">
        {/* Left Panel — Branding */}
        <div className="login-brand-panel">
          <div className="login-brand-content">
            <img src="/logo.png" alt="Sky Sentinel" className="login-logo" />
            <div className="login-brand-divider" />
            <div className="login-brand-features">
              <div className="login-brand-feature">
                <div className="login-feature-dot" />
                <span>Ensemble AI anomaly detection</span>
              </div>
              <div className="login-brand-feature">
                <div className="login-feature-dot" />
                <span>Cross-supplier network analysis</span>
              </div>
              <div className="login-brand-feature">
                <div className="login-feature-dot" />
                <span>Human-in-the-Loop investigation</span>
              </div>
              <div className="login-brand-feature">
                <div className="login-feature-dot" />
                <span>GPT-5.4 contextual reasoning</span>
              </div>
            </div>
            <div className="login-brand-footer">
              Team 1 — Sky Solutions LLC<br />
              ACT-IAC AI in Action Hackathon 2026
            </div>
          </div>
        </div>

        {/* Right Panel — Login Form */}
        <div className="login-form-panel">
          <div className="login-form-wrapper">
            <div className="login-form-header">
              <h2>Welcome back</h2>
              <p>Sign in to access the dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <label htmlFor="login-user">Username</label>
                <input
                  id="login-user"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                  autoFocus
                />
              </div>

              <div className="login-field">
                <label htmlFor="login-pass">Password</label>
                <input
                  id="login-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="login-error">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="login-submit"
                disabled={loading}
              >
                {loading ? (
                  <span className="login-submit-text">Signing in...</span>
                ) : (
                  <>
                    <Lock size={16} />
                    <span className="login-submit-text">Sign In</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="login-hint">
              <span>Demo credentials available for all team members</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
