import * as XLSX from 'xlsx'

type JsonRow = Record<string, unknown>

function normalizeCellValue(value: unknown) {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') return JSON.stringify(value)
  return value
}

export function jsonToSheet(rows: JsonRow[], options?: { header?: string[]; freezeHeader?: boolean }) {
  const safeRows =
    rows.length === 0
      ? [{}]
      : rows.map((r) => {
          const out: JsonRow = {}
          for (const [k, v] of Object.entries(r)) out[k] = normalizeCellValue(v)
          return out
        })

  const ws = XLSX.utils.json_to_sheet(safeRows, options?.header ? { header: options.header } : undefined)

  const header = options?.header ?? (safeRows.length > 0 ? Object.keys(safeRows[0] ?? {}) : [])
  const widths = header.map((h) => {
    let max = h.length
    for (const row of safeRows) {
      const v = row[h]
      const len = String(v ?? '').length
      if (len > max) max = len
    }
    const capped = Math.min(Math.max(max + 2, 10), 60)
    return { wch: capped }
  })
  ws['!cols'] = widths

  if (options?.freezeHeader) {
    ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' }
  }

  return ws
}

export function aoaToSheet(rows: unknown[][], options?: { freezeTopRows?: number }) {
  const safeRows =
    rows.length === 0
      ? [[]]
      : rows.map((r) => r.map((v) => normalizeCellValue(v)))

  const ws = XLSX.utils.aoa_to_sheet(safeRows)

  const maxCols = safeRows.reduce((m, r) => Math.max(m, r.length), 0)
  const widths = Array.from({ length: maxCols }, (_, colIdx) => {
    let max = 10
    for (const row of safeRows) {
      const v = row[colIdx]
      const len = String(v ?? '').length
      if (len > max) max = len
    }
    const capped = Math.min(Math.max(max + 2, 10), 70)
    return { wch: capped }
  })
  ws['!cols'] = widths

  const freezeTopRows = options?.freezeTopRows ?? 0
  if (freezeTopRows > 0) {
    ws['!freeze'] = {
      xSplit: 0,
      ySplit: freezeTopRows,
      topLeftCell: `A${freezeTopRows + 1}`,
      activePane: 'bottomLeft',
      state: 'frozen',
    }
  }

  return ws
}

export function workbookToXlsxBuffer(wb: XLSX.WorkBook) {
  return new Uint8Array(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer)
}

