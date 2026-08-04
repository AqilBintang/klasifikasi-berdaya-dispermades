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
import { getKlasifikasi, getStatusAkhir } from '@/lib/scoring'
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

    const klasifikasi = getKlasifikasi(catScore, catMax)

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
