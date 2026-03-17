import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { 
  Search, TrendingUp, Bot, Target, ClipboardList, 
  CheckCircle2, AlertCircle, Eye, Network 
} from 'lucide-react'

const FACTOR_COLORS = {
  billing_volume: '#EF4444',
  growth_rate: '#F59E0B',
  hcpcs_mix: '#3B82F6',
  geographic_spread: '#8B5CF6',
  llm_context: '#10B981',
  cluster_association: '#EC4899',
}

const FACTOR_LABELS = {
  billing_volume: 'Billing Volume',
  growth_rate: 'Growth Rate',
  hcpcs_mix: 'HCPCS Mix',
  geographic_spread: 'Geographic Spread',
  llm_context: 'AI Contextual',
  cluster_association: 'Cluster Link',
}

export default function SupplierDetail() {
  const { npi } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [actionStatus, setActionStatus] = useState(null)

  useEffect(() => {
    api.supplierDetail(npi).then(setData).catch(console.error)
    api.supplierTimeline(npi).then(setTimeline).catch(console.error)
  }, [npi])

  if (!data) return <div className="loading-container"><div className="spinner" /></div>
  const { supplier, risk_score, alert, recent_claims, cluster_id } = data

  const handleAction = async (action) => {
    if (!alert) return
    await api.alertAction(alert.id, { action, investigator: 'Demo Analyst', notes: '' })
    setActionStatus(action)
  }

  // Build gauge percentage
  const score = risk_score?.composite || 0
  const riskLevel = risk_score?.risk_level || 'low'
  const circumference = 2 * Math.PI * 80
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <h1 className="flex-center gap-2">
            <Search size={28} className="text-sky-light" />
            {supplier.name}
          </h1>
          <p>NPI: {supplier.npi} · {supplier.city}, {supplier.state} · {supplier.entity_type} · Enrolled: {supplier.enrollment_date ? new Date(supplier.enrollment_date).toLocaleDateString() : 'N/A'}</p>
        </div>
        <button className="btn-secondary" onClick={() => navigate(-1)}>← Back</button>
      </div>

      <div className="detail-grid">
        {/* Risk Gauge */}
        <div className="glass-card risk-gauge-container slide-up stagger-1">
          <div className="chart-title" style={{ marginBottom: 16 }}>Composite Risk Score</div>
          <svg width="200" height="200" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(33,150,243,0.1)" strokeWidth="12" />
            <circle
              cx="100" cy="100" r="80" fill="none"
              stroke={FACTOR_COLORS[riskLevel === 'critical' ? 'billing_volume' : riskLevel === 'high' ? 'growth_rate' : riskLevel === 'medium' ? 'hcpcs_mix' : 'llm_context']}
              strokeWidth="12" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 100 100)"
              style={{ transition: 'stroke-dashoffset 1.5s ease' }}
            />
            <text x="100" y="92" textAnchor="middle" fill="var(--sky-text-primary)" fontSize="42" fontWeight="800">
              {Math.round(score)}
            </text>
            <text x="100" y="118" textAnchor="middle" fill="var(--sky-text-secondary)" fontSize="14" fontWeight="600" textTransform="uppercase">
              {riskLevel}
            </text>
          </svg>
        </div>

        {/* Factor Breakdown */}
        <div className="glass-card slide-up stagger-2">
          <div className="chart-title" style={{ marginBottom: 20 }}>Risk Factor Breakdown</div>
          {risk_score?.factors && Object.entries(risk_score.factors).map(([key, value]) => (
            <div key={key} className="factor-bar">
              <span className="factor-label">{FACTOR_LABELS[key] || key}</span>
              <div className="factor-track">
                <div
                  className="factor-fill"
                  style={{
                    width: `${Math.min(value, 100)}%`,
                    background: FACTOR_COLORS[key] || 'var(--sky-blue)',
                  }}
                />
              </div>
              <span className="factor-value">{Math.round(value)}</span>
            </div>
          ))}
        </div>

        {/* Billing Timeline */}
        <div className="glass-card full-width slide-up stagger-3">
          <div className="chart-header">
            <div>
              <div className="chart-title flex-center gap-2">
                <TrendingUp size={18} />
                Billing Timeline
              </div>
              <div className="chart-subtitle">Claims volume and billing amount over time</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(33,150,243,0.08)" />
              <XAxis dataKey="period" tick={{ fill: '#94A3B8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#0F2847', border: '1px solid rgba(33,150,243,0.3)', borderRadius: 8 }}
              />
              <Line type="monotone" dataKey="total_billed" stroke="#2196F3" strokeWidth={2} dot={{ fill: '#2196F3', r: 4 }} name="Total Billed" />
              <Line type="monotone" dataKey="total_claims" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 4 }} name="Claims" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* LLM Narrative */}
        {alert?.llm_narrative && (
          <div className="glass-card full-width slide-up stagger-4">
            <div className="chart-header">
              <div>
                <div className="chart-title flex-center gap-2">
                  <Bot size={18} />
                  AI Risk Assessment
                </div>
                <div className="chart-subtitle">Generated by LLM — evidence-based narrative analysis</div>
              </div>
              <span className={`risk-badge ${riskLevel}`}>{riskLevel} risk</span>
            </div>
            <div className="llm-narrative"><ReactMarkdown>{alert.llm_narrative}</ReactMarkdown></div>
          </div>
        )}

        {/* Action Panel */}
        <div className="glass-card full-width slide-up stagger-5">
          <div className="chart-title flex-center gap-2" style={{ marginBottom: 16 }}>
            <Target size={18} />
            Investigator Actions
          </div>
          {actionStatus ? (
            <div className="flex-center justify-center gap-2" style={{ padding: 20, color: 'var(--status-clean)' }}>
              <CheckCircle2 size={18} /> 
              <span>Alert marked as <strong>{actionStatus.replace('_', ' ')}</strong>. Decision logged.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn-danger flex-center gap-2" onClick={() => handleAction('valid_concern')}>
                <AlertCircle size={16} /> Valid Concern — Escalate
              </button>
              <button className="btn-success flex-center gap-2" onClick={() => handleAction('false_positive')}>
                <CheckCircle2 size={16} /> False Positive — Dismiss
              </button>
              <button className="btn-secondary flex-center gap-2" onClick={() => handleAction('monitor')}>
                <Eye size={16} /> Continue Monitoring
              </button>
              {cluster_id && (
                <button className="btn-primary flex-center gap-2" onClick={() => navigate('/clusters')}>
                  <Network size={16} /> View Cluster #{cluster_id}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Recent Claims */}
        <div className="glass-card full-width slide-up">
          <div className="chart-header">
            <div>
              <div className="chart-title flex-center gap-2">
                <ClipboardList size={18} />
                Recent Claims
              </div>
              <div className="chart-subtitle">Individual claims from this supplier</div>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Claim ID</th>
                  <th>HCPCS</th>
                  <th>Description</th>
                  <th>Billed</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(recent_claims || []).map(c => (
                  <tr key={c.claim_id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.claim_id}</td>
                    <td style={{ fontWeight: 600, color: 'var(--sky-light)' }}>{c.hcpcs_code}</td>
                    <td style={{ fontSize: 12 }}>{c.hcpcs_description}</td>
                    <td style={{ fontWeight: 600 }}>${Number(c.billed_amount).toLocaleString()}</td>
                    <td style={{ fontSize: 12 }}>{c.service_date ? new Date(c.service_date).toLocaleDateString() : ''}</td>
                    <td><span className={`status-badge ${c.status}`}>{c.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
