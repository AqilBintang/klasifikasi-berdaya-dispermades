/**
 * scripts/generate-wilayah-json.ts
 *
 * Pre-generate wilayah JSON dari SQL files saat build time.
 * Output: src/data/wilayah-jateng.json
 *
 * Run: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/generate-wilayah-json.ts
 * atau: npm run generate:wilayah
 */

import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'

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
        if (inside[i + 1] === "'") { cur += "'"; i++; continue }
        inQuote = false
        continue
      }
      cur += ch
      continue
    }

    if (ch === "'") { inQuote = true; continue }
    if (ch === ',') { out.push(cur.trim()); cur = ''; continue }
    cur += ch
  }

  out.push(cur.trim())
  return out
}

async function parseKabKota(): Promise<{ kode: string; nama: string; lat: number | null; lng: number | null; luas: number | null; penduduk: number | null; path: string | null }[]> {
  const filePath = path.join(process.cwd(), 'db', 'wilayah_level_1_2_jateng.sql')
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' })
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

  const kabKota: { kode: string; nama: string; lat: number | null; lng: number | null; luas: number | null; penduduk: number | null; path: string | null }[] = []
  let started = false

  for await (const line of rl) {
    const trimmed = line.trim()
    if (!trimmed.startsWith("('")) continue
    if (!started && trimmed.startsWith("('33'")) started = true
    if (!started) continue
    if (trimmed.startsWith("('34'")) break

    const values = parseSqlRowValues(trimmed)
    const kode = values[0] ?? ''
    if (kode === '33') continue
    if (!kode.startsWith('33.')) continue
    if (kode.length !== 5) continue

    kabKota.push({
      kode,
      nama: values[1] ?? '',
      lat: parseNullableNumber(values[3]),
      lng: parseNullableNumber(values[4]),
      luas: parseNullableNumber(values[7]),
      penduduk: parseNullableNumber(values[8]),
      path: values[9]?.toUpperCase() === 'NULL' ? null : (values[9] ?? null),
    })
  }

  kabKota.sort((a, b) => a.kode.localeCompare(b.kode, 'id'))
  return kabKota
}

async function parseKecamatan(): Promise<Record<string, { kode: string; nama: string }[]>> {
  const filePath = path.join(process.cwd(), 'db', 'wilayah_jateng.sql')
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' })
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

  const byKabKota: Record<string, { kode: string; nama: string }[]> = {}
  let started = false

  for await (const line of rl) {
    const trimmed = line.trim()
    if (!trimmed.startsWith("('")) continue
    if (!started && trimmed.startsWith("('33'")) started = true
    if (!started) continue
    if (trimmed.startsWith("('34'")) break

    const values = parseSqlRowValues(trimmed)
    const kode = values[0] ?? ''
    if (kode === '33' || !kode.startsWith('33.') || kode.length !== 8) continue

    const kodeKabKota = kode.slice(0, 5)
    if (!byKabKota[kodeKabKota]) byKabKota[kodeKabKota] = []
    byKabKota[kodeKabKota].push({ kode, nama: values[1] ?? '' })
  }

  for (const key of Object.keys(byKabKota)) {
    byKabKota[key]?.sort((a, b) => a.kode.localeCompare(b.kode, 'id'))
  }

  return byKabKota
}

async function main() {
  console.log('Parsing wilayah dari SQL files...')
  const [kabKota, kecamatanByKabKota] = await Promise.all([
    parseKabKota(),
    parseKecamatan(),
  ])

  const output = { kabKota, kecamatanByKabKota }
  const outPath = path.join(process.cwd(), 'src', 'data', 'wilayah-jateng.json')

  fs.writeFileSync(outPath, JSON.stringify(output), 'utf8')
  console.log(`✓ ${outPath}`)
  console.log(`  kabKota: ${kabKota.length} entries`)
  console.log(`  kecamatan: ${Object.values(kecamatanByKabKota).reduce((s, v) => s + v.length, 0)} entries`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
