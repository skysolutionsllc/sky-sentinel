/**
 * HCPCS code → human-readable equipment name lookup.
 * Used across Dashboard, Alerts, SupplierDetail for tooltips/labels.
 */
export const HCPCS_NAMES = {
  'E1390': 'Oxygen Concentrator',
  'K0856': 'Power Wheelchair Group 3',
  'K0823': 'Power Wheelchair Group 2',
  'E0601': 'CPAP Device',
  'L1832': 'Knee Orthosis',
  'A4253': 'Blood Glucose Test Strips',
  'E0260': 'Hospital Bed (Semi-Electric)',
  'K0108': 'Wheelchair Accessory',
  'E0431': 'Portable Oxygen System',
  'L0650': 'Lumbar Orthosis',
  'E2402': 'Wound Therapy Pump',
  'E0784': 'External Infusion Pump',
  'K0871': 'Power Wheelchair Group 3 HD',
  'E1399': 'DME Miscellaneous',
  'A7027': 'CPAP Mask Cushion',
  'E0143': 'Walker (Wheeled)',
  'E0163': 'Commode Chair',
  'L3020': 'Foot Insert/Orthotic',
  'A6531': 'Compression Bandage',
  'E0277': 'Powered Air Mattress',
}

/**
 * Get human-readable name for a HCPCS code.
 * Returns "CODE — Name" if found, just the code if not.
 */
export function formatHCPCS(code) {
  if (!code) return '—'
  const name = HCPCS_NAMES[code]
  return name ? `${code} — ${name}` : code
}

/**
 * Get just the equipment name (no code prefix).
 */
export function getEquipmentName(code) {
  return HCPCS_NAMES[code] || 'Unknown Equipment'
}

/**
 * HCPCS categories for heatmap filtering.
 */
export const HCPCS_CATEGORIES = {
  'All Equipment': null,
  'Power Wheelchairs': ['K0856', 'K0823', 'K0871', 'K0108'],
  'Respiratory (O₂/CPAP)': ['E1390', 'E0601', 'E0431', 'A7027'],
  'Orthotic Devices': ['L1832', 'L0650', 'L3020'],
  'Hospital Beds': ['E0260', 'E0277'],
  'Wound Care': ['E2402', 'A6531'],
  'Diabetes Supplies': ['A4253'],
  'Infusion Pumps': ['E0784'],
}

/**
 * Generate CSV content and trigger download.
 */
export function downloadCSV(rows, columns, filename = 'export.csv') {
  if (!rows.length) return

  const headers = columns.map(c => c.label || c.key)
  const csvRows = [
    headers.join(','),
    ...rows.map(row =>
      columns.map(c => {
        const val = typeof c.accessor === 'function' ? c.accessor(row) : row[c.key]
        const str = String(val ?? '').replace(/"/g, '""')
        return `"${str}"`
      }).join(',')
    ),
  ]

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
