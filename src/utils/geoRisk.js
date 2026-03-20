/**
 * Shared geo-risk helpers for dashboard fairness reviews.
 * Small-denominator states are excluded from the verdict and nearby states
 * are lightly shrunk toward the national baseline so 1/1 and 2/2 do not dominate.
 */
export const FAIRNESS_MIN_SUPPLIERS = 5
export const FAIRNESS_SMOOTHING_SUPPLIERS = 5

const FAIRNESS_MIN_STATES = 3

export function getFlaggedSupplierCount(entry = {}) {
  const supplierCount = Number(entry?.supplier_count) || 0
  const flaggedSupplierCount = Number(entry?.flagged_supplier_count)

  if (Number.isFinite(flaggedSupplierCount)) {
    return Math.max(0, supplierCount > 0 ? Math.min(flaggedSupplierCount, supplierCount) : flaggedSupplierCount)
  }

  const alertCount = Number(entry?.alert_count) || 0
  return Math.max(0, supplierCount > 0 ? Math.min(alertCount, supplierCount) : alertCount)
}

export function getSupplierFlagRate(entry = {}) {
  const supplierCount = Number(entry?.supplier_count) || 0
  if (supplierCount <= 0) return 0

  return (getFlaggedSupplierCount(entry) / supplierCount) * 100
}

function getWeightedMean(items, valueKey, weightKey) {
  const totalWeight = items.reduce((sum, item) => sum + (item[weightKey] || 0), 0)
  if (totalWeight <= 0) return 0

  return items.reduce((sum, item) => sum + (item[valueKey] || 0) * (item[weightKey] || 0), 0) / totalWeight
}

function getWeightedVariance(items, valueKey, weightKey, mean) {
  const totalWeight = items.reduce((sum, item) => sum + (item[weightKey] || 0), 0)
  if (totalWeight <= 0) return 0

  return items.reduce((sum, item) => {
    const value = item[valueKey] || 0
    const weight = item[weightKey] || 0
    return sum + weight * Math.pow(value - mean, 2)
  }, 0) / totalWeight
}

export function analyzeGeoRiskFairness(geoRisk = []) {
  if (!Array.isArray(geoRisk) || geoRisk.length === 0) return null

  const statesWithData = geoRisk
    .filter(entry => entry?.state && (Number(entry?.supplier_count) || 0) > 0)
    .map(entry => ({
      state: entry.state,
      suppliers: Number(entry.supplier_count) || 0,
      alerts: Number(entry.alert_count) || 0,
      flaggedSuppliers: getFlaggedSupplierCount(entry),
      rawRate: getSupplierFlagRate(entry),
      avgRisk: Number(entry.avg_risk) || 0,
    }))

  if (statesWithData.length === 0) return null

  const totalSuppliers = statesWithData.reduce((sum, entry) => sum + entry.suppliers, 0)
  const totalFlaggedSuppliers = statesWithData.reduce((sum, entry) => sum + entry.flaggedSuppliers, 0)
  const overallRate = totalSuppliers > 0 ? (totalFlaggedSuppliers / totalSuppliers) * 100 : 0
  const priorFlaggedSuppliers = (overallRate / 100) * FAIRNESS_SMOOTHING_SUPPLIERS

  const flaggingRates = statesWithData
    .filter(entry => entry.suppliers >= FAIRNESS_MIN_SUPPLIERS)
    .map(entry => ({
      ...entry,
      // Light shrinkage keeps states near the cutoff from swinging the verdict.
      smoothedRate: ((entry.flaggedSuppliers + priorFlaggedSuppliers) / (entry.suppliers + FAIRNESS_SMOOTHING_SUPPLIERS)) * 100,
    }))
    .sort((a, b) => b.smoothedRate - a.smoothedRate)

  const statesExcluded = statesWithData.filter(entry => entry.suppliers < FAIRNESS_MIN_SUPPLIERS).length
  const mean = getWeightedMean(flaggingRates, 'smoothedRate', 'suppliers')
  const variance = getWeightedVariance(flaggingRates, 'smoothedRate', 'suppliers', mean)
  const stdDev = Math.sqrt(variance)
  const cv = mean > 0 ? (stdDev / mean) * 100 : 0
  const canIssueVerdict = flaggingRates.length >= FAIRNESS_MIN_STATES
  const outliers = canIssueVerdict
    ? flaggingRates.filter(entry => Math.abs(entry.smoothedRate - mean) > 2 * stdDev)
    : []

  return {
    flaggingRates,
    overallRate,
    mean,
    stdDev,
    cv,
    outliers,
    isFair: canIssueVerdict ? cv < 80 && outliers.length <= 2 : false,
    canIssueVerdict,
    statesAnalyzed: flaggingRates.length,
    statesExcluded,
    totalStates: statesWithData.length,
    totalSuppliers,
    totalFlaggedSuppliers,
  }
}
