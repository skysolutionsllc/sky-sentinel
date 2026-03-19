import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { Search, Settings, Microscope, BarChart2, Loader2, Save, RotateCcw, BookOpen } from 'lucide-react'

const DEFAULT_WEIGHTS = {
  billing_volume_weight: 20,
  growth_rate_weight: 20,
  hcpcs_mix_weight: 15,
  geographic_spread_weight: 15,
  llm_context_weight: 15,
  cluster_association_weight: 15,
  risk_threshold: 50,
}

const PRESETS = {
  'National Baseline': DEFAULT_WEIGHTS,
  'Florida DME Focus': {
    billing_volume_weight: 25,
    growth_rate_weight: 25,
    hcpcs_mix_weight: 15,
    geographic_spread_weight: 10,
    llm_context_weight: 15,
    cluster_association_weight: 10,
    risk_threshold: 45,
  },
  'New Supplier Focus': {
    billing_volume_weight: 15,
    growth_rate_weight: 30,
    hcpcs_mix_weight: 20,
    geographic_spread_weight: 10,
    llm_context_weight: 15,
    cluster_association_weight: 10,
    risk_threshold: 40,
  },
  'Wheelchair Fraud': {
    billing_volume_weight: 20,
    growth_rate_weight: 15,
    hcpcs_mix_weight: 30,
    geographic_spread_weight: 10,
    llm_context_weight: 15,
    cluster_association_weight: 10,
    risk_threshold: 45,
  },
  'Cluster Ring Detection': {
    billing_volume_weight: 10,
    growth_rate_weight: 15,
    hcpcs_mix_weight: 10,
    geographic_spread_weight: 20,
    llm_context_weight: 15,
    cluster_association_weight: 30,
    risk_threshold: 55,
  },
  'Shell Company Ring (Gold Rush)': {
    billing_volume_weight: 15,
    growth_rate_weight: 25,
    hcpcs_mix_weight: 10,
    geographic_spread_weight: 25,
    llm_context_weight: 10,
    cluster_association_weight: 15,
    risk_threshold: 40,
  },
}

const WEIGHT_LABELS = {
  billing_volume_weight: 'Billing Volume',
  growth_rate_weight: 'Growth Rate',
  hcpcs_mix_weight: 'HCPCS Mix Deviation',
  geographic_spread_weight: 'Geographic Spread',
  llm_context_weight: 'AI Contextual',
  cluster_association_weight: 'Cluster Association',
  risk_threshold: 'Risk Threshold',
}

export default function Investigation() {
  const [weights, setWeights] = useState(() => {
    const saved = localStorage.getItem('investigation_weights')
    return saved ? JSON.parse(saved) : DEFAULT_WEIGHTS
  })
  const [selectedPreset, setSelectedPreset] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [patterns, setPatterns] = useState([])
  const [savedMsg, setSavedMsg] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    api.listPatterns().then(setPatterns).catch(console.error)
  }, [])

  const handleThresholdTest = async () => {
    setLoading(true)
    try {
      const data = await api.testThreshold(weights)
      setResults(data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleWeightChange = (key, value) => {
    setWeights(prev => ({ ...prev, [key]: parseFloat(value) }))
    setSelectedPreset('')
  }

  const handlePresetChange = (presetName) => {
    if (presetName && PRESETS[presetName]) {
      setWeights({ ...PRESETS[presetName] })
      setSelectedPreset(presetName)
    }
  }

  const handleSave = () => {
    localStorage.setItem('investigation_weights', JSON.stringify(weights))
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2000)
  }

  const handleReset = () => {
    setWeights({ ...DEFAULT_WEIGHTS })
    setSelectedPreset('')
    localStorage.removeItem('investigation_weights')
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="flex-center gap-2">
          <Search size={28} className="text-sky-light" />
          Investigation Controls
        </h1>
        <p>Human-in-the-Loop pattern modeling — define patterns, adjust thresholds, test hypotheses</p>
      </div>

      <div className="dashboard-grid">
        {/* Threshold Tuner */}
        <div className="glass-card slide-up stagger-1">
          <div className="chart-title flex-center gap-2" style={{ marginBottom: 20 }}>
            <Settings size={18} /> Threshold Tuner
          </div>

          {/* Presets */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <select
              className="filter-select"
              value={selectedPreset}
              onChange={e => handlePresetChange(e.target.value)}
              style={{ flex: 1, minWidth: 140 }}
            >
              <option value="">Load Preset...</option>
              {Object.keys(PRESETS).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <button
              className="btn-primary"
              style={{ fontSize: 12, padding: '6px 12px' }}
              onClick={handleSave}
            >
              <Save size={14} style={{ marginRight: 4 }} />
              {savedMsg ? '✓ Saved!' : 'Save'}
            </button>
            <button
              className="btn-primary"
              style={{ fontSize: 12, padding: '6px 12px', background: 'rgba(255,255,255,0.06)' }}
              onClick={handleReset}
            >
              <RotateCcw size={14} style={{ marginRight: 4 }} />
              Reset
            </button>
          </div>

          <p style={{ fontSize: 13, color: 'var(--sky-text-secondary)', marginBottom: 20 }}>
            Adjust the weight of each anomaly dimension and the risk threshold to see how the alert population changes.
          </p>

          {Object.entries(weights).map(([key, value]) => (
            <div key={key} className="control-group">
              <label className="control-label">
                {WEIGHT_LABELS[key] || key}
                {key === 'risk_threshold' ? ' (min score to flag)' : ' (weight %)'}
              </label>
              <div className="slider-container">
                <input
                  type="range"
                  min={key === 'risk_threshold' ? 0 : 0}
                  max={key === 'risk_threshold' ? 100 : 50}
                  step={1}
                  value={value}
                  onChange={e => handleWeightChange(key, e.target.value)}
                />
                <span className="slider-value">{value}</span>
              </div>
            </div>
          ))}

          <button
            className="btn-primary flex-center justify-center gap-2"
            onClick={handleThresholdTest}
            disabled={loading}
            style={{ width: '100%', marginTop: 16 }}
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Running Analysis...</> : <><Microscope size={16} /> Test Threshold Configuration</>}
          </button>
        </div>

        {/* Results */}
        <div className="glass-card slide-up stagger-2">
          <div className="chart-title flex-center gap-2" style={{ marginBottom: 16 }}>
            <BarChart2 size={18} /> Hypothesis Test Results
          </div>

          {!results ? (
            <div className="flex-center flex-column justify-center" style={{ textAlign: 'center', padding: 60, color: 'var(--sky-text-muted)', flexDirection: 'column' }}>
              <div style={{ marginBottom: 16 }}><Microscope size={40} color="var(--sky-text-muted)" /></div>
              <div style={{ fontSize: 15 }}>
                Adjust the threshold sliders and click "Test" to see which suppliers
                would be flagged with your configuration.
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <div className="stat-card" style={{ flex: 1 }}>
                  <span className="stat-label">Flagged</span>
                  <span className="stat-value high">{results.total_flagged}</span>
                </div>
                <div className="stat-card" style={{ flex: 1 }}>
                  <span className="stat-label">Threshold</span>
                  <span className="stat-value medium">{results.threshold}</span>
                </div>
              </div>

              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Supplier</th>
                      <th>State</th>
                      <th>Original</th>
                      <th>New Score</th>
                      <th>Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(results.results || []).map(r => (
                      <tr key={r.npi} style={{ cursor: 'pointer' }} onClick={() => navigate(`/supplier/${r.npi}`)}>
                        <td style={{ fontWeight: 500 }}>{r.name}</td>
                        <td>{r.state}</td>
                        <td>{r.original_score}</td>
                        <td style={{ fontWeight: 700, color: r.new_score >= 80 ? 'var(--risk-critical)' : r.new_score >= 60 ? 'var(--risk-high)' : 'var(--sky-light)' }}>
                          {r.new_score}
                        </td>
                        <td><span className={`risk-badge ${r.risk_level}`}>{r.risk_level}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Saved Patterns */}
        <div className="glass-card full-width slide-up stagger-3">
          <div className="chart-title flex-center gap-2" style={{ marginBottom: 16 }}>
            <Save size={18} /> Saved Investigation Patterns
          </div>
          {patterns.length === 0 ? (
            <div style={{ color: 'var(--sky-text-muted)', textAlign: 'center', padding: 24 }}>
              No patterns saved yet. Use the AI Query interface to define and save patterns.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pattern Name</th>
                  <th>Criteria</th>
                  <th>Matches</th>
                  <th>Created By</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {patterns.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td style={{ fontSize: 12 }}>{JSON.stringify(p.criteria)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--sky-light)' }}>{p.match_count || 0}</td>
                    <td>{p.created_by}</td>
                    <td style={{ fontSize: 12 }}>{p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
