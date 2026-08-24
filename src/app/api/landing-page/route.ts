import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

const DEFAULT_BANNER = {
  slides: [
    { id: 'banner-1', imageUrl: '', alt: 'Banner 1' },
    { id: 'banner-2', imageUrl: '', alt: 'Banner 2' },
    { id: 'banner-3', imageUrl: '', alt: 'Banner 3' },
  ],
}
const DEFAULT_TENTANG = {
  heading: 'Apa itu Klasifikasi Berdaya?',
  description:
    'Klasifikasi Kecamatan Berdaya adalah sistem penilaian mandiri berbasis indikator yang mengukur kapasitas dan kinerja kecamatan dalam menjalankan program pemberdayaan masyarakat di Jawa Tengah.',
  points: [
    'Penilaian dilakukan oleh kecamatan secara mandiri melalui self-assessment',
    'Setiap indikator divalidasi oleh tim admin untuk menjamin akurasi data',
    'Hasil klasifikasi dipublikasikan secara transparan kepada masyarakat',
    'Data digunakan sebagai dasar pengambilan kebijakan pemberdayaan wilayah',
  ],
  imageUrl: '',
}

export async function GET() {
  try {
    const [bannerRow, tentangRow] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: 'landing_banner' } }),
      prisma.siteSetting.findUnique({ where: { key: 'landing_tentang_platform' } }),
    ])
    return NextResponse.json({
      banner: bannerRow?.value ?? DEFAULT_BANNER,
      tentangPlatform: tentangRow?.value ?? DEFAULT_TENTANG,
    })
  } catch {
    return NextResponse.json({ error: 'Gagal membaca data' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user?.role ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Hanya update key yang dikirim
    const ops: Promise<unknown>[] = []

    if (body.banner !== undefined) {
      ops.push(
        prisma.siteSetting.upsert({
          where: { key: 'landing_banner' },
          update: { value: body.banner },
          create: { key: 'landing_banner', value: body.banner },
        })
      )
    }

    if (body.tentangPlatform !== undefined) {
      ops.push(
        prisma.siteSetting.upsert({
          where: { key: 'landing_tentang_platform' },
          update: { value: body.tentangPlatform },
          create: { key: 'landing_tentang_platform', value: body.tentangPlatform },
        })
      )
    }

    await Promise.all(ops)

    // Bust cache landing page supaya perubahan langsung tampil
    revalidatePath('/')

    // Kembalikan data terbaru
    const [bannerRow, tentangRow] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: 'landing_banner' } }),
      prisma.siteSetting.findUnique({ where: { key: 'landing_tentang_platform' } }),
    ])
    return NextResponse.json({
      banner: bannerRow?.value ?? DEFAULT_BANNER,
      tentangPlatform: tentangRow?.value ?? DEFAULT_TENTANG,
    })
  } catch {
    return NextResponse.json({ error: 'Gagal menyimpan data' }, { status: 500 })
  }
}
