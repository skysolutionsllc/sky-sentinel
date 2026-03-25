import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { 
  Search, TrendingUp, Bot, Target, ClipboardList, 
  CheckCircle2, AlertCircle, Eye, Network, FileText, ListChecks 
} from 'lucide-react'

/* ─── Parse LLM narrative into 3 sections ─── */
function parseNarrative(text) {
  if (!text) return null
  const sections = { keyConcerns: '', evidenceSummary: '', recommendedActions: '', raw: text }
  // Normalize header patterns: ## KEY CONCERNS, ### KEY CONCERNS, **KEY CONCERNS**, KEY CONCERNS:
  const headerPattern = /(?:^|\n)\s*(?:#{1,3}\s*)?(?:\*\*)?\s*(KEY CONCERNS(?:\s+IDENTIFIED)?|EVIDENCE SUMMARY|RECOMMENDED ACTIONS)\s*(?:\*\*)?\s*:?\s*(?:\n|$)/gi
  const matches = [...text.matchAll(headerPattern)]
  if (matches.length < 2) return null // can't reliably parse, fall back to single card
  for (let i = 0; i < matches.length; i++) {
    const sectionName = matches[i][1].toUpperCase()
    const start = matches[i].index + matches[i][0].length
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length
    const content = text.slice(start, end).trim()
    if (sectionName.startsWith('KEY CONCERNS')) sections.keyConcerns = content
    else if (sectionName.startsWith('EVIDENCE')) sections.evidenceSummary = content
    else if (sectionName.startsWith('RECOMMENDED')) sections.recommendedActions = content
  }
  return sections
}

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

const FACTOR_DESCRIPTIONS = {
  billing_volume: 'Isolation Forest: 100-tree ensemble analyzes 7 features simultaneously (billed amount, claims, beneficiaries, HCPCS diversity, avg per claim, growth, geo spread). Anomalies are data points easily isolated — fewer tree splits needed. Score 0–100.',
  growth_rate: 'Time-Series Analysis: measures quarter-over-quarter billing acceleration. Formula: min(|growth_rate| × 2, 100). A 400% quarterly growth → score 100. Legitimate suppliers typically grow ±10% per quarter.',
  hcpcs_mix: 'Peer Deviation: compares this supplier\'s HCPCS code diversity against state peers. Shell companies concentrate on 2–3 high-cost codes (e.g., K0856 power wheelchairs at $30K+). Score increases with concentration.',
  geographic_spread: 'Geographic Impossibility: measures the ratio of states served relative to supplier location. A Brooklyn DME company billing patients across 12+ states scores near 100. Legitimate suppliers typically serve 1–2 states.',
  llm_context: 'Z-Score Peer Analysis: measures standard deviations from state peer group mean. Formula: min(|billing − peer_mean| / peer_std × 25, 100). A Z-score of 4+ means the supplier is a statistical impossibility within its peer group.',
  cluster_association: 'DBSCAN Clustering: density-based scan in 5-dimensional behavioral space (eps=0.8, min_samples=3). Cluster members score 60; non-members score 10. Detects coordinated activity even when individual entities stay below thresholds.',
}

export default function SupplierDetail() {
  const { npi } = useParams()
  const navigate = useNavigate()
  const { effectiveRole } = useAuth()
  const [data, setData] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [actionStatus, setActionStatus] = useState(null)
  const [outboundNotification, setOutboundNotification] = useState(null)

  useEffect(() => {
    api.supplierDetail(npi).then(setData).catch(console.error)
    api.supplierTimeline(npi).then(setTimeline).catch(console.error)
  }, [npi])

  if (!data) return <div className="loading-container"><div className="spinner" /></div>
  const { supplier, risk_score, alert, recent_claims, cluster_id } = data

  const handleAction = async (action) => {
    if (!alert) return
    const result = await api.alertAction(alert.id, { action, investigator: 'Demo Analyst', notes: '' })
    setActionStatus(action)
    if (result.outbound_notification) setOutboundNotification(result.outbound_notification)
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
            <div key={key} className="factor-bar" style={{ marginBottom: 16 }}>
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
              {FACTOR_DESCRIPTIONS[key] && (
                <div style={{ fontSize: 11, color: 'var(--sky-text-secondary)', lineHeight: 1.5, marginTop: 4, gridColumn: '1 / -1' }}>
                  {FACTOR_DESCRIPTIONS[key]}
                </div>
              )}
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

        {/* LLM Narrative — split into 3 panels */}
        {alert?.llm_narrative && (() => {
          const parsed = parseNarrative(alert.llm_narrative)
          if (parsed) {
            return (
              <>
                {/* Section Header */}
                <div className="glass-card full-width slide-up stagger-4" style={{ padding: '14px 20px' }}>
                  <div className="chart-header" style={{ marginBottom: 0 }}>
                    <div>
                      <div className="chart-title flex-center gap-2">
                        <Bot size={18} />
                        AI Risk Assessment
                      </div>
                      <div className="chart-subtitle">Generated by LLM — evidence-based narrative analysis</div>
                    </div>
                    <span className={`risk-badge ${riskLevel}`}>{riskLevel} risk</span>
                  </div>
                </div>

                {/* Key Concerns */}
                {parsed.keyConcerns && (
                  <div className="glass-card full-width slide-up" style={{ animationDelay: '0.35s', borderLeft: '3px solid #EF4444' }}>
                    <div className="chart-title flex-center gap-2" style={{ marginBottom: 12, color: '#EF4444' }}>
                      <AlertCircle size={18} />
                      Key Concerns
                    </div>
                    <div className="llm-narrative"><ReactMarkdown>{parsed.keyConcerns}</ReactMarkdown></div>
                  </div>
                )}

                {/* Evidence Summary */}
                {parsed.evidenceSummary && (
                  <div className="glass-card full-width slide-up" style={{ animationDelay: '0.45s', borderLeft: '3px solid #3B82F6' }}>
                    <div className="chart-title flex-center gap-2" style={{ marginBottom: 12, color: '#3B82F6' }}>
                      <FileText size={18} />
                      Evidence Summary
                    </div>
                    <div className="llm-narrative"><ReactMarkdown>{parsed.evidenceSummary}</ReactMarkdown></div>
                  </div>
                )}

                {/* Recommended Actions */}
                {parsed.recommendedActions && (
                  <div className="glass-card full-width slide-up" style={{ animationDelay: '0.55s', borderLeft: '3px solid #10B981' }}>
                    <div className="chart-title flex-center gap-2" style={{ marginBottom: 12, color: '#10B981' }}>
                      <ListChecks size={18} />
                      Recommended Actions
                    </div>
                    <div className="llm-narrative"><ReactMarkdown>{parsed.recommendedActions}</ReactMarkdown></div>
                  </div>
                )}
              </>
            )
          }
          // Fallback: single card if parsing fails
          return (
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
          )
        })()}

        {/* Action Panel — hidden for viewers */}
        {effectiveRole !== 'viewer' && (
        <div className="glass-card full-width slide-up stagger-5">
          <div className="chart-title flex-center gap-2" style={{ marginBottom: 16 }}>
            <Target size={18} />
            Investigator Actions
          </div>
          {actionStatus ? (
            <div>
              <div className="flex-center justify-center gap-2" style={{ padding: 20, color: 'var(--status-clean)' }}>
                <CheckCircle2 size={18} /> 
                <span>Alert marked as <strong>{actionStatus.replace('_', ' ')}</strong>. Decision logged.</span>
              </div>
              {outboundNotification && (
                <div style={{
                  marginTop: 12, padding: 16, borderRadius: 10,
                  background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#3B82F6', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Network size={15} /> Outbound Insurance Provider Notification Sent
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', fontSize: 12, color: 'var(--sky-text-secondary)' }}>
                    <div><strong style={{ color: 'var(--sky-text-primary)' }}>Reference:</strong> {outboundNotification.reference_id}</div>
                    <div><strong style={{ color: 'var(--sky-text-primary)' }}>Carrier:</strong> {outboundNotification.carrier}</div>
                    <div><strong style={{ color: 'var(--sky-text-primary)' }}>Endpoint:</strong> <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{outboundNotification.endpoint}</span></div>
                    <div><strong style={{ color: 'var(--sky-text-primary)' }}>Priority:</strong> <span style={{ color: outboundNotification.payload?.priority === 'HIGH' ? '#EF4444' : '#F59E0B', fontWeight: 600 }}>{outboundNotification.payload?.priority}</span></div>
                    <div><strong style={{ color: 'var(--sky-text-primary)' }}>Status:</strong> <span style={{ color: '#10B981', fontWeight: 600 }}>✓ {outboundNotification.status}</span></div>
                    <div><strong style={{ color: 'var(--sky-text-primary)' }}>Timestamp:</strong> {new Date(outboundNotification.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              )}
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
                  <Network size={16} /> View Cluster #{cluster_id + 1}
                </button>
              )}
            </div>
          )}
        </div>
        )}

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
