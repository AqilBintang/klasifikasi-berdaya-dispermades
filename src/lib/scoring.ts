/**
 * Klasifikasi tingkat kecamatan berdasarkan total skor per kategori.
 * Formula: IF(total<=21;"Belum Berdaya";IF(total<=42;"Rintisan";IF(total<=63;"Berkembang";IF(total>=64;"Maju"))))
 *
 * Jika maxScore kategori < 64, maka klasifikasi tidak berlaku (null).
 */
export type KlasifikasiLevel = 'Belum Berdaya' | 'Rintisan' | 'Berkembang' | 'Maju'

const MIN_SCORE_FOR_CLASSIFICATION = 64  // skor minimum agar semua threshold terpenuhi

export function getKlasifikasi(totalScore: number, maxScore: number): KlasifikasiLevel | null {
  // Jika kategori tidak punya cukup indikator untuk mencapai threshold tertinggi
  if (maxScore < MIN_SCORE_FOR_CLASSIFICATION) return null

  if (totalScore <= 21) return 'Belum Berdaya'
  if (totalScore <= 42) return 'Rintisan'
  if (totalScore <= 63) return 'Berkembang'
  return 'Maju'
}

export const KLASIFIKASI_CONFIG: Record<KlasifikasiLevel, { color: string; bg: string; border: string; emoji: string }> = {
  'Belum Berdaya': { color: 'text-red-700',    bg: 'bg-red-100',    border: 'border-red-200',    emoji: '🔴' },
  'Rintisan':      { color: 'text-amber-700',  bg: 'bg-amber-100',  border: 'border-amber-200',  emoji: '🟡' },
  'Berkembang':    { color: 'text-blue-700',   bg: 'bg-blue-100',   border: 'border-blue-200',   emoji: '🔵' },
  'Maju':          { color: 'text-green-700',  bg: 'bg-green-100',  border: 'border-green-200',  emoji: '🟢' },
}

/**
 * Hitung total skor per kategori dari array self assessment entries
 */
export function calcCategoryScore(entries: { score: number; validatedScore?: number | null }[]): number {
  return entries.reduce((sum, e) => sum + (e.validatedScore ?? e.score), 0)
}

/**
 * Status akhir kecamatan = klasifikasi dari total skor semua kategori digabung.
 * Hanya menampilkan klasifikasi jika maxPossibleTotal >= 64.
 */
export function getStatusAkhir(totalScore: number, maxPossibleTotal: number): KlasifikasiLevel | null {
  return getKlasifikasi(totalScore, maxPossibleTotal)
}
