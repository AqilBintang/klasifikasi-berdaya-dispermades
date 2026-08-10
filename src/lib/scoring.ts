/**
 * Klasifikasi tingkat kecamatan berdasarkan total skor per kategori.
 * Formula: IF(total<=16;"Rintisan";IF(total<=32;"Berkembang";IF(total<=48;"Maju";IF(total>=49;"Berdaya"))))
 *
 * Jika maxScore kategori < 49, maka klasifikasi tidak berlaku (null).
 */
export type KlasifikasiLevel = 'Rintisan' | 'Berkembang' | 'Maju' | 'Berdaya'

const MIN_SCORE_FOR_CLASSIFICATION = 49  // skor minimum agar semua threshold terpenuhi

export function getKlasifikasi(totalScore: number, maxScore: number): KlasifikasiLevel | null {
  // Jika kategori tidak punya cukup indikator untuk mencapai threshold tertinggi
  if (maxScore < MIN_SCORE_FOR_CLASSIFICATION) return null

  if (totalScore <= 16) return 'Rintisan'
  if (totalScore <= 32) return 'Berkembang'
  if (totalScore <= 48) return 'Maju'
  return 'Berdaya'
}

export const KLASIFIKASI_CONFIG: Record<KlasifikasiLevel, { color: string; bg: string; border: string; emoji: string }> = {
  'Rintisan':      { color: 'text-red-700',    bg: 'bg-red-100',    border: 'border-red-200',    emoji: '🔴' },
  'Berkembang':    { color: 'text-amber-700',  bg: 'bg-amber-100',  border: 'border-amber-200',  emoji: '🟡' },
  'Maju':          { color: 'text-blue-700',   bg: 'bg-blue-100',   border: 'border-blue-200',   emoji: '🔵' },
  'Berdaya':       { color: 'text-green-700',  bg: 'bg-green-100',  border: 'border-green-200',  emoji: '🟢' },
}

/**
 * Hitung total skor per kategori dari array self assessment entries
 */
export function calcCategoryScore(entries: { score: number; validatedScore?: number | null }[]): number {
  return entries.reduce((sum, e) => sum + (e.validatedScore ?? e.score), 0)
}

/**
 * Status akhir kecamatan = klasifikasi dari total skor semua kategori digabung.
 * Hanya menampilkan klasifikasi jika maxPossibleTotal >= 49.
 */
export function getStatusAkhir(totalScore: number, maxPossibleTotal: number): KlasifikasiLevel | null {
  return getKlasifikasi(totalScore, maxPossibleTotal)
}
