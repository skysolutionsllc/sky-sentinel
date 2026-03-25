import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { Search, Settings, Microscope, BarChart2, Loader2, Save, RotateCcw, BookOpen, Trash2, Edit3, Download } from 'lucide-react'

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
  llm_context_weight: 'Peer Deviation',
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
  const [savedConfigs, setSavedConfigs] = useState([])
  const [savedMsg, setSavedMsg] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = () => {
    api.listWeightConfigs().then(setSavedConfigs).catch(console.error)
  }

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

  const handleSaveConfig = async () => {
    if (!saveName.trim()) return
    await api.saveWeightConfig({ name: saveName.trim(), weights, created_by: 'Demo Analyst' })
    setSaveName('')
    setShowSaveModal(false)
    loadConfigs()
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2000)
  }

  const handleLoadConfig = (config) => {
    setWeights({ ...config.weights })
    setSelectedPreset('')
    localStorage.setItem('investigation_weights', JSON.stringify(config.weights))
  }

  const handleRename = async (id) => {
    if (!renameValue.trim()) return
    await api.renameWeightConfig(id, renameValue.trim())
    setRenamingId(null)
    setRenameValue('')
    loadConfigs()
  }

  const handleDelete = async (id) => {
    await api.deleteWeightConfig(id)
    loadConfigs()
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
              onClick={() => setShowSaveModal(true)}
            >
              <Save size={14} style={{ marginRight: 4 }} />
              {savedMsg ? '✓ Saved!' : 'Save Config'}
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

          {/* Save Modal */}
          {showSaveModal && (
            <div style={{
              padding: 16, marginBottom: 16, borderRadius: 10,
              background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#3B82F6' }}>
                Save Weight Configuration
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="query-input"
                  style={{ fontSize: 13, padding: '8px 12px' }}
                  placeholder="Configuration name..."
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveConfig()}
                  autoFocus
                />
                <button className="btn-primary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={handleSaveConfig}>
                  Save
                </button>
                <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => setShowSaveModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

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

        {/* Saved Weight Configurations */}
        <div className="glass-card full-width slide-up stagger-3">
          <div className="chart-title flex-center gap-2" style={{ marginBottom: 16 }}>
            <Save size={18} /> Saved Weight Configurations
          </div>
          {savedConfigs.length === 0 ? (
            <div style={{ color: 'var(--sky-text-muted)', textAlign: 'center', padding: 24 }}>
              No weight configurations saved yet. Adjust the sliders above and click "Save Config" to save your first configuration.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Configuration Name</th>
                  <th>Weights Summary</th>
                  <th>Created By</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {savedConfigs.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>
                      {renamingId === c.id ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input
                            className="query-input"
                            style={{ fontSize: 12, padding: '4px 8px', width: 160 }}
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleRename(c.id)}
                            autoFocus
                          />
                          <button className="btn-primary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => handleRename(c.id)}>✓</button>
                          <button className="btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setRenamingId(null)}>✕</button>
                        </div>
                      ) : c.name}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--sky-text-secondary)' }}>
                      {c.weights ? Object.entries(c.weights).filter(([k]) => k !== 'risk_threshold').map(([k, v]) => `${WEIGHT_LABELS[k]?.split(' ')[0] || k}: ${v}`).join(' · ') : '—'}
                    </td>
                    <td>{c.created_by}</td>
                    <td style={{ fontSize: 12 }}>{c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn-primary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => handleLoadConfig(c)} title="Load">
                          <Download size={12} style={{ marginRight: 3 }} /> Load
                        </button>
                        <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => { setRenamingId(c.id); setRenameValue(c.name) }} title="Rename">
                          <Edit3 size={12} />
                        </button>
                        <button className="btn-danger" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => handleDelete(c.id)} title="Delete">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
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
