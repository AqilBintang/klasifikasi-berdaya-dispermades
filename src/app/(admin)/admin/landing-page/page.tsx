import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { LandingPageClient } from '@/components/admin/LandingPageClient'
import { prisma } from '@/lib/prisma'

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
}

async function getLandingPageData() {
  const [bannerRow, tentangRow] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { key: 'landing_banner' } }),
    prisma.siteSetting.findUnique({ where: { key: 'landing_tentang_platform' } }),
  ])
  return {
    banner: (bannerRow?.value ?? DEFAULT_BANNER) as typeof DEFAULT_BANNER,
    tentangPlatform: (tentangRow?.value ?? DEFAULT_TENTANG) as typeof DEFAULT_TENTANG,
  }
}

export default async function AdminLandingPage() {
  const session = await auth()
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/admin')
  }

  const data = await getLandingPageData()
  return <LandingPageClient initialData={data} />
}
