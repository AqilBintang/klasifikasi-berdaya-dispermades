import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Admin user ──────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@1234', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@klasberdaya.id' },
    update: {},
    create: {
      name: 'Administrator',
      email: 'admin@klasberdaya.id',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  })

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

  console.log('✅ Seeding selesai.')
  console.log('   - Admin: admin@klasberdaya.id / Admin@1234')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
