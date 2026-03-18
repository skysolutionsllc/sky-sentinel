import { useState, memo } from 'react'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"

// FIPS code to state abbreviation mapping
const FIPS_TO_STATE = {
  '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT','10':'DE',
  '11':'DC','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL','18':'IN','19':'IA',
  '20':'KS','21':'KY','22':'LA','23':'ME','24':'MD','25':'MA','26':'MI','27':'MN',
  '28':'MS','29':'MO','30':'MT','31':'NE','32':'NV','33':'NH','34':'NJ','35':'NM',
  '36':'NY','37':'NC','38':'ND','39':'OH','40':'OK','41':'OR','42':'PA','44':'RI',
  '45':'SC','46':'SD','47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA',
  '54':'WV','55':'WI','56':'WY','72':'PR',
}

function getRiskColor(score) {
  if (!score || score === 0) return 'rgba(33, 150, 243, 0.08)'
  if (score >= 70) return '#EF4444'
  if (score >= 55) return '#F59E0B'
  if (score >= 40) return '#3B82F6'
  return '#10B981'
}

function getRiskOpacity(score) {
  if (!score || score === 0) return 0.15
  return 0.4 + Math.min(score / 100, 1) * 0.6
}

function USHeatmap({ geoRisk = [] }) {
  const [tooltip, setTooltip] = useState(null)

  // Build a lookup from state abbreviation to risk data
  const stateData = {}
  for (const g of geoRisk) {
    stateData[g.state] = g
  }

  return (
    <div style={{ position: 'relative' }}>
      <ComposableMap
        projection="geoAlbersUsa"
        style={{ width: '100%', height: 'auto' }}
        projectionConfig={{ scale: 900 }}
      >
        <ZoomableGroup center={[-96, 38]} zoom={1} minZoom={1} maxZoom={1}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const fips = geo.id
                const stateAbbr = FIPS_TO_STATE[fips]
                const data = stateData[stateAbbr]
                const avgRisk = data?.avg_risk || 0
                const alertCount = data?.alert_count || 0

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getRiskColor(avgRisk)}
                    fillOpacity={getRiskOpacity(avgRisk)}
                    stroke="rgba(33, 150, 243, 0.25)"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: {
                        fill: getRiskColor(avgRisk),
                        fillOpacity: 1,
                        stroke: '#42A5F5',
                        strokeWidth: 1.5,
                        outline: 'none',
                        cursor: 'pointer',
                      },
                      pressed: { outline: 'none' },
                    }}
                    onMouseEnter={() => {
                      setTooltip({
                        name: geo.properties.name,
                        abbr: stateAbbr,
                        avgRisk: avgRisk,
                        alerts: alertCount,
                        suppliers: data?.supplier_count || 0,
                      })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'rgba(10, 20, 40, 0.96)',
          border: '1px solid rgba(33, 150, 243, 0.25)',
          borderRadius: 10,
          padding: '14px 18px',
          fontSize: 13,
          color: '#F1F5F9',
          backdropFilter: 'blur(12px)',
          minWidth: 200,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 14 }}>{tooltip.name}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>{tooltip.abbr}</div>
          {/* Risk score bar */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Risk Score</span>
              <span style={{ fontWeight: 700, color: getRiskColor(tooltip.avgRisk) }}>
                {tooltip.avgRisk > 0 ? tooltip.avgRisk.toFixed(1) : 'N/A'}
              </span>
            </div>
            {tooltip.avgRisk > 0 && (
              <div style={{ height: 4, background: 'rgba(33,150,243,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(tooltip.avgRisk, 100)}%`,
                  background: getRiskColor(tooltip.avgRisk),
                  borderRadius: 2,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94A3B8', fontSize: 12 }}>Risk Level</span>
              <span style={{ fontWeight: 600, fontSize: 12, color: getRiskColor(tooltip.avgRisk) }}>
                {tooltip.avgRisk >= 70 ? 'Critical' : tooltip.avgRisk >= 55 ? 'High' : tooltip.avgRisk >= 40 ? 'Medium' : tooltip.avgRisk > 0 ? 'Low' : '—'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94A3B8', fontSize: 12 }}>Alerts</span>
              <span style={{ fontWeight: 600, fontSize: 12 }}>{tooltip.alerts}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94A3B8', fontSize: 12 }}>Suppliers</span>
              <span style={{ fontWeight: 600, fontSize: 12 }}>{tooltip.suppliers}</span>
            </div>
            {tooltip.suppliers > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8', fontSize: 12 }}>Flag Rate</span>
                <span style={{ fontWeight: 700, fontSize: 12, color: '#F59E0B' }}>
                  {((tooltip.alerts / tooltip.suppliers) * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 8, fontSize: 11 }}>
        {[
          { label: 'Critical (70+)', color: '#EF4444' },
          { label: 'High (55-70)', color: '#F59E0B' },
          { label: 'Medium (40-55)', color: '#3B82F6' },
          { label: 'Low (<40)', color: '#10B981' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: l.color, opacity: 0.8, display: 'inline-block' }} />
            <span style={{ color: '#94A3B8' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default memo(USHeatmap)
