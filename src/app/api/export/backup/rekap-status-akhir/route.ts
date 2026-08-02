import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { jsonToSheet, workbookToXlsxBuffer } from '@/lib/excel'
import { buildRekapStatusAkhir } from '@/lib/export/assessment-export'

export const dynamic = 'force-dynamic'

function safeName(s: string) {
  return s.replace(/[^a-z0-9_-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase()
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const periode = searchParams.get('periode') ?? undefined
  const kecamatanParam = searchParams.get('kecamatan') ?? undefined

  let kecamatanNama: string | undefined = kecamatanParam
  if (session.user.role === 'USER') {
    const me = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { kecamatan: { select: { id: true, nama: true } } },
    })
    if (!me?.kecamatan) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    kecamatanNama = me.kecamatan.nama
  }

  if (!periode || !kecamatanNama) return NextResponse.json({ error: 'periode dan kecamatan wajib diisi' }, { status: 400 })

  // Resolve kecamatanId dari nama
  const wilayah = await prisma.wilayah.findFirst({
    where: { nama: kecamatanNama, level: 3 },
    select: { id: true },
  })
  if (!wilayah) return NextResponse.json({ error: 'Kecamatan tidak ditemukan' }, { status: 404 })

  const rows = await buildRekapStatusAkhir({ periode, kecamatanId: wilayah.id })
  const exportRows = rows.map((r) => ({
    'Judul Assessment': r.assessmentTitle,
    'Periode': r.periode,
    'Tahun': r.tahun,
    'Kabupaten/Kota': r.kabupaten,
    'Kecamatan': r.kecamatan,
    'Total Skor': r.totalScore,
    'Skor Maksimum': r.maxPossibleTotal,
    'Klasifikasi Akhir': r.statusAkhir,
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, jsonToSheet(exportRows as any[], { freezeHeader: true }), 'rekap_status_akhir')

  const stamp = new Date().toISOString().slice(0, 10)
  const parts = [
    'rekap-status-akhir',
    safeName(periode),
    safeName(kecamatanNama),
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
