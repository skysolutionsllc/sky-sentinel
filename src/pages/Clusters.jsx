import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { Network, Search, TrendingUp, MapPin, Bot, Link, ChevronDown, ChevronUp } from 'lucide-react'

/* ─── Tiny helper: first 2 sentences of the LLM narrative ─── */
function summarize(text) {
  if (!text) return null
  // strip markdown bold/headers for the snippet
  const clean = text.replace(/##?\s*/g, '').replace(/\*\*/g, '').replace(/\n+/g, ' ').trim()
  const sentences = clean.match(/[^.!?]+[.!?]+/g)
  if (!sentences) return clean.slice(0, 160) + '…'
  return sentences.slice(0, 2).join(' ').trim()
}

/* ─── Individual Cluster Network Visualization ─── */
function ClusterGraph({ cluster, navigate }) {
  const size = 260
  const center = size / 2
  const hubR = 26
  const memberR = 16
  const spokeR = 90
  const members = cluster.members || []

  return (
    <svg width="100%" viewBox={`0 0 ${size} ${size}`} style={{ maxHeight: 260 }}>
      <defs>
        <filter id={`glow-hub-${cluster.cluster_id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id={`glow-node-${cluster.cluster_id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id={`bg-${cluster.cluster_id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(33,150,243,0.06)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      {/* Subtle background glow */}
      <circle cx={center} cy={center} r={center - 2} fill={`url(#bg-${cluster.cluster_id})`} />

      {/* Pulsing aura */}
      <circle cx={center} cy={center} r={hubR + 8} fill="none" stroke="#2196F3" strokeWidth="1">
        <animate attributeName="r" values={`${hubR + 8};${hubR + 30};${hubR + 8}`} dur="4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0;0.6" dur="4s" repeatCount="indefinite" />
      </circle>

      {/* Spokes + member nodes */}
      {members.slice(0, 8).map((m, mi) => {
        const angle = (mi / Math.min(members.length, 8)) * Math.PI * 2 - Math.PI / 2
        const mx = center + Math.cos(angle) * spokeR
        const my = center + Math.sin(angle) * spokeR
        const isCritical = m.risk_score >= 80
        const isHigh = m.risk_score >= 60
        const color = isCritical ? '#EF4444' : isHigh ? '#F59E0B' : '#3B82F6'
        const filter = (isCritical || isHigh) ? `url(#glow-node-${cluster.cluster_id})` : ''
        // Truncate name to initials
        const initials = (m.name || '').split(' ').map(w => w[0]).filter(Boolean).slice(0, 3).join('')
        return (
          <g key={m.npi} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); navigate(`/supplier/${m.npi}`) }}>
            <line x1={center} y1={center} x2={mx} y2={my} stroke={color} strokeOpacity="0.25" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx={mx} cy={my} r={memberR} fill="rgba(10,22,40,0.9)" stroke={color} strokeWidth="2" filter={filter} />
            <circle cx={mx} cy={my} r={3} fill={color} />
            <text x={mx} y={my - memberR - 5} textAnchor="middle" fill="#94A3B8" fontSize={8} fontWeight={500}>
              {initials}
            </text>
            <text x={mx} y={my + memberR + 12} textAnchor="middle" fill={color} fontSize={9} fontWeight={700}>
              {Math.round(m.risk_score)}
            </text>
          </g>
        )
      })}

      {/* Hub core */}
      <circle cx={center} cy={center} r={hubR} fill="rgba(10,22,40,0.95)" stroke="#2196F3" strokeWidth="2.5" filter={`url(#glow-hub-${cluster.cluster_id})`} />
      <text x={center} y={center - 4} textAnchor="middle" fill="#F1F5F9" fontSize={12} fontWeight={700}>C{cluster.cluster_id + 1}</text>
      <text x={center} y={center + 10} textAnchor="middle" fill="#94A3B8" fontSize={9}>{members.length} nodes</text>
    </svg>
  )
}


export default function Clusters() {
  const [data, setData] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.clusters().then(setData).catch(console.error)
  }, [])

  if (!data) return <div className="loading-container"><div className="spinner" /></div>

  const clusters = data.clusters || []

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="flex-center gap-2">
          <Network size={28} className="text-sky-light" />
          Cluster Detection
        </h1>
        <p>Coordinated multi-supplier patterns — what traditional detection systems miss</p>
      </div>

      {clusters.length === 0 ? (
        <div className="glass-card flex-center flex-column" style={{ textAlign: 'center', padding: 60, flexDirection: 'column' }}>
          <div style={{ marginBottom: 16 }}><Search size={48} color="var(--sky-text-muted)" /></div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No Clusters Detected</div>
          <div style={{ color: 'var(--sky-text-secondary)' }}>
            DBSCAN analysis found no coordinated supplier groups in the current dataset.
          </div>
        </div>
      ) : (
        <>
          {/* ── Section Header ── */}
          <div className="glass-card slide-up" style={{ marginBottom: 24, padding: '16px 20px' }}>
            <div className="chart-header" style={{ marginBottom: 0 }}>
              <div>
                <div className="chart-title flex-center gap-2">
                  <Link size={18} /> Coordinated Fraud Networks
                </div>
                <div className="chart-subtitle">{clusters.length} clusters detected — each card shows the network graph, linked suppliers, and AI analysis</div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {clusters.map(c => (
                  <span key={c.cluster_id} style={{
                    padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    background: c.cluster_risk_score >= 80 ? 'rgba(239,68,68,0.15)' : c.cluster_risk_score >= 60 ? 'rgba(245,158,11,0.15)' : 'rgba(33,150,243,0.15)',
                    color: c.cluster_risk_score >= 80 ? '#EF4444' : c.cluster_risk_score >= 60 ? '#F59E0B' : '#3B82F6',
                    border: `1px solid ${c.cluster_risk_score >= 80 ? 'rgba(239,68,68,0.3)' : c.cluster_risk_score >= 60 ? 'rgba(245,158,11,0.3)' : 'rgba(33,150,243,0.3)'}`,
                  }}>
                    C{c.cluster_id + 1}: {Math.round(c.cluster_risk_score)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Cluster Cards Grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 20 }}>
            {clusters.map((c, i) => {
              const isExpanded = expanded === c.cluster_id
              const riskLevel = c.cluster_risk_score >= 80 ? 'critical' : c.cluster_risk_score >= 60 ? 'high' : 'medium'
              const riskColor = riskLevel === 'critical' ? '#EF4444' : riskLevel === 'high' ? '#F59E0B' : '#3B82F6'
              const snippet = summarize(c.llm_narrative)

              return (
                <div
                  key={c.cluster_id}
                  className="glass-card slide-up"
                  style={{
                    animationDelay: `${i * 80}ms`,
                    transition: 'box-shadow 0.4s ease, border-color 0.3s ease',
                    borderColor: isExpanded ? riskColor : undefined,
                    cursor: 'pointer',
                    overflow: 'hidden',
                  }}
                  onClick={() => setExpanded(isExpanded ? null : c.cluster_id)}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                        Cluster #{c.cluster_id + 1}
                        <span style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                          background: `${riskColor}15`, color: riskColor,
                          border: `1px solid ${riskColor}30`,
                        }}>
                          {riskLevel.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--sky-text-secondary)' }}>
                        {c.member_count} connected suppliers
                      </div>
                    </div>
                    <div className={`alert-score ${riskLevel}`} style={{ width: 48, height: 48, fontSize: 16, flexShrink: 0 }}>
                      {Math.round(c.cluster_risk_score)}
                    </div>
                  </div>

                  {/* Shared Attributes */}
                  {c.shared_attributes && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                      {c.shared_attributes.shared_hcpcs?.map(h => (
                        <span key={h} style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 4,
                          background: 'rgba(33,150,243,0.1)', color: 'var(--sky-light)',
                          border: '1px solid var(--sky-border)'
                        }}>HCPCS: {h}</span>
                      ))}
                      {c.shared_attributes.growth_sync && (
                        <span className="flex-center gap-2" style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 4,
                          background: 'rgba(245,158,11,0.1)', color: 'var(--risk-high)',
                          border: '1px solid rgba(245,158,11,0.2)'
                        }}><TrendingUp size={12} /> Synced Growth</span>
                      )}
                      {c.shared_attributes.geo_overlap && (
                        <span className="flex-center gap-2" style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 4,
                          background: 'rgba(139,92,246,0.1)', color: '#A78BFA',
                          border: '1px solid rgba(139,92,246,0.2)'
                        }}><MapPin size={12} /> Geo Overlap</span>
                      )}
                    </div>
                  )}

                  {/* Network Graph */}
                  <div style={{
                    background: 'rgba(5,15,30,0.4)',
                    borderRadius: 12,
                    padding: 8,
                    marginBottom: 12,
                    border: '1px solid rgba(33,150,243,0.08)',
                  }}>
                    <ClusterGraph cluster={c} navigate={navigate} />
                  </div>

                  {/* AI Summary Snippet */}
                  {snippet && (
                    <div style={{
                      display: 'flex', gap: 8, alignItems: 'flex-start',
                      padding: '10px 12px',
                      background: 'rgba(139,92,246,0.05)',
                      border: '1px solid rgba(139,92,246,0.15)',
                      borderRadius: 8,
                      marginBottom: isExpanded ? 12 : 0,
                    }}>
                      <Bot size={16} style={{ flexShrink: 0, marginTop: 2, color: '#A78BFA' }} />
                      <div style={{ fontSize: 12, color: '#CBD5E1', lineHeight: 1.5 }}>
                        {snippet}
                      </div>
                    </div>
                  )}

                  {/* Expand/Collapse indicator */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8, color: '#64748b' }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div style={{ marginTop: 8 }}>
                      {/* Member List */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Linked Suppliers
                        </div>
                        <div className="cluster-members">
                          {c.members?.map(m => (
                            <span
                              key={m.npi}
                              className="cluster-member-badge"
                              onClick={(e) => { e.stopPropagation(); navigate(`/supplier/${m.npi}`) }}
                              style={{ cursor: 'pointer' }}
                            >
                              {m.name} ({m.state}) — {m.risk_score}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Full LLM Narrative */}
                      {c.llm_narrative && (
                        <div>
                          <div className="chart-title flex-center gap-2" style={{ fontSize: 13, marginBottom: 8 }}>
                            <Bot size={16} /> Full AI Cluster Analysis
                          </div>
                          <div className="llm-narrative" style={{ fontSize: 13 }}>
                            <ReactMarkdown>{c.llm_narrative}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* How DBSCAN Works */}
      <div className="glass-card" style={{ marginTop: 24 }}>
        <div className="chart-header">
          <div>
            <div className="chart-title flex-center gap-2">
              <Network size={18} /> How DBSCAN Cluster Detection Works
            </div>
            <div className="chart-subtitle">The algorithm behind coordinated fraud ring discovery</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 8 }}>
          <div style={{ padding: 16, borderRadius: 10, background: 'rgba(10,22,40,0.5)', border: '1px solid var(--sky-border)' }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--sky-light)', fontSize: 14 }}>1. Feature Space</div>
            <div style={{ fontSize: 13, color: 'var(--sky-text-secondary)', lineHeight: 1.6 }}>
              Each supplier is represented as a point in 5-dimensional space: <strong>billing volume</strong>, <strong>claim count</strong>, <strong>growth rate</strong>, <strong>HCPCS diversity</strong>, and <strong>geographic spread</strong>. All features are standardized to zero mean and unit variance.
            </div>
          </div>
          <div style={{ padding: 16, borderRadius: 10, background: 'rgba(10,22,40,0.5)', border: '1px solid var(--sky-border)' }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--sky-light)', fontSize: 14 }}>2. Density Scanning</div>
            <div style={{ fontSize: 13, color: 'var(--sky-text-secondary)', lineHeight: 1.6 }}>
              DBSCAN scans each supplier's <strong>ε-neighborhood</strong> (eps=0.8 std devs). If ≥3 suppliers are within this radius, they form a <strong>core cluster</strong>. Unlike K-Means, the number of clusters is discovered automatically — no preset count needed.
            </div>
          </div>
          <div style={{ padding: 16, borderRadius: 10, background: 'rgba(10,22,40,0.5)', border: '1px solid var(--sky-border)' }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--sky-light)', fontSize: 14 }}>3. Why It Catches Fraud Rings</div>
            <div style={{ fontSize: 13, color: 'var(--sky-text-secondary)', lineHeight: 1.6 }}>
              Shell companies in a coordinated network share <strong>behavioral fingerprints</strong>: similar billing patterns, same HCPCS focus, correlated growth, and wide geographic reach. DBSCAN groups them <strong>even when no single entity exceeds an individual threshold</strong>.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
