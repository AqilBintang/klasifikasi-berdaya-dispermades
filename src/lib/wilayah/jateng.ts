import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'

import type { KabKotaJateng, KecamatanJateng } from '@/types/wilayah'

type ParsedJateng = {
  kabKota: KabKotaJateng[]
  kecamatanByKabKota: Record<string, KecamatanJateng[]>
}

let parsedPromise: Promise<ParsedJateng> | null = null

// Coba load dari pre-built JSON dulu (generated via scripts/generate-wilayah-json.ts).
// Jika tidak tersedia, fallback ke SQL parsing. JSON jauh lebih cepat karena tidak
// perlu parse line-by-line, terutama saat cold start di serverless.
function tryLoadFromJson(): ParsedJateng | null {
  const jsonPath = path.join(process.cwd(), 'src', 'data', 'wilayah-jateng.json')
  try {
    if (!fs.existsSync(jsonPath)) return null
    const raw = fs.readFileSync(jsonPath, 'utf8')
    return JSON.parse(raw) as ParsedJateng
  } catch {
    return null
  }
}

function parseNullableNumber(value: string | undefined): number | null {
  if (!value) return null
  if (value.toUpperCase() === 'NULL') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function parseSqlRowValues(rowLine: string): string[] {
  const start = rowLine.indexOf('(')
  const end = rowLine.lastIndexOf(');')
  const closeParen = end >= 0 ? end : rowLine.lastIndexOf(')')
  const inside = rowLine.slice(start + 1, closeParen)

  const out: string[] = []
  let cur = ''
  let inQuote = false

  for (let i = 0; i < inside.length; i++) {
    const ch = inside[i]

    if (inQuote) {
      if (ch === "'") {
        if (inside[i + 1] === "'") {
          cur += "'"
          i++
          continue
        }
        inQuote = false
        continue
      }
      cur += ch
      continue
    }

    if (ch === "'") {
      inQuote = true
      continue
    }

    if (ch === ',') {
      out.push(cur.trim())
      cur = ''
      continue
    }

    cur += ch
  }

  out.push(cur.trim())
  return out
}

async function parseKabKotaJatengFromSqlLevel12(): Promise<KabKotaJateng[]> {
  const filePath = path.join(process.cwd(), 'db', 'wilayah_level_1_2_jateng.sql')
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' })
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

  const kabKota: KabKotaJateng[] = []

  let started = false

  for await (const line of rl) {
    const trimmed = line.trim()
    if (!trimmed.startsWith("('")) continue

    if (!started && trimmed.startsWith("('33'")) started = true
    if (!started) continue

    if (trimmed.startsWith("('34'")) break

    const values = parseSqlRowValues(trimmed)
    const kode = values[0] ?? ''
    const nama = values[1] ?? ''

    if (kode === '33') continue
    if (!kode.startsWith('33.')) continue

    if (kode.length === 5) {
      kabKota.push({
        kode,
        nama,
        lat: parseNullableNumber(values[3]),
        lng: parseNullableNumber(values[4]),
        luas: parseNullableNumber(values[7]),
        penduduk: parseNullableNumber(values[8]),
        path: values[9]?.toUpperCase() === 'NULL' ? null : (values[9] ?? null),
      })
      continue
    }
  }

  kabKota.sort((a, b) => a.kode.localeCompare(b.kode, 'id'))
  return kabKota
}

async function parseKecamatanJatengFromWilayahSql(): Promise<Record<string, KecamatanJateng[]>> {
  const filePath = path.join(process.cwd(), 'db', 'wilayah_jateng.sql')
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' })
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

  const kecamatanByKabKota: Record<string, KecamatanJateng[]> = {}

  let started = false

  for await (const line of rl) {
    const trimmed = line.trim()
    if (!trimmed.startsWith("('")) continue

    if (!started && trimmed.startsWith("('33'")) started = true
    if (!started) continue

    if (trimmed.startsWith("('34'")) break

    const values = parseSqlRowValues(trimmed)
    const kode = values[0] ?? ''
    const nama = values[1] ?? ''

    if (kode === '33') continue
    if (!kode.startsWith('33.')) continue
    if (kode.length !== 8) continue

    const kodeKabKota = kode.slice(0, 5)
    if (!kecamatanByKabKota[kodeKabKota]) kecamatanByKabKota[kodeKabKota] = []
    kecamatanByKabKota[kodeKabKota].push({ kode, nama })
  }

  for (const key of Object.keys(kecamatanByKabKota)) {
    kecamatanByKabKota[key]?.sort((a, b) => a.kode.localeCompare(b.kode, 'id'))
  }

  return kecamatanByKabKota
}

async function parseJatengFromSql(): Promise<ParsedJateng> {
  const [kabKota, kecamatanByKabKota] = await Promise.all([
    parseKabKotaJatengFromSqlLevel12(),
    parseKecamatanJatengFromWilayahSql(),
  ])

  return { kabKota, kecamatanByKabKota }
}

async function getParsedJateng(): Promise<ParsedJateng> {
  if (!parsedPromise) {
    // Coba JSON dulu — synchronous dan cepat
    const fromJson = tryLoadFromJson()
    if (fromJson) {
      parsedPromise = Promise.resolve(fromJson)
    } else {
      // Fallback: parse SQL files (dibutuhkan saat JSON belum di-generate)
      parsedPromise = parseJatengFromSql()
    }
  }
  return parsedPromise
}

export async function getKabKotaJateng(): Promise<KabKotaJateng[]> {
  return (await getParsedJateng()).kabKota
}

export async function getKecamatanByKabKotaJateng(kodeKabKota: string): Promise<KecamatanJateng[]> {
  const { kecamatanByKabKota } = await getParsedJateng()
  return kecamatanByKabKota[kodeKabKota] ?? []
}

export async function getKecamatanMapJateng(): Promise<Record<string, KecamatanJateng[]>> {
  return (await getParsedJateng()).kecamatanByKabKota
}
