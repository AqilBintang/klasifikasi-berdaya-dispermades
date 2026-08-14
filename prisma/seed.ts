import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Super Admin user ────────────────────────────────────────
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD

  if (!superAdminEmail || !superAdminPassword) {
    throw new Error(
      '❌ SUPER_ADMIN_EMAIL dan SUPER_ADMIN_PASSWORD harus diset di environment variables. ' +
      'Jangan gunakan password default untuk production.'
    )
  }

  const superAdminPasswordHash = await bcrypt.hash(superAdminPassword, 12)

  await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {}, // Jangan overwrite akun SUPER_ADMIN yang sudah ada
    create: {
      name: 'Super Administrator',
      email: superAdminEmail,
      passwordHash: superAdminPasswordHash,
      role: 'SUPER_ADMIN',
    },
  })
  console.log(`   - Super Admin: ${superAdminEmail}`)

  // ── Admin user ──────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    throw new Error(
      '❌ ADMIN_EMAIL dan ADMIN_PASSWORD harus diset di environment variables. ' +
      'Jangan gunakan password default untuk production.'
    )
  }

  const adminPasswordHash = await bcrypt.hash(adminPassword, 12)

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Administrator',
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
  })
  console.log(`   - Admin: ${adminEmail}`)

  // ── Assessment template awal ────────────────────────────────
  // Cek apakah sudah ada assessment dengan judul ini
  const existing = await prisma.assessment.findFirst({
    where: { title: 'Self Assessment Desa 2025' },
  })

  if (!existing) {
    await prisma.assessment.create({
      data: {
        title: 'Self Assessment Desa 2025',
        description: 'Template penilaian mandiri desa tahun 2025',
        periode: '2025',
        status: 'PUBLISHED',
        categories: {
          create: [
            {
              code: 'A',
              name: 'Program Prioritas Rumah Perlindungan Perempuan dan Anak',
              order: 0,
              indicators: {
                create: [
                  { number: 1, indicator: 'Tersedia anggaran untuk program perlindungan perempuan dan anak dalam APBDes', maxScore: 4 },
                  { number: 2, indicator: 'Terbentuk Satuan Tugas (Satgas) Perlindungan Perempuan dan Anak di desa', maxScore: 4 },
                  { number: 3, indicator: 'Tersedia ruang/fasilitas layanan konsultasi bagi perempuan dan anak', maxScore: 4 },
                  { number: 4, indicator: 'Terlaksana sosialisasi pencegahan kekerasan terhadap perempuan dan anak', maxScore: 4 },
                  { number: 5, indicator: 'Tersedia mekanisme pelaporan kasus kekerasan yang mudah diakses masyarakat', maxScore: 4 },
                ],
              },
            },
          ],
        },
      },
    })
  }

  // ── Wilayah Jawa Tengah ─────────────────────────────────────
  console.log('🌾 Seeding Jawa Tengah wilayah data...')
  await seedWilayahJawaTengah()

  // ── Update users to use foreign keys ────────────────────────
  console.log('🔗 Updating user wilayah references...')
  await updateUserWilayahReferences()

  console.log('✅ Seeding selesai.')
}

async function seedWilayahJawaTengah() {
  const wilayahDir = path.join(process.cwd(), 'wilayah', 'db')
  const level12Path = path.join(wilayahDir, 'wilayah_level_1_2.sql')
  const wilayahPath = path.join(wilayahDir, 'wilayah.sql')

  // We'll collect all rows from both files that belong to Jawa Tengah (kode starts with '33')
  const rows: Array<{
    kode: string
    nama: string
    lat: number | null
    lng: number | null
    luas: number | null
    penduduk: number | null
    path: string | null
  }> = []

  // Function to extract the values array from a line like: ('33','Jakarta Pusat',...),
  function extractValuesFromLine(line: string) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('(')) return null
    // Find the last closing parenthesis
    const lastParenIdx = trimmed.lastIndexOf(')')
    if (lastParenIdx === -1) return null
    // Take from start to after the last ')'
    const withParen = trimmed.slice(0, lastParenIdx + 1)
    // Now withParen should start with '(' and end with ')'
    if (!withParen.startsWith('(') || !withParen.endsWith(')')) return null
    // Remove the outer parentheses
    const content = withParen.slice(1, -1)
    // Now parse the content as CSV respecting quotes
    return parseCsvLine(content)
  }

  // Function to parse a CSV line where fields may be quoted and may contain commas inside quotes
  function parseCsvLine(line: string) {
    const values: string[] = []
    let current = ''
    let inQuote = false
    let escapeNext = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (escapeNext) {
        current += ch
        escapeNext = false
        continue
      }
      if (ch === '\\\\') {
        escapeNext = true
        continue
      }
      if (ch === "'" && !escapeNext) {
        inQuote = !inQuote
        continue
      }
      if (ch === ',' && !inQuote) {
        values.push(current.trim())
        current = ''
        continue
      }
      current += ch
    }
    values.push(current.trim())
    return values
  }

  // Process a single file
  function processFile(filePath: string) {
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`)
      return
    }
    console.log(`Reading ${filePath}`)
    const data = fs.readFileSync(filePath, 'utf8')
    const lines = data.split('\n')
    let tupleCount = 0
    const truncated = (s: string, len: number) => s.length > len ? s.substring(0, len) + '...' : s
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('(')) continue
      // Remove trailing comma if present
      let lineToParse = trimmed
      if (lineToParse.endsWith(',')) {
        lineToParse = lineToParse.slice(0, -1)
      }
      // Now lineToParse should be like '(' ... ')'
      const values = extractValuesFromLine(lineToParse)
      if (!values) {
        console.log(`extractValuesFromLine returned null for line: ${truncated(trimmed, 100)}`)
        continue
      }
      tupleCount++
      if (tupleCount <= 10) {
        console.log(`Processing tuple line ${tupleCount}: ${truncated(trimmed, 100)}`)
      }

      // Determine which file we are processing to know the expected number of columns
      const isLevel12 = filePath.endsWith('wilayah_level_1_2.sql')
      const isWilayah = filePath.endsWith('wilayah.sql')

      if (isLevel12) {
        // Expect 11 columns: kode,nama,ibukota,lat,lng,elv,tz,luas,penduduk,path,status
        if (values.length >= 2) {
          const kode = values[0].replace(/'/g, '')
          if (kode.startsWith('33')) {
            // We only want Jawa Tengah
            const nama = values[1].replace(/'/g, '')
            // Helper to parse a nullable numeric field
            const parseNullable = (str: string | undefined): number | null => {
              if (!str) return null
              const v = str.replace(/'/g, '')
              if (v.toUpperCase() === 'NULL') return null
              const num = parseFloat(v)
              return isNaN(num) ? null : num
            }
            const lat = parseNullable(values[3])
            const lng = parseNullable(values[4])
            const luas = parseNullable(values[7])
            const penduduk = parseNullable(values[8])
            const pathVal = values[9] === 'NULL' ? null : values[9].replace(/'/g, '')
            rows.push({ kode, nama, lat, lng, luas, penduduk, path: pathVal })
            if (tupleCount <= 10) {
              console.log(`Found Jawa Tengah wilayah (level 1-2): kode=${kode}, nama=${nama}`)
            }
          }
        } else {
          console.log(`Unexpected number of columns (${values.length}) in level 1-2 tuple`)
        }
      } else if (isWilayah) {
        // Expect 2 columns: kode, nama
        if (values.length >= 2) {
          const kode = values[0].replace(/'/g, '')
          if (kode.startsWith('33')) {
            const nama = values[1].replace(/'/g, '')
            // The wilayah.sql table only has kode and nama, no lat/lng etc.
            rows.push({ kode, nama, lat: null, lng: null, luas: null, penduduk: null, path: null })
            if (tupleCount <= 10) {
              console.log(`Found Jawa Tengah wilayah (wilayah.sql): kode=${kode}, nama=${nama}`)
            }
          }
        } else {
          console.log(`Unexpected number of columns (${values.length}) in wilayah tuple`)
        }
      } else {
        console.log(`Unknown file: ${filePath}`)
      }
    }
    console.log(`Processed ${tupleCount} tuples for ${filePath}`)
  }

  // Process both files — level_1_2 first so its richer data takes priority on dedup
  processFile(level12Path)
  processFile(wilayahPath)

  // Deduplicate by kode: first occurrence wins (level_1_2 data has lat/lng/luas)
  const seen = new Set<string>()
  const uniqueRows = rows.filter(({ kode }) => {
    if (seen.has(kode)) return false
    seen.add(kode)
    return true
  })

  // Sort by kode length (parent before child), then lexicographic
  uniqueRows.sort((a, b) => {
    if (a.kode.length !== b.kode.length) return a.kode.length - b.kode.length
    return a.kode.localeCompare(b.kode, 'und')
  })

  // Delete existing Jawa Tengah wilayah to avoid duplicate key errors
  await prisma.wilayah.deleteMany({
    where: {
      kode: {
        startsWith: '33',
      },
    },
  })

  // We'll keep a map from kode to inserted id
  const kodeToId = new Map<string, number>()

  for (const { kode, nama, lat, lng, luas, penduduk, path } of rows) {
    // Determine level based on kode length (assuming format like 33, 33.01, 33.01.01)
    let level: number
    if (kode.length === 2) level = 1 // provinsi
    else if (kode.length === 5) level = 2 // kabupaten/kota
    else if (kode.length === 8) level = 3 // kecamatan
    else continue // skip other levels (desa, etc.)

    // Determine parentId: for level 1, null; else, parent kode is kode without the last 3 characters (dot + two digits)
    let parentId: number | null = null
    if (level > 1) {
      const parentKode = kode.slice(0, kode.length - 3) // remove last three characters (e.g., .01)
      const parentIdFromMap = kodeToId.get(parentKode)
      parentId = parentIdFromMap !== undefined ? parentIdFromMap : null
      if (parentId === null) {
        console.warn(`Parent kode ${parentKode} not found for kode ${kode}`)
      }
    }

    // Insert the wilayah
    const wilayah = await prisma.wilayah.create({
      data: {
        kode,
        nama,
        level,
        parentId,
        lat,
        lng,
        luas,
        penduduk,
        path,
        status: null, // we don't have status from the SQL, set to null
      },
    })

    kodeToId.set(kode, wilayah.id)
  }

  console.log(`   - Seeded ${kodeToId.size} wilayah entries for Jawa Tengah`)
}

async function updateUserWilayahReferences() {
  // Get all users that have kabupatenName or kecamatanName set (and are regular users)
  const users = await prisma.user.findMany({
    where: {
      role: 'USER',
      OR: [
        { kabupatenName: { not: null } },
        { kecamatanName: { not: null } },
      ],
    },
    select: {
      id: true,
      kabupatenName: true,
      kecamatanName: true,
    },
  })

  console.log(`   - Found ${users.length} users with wilayah names to update`)

  for (const user of users) {
    let kabupatenId: number | null = null
    let kecamatanId: number | null = null

    // Find kabupaten by name (level 2)
    if (user.kabupatenName) {
      const kabupaten = await prisma.wilayah.findFirst({
        where: {
          nama: user.kabupatenName,
          level: 2,
        },
      })
      kabupatenId = kabupaten?.id ?? null
    }

    // Find kecamatan by name (level 3) and optionally under the found kabupaten
    if (user.kecamatanName) {
      // First, try to find kecamatan under the kabupaten we just found (if any)
      let kecamatan: any | null = null
      if (kabupatenId) {
        kecamatan = await prisma.wilayah.findFirst({
          where: {
            nama: user.kecamatanName,
            level: 3,
            parentId: kabupatenId,
          },
        })
      }
      // If not found under that kabupaten, try any kecamatan with that name (level 3)
      if (!kecamatan) {
        kecamatan = await prisma.wilayah.findFirst({
          where: {
            nama: user.kecamatanName,
            level: 3,
          },
        })
      }
      kecamatanId = kecamatan?.id ?? null
    }

    // Update the user with the found IDs
    await prisma.user.update({
      where: { id: user.id },
      data: {
        kabupatenId: kabupatenId,
        kecamatanId: kecamatanId,
      },
    })
  }

  console.log('   - Updated user wilayah references')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())