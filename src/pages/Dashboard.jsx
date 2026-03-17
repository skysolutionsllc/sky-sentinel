import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { 
  Shield, TrendingUp, Target, Building2, Activity,
  CheckCircle2, XCircle, Hourglass, PauseCircle,
  AlertTriangle, Map
} from 'lucide-react'
import USHeatmap from '../components/charts/USHeatmap'
import FairnessPanel from '../components/charts/FairnessPanel'

// --- Custom AI Icons ---
const CoreAiIcon = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2z" fill={color} fillOpacity="0.15" />
    <path d="M19 4l1.2 3.8L24 9l-3.8 1.2L19 14l-1.2-3.8L14 9l3.8-1.2L19 4z" />
  </svg>
)

const MultiMethodIcon = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="14" width="8" height="8" rx="2" fill={color} fillOpacity="0.2" />
    <rect x="13" y="2" width="8" height="8" rx="2" fill={color} fillOpacity="0.8" />
    <path d="M7 14V11c0-1.1.9-2 2-2h4" />
    <circle cx="17" cy="18" r="3" fill={color} fillOpacity="0.2" />
    <path d="M17 15v-1c0-1.1-.9-2-2-2h-2" />
  </svg>
)

const LlmIcon = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z" fill={color} fillOpacity="0.1" />
    <path d="M14 2v6h6" />
    <path d="M8 12h8M8 16h5" />
    <circle cx="18" cy="16" r="1.5" fill={color} stroke="none" />
    <path d="M19.5 14L20 12.5L21.5 12L20 11.5L19.5 10L19 11.5L17.5 12L19 12.5z" fill={color} stroke="none" />
  </svg>
)

const HitlIcon = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19.5 9A8.995 8.995 0 0012 3a8.995 8.995 0 00-6.763 3.067M21.5 6.5V9H19" />
    <path d="M4.5 15A8.995 8.995 0 0012 21a8.995 8.995 0 006.763-3.067M2.5 17.5V15H5" />
    <circle cx="12" cy="10" r="2.5" fill={color} fillOpacity="0.2" />
    <path d="M7 17c0-2.5 2.5-3.5 5-3.5s5 1 5 3.5" />
  </svg>
)

const FairnessIcon = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="14" width="4" height="6" rx="1" fill={color} fillOpacity="0.2" />
    <rect x="10" y="8" width="4" height="12" rx="1" fill={color} fillOpacity="0.8" />
    <rect x="16" y="11" width="4" height="9" rx="1" fill={color} fillOpacity="0.2" />
    <path d="M2 22h20" />
    <path d="M6 10l6-6 6 4" />
  </svg>
)

const RISK_COLORS = { critical: '#EF4444', high: '#F59E0B', medium: '#3B82F6', low: '#10B981' }

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [claims, setClaims] = useState([])
  const [trends, setTrends] = useState([])
  const [hcpcs, setHcpcs] = useState([])
  const [geoRisk, setGeoRisk] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      api.dashboardStats(),
      api.alerts({ limit: 5 }),
      api.claimsFeed({ limit: 15 }),
      api.trends(),
      api.hcpcsDistribution(),
      api.geoRisk(),
    ]).then(([s, a, c, t, h, g]) => {
      setStats(s)
      setAlerts(a.alerts || [])
      setClaims(c.claims || [])
      setTrends(t || [])
      setHcpcs(h || [])
      setGeoRisk(g || [])
    }).catch(console.error)
  }, [])

  if (!stats) return <div className="loading-container"><div className="spinner" /></div>

  const rd = stats.risk_distribution || {}
  const pieData = [
    { name: 'Critical', value: rd.critical || 0, color: RISK_COLORS.critical },
    { name: 'High', value: rd.high || 0, color: RISK_COLORS.high },
    { name: 'Medium', value: rd.medium || 0, color: RISK_COLORS.medium },
    { name: 'Low', value: rd.low || 0, color: RISK_COLORS.low },
  ].filter(d => d.value > 0)

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Shield size={28} className="text-sky-light" />
          Sky Sentinel Dashboard
        </h1>
        <p>AI-Augmented DME Fraud Detection — Real-time Medicare Program Integrity Intelligence</p>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card slide-up stagger-1">
          <span className="stat-label">Total Alerts</span>
          <span className="stat-value critical">{stats.total_alerts}</span>
          <span className="stat-sub">{stats.new_alerts} new since last session</span>
        </div>
        <div className="stat-card slide-up stagger-2">
          <span className="stat-label">Critical Risk</span>
          <span className="stat-value critical">{rd.critical || 0}</span>
          <span className="stat-sub">Immediate attention required</span>
        </div>
        <div className="stat-card slide-up stagger-3">
          <span className="stat-label">Active Clusters</span>
          <span className="stat-value high">{stats.active_clusters}</span>
          <span className="stat-sub">Coordinated patterns detected</span>
        </div>
        <div className="stat-card slide-up stagger-4">
          <span className="stat-label">Claims Processed</span>
          <span className="stat-value medium">{stats.total_claims?.toLocaleString()}</span>
          <span className="stat-sub">{stats.flagged_claims} flagged for review</span>
        </div>
        <div className="stat-card slide-up stagger-5">
          <span className="stat-label">Suppliers Monitored</span>
          <span className="stat-value">{stats.total_suppliers}</span>
          <span className="stat-sub">DME suppliers under analysis</span>
        </div>
      </div>

      {/* AI Approach Banner */}
      <div className="glass-card slide-up stagger-2" style={{
        background: 'linear-gradient(135deg, rgba(33,150,243,0.08) 0%, rgba(16,185,129,0.06) 100%)',
        border: '1px solid rgba(33,150,243,0.2)',
        padding: '24px 32px',
        marginBottom: '24px' // Added spacing class/style
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 /* Increased bottom margin */ }}>
          <CoreAiIcon size={24} color="#2196F3" />
          <span style={{ fontSize: 16, fontWeight: 600, color: '#F1F5F9' }}>Why Sky Sentinel Goes Beyond Traditional Fraud Detection</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ marginTop: 2, flexShrink: 0 }}>
              <MultiMethodIcon size={20} color="#F59E0B" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#CBD5E1', marginBottom: 4 }}>Multi-Method AI</div>
              <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.4 }}>Isolation Forest + Z-score + DBSCAN — not just one model</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ marginTop: 2, flexShrink: 0 }}>
              <LlmIcon size={20} color="#10B981" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#CBD5E1', marginBottom: 4 }}>LLM Reasoning</div>
              <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.4 }}>Explains <em>why</em> a supplier is suspicious, not just a score</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ marginTop: 2, flexShrink: 0 }}>
              <HitlIcon size={20} color="#8B5CF6" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#CBD5E1', marginBottom: 4 }}>Human-in-the-Loop</div>
              <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.4 }}>Investigators tune weights and test hypotheses</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ marginTop: 2, flexShrink: 0 }}>
              <FairnessIcon size={20} color="#EC4899" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#CBD5E1', marginBottom: 4 }}>Fairness Built-In</div>
              <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.4 }}>Algorithmic bias monitoring across geographies</div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Geographic Risk Heatmap — moved up for demo visibility */}
        <div className="glass-card full-width slide-up">
          <div className="chart-header">
            <div>
              <div className="chart-title flex-center gap-2">
                <Map size={18} />
                Provider Risk Heatmap
              </div>
              <div className="chart-subtitle">Geographic risk concentration across US states</div>
            </div>
          </div>
          <USHeatmap geoRisk={geoRisk} />
        </div>

        {/* Fairness & Bias Review — moved up */}
        <div className="full-width">
          <FairnessPanel geoRisk={geoRisk} />
        </div>

        {/* Charts Row */}
        {/* Claims Trend */}
        <div className="glass-card slide-up stagger-2">
          <div className="chart-header">
            <div>
              <div className="chart-title flex-center gap-2">
                <TrendingUp size={18} />
                Claims Trend
              </div>
              <div className="chart-subtitle">Monthly flagged vs. total claims</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trends}>
              <defs>
                <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2196F3" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#2196F3" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(33,150,243,0.08)" />
              <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#0F2847', border: '1px solid rgba(33,150,243,0.3)', borderRadius: 8 }}
                labelStyle={{ color: '#F1F5F9' }}
                itemStyle={{ color: '#F1F5F9' }}
              />
              <Area type="monotone" dataKey="total_claims" stroke="#2196F3" fill="url(#gradBlue)" name="Total Claims" />
              <Area type="monotone" dataKey="flagged_count" stroke="#EF4444" fill="url(#gradRed)" name="Flagged" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Distribution */}
        <div className="glass-card slide-up stagger-3">
          <div className="chart-header">
            <div>
              <div className="chart-title flex-center gap-2">
                <Target size={18} />
                Risk Distribution
              </div>
              <div className="chart-subtitle">Supplier alert risk levels</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%" cy="50%"
                innerRadius={60} outerRadius={95}
                paddingAngle={4}
                dataKey="value"
              >
                {pieData.map((d, i) => (
                  <Cell key={i} fill={d.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#0F2847', border: '1px solid rgba(33,150,243,0.3)', borderRadius: 8 }}
                labelStyle={{ color: '#F1F5F9' }}
                itemStyle={{ color: '#F1F5F9' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: -8 }}>
            {pieData.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                <span style={{ color: '#94A3B8' }}>{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* HCPCS Distribution */}
        <div className="glass-card slide-up stagger-4">
          <div className="chart-header">
            <div>
              <div className="chart-title flex-center gap-2">
                <Building2 size={18} />
                Top DME Categories
              </div>
              <div className="chart-subtitle">HCPCS codes by total billed amount</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={hcpcs.slice(0, 7)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(33,150,243,0.08)" />
              <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis dataKey="code" type="category" tick={{ fill: '#94A3B8', fontSize: 11 }} width={60} />
              <Tooltip
                contentStyle={{ background: '#0F2847', border: '1px solid rgba(33,150,243,0.3)', borderRadius: 8 }}
                labelStyle={{ color: '#F1F5F9' }}
                itemStyle={{ color: '#F1F5F9' }}
                formatter={(v, name, props) => [
                  `$${Number(v).toLocaleString()}`,
                  props.payload.description || props.payload.code
                ]}
                labelFormatter={(label) => {
                  const item = hcpcs.find(h => h.code === label)
                  return item?.description ? `${label} — ${item.description}` : label
                }}
              />
              <Bar dataKey="total_billed" fill="#2196F3" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Live Claims Feed */}
        <div className="glass-card slide-up stagger-5">
          <div className="chart-header">
            <div>
              <div className="chart-title flex-center gap-2">
                <Activity size={18} />
                Live Claims Feed
              </div>
              <div className="chart-subtitle">Real-time claim processing status</div>
            </div>
            <span className="pulse-glow" style={{
              width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block'
            }} />
          </div>
          <div className="claims-feed">
            {claims.map((c, i) => (
              <div key={c.claim_id} className="claim-item" style={{ animationDelay: `${i * 60}ms` }}>
                <span className={`status-badge ${c.status}`} style={{ padding: '4px' }}>
                  {c.status === 'clean' ? <CheckCircle2 size={14} /> : 
                   c.status === 'flagged' ? <XCircle size={14} /> : 
                   c.status === 'processing' ? <Hourglass size={14} /> : 
                   <PauseCircle size={14} />}
                </span>
                <span className="claim-npi">{c.supplier_npi?.slice(0, 6)}...</span>
                <span className="claim-hcpcs">{c.hcpcs_code}</span>
                <span className="claim-amount">${Number(c.billed_amount).toLocaleString()}</span>
                <span className="claim-time">
                  {c.service_date ? new Date(c.service_date).toLocaleDateString() : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Alerts */}
        <div className="glass-card full-width slide-up stagger-5">
          <div className="chart-header">
            <div>
              <div className="chart-title flex-center gap-2">
                <AlertTriangle size={18} className="text-risk-critical" />
                Top Risk Alerts
              </div>
              <div className="chart-subtitle">Highest-risk suppliers requiring investigation</div>
            </div>
            <button className="btn-secondary" onClick={() => navigate('/alerts')}>View All →</button>
          </div>
          <div className="alert-list">
            {alerts.map(a => (
              <div
                key={a.id}
                className="alert-card"
                onClick={() => navigate(`/supplier/${a.supplier_npi}`)}
              >
                <div className={`alert-score ${a.risk_level}`}>
                  {Math.round(a.risk_score)}
                </div>
                <div className="alert-info">
                  <div className="alert-title">{a.supplier_name}</div>
                  <div className="alert-summary">{a.summary}</div>
                </div>
                <div className="alert-meta">
                  <span className={`risk-badge ${a.risk_level}`}>{a.risk_level}</span>
                  <span style={{ fontSize: 12, color: 'var(--sky-text-muted)' }}>{a.supplier_state}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Risk Bar Chart — detailed breakdown */}
        <div className="glass-card full-width slide-up">
          <div className="chart-header">
            <div>
              <div className="chart-title flex-center gap-2">
                <AlertTriangle size={18} />
                State Risk Rankings
              </div>
              <div className="chart-subtitle">States with highest average risk scores and alert concentrations</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={geoRisk.filter(g => g.alert_count > 0).sort((a, b) => b.avg_risk - a.avg_risk).slice(0, 15)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(33,150,243,0.08)" />
              <XAxis dataKey="state" tick={{ fill: '#94A3B8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#0F2847', border: '1px solid rgba(33,150,243,0.3)', borderRadius: 8 }}
                labelStyle={{ color: '#F1F5F9' }}
                itemStyle={{ color: '#F1F5F9' }}
              />
              <Bar dataKey="avg_risk" name="Avg Risk Score" fill="#F59E0B" radius={[6, 6, 0, 0]} />
              <Bar dataKey="alert_count" name="Alert Count" fill="#2196F3" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
