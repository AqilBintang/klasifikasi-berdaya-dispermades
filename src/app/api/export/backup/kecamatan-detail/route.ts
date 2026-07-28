import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { auth } from '@/auth'
import { jsonToSheet, workbookToXlsxBuffer } from '@/lib/excel'
import { buildKecamatanDetail } from '@/lib/export/assessment-export'

export const dynamic = 'force-dynamic'

function toInt(value: string | null) {
  if (!value) return undefined
  const n = Number.parseInt(value, 10)
  return Number.isNaN(n) ? undefined : n
}

function safeName(s: string) {
  return s.replace(/[^a-z0-9_-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase()
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const assessmentId = toInt(searchParams.get('assessmentId'))
  const periode = searchParams.get('periode') ?? undefined
  const kecamatanParam = searchParams.get('kecamatan') ?? undefined

  let kecamatan = kecamatanParam
  if (session.user.role === 'USER') {
    if (!session.user.kecamatan) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    kecamatan = session.user.kecamatan
  }

  if (!kecamatan) return NextResponse.json({ error: 'kecamatan wajib diisi' }, { status: 400 })

  const { detailRows, rekapRows } = await buildKecamatanDetail({ kecamatan, assessmentId, periode })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, jsonToSheet(rekapRows as any[], { freezeHeader: true }), 'rekap_status_akhir')
  XLSX.utils.book_append_sheet(wb, jsonToSheet(detailRows as any[], { freezeHeader: true }), 'detail_isian')

  const stamp = new Date().toISOString().slice(0, 10)
  const parts = [
    'kecamatan-detail',
    safeName(kecamatan),
    assessmentId ? `assessment-${assessmentId}` : '',
    periode ? safeName(periode) : '',
    stamp,
  ].filter(Boolean)
  const filename = `${parts.join('-')}.xlsx`

  return new NextResponse(workbookToXlsxBuffer(wb), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

