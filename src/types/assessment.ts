/**
 * Satu entry dalam scoring rule kategori.
 * - max: batas atas inklusif (undefined = fallback/else, selalu taruh terakhir)
 * - label: klasifikasi yang diberikan
 *
 * Contoh kategori C:
 *   [{ max: 5, label: "Belum Berdaya" }, { max: 10, label: "Rintisan" },
 *    { max: 15, label: "Berkembang" }, { label: "Maju" }]
 */
export interface ScoringRuleEntry {
  max?: number
  label: string
}

/** Array scoring rule yang disimpan di field scoringRule (JSON) sebuah kategori */
export type ScoringRule = ScoringRuleEntry[]
