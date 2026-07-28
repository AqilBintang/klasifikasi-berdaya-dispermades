import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { aoaToSheet, workbookToXlsxBuffer } from '@/lib/excel'

export const dynamic = 'force-dynamic'

function safeSheetName(input: string) {
  const cleaned = input.replace(/[\[\]\*\/\\\?\:]/g, '-').trim()
  const limited = cleaned.slice(0, 31)
  return limited.length > 0 ? limited : 'sheet'
}

function safeFilePart(s: string) {
  return s.replace(/[^a-z0-9_-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase()
}

type Snapshot = {
  assessmentTitle: string
  periode: string
  tahun: number | null
  kabupaten: string | null
  kecamatan: string | null
  categories: Array<{
    code: string
    name: string
    order: number
    totalScore: number
    maxScore: number
    klasifikasi: string | null
    indicators: Array<{
      number: number
      indicator: string
      maxScore: number
      description: string
      supportingDoc: string | null
      score: number
      validatedScore: number | null
      effectiveScore: number
    }>
  }>
  totalScore: number
  maxPossibleTotal: number
  statusAkhir: string | null
}

function snapshotToRows(s: Snapshot) {
  const rows: unknown[][] = []
  rows.push(['Judul Assessment', s.assessmentTitle])
  rows.push(['Periode', s.periode, 'Tahun', s.tahun ?? ''])
  rows.push(['Kabupaten/Kota', s.kabupaten ?? '', 'Kecamatan', s.kecamatan ?? ''])
  rows.push(['Status Akhir', s.statusAkhir ?? '', 'Total Skor', `${s.totalScore}/${s.maxPossibleTotal}`])
  rows.push([])

  const categories = [...(s.categories ?? [])].sort((a, b) => a.order - b.order)
  for (const c of categories) {
    rows.push([`Kategori ${c.code}`, c.name])
    rows.push(['Total Skor Kategori', `${c.totalScore}/${c.maxScore}`, 'Klasifikasi', c.klasifikasi ?? ''])
    rows.push([])
    rows.push(['No', 'Indikator', 'Deskripsi', 'Skor', 'Skor Validasi', 'Skor Efektif', 'Dokumen Pendukung'])
    for (const i of c.indicators ?? []) {
      rows.push([
        i.number,
        i.indicator,
        i.description,
        i.score,
        i.validatedScore ?? '',
        i.effectiveScore,
        i.supportingDoc ?? '',
      ])
    }
    rows.push([])
  }

  rows.push(['Ringkasan', '', '', '', '', '', ''])
  rows.push(['Total Skor Akhir', `${s.totalScore}/${s.maxPossibleTotal}`, 'Klasifikasi Akhir', s.statusAkhir ?? ''])
  return rows
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const periode = searchParams.get('periode') ?? undefined
  const kecamatanParam = searchParams.get('kecamatan') ?? undefined

  let kecamatan = kecamatanParam
  if (session.user.role === 'USER') {
    if (!session.user.kecamatan) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    kecamatan = session.user.kecamatan
  }

  if (!periode || !kecamatan) return NextResponse.json({ error: 'periode dan kecamatan wajib diisi' }, { status: 400 })

  const backups = await prisma.assessmentBackup.findMany({
    where: { periode, kecamatan },
    orderBy: [{ assessmentTitle: 'asc' }],
  })

  if (backups.length === 0) {
    return NextResponse.json({ error: 'Belum ada backup untuk periode & kecamatan tersebut.' }, { status: 404 })
  }

  const wb = XLSX.utils.book_new()
  for (const b of backups) {
    const s = b.snapshot as unknown as Snapshot
    const sheetName = safeSheetName(s.assessmentTitle)
    XLSX.utils.book_append_sheet(wb, aoaToSheet(snapshotToRows(s), { freezeTopRows: 4 }), sheetName)
  }

  const stamp = new Date().toISOString().slice(0, 10)
  const filename = `backup-${safeFilePart(kecamatan)}-${safeFilePart(periode)}-${stamp}.xlsx`

  return new NextResponse(workbookToXlsxBuffer(wb), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

