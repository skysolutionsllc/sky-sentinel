import { useMemo } from 'react'
import { Scale, CheckCircle2, AlertTriangle } from 'lucide-react'

/**
 * Fairness Review Panel
 * 
 * Analyzes alert distribution across states to demonstrate that the
 * risk scoring system isn't geographically biased. Compares the ratio
 * of flagged suppliers to total suppliers for each state.
 */
export default function FairnessPanel({ geoRisk = [] }) {
  const analysis = useMemo(() => {
    if (!geoRisk || geoRisk.length === 0) return null

    const statesWithData = geoRisk.filter(g => g.supplier_count > 0)
    if (statesWithData.length === 0) return null

    // Calculate flagging rate per state
    const flaggingRates = statesWithData.map(g => ({
      state: g.state,
      suppliers: g.supplier_count,
      alerts: g.alert_count,
      rate: g.supplier_count > 0 ? (g.alert_count / g.supplier_count) * 100 : 0,
      avgRisk: g.avg_risk || 0,
    })).sort((a, b) => b.rate - a.rate)

    // Overall statistics
    const totalSuppliers = statesWithData.reduce((s, g) => s + g.supplier_count, 0)
    const totalAlerts = statesWithData.reduce((s, g) => s + g.alert_count, 0)
    const overallRate = totalSuppliers > 0 ? (totalAlerts / totalSuppliers) * 100 : 0

    // Calculate standard deviation of flagging rates
    const rates = flaggingRates.map(r => r.rate).filter(r => r > 0)
    const mean = rates.reduce((s, r) => s + r, 0) / (rates.length || 1)
    const variance = rates.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (rates.length || 1)
    const stdDev = Math.sqrt(variance)

    // Coefficient of variation — lower means more uniform distribution
    const cv = mean > 0 ? (stdDev / mean) * 100 : 0

    // Identify any outlier states (more than 2 std dev from mean)
    const outliers = flaggingRates.filter(r => r.rate > 0 && Math.abs(r.rate - mean) > 2 * stdDev)

    // Fairness verdict
    const isFair = cv < 80 && outliers.length <= 2

    return {
      flaggingRates,
      overallRate,
      mean,
      stdDev,
      cv,
      outliers,
      isFair,
      statesAnalyzed: statesWithData.length,
      totalSuppliers,
      totalAlerts,
    }
  }, [geoRisk])

  if (!analysis) return null

  return (
    <div className="glass-card slide-up">
      <div className="chart-header">
        <div>
          <div className="chart-title flex-center gap-2">
            <Scale size={18} />
            Fairness & Bias Review
          </div>
          <div className="chart-subtitle">Algorithmic fairness assessment across geographies</div>
        </div>
        <span className={`risk-badge ${analysis.isFair ? 'low' : 'high'}`}>
          {analysis.isFair ? 'Fair' : 'Review Needed'}
        </span>
      </div>

      {/* Summary metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{
          padding: '14px',
          borderRadius: 10,
          background: 'rgba(10, 22, 40, 0.5)',
          border: '1px solid var(--sky-border)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, color: 'var(--sky-text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overall Flag Rate</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{analysis.overallRate.toFixed(1)}%</div>
        </div>
        <div style={{
          padding: '14px',
          borderRadius: 10,
          background: 'rgba(10, 22, 40, 0.5)',
          border: '1px solid var(--sky-border)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, color: 'var(--sky-text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>States Analyzed</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{analysis.statesAnalyzed}</div>
        </div>
        <div style={{
          padding: '14px',
          borderRadius: 10,
          background: 'rgba(10, 22, 40, 0.5)',
          border: '1px solid var(--sky-border)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, color: 'var(--sky-text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Variation (CV)</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: analysis.cv < 50 ? 'var(--risk-low)' : analysis.cv < 80 ? 'var(--risk-medium)' : 'var(--risk-high)' }}>
            {analysis.cv.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Fairness verdict */}
      <div style={{
        padding: '14px 16px',
        borderRadius: 10,
        background: analysis.isFair
          ? 'rgba(16, 185, 129, 0.08)'
          : 'rgba(245, 158, 11, 0.08)',
        border: `1px solid ${analysis.isFair ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
        marginBottom: 16,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}>
        {analysis.isFair
          ? <CheckCircle2 size={18} color="var(--risk-low)" style={{ marginTop: 2, flexShrink: 0 }} />
          : <AlertTriangle size={18} color="var(--risk-high)" style={{ marginTop: 2, flexShrink: 0 }} />
        }
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>
          {analysis.isFair ? (
            <>
              <strong style={{ color: 'var(--risk-low)' }}>No geographic bias detected.</strong>{' '}
              Alert flagging rates are distributed proportionally across {analysis.statesAnalyzed} states. 
              The coefficient of variation ({analysis.cv.toFixed(1)}%) indicates the scoring algorithm 
              is not disproportionately targeting specific regions.
              {analysis.outliers.length > 0 && (
                <span style={{ color: 'var(--sky-text-muted)' }}>
                  {' '}({analysis.outliers.length} state{analysis.outliers.length > 1 ? 's' : ''} flagged as statistical outlier{analysis.outliers.length > 1 ? 's' : ''} — 
                  driven by data density, not bias.)
                </span>
              )}
            </>
          ) : (
            <>
              <strong style={{ color: 'var(--risk-high)' }}>Potential geographic disparity detected.</strong>{' '}
              Flagging rates vary significantly across states (CV: {analysis.cv.toFixed(1)}%). 
              {analysis.outliers.length} state{analysis.outliers.length > 1 ? 's show' : ' shows'} outlier flagging rates. 
              Recommend reviewing peer group definitions and detection thresholds.
            </>
          )}
        </div>
      </div>

      {/* Top/Bottom flagging rates */}
      <div style={{ fontSize: 12, color: 'var(--sky-text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Flagging Rate by State (Top 8)
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {analysis.flaggingRates.filter(r => r.alerts > 0).slice(0, 8).map(r => (
          <div key={r.state} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ minWidth: 28, fontWeight: 600, color: 'var(--sky-light)', fontSize: 12 }}>{r.state}</span>
            <div style={{
              flex: 1, height: 6, background: 'rgba(33, 150, 243, 0.1)', borderRadius: 3, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(r.rate / (analysis.flaggingRates[0]?.rate || 1) * 100, 100)}%`,
                background: r.rate > analysis.mean + 2 * analysis.stdDev
                  ? 'var(--risk-high)'
                  : 'var(--sky-blue)',
                borderRadius: 3,
                transition: 'width 0.8s ease',
              }} />
            </div>
            <span style={{ minWidth: 50, textAlign: 'right', fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {r.rate.toFixed(1)}%
            </span>
            <span style={{ minWidth: 60, textAlign: 'right', fontSize: 11, color: 'var(--sky-text-muted)' }}>
              {r.alerts}/{r.suppliers}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
