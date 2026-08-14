import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { auth } from '@/auth'
import { jsonToSheet, workbookToXlsxBuffer } from '@/lib/excel'
import { buildRekapStatusAkhir } from '@/lib/export/assessment-export'

export const dynamic = 'force-dynamic'

function safeName(s: string) {
  return s.replace(/[^a-z0-9_-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase()
}

// Excel sheet name max 31 chars, strip invalid chars
function sheetName(s: string) {
  return s.replace(/[\\/*?[\]:]/g, '-').slice(0, 31)
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const periode = searchParams.get('periode') ?? undefined

  if (!periode) return NextResponse.json({ error: 'periode wajib diisi' }, { status: 400 })

  const rows = await buildRekapStatusAkhir({ periode })

  // Collect all category headers in order (union across all rows)
  const catHeaders = new Map<string, string>() // code → display label
  for (const r of rows) {
    for (const c of r.categoryScores) {
      if (!catHeaders.has(c.code)) catHeaders.set(c.code, `Skor ${c.code} - ${c.name}`)
    }
  }

  // Group by kabupaten
  const byKabupaten = new Map<string, typeof rows>()
  for (const r of rows) {
    const kab = r.kabupaten ?? 'Tidak Diketahui'
    if (!byKabupaten.has(kab)) byKabupaten.set(kab, [])
    byKabupaten.get(kab)!.push(r)
  }

  const wb = XLSX.utils.book_new()

  for (const [kab, kabRows] of byKabupaten) {
    const exportRows = kabRows.map((r) => {
      const catCols: Record<string, number> = {}
      for (const [code, label] of catHeaders) {
        catCols[label] = r.categoryScores.find((c) => c.code === code)?.score ?? 0
      }
      return {
        'Judul Assessment': r.assessmentTitle,
        'Periode': r.periode,
        'Kecamatan': r.kecamatan,
        ...catCols,
        'Total Skor': r.totalScore,
        'Skor Maksimum': r.maxPossibleTotal,
        'Klasifikasi Akhir': r.statusAkhir,
      }
    })
    XLSX.utils.book_append_sheet(wb, jsonToSheet(exportRows as any[], { freezeHeader: true }), sheetName(kab))
  }

  // Fallback: if no data at all
  if (byKabupaten.size === 0) {
    XLSX.utils.book_append_sheet(wb, jsonToSheet([], { freezeHeader: true }), 'Tidak Ada Data')
  }

  const stamp = new Date().toISOString().slice(0, 10)
  const filename = `rekap-status-akhir-${safeName(periode)}-${stamp}.xlsx`

  return new NextResponse(workbookToXlsxBuffer(wb), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
