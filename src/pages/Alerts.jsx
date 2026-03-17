import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { ShieldAlert, AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react'

export default function Alerts() {
  const [data, setData] = useState(null)
  const [riskFilter, setRiskFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const params = {}
    if (riskFilter) params.risk_level = riskFilter
    if (stateFilter) params.state = stateFilter
    api.alerts(params).then(setData).catch(console.error)
  }, [riskFilter, stateFilter])

  if (!data) return <div className="loading-container"><div className="spinner" /></div>

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="flex-center gap-2">
          <ShieldAlert size={28} className="text-risk-critical" />
          Alert Rankings
        </h1>
        <p>Suppliers ranked by composite AI risk score — highest risk first</p>
      </div>

      <div className="filter-bar">
        <select className="filter-select" value={riskFilter} onChange={e => setRiskFilter(e.target.value)}>
          <option value="">All Risk Levels</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select className="filter-select" value={stateFilter} onChange={e => setStateFilter(e.target.value)}>
          <option value="">All States</option>
          {['FL','TX','CA','NY','MI','IL','GA','NJ','PA','OH'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span style={{ fontSize: 13, color: 'var(--sky-text-muted)', lineHeight: '36px' }}>
          Showing {data.total} alerts
        </span>
      </div>

      <div className="alert-list">
        {(data.alerts || []).map((a, i) => (
          <div
            key={a.id}
            className="alert-card slide-up"
            style={{ animationDelay: `${i * 40}ms` }}
            onClick={() => navigate(`/supplier/${a.supplier_npi}`)}
          >
            <div className={`alert-score ${a.risk_level}`}>
              {Math.round(a.risk_score)}
            </div>
            <div className="alert-info">
              <div className="alert-title">{a.supplier_name}</div>
              <div className="alert-summary">{a.summary}</div>
              {a.top_reasons && (
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {a.top_reasons.slice(0, 3).map((r, ri) => (
                    <span key={ri} style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 4,
                      background: 'rgba(33,150,243,0.08)', color: 'var(--sky-text-secondary)',
                      border: '1px solid var(--sky-border)',
                    }}>{r}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="alert-meta" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <span className={`risk-badge ${a.risk_level}`}>{a.risk_level}</span>
              <span style={{ fontSize: 12, color: 'var(--sky-text-muted)' }}>
                {a.supplier_state} · {a.alert_type}
              </span>
              <span style={{ fontSize: 11, color: 'var(--sky-text-muted)' }}>
                {a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
