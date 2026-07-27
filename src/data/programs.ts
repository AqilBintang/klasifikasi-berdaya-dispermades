import { Program } from '@/types/program'

export const mockPrograms: Program[] = [
  {
    id: 'prog-001',
    title: 'Program Digitalisasi Desa 2025',
    description:
      'Program peningkatan kapasitas digital untuk masyarakat desa, mencakup pelatihan penggunaan teknologi informasi dan komunikasi untuk mendukung kegiatan ekonomi lokal.',
    category: 'Teknologi',
    status: 'active',
    startDate: '2025-01-15',
    endDate: '2025-06-30',
    registrationDeadline: '2025-01-31',
    maxParticipants: 100,
    currentParticipants: 68,
    organizerName: 'Klas Berdaya',
    tags: ['digital', 'desa', 'teknologi', 'ikt'],
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'prog-002',
    title: 'Leadership Academy Jawa Tengah',
    description:
      'Program pengembangan kepemimpinan bagi pemuda usia 18–30 tahun di seluruh Jawa Tengah. Peserta akan mendapatkan pelatihan soft skill, mentoring, dan exposure ke dunia profesional.',
    category: 'Kepemimpinan',
    status: 'active',
    startDate: '2025-02-01',
    endDate: '2025-07-31',
    registrationDeadline: '2025-02-15',
    maxParticipants: 50,
    currentParticipants: 42,
    organizerName: 'Klas Berdaya',
    tags: ['kepemimpinan', 'pemuda', 'soft-skill'],
    createdAt: '2025-01-10T00:00:00Z',
  },
  {
    id: 'prog-003',
    title: 'Inkubasi Wirausaha Muda 2025',
    description:
      'Program inkubasi bisnis untuk wirausaha muda yang ingin mengembangkan ide bisnis mereka. Tersedia pendampingan dari mentor berpengalaman dan akses ke jaringan investor.',
    category: 'Kewirausahaan',
    status: 'upcoming',
    startDate: '2025-04-01',
    endDate: '2025-09-30',
    registrationDeadline: '2025-03-20',
    maxParticipants: 30,
    currentParticipants: 12,
    organizerName: 'Klas Berdaya',
    tags: ['wirausaha', 'bisnis', 'inkubasi', 'startup'],
    createdAt: '2025-01-20T00:00:00Z',
  },
  {
    id: 'prog-004',
    title: 'Pelestarian Seni Batik Nusantara',
    description:
      'Program pelestarian dan pengembangan seni batik tradisional yang menggabungkan teknik klasik dengan sentuhan modern. Peserta belajar langsung dari pengrajin batik berpengalaman.',
    category: 'Seni & Budaya',
    status: 'completed',
    startDate: '2024-08-01',
    endDate: '2024-12-31',
    maxParticipants: 40,
    currentParticipants: 40,
    organizerName: 'Klas Berdaya',
    tags: ['batik', 'seni', 'budaya', 'nusantara'],
    createdAt: '2024-07-15T00:00:00Z',
  },
  {
    id: 'prog-005',
    title: 'Lingkungan Hijau: Urban Farming',
    description:
      'Program pemberdayaan masyarakat perkotaan melalui pertanian urban. Peserta belajar teknik bercocok tanam di lahan terbatas, pengelolaan kompos, dan pemasaran produk organik.',
    category: 'Lingkungan',
    status: 'active',
    startDate: '2025-01-20',
    endDate: '2025-05-31',
    registrationDeadline: '2025-02-05',
    maxParticipants: 60,
    currentParticipants: 35,
    organizerName: 'Klas Berdaya',
    tags: ['lingkungan', 'pertanian', 'urban', 'organik'],
    createdAt: '2025-01-05T00:00:00Z',
  },
  {
    id: 'prog-006',
    title: 'Kesehatan Mental Remaja Indonesia',
    description:
      'Program edukasi dan pendampingan kesehatan mental khusus remaja. Tersedia sesi konseling, workshop manajemen stres, dan komunitas dukungan sebaya.',
    category: 'Kesehatan',
    status: 'upcoming',
    startDate: '2025-05-01',
    endDate: '2025-10-31',
    registrationDeadline: '2025-04-20',
    maxParticipants: 80,
    currentParticipants: 5,
    organizerName: 'Klas Berdaya',
    tags: ['kesehatan', 'mental', 'remaja', 'konseling'],
    createdAt: '2025-01-25T00:00:00Z',
  },
]

/**
 * Mengembalikan N program terbaru berdasarkan createdAt (terbaru duluan)
 */
export const getRecentPrograms = (n = 3): Program[] =>
  [...mockPrograms]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, n)
