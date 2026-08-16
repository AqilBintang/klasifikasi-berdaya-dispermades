/**
 * Export self-assessment kecamatan dengan format identik file contoh Excel.
 *
 * Layout output (array-of-arrays):
 *   Baris 1   : "SELF ASESSMENT KECAMATAN BERDAYA PROVINSI JAWA TENGAH"
 *   Baris 2   : "", "Kecamatan", <nama kecamatan>
 *   Baris 3   : "", "Kabupaten/Kota", <nama kabupaten>
 *   Baris 4   : kosong
 *   Per kategori:
 *     - Header kategori  : "<kode>. <nama kategori>"
 *     - Sub-header NO    : "NO", "INDIKATOR", "SELF ASESSMENT", "", ""
 *     - Sub-header kolom : "", "", "DESKRIPSI", "SKOR", "DOKUMEN PENDUKUNG"
 *     - Satu baris per indikator
 *     - Baris total skor : "TOTAL SKOR <kode>", "", "", <skor>
 *     - Baris kategori   : "KATEGORI PROGRAM PRIORITAS", "", <label>, ...
 *     - Baris kosong
 *   Terakhir:
 *     - Total semua skor
 *     - Kategori akhir
 */

import * as XLSX from 'xlsx'
import { prisma } from '@/lib/prisma'
import { getStatusAkhir, getKlasifikasiPerKategori } from '@/lib/scoring'
import { aoaToSheet, workbookToXlsxBuffer } from '@/lib/excel'

// ─── Ambil data ───────────────────────────────────────────────────────────────

export async function buildSelfAssessmentExport(userId: number, assessmentId: number, periode: string) {
  // Info user (kecamatan & kabupaten)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      kecamatan: { select: { nama: true } },
      kabupaten: { select: { nama: true } },
      kecamatanName: true,
      kabupatenName: true,
    },
  })
  if (!user) throw new Error('User tidak ditemukan')

  const kecamatanNama = user.kecamatan?.nama ?? user.kecamatanName ?? '-'
  const kabupatenNama = user.kabupaten?.nama ?? user.kabupatenName ?? '-'

  // Struktur assessment lengkap (kategori + indikator)
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      categories: {
        orderBy: { order: 'asc' },
        include: {
          indicators: { orderBy: { number: 'asc' } },
        },
      },
    },
  })
  if (!assessment) throw new Error('Assessment tidak ditemukan')

  // Self-assessment entries user untuk periode ini
  const entries = await prisma.selfAssessment.findMany({
    where: {
      submittedById: userId,
      periode,
      indicator: { category: { assessmentId } },
    },
    select: {
      indicatorId: true,
      description: true,
      score: true,
      supportingDoc: true,
      validations: {
        orderBy: { validatedAt: 'desc' },
        take: 1,
        select: { validatedScore: true },
      },
    },
  })

  // Map indicatorId → entry untuk lookup O(1)
  const entryMap = new Map(entries.map((e) => [e.indicatorId, e]))

  // ─── Susun array-of-arrays ──────────────────────────────────────────────────

  const rows: unknown[][] = []

  // Baris header dokumen
  rows.push(['SELF ASESSMENT KECAMATAN BERDAYA PROVINSI JAWA TENGAH', '', '', '', '', ''])
  rows.push(['', 'Kecamatan ', kecamatanNama.toUpperCase(), '', '', ''])
  rows.push(['', 'Kabupaten/Kota', kabupatenNama.toUpperCase(), '', '', ''])
  rows.push(['', '', '', '', '', ''])

  let grandTotal = 0
  let grandMax   = 0

  for (const cat of assessment.categories) {
    // Hitung skor kategori
    let catScore = 0
    let catMax   = 0
    for (const ind of cat.indicators) {
      const e = entryMap.get(ind.id)
      const effectiveScore = e?.validations[0]?.validatedScore ?? e?.score ?? 0
      catScore += effectiveScore
      catMax   += ind.maxScore
    }
    grandTotal += catScore
    grandMax   += catMax

    const klasifikasi = getKlasifikasiPerKategori(cat.code, catScore)

    // Header kategori
    rows.push([`${cat.code}. ${cat.name}`, '', '', '', '', ''])
    rows.push(['NO', 'INDIKATOR', 'SELF ASESSMENT', '', '', ''])
    rows.push(['', '', 'DESKRIPSI', 'SKOR', 'DOKUMEN PENDUKUNG', ''])

    // Satu baris per indikator
    for (const ind of cat.indicators) {
      const e = entryMap.get(ind.id)
      const effectiveScore = e?.validations[0]?.validatedScore ?? e?.score ?? ''
      rows.push([
        ind.number,
        ind.indicator,
        e?.description ?? '',
        effectiveScore,
        e?.supportingDoc ?? '',
        '',
      ])
    }

    // Total skor kategori
    rows.push([`TOTAL SKOR ${cat.code}`, '', '', catScore, '', ''])
    rows.push(['KATEGORI PROGRAM PRIORITAS ', '', klasifikasi ?? '-', '', '', ''])
    rows.push(['', '', '', '', '', ''])
  }

  // Grand total
  const statusAkhir = getStatusAkhir(grandTotal, grandMax)
  rows.push([`TOTAL SKOR ${assessment.categories.map((c) => c.code).join(', ')} DAN ${assessment.categories.at(-1)?.code ?? ''}`, '', '', grandTotal, '', ''])
  rows.push(['KATEGORI KECAMATAN BERDAYA', '', statusAkhir ?? '-', '', '', ''])

  return { rows, kecamatanNama, kabupatenNama, assessmentTitle: assessment.title, periode }
}

// ─── Build workbook ───────────────────────────────────────────────────────────

export async function buildSelfAssessmentWorkbook(userId: number, assessmentId: number, periode: string) {
  const { rows, kecamatanNama, kabupatenNama, assessmentTitle } = await buildSelfAssessmentExport(
    userId,
    assessmentId,
    periode,
  )

  const ws = aoaToSheet(rows)

  // Lebar kolom: NO, INDIKATOR, DESKRIPSI, SKOR, DOKUMEN, (spare)
  ws['!cols'] = [
    { wch: 6 },
    { wch: 55 },
    { wch: 60 },
    { wch: 8 },
    { wch: 55 },
    { wch: 5 },
  ]

  // ── Merge cells ──────────────────────────────────────────────────────────────
  // Kolom: A=0, B=1, C=2, D=3, E=4, F=5
  // XLSX merges: { s: {r, c}, e: {r, c} }  (0-indexed)

  const merges: XLSX.Range[] = []

  // Helper
  const merge = (r1: number, c1: number, r2: number, c2: number) =>
    merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } })

  // Baris 1 (r=0): judul — TIDAK di-merge (sesuai file asli)

  // Baris 2 (r=1): nilai kecamatan → C:F
  merge(1, 2, 1, 5)
  // Baris 3 (r=2): nilai kabupaten → C:F
  merge(2, 2, 2, 5)

  // Scan per kategori
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      categories: {
        orderBy: { order: 'asc' },
        include: { indicators: { select: { id: true }, orderBy: { number: 'asc' } } },
      },
    },
  })

  if (assessment) {
    let r = 4 // baris ke-5 (0-indexed), setelah 4 baris header dokumen

    for (const cat of assessment.categories) {
      // Header kategori (r=4,10,...) — TIDAK di-merge
      r++

      // Sub-header baris atas (r+0): NO merge ke bawah A(r)..A(r+1),
      //   INDIKATOR merge ke bawah B(r)..B(r+1),
      //   SELF ASESSMENT merge ke kanan C(r)..E(r)
      const subHeaderRow = r
      merge(subHeaderRow, 0, subHeaderRow + 1, 0)  // NO    → A merge 2 baris
      merge(subHeaderRow, 1, subHeaderRow + 1, 1)  // INDIKATOR → B merge 2 baris
      merge(subHeaderRow, 2, subHeaderRow, 4)       // SELF ASESSMENT → C:E
      r += 2 // lewati 2 baris sub-header

      // Baris indikator — tidak di-merge
      r += cat.indicators.length

      // TOTAL SKOR → A:C (1 baris)
      merge(r, 0, r, 2)
      r++

      // KATEGORI PROGRAM PRIORITAS:
      //   label A:B, nilai klasifikasi C:D
      merge(r, 0, r, 1)
      merge(r, 2, r, 3)
      r++

      // Baris kosong
      r++
    }

    // Grand total → A:C
    merge(r, 0, r, 2)
    r++

    // KATEGORI KECAMATAN BERDAYA: label A:B, nilai C:D
    merge(r, 0, r, 1)
    merge(r, 2, r, 3)
  }

  ws['!merges'] = merges

  const wb = XLSX.utils.book_new()
  const sheetName = 'Input Self Asessment'
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  const safePart = (s: string) =>
    s.replace(/[^a-z0-9 _-]/gi, '').trim().replace(/\s+/g, '_').toUpperCase()

  const filename = `KECAMATAN_${safePart(kecamatanNama)}_${safePart(kabupatenNama)}-${assessmentTitle.replace(/\s+/g, '_')}-${periode}.xlsx`

  return { buffer: workbookToXlsxBuffer(wb), filename }
}


// ─── Laporan Tahunan ──────────────────────────────────────────────────────────

/**
 * Build workbook laporan tahunan — satu sheet per assessment dalam tahun tersebut.
 *
 * Layout kolom (A-G):
 *   A  = No
 *   B  = Indikator
 *   C  = Deskripsi         ┐
 *   D  = Skor              │ SELF ASSESSMENT (header di atas)
 *   E  = Dokumen Pendukung │
 *   F  = Skor Validasi     │
 *   G  = Komentar Tim Teknis┘
 */
export async function buildYearlyReportWorkbook(userId: number, tahun: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      kecamatan: { select: { nama: true } },
      kabupaten: { select: { nama: true } },
      kecamatanName: true,
      kabupatenName: true,
    },
  })
  if (!user) throw new Error('User tidak ditemukan')

  const kecamatanNama = user.kecamatan?.nama ?? user.kecamatanName ?? '-'
  const kabupatenNama = user.kabupaten?.nama ?? user.kabupatenName ?? '-'

  // Ambil semua self-assessment user pada tahun tersebut
  const entries = await prisma.selfAssessment.findMany({
    where: {
      submittedById: userId,
      periode: { contains: String(tahun) },
    },
    select: {
      indicatorId: true,
      periode: true,
      description: true,
      score: true,
      supportingDoc: true,
      status: true,
      validations: {
        orderBy: { validatedAt: 'desc' },
        take: 1,
        select: { validatedScore: true, notes: true },
      },
      indicator: {
        select: {
          id: true,
          number: true,
          indicator: true,
          maxScore: true,
          category: {
            select: {
              id: true,
              code: true,
              name: true,
              order: true,
              assessmentId: true,
              assessment: { select: { id: true, title: true, periode: true } },
            },
          },
        },
      },
    },
    orderBy: [
      { indicator: { category: { order: 'asc' } } },
      { indicator: { number: 'asc' } },
    ],
  })

  if (entries.length === 0) throw new Error(`Tidak ada data assessment untuk tahun ${tahun}`)

  // Kelompokkan per assessmentId+periode
  type EntryType = typeof entries[0]
  const groupMap = new Map<string, { assessmentId: number; title: string; periode: string; entries: EntryType[] }>()
  for (const e of entries) {
    const key = `${e.indicator.category.assessmentId}_${e.periode}`
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        assessmentId: e.indicator.category.assessmentId,
        title: e.indicator.category.assessment.title,
        periode: e.periode,
        entries: [],
      })
    }
    groupMap.get(key)!.entries.push(e)
  }

  const wb = XLSX.utils.book_new()

  // Kolom: A=0 No, B=1 Indikator, C=2 Deskripsi, D=3 Skor, E=4 Dokumen, F=5 Skor Validasi, G=6 Komentar
  const COL_COUNT = 7

  for (const group of groupMap.values()) {
    const rows: unknown[][] = []
    const merges: XLSX.Range[] = []
    const merge = (r1: number, c1: number, r2: number, c2: number) =>
      merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } })

    // ── Header dokumen (baris 0-3, A kosong, label di B, nilai di C) ──
    // r=0: judul di A1, merge A:G
    rows.push(['SELF ASESSMENT KECAMATAN BERDAYA PROVINSI JAWA TENGAH', '', '', '', '', '', ''])
    merge(0, 0, 0, 6)

    // r=1: Kecamatan — label B, nilai C:G
    rows.push(['', 'Kecamatan', kecamatanNama.toUpperCase(), '', '', '', ''])
    merge(1, 2, 1, 6)

    // r=2: Kabupaten — label B, nilai C:G
    rows.push(['', 'Kabupaten/Kota', kabupatenNama.toUpperCase(), '', '', '', ''])
    merge(2, 2, 2, 6)

    // r=3: Periode — label B, nilai C:G
    rows.push(['', 'Periode', group.periode, '', '', '', ''])
    merge(3, 2, 3, 6)

    // r=4: kosong
    rows.push(Array(COL_COUNT).fill(''))

    // Kelompokkan entries per kategori
    type CatData = { code: string; name: string; order: number; items: EntryType[] }
    const catMap = new Map<number, CatData>()
    for (const e of group.entries) {
      const cat = e.indicator.category
      if (!catMap.has(cat.id)) {
        catMap.set(cat.id, { code: cat.code, name: cat.name, order: cat.order, items: [] })
      }
      catMap.get(cat.id)!.items.push(e)
    }
    const cats = Array.from(catMap.values()).sort((a, b) => a.order - b.order)

    let grandTotal = 0
    let grandMax = 0
    const rekapRows: unknown[][] = []

    for (const cat of cats) {
      let catScore = 0
      let catMax = 0

      // r: header kategori — A:G merge
      const rCatHeader = rows.length
      rows.push([`${cat.code}. ${cat.name}`, '', '', '', '', '', ''])
      merge(rCatHeader, 0, rCatHeader, 6)

      // r+1: sub-header baris atas
      //   A=No (merge 2 baris), B=Indikator (merge 2 baris), C:G = "SELF ASSESSMENT"
      const rSubH1 = rows.length
      rows.push(['NO', 'INDIKATOR', 'SELF ASSESSMENT', '', '', '', ''])
      merge(rSubH1, 0, rSubH1 + 1, 0)   // No: merge 2 baris
      merge(rSubH1, 1, rSubH1 + 1, 1)   // Indikator: merge 2 baris
      merge(rSubH1, 2, rSubH1, 6)        // SELF ASSESSMENT: merge C:G

      // r+2: sub-header baris bawah (kolom detail)
      rows.push(['', '', 'DESKRIPSI', 'SKOR', 'DOKUMEN PENDUKUNG', 'SKOR VALIDASI', 'KOMENTAR TIM TEKNIS'])

      // Baris data indikator
      for (const e of cat.items) {
        const validatedScore = e.validations[0]?.validatedScore ?? null
        const effectiveScore = validatedScore ?? e.score
        catScore += effectiveScore
        catMax += e.indicator.maxScore
        rows.push([
          e.indicator.number,
          e.indicator.indicator,
          e.description,
          e.score,
          e.supportingDoc ?? '-',
          validatedScore ?? '-',
          e.validations[0]?.notes ?? '-',
        ])
      }

      grandTotal += catScore
      grandMax += catMax
      const klasifikasi = getKlasifikasiPerKategori(cat.code, catScore)

      // Total skor kategori — A:C merge, nilai di D
      const rTotal = rows.length
      rows.push([`TOTAL SKOR ${cat.code}`, '', '', catScore, '', '', ''])
      merge(rTotal, 0, rTotal, 2)

      // Baris klasifikasi — hanya untuk kategori A, B, C, D
      if (klasifikasi !== null) {
        const rKlas = rows.length
        rows.push(['KATEGORI PROGRAM PRIORITAS', '', klasifikasi, '', '', '', ''])
        merge(rKlas, 0, rKlas, 1)
        merge(rKlas, 2, rKlas, 3)
      }

      rows.push(Array(COL_COUNT).fill(''))

      rekapRows.push([cat.code, cat.name, catScore, catMax, klasifikasi ?? '-'])
    }

    // Rekap akhir
    const categoryScores = cats.map((cat) => {
      let score = 0; let maxScore = 0
      for (const e of cat.items) {
        score += e.validations[0]?.validatedScore ?? e.score
        maxScore += e.indicator.maxScore
      }
      return { code: cat.code, score, maxScore }
    })
    const statusAkhir = getStatusAkhir(grandTotal, grandMax, categoryScores)

    // Grand total — A:C merge
    const rGrand = rows.length
    rows.push([`TOTAL SKOR KESELURUHAN`, '', '', grandTotal, '', '', ''])
    merge(rGrand, 0, rGrand, 2)

    // Status akhir — A:B merge, nilai di C
    const rStatus = rows.length
    rows.push(['KATEGORI KECAMATAN BERDAYA', '', statusAkhir ?? '-', '', '', '', ''])
    merge(rStatus, 0, rStatus, 1)
    merge(rStatus, 2, rStatus, 3)

    rows.push(Array(COL_COUNT).fill(''))

    // Tabel rekapitulasi ringkas
    rows.push(['REKAPITULASI', '', '', '', '', '', ''])
    rows.push(['Kode', 'Kategori', 'Skor', 'Skor Maks', 'Klasifikasi', '', ''])
    rows.push(...rekapRows.map((r) => [...(r as unknown[]), '', '']))
    rows.push(['', 'TOTAL', grandTotal, grandMax, statusAkhir ?? '-', '', ''])

    const ws = aoaToSheet(rows)
    ws['!merges'] = merges
    ws['!cols'] = [
      { wch: 6 },   // A: No
      { wch: 50 },  // B: Indikator
      { wch: 55 },  // C: Deskripsi
      { wch: 8 },   // D: Skor
      { wch: 40 },  // E: Dokumen Pendukung
      { wch: 14 },  // F: Skor Validasi
      { wch: 45 },  // G: Komentar Tim Teknis
    ]
    ws['!freeze'] = { xSplit: 0, ySplit: 5, topLeftCell: 'A6', activePane: 'bottomLeft', state: 'frozen' }

    // Sheet name: periode (maks 31 char, strip karakter invalid)
    const sheetName = group.periode.replace(/[\\/*?[\]:]/g, '-').slice(0, 31)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  }

  const safePart = (s: string) =>
    s.replace(/[^a-z0-9 _-]/gi, '').trim().replace(/\s+/g, '_').toUpperCase()

  const filename = `LAPORAN_${safePart(kecamatanNama)}_${tahun}.xlsx`

  return { buffer: workbookToXlsxBuffer(wb), filename }
}
