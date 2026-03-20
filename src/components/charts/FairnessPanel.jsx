import { useMemo } from 'react'
import { Scale, CheckCircle2, AlertTriangle } from 'lucide-react'
import { analyzeGeoRiskFairness, FAIRNESS_MIN_SUPPLIERS } from '../../utils/geoRisk'

/**
 * Fairness Review Panel
 * 
 * Analyzes supplier-level flagging distribution across states to demonstrate
 * that the risk scoring system isn't geographically biased.
 */
export default function FairnessPanel({ geoRisk = [] }) {
  const analysis = useMemo(() => analyzeGeoRiskFairness(geoRisk), [geoRisk])

  if (!analysis) return null

  const verdictTone = analysis.canIssueVerdict
    ? analysis.isFair ? 'low' : 'high'
    : 'medium'
  const verdictLabel = analysis.canIssueVerdict
    ? analysis.isFair ? 'Fair' : 'Review Needed'
    : 'Monitoring'
  const verdictAccent = verdictTone === 'low'
    ? 'var(--risk-low)'
    : verdictTone === 'medium'
      ? 'var(--risk-medium)'
      : 'var(--risk-high)'
  const verdictBackground = verdictTone === 'low'
    ? 'rgba(16, 185, 129, 0.08)'
    : verdictTone === 'medium'
      ? 'rgba(59, 130, 246, 0.08)'
      : 'rgba(245, 158, 11, 0.08)'
  const verdictBorder = verdictTone === 'low'
    ? 'rgba(16, 185, 129, 0.2)'
    : verdictTone === 'medium'
      ? 'rgba(59, 130, 246, 0.2)'
      : 'rgba(245, 158, 11, 0.2)'
  const outlierStates = new Set(analysis.outliers.map(entry => entry.state))
  const topRate = analysis.flaggingRates[0]?.smoothedRate || 0

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
        <span className={`risk-badge ${verdictTone}`}>
          {verdictLabel}
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
          <div style={{ fontSize: 11, color: 'var(--sky-text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Supplier Flag Rate</div>
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
          <div style={{ fontSize: 22, fontWeight: 700, color: analysis.canIssueVerdict ? (analysis.cv < 50 ? 'var(--risk-low)' : analysis.cv < 80 ? 'var(--risk-medium)' : 'var(--risk-high)') : 'var(--risk-medium)' }}>
            {analysis.cv.toFixed(1)}%
          </div>
        </div>
      </div>

      {analysis.statesExcluded > 0 && (
        <div style={{ fontSize: 12, color: 'var(--sky-text-muted)', marginBottom: 16 }}>
          {analysis.statesExcluded} low-volume state{analysis.statesExcluded > 1 ? 's' : ''} with fewer than {FAIRNESS_MIN_SUPPLIERS} suppliers are excluded from the bias verdict due to insufficient sample size.
        </div>
      )}

      {/* Fairness verdict */}
      <div style={{
        padding: '14px 16px',
        borderRadius: 10,
        background: verdictBackground,
        border: `1px solid ${verdictBorder}`,
        marginBottom: 16,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}>
        {analysis.canIssueVerdict && analysis.isFair
          ? <CheckCircle2 size={18} color="var(--risk-low)" style={{ marginTop: 2, flexShrink: 0 }} />
          : <AlertTriangle size={18} color={verdictAccent} style={{ marginTop: 2, flexShrink: 0 }} />
        }
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>
          {!analysis.canIssueVerdict ? (
            <>
              <strong style={{ color: verdictAccent }}>Fairness monitoring is active.</strong>{' '}
              Supplier-level rates are being tracked, but only {analysis.statesAnalyzed} of {analysis.totalStates} state{analysis.totalStates > 1 ? 's' : ''} currently meet the minimum sample size needed for a formal verdict.
              Low-volume states remain visible in the dashboard and stay outside the bias verdict until more supplier volume is available.
            </>
          ) : analysis.isFair ? (
            <>
              <strong style={{ color: 'var(--risk-low)' }}>No geographic bias detected.</strong>{' '}
              Supplier flagging rates remain well distributed across {analysis.statesAnalyzed} states with sufficient sample size.
              The stabilized variation ({analysis.cv.toFixed(1)}%) stays within tolerance, and supplier-level counts prevent repeat alerts from overstating geographic concentration.
              {analysis.outliers.length > 0 && (
                <span style={{ color: 'var(--sky-text-muted)' }}>
                  {' '}({analysis.outliers.length} state{analysis.outliers.length > 1 ? 's remain outside the normal range after stabilization and are being monitored separately' : ' remains outside the normal range after stabilization and is being monitored separately'}.)
                </span>
              )}
            </>
          ) : (
            <>
              <strong style={{ color: 'var(--risk-high)' }}>Potential geographic disparity detected.</strong>{' '}
              Stabilized supplier flagging rates still vary materially across adequately sampled states (CV: {analysis.cv.toFixed(1)}%).
              {analysis.outliers.length} state{analysis.outliers.length > 1 ? 's remain' : ' remains'} outside the expected range after low-volume suppression.
              Recommend reviewing peer group definitions and detection thresholds.
            </>
          )}
        </div>
      </div>

      {/* Top/Bottom flagging rates */}
      <div style={{ fontSize: 12, color: 'var(--sky-text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Stabilized Supplier Flag Rate by State (Top 8)
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {analysis.flaggingRates.slice(0, 8).map(r => (
          <div key={r.state} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ minWidth: 28, fontWeight: 600, color: 'var(--sky-light)', fontSize: 12 }}>{r.state}</span>
            <div style={{
              flex: 1, height: 6, background: 'rgba(33, 150, 243, 0.1)', borderRadius: 3, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min((r.smoothedRate / (topRate || 1)) * 100, 100)}%`,
                background: outlierStates.has(r.state)
                  ? 'var(--risk-high)'
                  : 'var(--sky-blue)',
                borderRadius: 3,
                transition: 'width 0.8s ease',
              }} />
            </div>
            <span style={{ minWidth: 50, textAlign: 'right', fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {r.smoothedRate.toFixed(1)}%
            </span>
            <span style={{ minWidth: 60, textAlign: 'right', fontSize: 11, color: 'var(--sky-text-muted)' }}>
              {r.flaggedSuppliers}/{r.suppliers}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
