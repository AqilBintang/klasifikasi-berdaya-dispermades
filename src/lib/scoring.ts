/**
 * Klasifikasi tingkat kecamatan berdasarkan weighted score dari kategori.
 * Formula weighted: A*0.31 + B*0.255 + C*0.16 + D*0.22 + E*0.01 + F*0.045
 * Threshold: ≤14.41 (Rintisan), ≤29.13 (Berkembang), ≤43.23 (Maju), ≥43.24 (Berdaya)
 */
import type { ScoringRule } from '@/types/assessment'

export type { ScoringRule }

/**
 * Evaluasi skor kategori berdasarkan scoringRule kustom.
 * Entry diurutkan dari kecil ke besar; entry tanpa max = fallback.
 * Mengembalikan label string, bukan KlasifikasiLevel (bisa bebas).
 */
export function evaluateScoringRule(score: number, rule: ScoringRule): string | null {
  if (!rule || rule.length === 0) return null
  // Cari entry pertama dengan max >= score, atau fallback (tanpa max)
  for (const entry of rule) {
    if (entry.max === undefined || score <= entry.max) return entry.label
  }
  return null
}
export type KlasifikasiLevel = 'Rintisan' | 'Berkembang' | 'Maju' | 'Berdaya'

// Bobot per kategori untuk weighted scoring
export const CATEGORY_WEIGHTS: Record<string, number> = {
  'A': 0.31,
  'B': 0.255,
  'C': 0.16,
  'D': 0.22,
  'E': 0.01,
  'F': 0.045,
}

// Total bobot maksimum untuk normalisasi (sum of all weights)
const MAX_WEIGHTED_SCORE = Object.values(CATEGORY_WEIGHTS).reduce((sum, weight) => sum + weight, 0)

/**
 * Hitung weighted score dari array category scores
 * Formula: (Jumlah skor kategori A*0,31) + (Jumlah skor kategori B*0,255) + ... dst
 * Menggunakan jumlah skor mentah, bukan dinormalisasi
 */
export function calculateWeightedScore(categoryScores: Array<{ code: string; score: number; maxScore: number }>): {
  weightedScore: number
  maxWeightedScore: number
} {
  let weightedScore = 0
  let maxWeightedScore = 0
  
  for (const cat of categoryScores) {
    const weight = CATEGORY_WEIGHTS[cat.code] ?? 0
    if (weight > 0) {
      // Gunakan jumlah skor mentah sesuai formula dari tim teknis
      weightedScore += cat.score * weight
      maxWeightedScore += cat.maxScore * weight
    }
  }
  
  return { weightedScore, maxWeightedScore }
}

/**
 * Klasifikasi berdasarkan weighted score dengan threshold baru
 */
export function getKlasifikasiFromWeighted(weightedScore: number): KlasifikasiLevel | null {
  // Minimum weighted score yang diperlukan agar semua kategori tersedia
  if (weightedScore < 0) return null

  if (weightedScore <= 14.41) return 'Rintisan'
  if (weightedScore <= 29.13) return 'Berkembang'  
  if (weightedScore <= 43.23) return 'Maju'
  return 'Berdaya'
}

/**
 * Legacy function untuk backward compatibility dengan sistem lama
 * Untuk sementara masih menggunakan logic lama sampai semua data migrasi
 */
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
 * Status akhir kecamatan menggunakan weighted scoring jika data kategori tersedia,
 * fallback ke total score jika tidak ada data kategori.
 */
export function getStatusAkhir(
  totalScore: number, 
  maxPossibleTotal: number,
  categoryScores?: Array<{ code: string; score: number; maxScore: number }>
): KlasifikasiLevel | null {
  // Prioritas 1: Gunakan weighted scoring jika ada data kategori
  if (categoryScores && categoryScores.length > 0) {
    const { weightedScore } = calculateWeightedScore(categoryScores)
    return getKlasifikasiFromWeighted(weightedScore)
  }
  
  // Prioritas 2: Fallback ke sistem lama untuk backward compatibility
  return getKlasifikasi(totalScore, maxPossibleTotal)
}
