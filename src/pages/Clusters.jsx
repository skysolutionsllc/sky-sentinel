import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { Network, Search, TrendingUp, MapPin, Bot, Link } from 'lucide-react'

export default function Clusters() {
  const [data, setData] = useState(null)
  const [selected, setSelected] = useState(null)
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 20 }}>
          {clusters.map((c, i) => (
            <div
              key={c.cluster_id}
              className="cluster-card slide-up"
              style={{ animationDelay: `${i * 80}ms` }}
              onClick={() => setSelected(selected === c.cluster_id ? null : c.cluster_id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                    Cluster #{c.cluster_id + 1}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--sky-text-secondary)' }}>
                    {c.member_count} connected suppliers
                  </div>
                </div>
                <div className={`alert-score ${c.cluster_risk_score >= 80 ? 'critical' : c.cluster_risk_score >= 60 ? 'high' : 'medium'}`}
                  style={{ width: 48, height: 48, fontSize: 16 }}>
                  {Math.round(c.cluster_risk_score)}
                </div>
              </div>

              {/* Shared Attributes */}
              {c.shared_attributes && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
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

              {/* Members */}
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

              {/* LLM Narrative (expanded) */}
              {selected === c.cluster_id && c.llm_narrative && (
                <div style={{ marginTop: 16 }}>
                  <div className="chart-title flex-center gap-2" style={{ fontSize: 13, marginBottom: 8 }}>
                    <Bot size={16} /> AI Cluster Analysis
                  </div>
                  <div className="llm-narrative" style={{ fontSize: 13 }}>
                    <ReactMarkdown>{c.llm_narrative}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Network Visualization */}
      <div className="glass-card" style={{ marginTop: 24 }}>
        <div className="chart-header">
          <div>
            <div className="chart-title flex-center gap-2">
              <Link size={18} /> Cluster Network Graph
            </div>
            <div className="chart-subtitle">Visual representation of supplier coordination patterns</div>
          </div>
        </div>
        <div style={{ position: 'relative', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowX: 'auto' }}>
          <svg width="100%" height="280" viewBox={`0 0 ${Math.max(800, clusters.length * 180 + 100)} 280`} style={{ minWidth: Math.max(800, clusters.length * 180 + 100) }}>
            {clusters.map((c, ci) => {
              const totalWidth = Math.max(800, clusters.length * 180 + 100)
              const cx = (totalWidth / (clusters.length + 1)) * (ci + 1)
              const cy = 140
              return (
                <g key={c.cluster_id}>
                  {/* Hub */}
                  <circle cx={cx} cy={cy} r={30} fill="rgba(33,150,243,0.15)" stroke="#2196F3" strokeWidth={2} />
                  <text x={cx} y={cy + 4} textAnchor="middle" fill="#F1F5F9" fontSize={11} fontWeight={600}>
                    C{c.cluster_id + 1}
                  </text>
                  {/* Spokes */}
                  {c.members?.slice(0, 6).map((m, mi) => {
                    const angle = (mi / Math.min(c.members.length, 6)) * Math.PI * 2 - Math.PI / 2
                    const mx = cx + Math.cos(angle) * 80
                    const my = cy + Math.sin(angle) * 80
                    const color = m.risk_score >= 80 ? '#EF4444' : m.risk_score >= 60 ? '#F59E0B' : '#3B82F6'
                    return (
                      <g key={m.npi}>
                        <line x1={cx} y1={cy} x2={mx} y2={my} stroke="rgba(33,150,243,0.2)" strokeWidth={1} />
                        <circle cx={mx} cy={my} r={16} fill="rgba(15,40,71,0.8)" stroke={color} strokeWidth={1.5} />
                        <text x={mx} y={my + 4} textAnchor="middle" fill={color} fontSize={9} fontWeight={700}>
                          {Math.round(m.risk_score)}
                        </text>
                      </g>
                    )
                  })}
                </g>
              )
            })}
          </svg>
        </div>
      </div>

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
