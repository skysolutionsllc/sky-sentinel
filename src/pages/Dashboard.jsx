import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import {
  Shield, TrendingUp, Target, Building2, Activity,
  CheckCircle2, XCircle, Hourglass, PauseCircle,
  AlertTriangle, Map, Info, Bot
} from 'lucide-react'
import USHeatmap from '../components/charts/USHeatmap'
import FairnessPanel from '../components/charts/FairnessPanel'
import { getEquipmentName, formatHCPCS, HCPCS_NAMES, US_STATES, RISK_DESCRIPTIONS, STATUS_INFO } from '../utils/hcpcs'
import { getFlaggedSupplierCount, getSupplierFlagRate } from '../utils/geoRisk'

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

// ─── Reusable tooltip wrapper style ───
const ttStyle = {
  background: 'rgba(10,20,40,0.96)',
  border: '1px solid rgba(33,150,243,0.25)',
  borderRadius: 10,
  padding: '12px 16px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  backdropFilter: 'blur(12px)',
  maxWidth: 300,
}
const ttLabel = { color: '#94A3B8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }
const ttValue = { color: '#F1F5F9', fontSize: 14, fontWeight: 600 }
const ttDivider = { height: 1, background: 'rgba(33,150,243,0.12)', margin: '8px 0' }

// ─── Custom Tooltips for each chart type ───

function ClaimsTrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const total = payload.find(p => p.dataKey === 'total_claims')?.value || 0
  const flagged = payload.find(p => p.dataKey === 'flagged_count')?.value || 0
  const rate = total > 0 ? ((flagged / total) * 100).toFixed(1) : '0.0'
  return (
    <div style={ttStyle}>
      <div style={{ ...ttValue, fontSize: 13, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>
          <span style={{ ...ttLabel, marginBottom: 0 }}>Total Claims</span>
          <span style={{ color: '#60A5FA', fontWeight: 600, fontSize: 13 }}>{total.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>
          <span style={{ ...ttLabel, marginBottom: 0 }}>Flagged</span>
          <span style={{ color: '#EF4444', fontWeight: 600, fontSize: 13 }}>{flagged.toLocaleString()}</span>
        </div>
        <div style={ttDivider} />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>
          <span style={{ ...ttLabel, marginBottom: 0 }}>Flag Rate</span>
          <span style={{ color: parseFloat(rate) > 50 ? '#EF4444' : '#F59E0B', fontWeight: 700, fontSize: 13 }}>{rate}%</span>
        </div>
      </div>
      <div style={{ fontSize: 10, color: '#475569', marginTop: 8, lineHeight: 1.4 }}>
        Claims flagged by the ensemble AI pipeline (Isolation Forest + Z-Score + DBSCAN)
      </div>
    </div>
  )
}

function RiskPieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  const name = d.name?.toLowerCase()
  return (
    <div style={ttStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.payload?.color || d.color, display: 'inline-block' }} />
        <span style={{ ...ttValue, fontSize: 15 }}>{d.name}</span>
        <span style={{ color: '#64748b', fontSize: 12, marginLeft: 'auto' }}>{d.value} suppliers</span>
      </div>
      <div style={ttDivider} />
      <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.5 }}>
        {RISK_DESCRIPTIONS[name] || 'Risk level assessment based on composite scoring'}
      </div>
    </div>
  )
}

function HCPCSTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload
  const code = data?.code || label
  const name = HCPCS_NAMES[code] || data?.description || 'Unknown Equipment'
  const total = data?.total_billed || 0
  const count = data?.claim_count || data?.count || 0
  const avg = count > 0 ? total / count : 0
  return (
    <div style={ttStyle}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span style={{ ...ttValue, fontSize: 14 }}>{code}</span>
        <span style={{ color: '#60A5FA', fontSize: 12 }}>{name}</span>
      </div>
      <div style={ttDivider} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ ...ttLabel, marginBottom: 0 }}>Total Billed</span>
          <span style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 13 }}>${total.toLocaleString()}</span>
        </div>
        {count > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ ...ttLabel, marginBottom: 0 }}>Claims</span>
            <span style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 13 }}>{count.toLocaleString()}</span>
          </div>
        )}
        {avg > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ ...ttLabel, marginBottom: 0 }}>Avg per Claim</span>
            <span style={{ color: '#F59E0B', fontWeight: 600, fontSize: 13 }}>${avg.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        )}
      </div>
      <div style={{ fontSize: 10, color: '#475569', marginTop: 8, lineHeight: 1.4 }}>
        HCPCS = Healthcare Common Procedure Coding System — standardized codes for DME billing
      </div>
    </div>
  )
}

function StateRiskTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload
  const fullName = US_STATES[label] || label
  const avgRisk = data?.avg_risk || 0
  const alerts = data?.alert_count || 0
  const suppliers = data?.supplier_count || 0
  const flaggedSuppliers = getFlaggedSupplierCount(data)
  const flagRate = getSupplierFlagRate(data).toFixed(1)
  const riskLevel = avgRisk >= 70 ? 'critical' : avgRisk >= 55 ? 'high' : avgRisk >= 40 ? 'medium' : 'low'

  return (
    <div style={ttStyle}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span style={{ ...ttValue, fontSize: 15 }}>{fullName}</span>
        <span style={{ color: '#64748b', fontSize: 12 }}>({label})</span>
      </div>
      <div style={ttDivider} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ ...ttLabel, marginBottom: 0 }}>Avg Risk Score</span>
          <span style={{ color: RISK_COLORS[riskLevel], fontWeight: 700, fontSize: 14 }}>{avgRisk.toFixed(1)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ ...ttLabel, marginBottom: 0 }}>Active Alerts</span>
          <span style={{ color: '#EF4444', fontWeight: 600, fontSize: 13 }}>{alerts}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ ...ttLabel, marginBottom: 0 }}>Flagged Suppliers</span>
          <span style={{ color: '#F59E0B', fontWeight: 600, fontSize: 13 }}>{flaggedSuppliers}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ ...ttLabel, marginBottom: 0 }}>Total Suppliers</span>
          <span style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 13 }}>{suppliers}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ ...ttLabel, marginBottom: 0 }}>Supplier Flag Rate</span>
          <span style={{ color: parseFloat(flagRate) > 50 ? '#EF4444' : '#F59E0B', fontWeight: 700, fontSize: 13 }}>{flagRate}%</span>
        </div>
      </div>
    </div>
  )
}

// ─── Hover tooltip component for inline table cells ───
function CellTooltip({ children, text }) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const handleMouse = (e) => {
    setPos({ x: e.clientX, y: e.clientY })
    setShow(true)
  }
  return (
    <span
      style={{ cursor: 'help' }}
      onMouseEnter={handleMouse}
      onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && createPortal(
        <span style={{
          position: 'fixed',
          top: pos.y - 10,
          left: pos.x,
          transform: 'translate(-50%, -100%)',
          background: 'rgba(10,20,40,0.96)',
          border: '1px solid rgba(33,150,243,0.25)',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 12,
          color: '#e2e8f0',
          whiteSpace: 'pre-line',
          zIndex: 99999,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
          maxWidth: 280,
          lineHeight: 1.4,
        }}>
          {text}
        </span>,
        document.body
      )}
    </span>
  )
}

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
  const totalRisk = (rd.critical || 0) + (rd.high || 0) + (rd.medium || 0) + (rd.low || 0)
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
        <div className="stat-card slide-up stagger-1" onClick={() => navigate('/alerts')} style={{ cursor: 'pointer' }}>
          <span className="stat-label">Total Alerts</span>
          <span className="stat-value critical">{stats.total_alerts}</span>
          <span className="stat-sub">{stats.new_alerts} new since last session</span>
        </div>
        <div className="stat-card slide-up stagger-2" onClick={() => navigate('/alerts')} style={{ cursor: 'pointer' }}>
          <span className="stat-label">Critical Risk</span>
          <span className="stat-value critical">{rd.critical || 0}</span>
          <span className="stat-sub">Immediate attention required</span>
        </div>
        <div className="stat-card slide-up stagger-3" onClick={() => navigate('/clusters')} style={{ cursor: 'pointer' }}>
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
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <CoreAiIcon size={24} color="#2196F3" />
          <span style={{ fontSize: 16, fontWeight: 600, color: '#F1F5F9' }}>Why Sky Sentinel Goes Beyond Traditional Fraud Detection</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ marginTop: 2, flexShrink: 0 }}><MultiMethodIcon size={20} color="#F59E0B" /></div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#CBD5E1', marginBottom: 4 }}>Ensemble AI</div>
              <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.4 }}>Isolation Forest + Z-Score + DBSCAN + LLM — multi-model ensemble</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ marginTop: 2, flexShrink: 0 }}><LlmIcon size={20} color="#10B981" /></div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#CBD5E1', marginBottom: 4 }}>LLM Reasoning</div>
              <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.4 }}>Decoder LLM explains <em>why</em> — encoder classifies at speed</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ marginTop: 2, flexShrink: 0 }}><HitlIcon size={20} color="#8B5CF6" /></div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#CBD5E1', marginBottom: 4 }}>Human-in-the-Loop</div>
              <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.4 }}>Investigators tune weights and test hypotheses</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ marginTop: 2, flexShrink: 0 }}><FairnessIcon size={20} color="#EC4899" /></div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#CBD5E1', marginBottom: 4 }}>Fairness Built-In</div>
              <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.4 }}>Algorithmic bias monitoring across geographies</div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Geographic Risk Heatmap */}
        <div className="glass-card full-width slide-up">
          <div className="chart-header">
            <div>
              <div className="chart-title flex-center gap-2">
                <Map size={18} />
                Provider Risk Heatmap
              </div>
              <div className="chart-subtitle">Geographic risk concentration across US states — hover any state for detailed breakdown</div>
            </div>
          </div>
          <USHeatmap geoRisk={geoRisk} />
        </div>

        {/* Fairness & Bias Review */}
        <div className="full-width">
          <FairnessPanel geoRisk={geoRisk} />
        </div>

        {/* ── Claims Trend ── */}
        <div className="glass-card slide-up stagger-2">
          <div className="chart-header">
            <div>
              <div className="chart-title flex-center gap-2">
                <TrendingUp size={18} />
                Claims Trend
              </div>
              <div className="chart-subtitle">Monthly flagged vs. total claims — hover for flag rate analysis</div>
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
              <Tooltip content={<ClaimsTrendTooltip />} />
              <Area type="monotone" dataKey="total_claims" stroke="#2196F3" fill="url(#gradBlue)" name="Total Claims" />
              <Area type="monotone" dataKey="flagged_count" stroke="#EF4444" fill="url(#gradRed)" name="Flagged" />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 4, fontSize: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 12, height: 3, borderRadius: 2, background: '#2196F3', display: 'inline-block' }} />
              <span style={{ color: '#94A3B8' }}>Total Claims</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 12, height: 3, borderRadius: 2, background: '#EF4444', display: 'inline-block' }} />
              <span style={{ color: '#94A3B8' }}>Flagged by AI</span>
            </div>
          </div>
        </div>

        {/* ── Risk Distribution ── */}
        <div className="glass-card slide-up stagger-3">
          <div className="chart-header">
            <div>
              <div className="chart-title flex-center gap-2">
                <Target size={18} />
                Risk Distribution
              </div>
              <div className="chart-subtitle">Supplier alert breakdown by risk level — hover for details</div>
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
              <Tooltip content={<RiskPieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div style={{
            textAlign: 'center', marginTop: -144, marginBottom: 120, position: 'relative', zIndex: 0, pointerEvents: 'none',
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#F1F5F9' }}>{totalRisk}</div>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: -8 }}>
            {pieData.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                <span style={{ color: '#94A3B8' }}>{d.name}: {d.value} ({totalRisk > 0 ? ((d.value / totalRisk) * 100).toFixed(0) : 0}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── HCPCS Distribution ── */}
        <div className="glass-card slide-up stagger-4" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="chart-header">
            <div>
              <div className="chart-title flex-center gap-2">
                <Building2 size={18} />
                Top DME Categories
              </div>
              <div className="chart-subtitle">HCPCS codes ranked by total billed amount — hover for equipment details</div>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hcpcs.slice(0, 7)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(33,150,243,0.08)" />
              <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis
                dataKey="code"
                type="category"
                tick={{ fill: '#94A3B8', fontSize: 10 }}
                width={100}
                tickFormatter={(code) => {
                  const name = HCPCS_NAMES[code]
                  return name ? `${code} · ${name.length > 12 ? name.slice(0, 12) + '…' : name}` : code
                }}
              />
              <Tooltip content={<HCPCSTooltip />} />
              <Bar dataKey="total_billed" fill="#2196F3" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* ── Live Claims Feed ── */}
        <div className="glass-card slide-up stagger-5">
          <div className="chart-header">
            <div>
              <div className="chart-title flex-center gap-2">
                <Activity size={18} />
                Live Claims Feed
              </div>
              <div className="chart-subtitle">Real-time claim processing — hover any cell for details</div>
            </div>
            <span className="pulse-glow" style={{
              width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block'
            }} />
          </div>
          {/* Column headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: '40px 95px 70px 1fr 80px', alignItems: 'center', gap: 12, padding: '6px 14px',
            marginBottom: 4, fontSize: 10, fontWeight: 700, color: '#64748b',
            textTransform: 'uppercase', letterSpacing: '0.5px',
            borderBottom: '1px solid rgba(33,150,243,0.08)',
          }}>
            <span style={{ textAlign: 'center' }}>
              <CellTooltip text="Claim processing status: Clean, Flagged, Processing, or Pending">Status</CellTooltip>
            </span>
            <span>
              <CellTooltip text="National Provider Identifier — unique 10-digit ID assigned to each Medicare supplier">NPI</CellTooltip>
            </span>
            <span>
              <CellTooltip text="HCPCS Code — Healthcare Common Procedure Coding System code identifying the billed equipment">HCPCS</CellTooltip>
            </span>
            <span style={{ textAlign: 'right' }}>
              <CellTooltip text="Dollar amount billed to Medicare for this claim">Amount</CellTooltip>
            </span>
            <span style={{ textAlign: 'right' }}>
              <CellTooltip text="Date the DME service was provided to the beneficiary">Date</CellTooltip>
            </span>
          </div>
          <div className="claims-feed">
            {claims.map((c, i) => (
              <div key={c.claim_id} className="claim-item" style={{ animationDelay: `${i * 60}ms` }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <CellTooltip text={STATUS_INFO[c.status]?.desc || 'Unknown status'}>
                    <span className={`status-badge ${c.status}`} style={{ padding: '4px' }}>
                      {c.status === 'clean' ? <CheckCircle2 size={14} /> :
                       c.status === 'flagged' ? <XCircle size={14} /> :
                       c.status === 'processing' ? <Hourglass size={14} /> :
                       <PauseCircle size={14} />}
                    </span>
                  </CellTooltip>
                </div>
                <CellTooltip text={`NPI: ${c.supplier_npi || 'N/A'}\nNational Provider Identifier — click supplier page for full details`}>
                  <span className="claim-npi" style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/supplier/${c.supplier_npi}`)}>
                    {c.supplier_npi || '—'}
                  </span>
                </CellTooltip>
                <CellTooltip text={formatHCPCS(c.hcpcs_code)}>
                  <span className="claim-hcpcs">{c.hcpcs_code}</span>
                </CellTooltip>
                <div style={{ textAlign: 'right' }}>
                  <CellTooltip text={`Billed: $${Number(c.billed_amount).toLocaleString()}\nAmount billed to Medicare for this DME item`}>
                    <span className="claim-amount">${Number(c.billed_amount).toLocaleString()}</span>
                  </CellTooltip>
                </div>
                <span className="claim-time" style={{ textAlign: 'right' }}>
                  {c.service_date ? new Date(c.service_date).toLocaleDateString() : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Top Alerts ── */}
        <div className="glass-card full-width slide-up stagger-5">
          <div className="chart-header">
            <div>
              <div className="chart-title flex-center gap-2">
                <AlertTriangle size={18} className="text-risk-critical" />
                Top Risk Alerts
              </div>
              <div className="chart-subtitle">Highest-risk suppliers — click any alert for full investigation view</div>
            </div>
            <button className="btn-secondary" onClick={() => navigate('/alerts')}>View All →</button>
          </div>
          <div className="alert-list">
            {alerts.map(a => (
              <div
                key={a.id}
                className="alert-card"
                onClick={() => navigate(`/supplier/${a.supplier_npi}`)}
                title={`Risk Score: ${Math.round(a.risk_score)}/100 — ${RISK_DESCRIPTIONS[a.risk_level] || 'Click for details'}`}
              >
                <CellTooltip text={`Composite Risk Score: ${Math.round(a.risk_score)}/100\n${RISK_DESCRIPTIONS[a.risk_level] || 'Multi-factor ensemble score'}\n\nClick to view full supplier investigation`}>
                  <div className={`alert-score ${a.risk_level}`}>
                    {Math.round(a.risk_score)}
                  </div>
                </CellTooltip>
                <div className="alert-info">
                  <div className="alert-title">{a.supplier_name}</div>
                  <div className="alert-summary">{a.summary}</div>
                </div>
                <div className="alert-meta">
                  <span className={`risk-badge ${a.risk_level}`}>{a.risk_level}</span>
                  <CellTooltip text={US_STATES[a.supplier_state] || a.supplier_state}>
                    <span style={{ fontSize: 12, color: 'var(--sky-text-muted)' }}>{a.supplier_state}</span>
                  </CellTooltip>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── AI Detection Methodology ── */}
        <div className="glass-card full-width slide-up">
          <div className="chart-header">
            <div>
              <div className="chart-title flex-center gap-2">
                <Bot size={18} />
                AI Detection Methodology
              </div>
              <div className="chart-subtitle">How Sky Sentinel calculates composite risk scores</div>
            </div>
          </div>

          {/* Composite Score Formula */}
          <div style={{ padding: '16px 0', marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--sky-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
              Composite Score Formula
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
              {[
                { label: 'Billing Volume', weight: '20%', color: '#EF4444', algo: 'Isolation Forest' },
                { label: 'Growth Rate', weight: '20%', color: '#F59E0B', algo: 'Time-Series' },
                { label: 'HCPCS Mix', weight: '15%', color: '#3B82F6', algo: 'Peer Deviation' },
                { label: 'Geo Spread', weight: '15%', color: '#8B5CF6', algo: 'Distribution' },
                { label: 'AI Context', weight: '15%', color: '#10B981', algo: 'Z-Score' },
                { label: 'Cluster Link', weight: '15%', color: '#EC4899', algo: 'DBSCAN' },
              ].map((f, i) => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {i > 0 && <span style={{ color: 'var(--sky-text-muted)', fontSize: 14, marginRight: 4 }}>+</span>}
                  <div style={{
                    padding: '8px 12px', borderRadius: 8,
                    background: `${f.color}15`,
                    border: `1px solid ${f.color}30`,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: f.color }}>{f.weight}</div>
                    <div style={{ fontSize: 10, color: 'var(--sky-text-secondary)', marginTop: 2 }}>{f.label}</div>
                    <div style={{ fontSize: 9, color: 'var(--sky-text-muted)', marginTop: 1 }}>{f.algo}</div>
                  </div>
                </div>
              ))}
              <span style={{ color: 'var(--sky-text-muted)', fontSize: 14, margin: '0 8px' }}>=</span>
              <div style={{
                padding: '8px 16px', borderRadius: 8,
                background: 'rgba(33,150,243,0.1)',
                border: '1px solid rgba(33,150,243,0.3)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--sky-light)' }}>0–100</div>
                <div style={{ fontSize: 10, color: 'var(--sky-text-secondary)' }}>Risk Score</div>
              </div>
            </div>
          </div>

          {/* Three columns: algorithms */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div style={{ padding: 14, borderRadius: 10, background: 'rgba(10,22,40,0.5)', border: '1px solid var(--sky-border)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#EF4444', marginBottom: 6 }}>Isolation Forest</div>
              <div style={{ fontSize: 12, color: 'var(--sky-text-secondary)', lineHeight: 1.6 }}>
                100-tree ensemble evaluates 7 features simultaneously. Anomalies require fewer splits to isolate in random trees. contamination=10%.
              </div>
            </div>
            <div style={{ padding: 14, borderRadius: 10, background: 'rgba(10,22,40,0.5)', border: '1px solid var(--sky-border)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#10B981', marginBottom: 6 }}>Z-Score Analysis</div>
              <div style={{ fontSize: 12, color: 'var(--sky-text-secondary)', lineHeight: 1.6 }}>
                Measures standard deviations from state peer group mean billing. Z = |billing − mean| / σ. Score = min(Z × 25, 100).
              </div>
            </div>
            <div style={{ padding: 14, borderRadius: 10, background: 'rgba(10,22,40,0.5)', border: '1px solid var(--sky-border)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#EC4899', marginBottom: 6 }}>DBSCAN Clustering</div>
              <div style={{ fontSize: 12, color: 'var(--sky-text-secondary)', lineHeight: 1.6 }}>
                Density-based scan in 5D behavioral space (eps=0.8, min_samples=3). Discovers coordinated networks without preset cluster count.
              </div>
            </div>
          </div>

          {/* Risk thresholds */}
          <div style={{ display: 'flex', gap: 16, marginTop: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { level: 'Critical', min: '≥80', color: 'var(--risk-critical)', desc: 'Immediate investigation' },
              { level: 'High', min: '≥60', color: 'var(--risk-high)', desc: 'Prioritized review' },
              { level: 'Medium', min: '≥40', color: 'var(--risk-medium)', desc: 'Monitor closely' },
              { level: 'Low', min: '<40', color: 'var(--risk-low)', desc: 'Normal parameters' },
            ].map(t => (
              <div key={t.level} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: t.color, display: 'inline-block' }} />
                <span style={{ fontWeight: 600, color: t.color }}>{t.level} ({t.min})</span>
                <span style={{ color: 'var(--sky-text-muted)' }}>— {t.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── State Risk Rankings ── */}
        <div className="glass-card full-width slide-up">
          <div className="chart-header">
            <div>
              <div className="chart-title flex-center gap-2">
                <AlertTriangle size={18} />
                State Risk Rankings
              </div>
              <div className="chart-subtitle">States ranked by average risk score and alert count — hover for full breakdown</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={geoRisk.filter(g => g.alert_count > 0).sort((a, b) => b.avg_risk - a.avg_risk).slice(0, 15)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(33,150,243,0.08)" />
              <XAxis dataKey="state" tick={{ fill: '#94A3B8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} />
              <Tooltip content={<StateRiskTooltip />} />
              <Bar dataKey="avg_risk" name="Avg Risk Score" fill="#F59E0B" radius={[6, 6, 0, 0]} />
              <Bar dataKey="alert_count" name="Alert Count" fill="#2196F3" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 8, fontSize: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: '#F59E0B', display: 'inline-block' }} />
              <span style={{ color: '#94A3B8' }}>Avg Risk Score (0-100)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: '#2196F3', display: 'inline-block' }} />
              <span style={{ color: '#94A3B8' }}>Active Alert Count</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
