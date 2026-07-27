import { Activity } from '@/types/activity'

export const mockActivities: Activity[] = [
  {
    id: 'act-001',
    title: 'Workshop Pembuatan Website dengan Next.js',
    programId: 'prog-001',
    programName: 'Program Digitalisasi Desa 2025',
    description:
      'Workshop intensif selama 3 jam untuk membangun website sederhana menggunakan Next.js dan Tailwind CSS. Cocok untuk pemula yang ingin memulai perjalanan di dunia web development.',
    date: '2025-02-15',
    startTime: '09:00',
    endTime: '12:00',
    mode: 'online',
    meetingUrl: 'https://zoom.us/j/example-001',
    registrationStatus: 'open',
    maxParticipants: 50,
    currentParticipants: 28,
    createdAt: '2025-01-10T00:00:00Z',
  },
  {
    id: 'act-002',
    title: 'Seminar Kepemimpinan: Visi dan Misi Pemimpin Muda',
    programId: 'prog-002',
    programName: 'Leadership Academy Jawa Tengah',
    description:
      'Seminar interaktif menghadirkan pembicara dari kalangan pemimpin muda inspiratif Indonesia. Peserta akan mendapatkan wawasan tentang bagaimana membangun visi kepemimpinan yang kuat.',
    date: '2025-02-20',
    startTime: '13:00',
    endTime: '17:00',
    mode: 'offline',
    location: 'Gedung Serba Guna Kota Semarang, Jl. Pemuda No. 10',
    registrationStatus: 'open',
    maxParticipants: 100,
    currentParticipants: 75,
    createdAt: '2025-01-12T00:00:00Z',
  },
  {
    id: 'act-003',
    title: 'Pelatihan Urban Farming: Teknik Hidroponik',
    programId: 'prog-005',
    programName: 'Lingkungan Hijau: Urban Farming',
    description:
      'Pelatihan langsung teknik bercocok tanam hidroponik di lahan terbatas. Peserta akan belajar membuat instalasi hidroponik sederhana dari bahan-bahan yang mudah didapat.',
    date: '2025-03-05',
    startTime: '08:00',
    endTime: '11:00',
    mode: 'offline',
    location: 'Taman Edukasi Botani, Jl. Sriwijaya No. 5, Semarang',
    registrationStatus: 'open',
    maxParticipants: 30,
    currentParticipants: 18,
    createdAt: '2025-01-15T00:00:00Z',
  },
  {
    id: 'act-004',
    title: 'Bootcamp Pitching Bisnis untuk Wirausaha Muda',
    programId: 'prog-003',
    programName: 'Inkubasi Wirausaha Muda 2025',
    description:
      'Bootcamp 2 hari untuk melatih kemampuan presentasi dan pitching bisnis di hadapan calon investor. Peserta akan mendapatkan feedback langsung dari mentor berpengalaman.',
    date: '2025-04-12',
    startTime: '09:00',
    endTime: '17:00',
    mode: 'hybrid',
    location: 'Co-working Space Berdaya, Jl. Gajah Mada No. 20, Semarang',
    meetingUrl: 'https://zoom.us/j/example-004',
    registrationStatus: 'open',
    maxParticipants: 30,
    currentParticipants: 10,
    createdAt: '2025-01-20T00:00:00Z',
  },
  {
    id: 'act-005',
    title: 'Webinar Kesehatan Mental: Mengelola Stres di Era Digital',
    programId: 'prog-006',
    programName: 'Kesehatan Mental Remaja Indonesia',
    description:
      'Webinar gratis membahas cara mengelola stres dan kecemasan di era media sosial. Narasumber adalah psikolog klinis berpengalaman yang akan memberikan tips praktis.',
    date: '2025-05-10',
    startTime: '15:00',
    endTime: '17:00',
    mode: 'online',
    meetingUrl: 'https://zoom.us/j/example-005',
    registrationStatus: 'open',
    maxParticipants: 200,
    currentParticipants: 45,
    createdAt: '2025-01-25T00:00:00Z',
  },
  {
    id: 'act-006',
    title: 'Sesi Mentoring: Digital Marketing untuk UMKM',
    programId: 'prog-001',
    programName: 'Program Digitalisasi Desa 2025',
    description:
      'Sesi mentoring kelompok kecil membahas strategi digital marketing yang efektif dan terjangkau untuk pelaku UMKM di daerah.',
    date: '2024-12-10',
    startTime: '10:00',
    endTime: '12:00',
    mode: 'online',
    meetingUrl: 'https://zoom.us/j/example-006',
    registrationStatus: 'closed',
    maxParticipants: 20,
    currentParticipants: 20,
    createdAt: '2024-11-20T00:00:00Z',
  },
  {
    id: 'act-007',
    title: 'Festival Batik: Pameran Karya Peserta',
    programId: 'prog-004',
    programName: 'Pelestarian Seni Batik Nusantara',
    description:
      'Pameran hasil karya batik peserta program selama 4 bulan. Terbuka untuk umum dan karya-karya terbaik akan dipamerkan di galeri seni daerah.',
    date: '2024-12-28',
    startTime: '09:00',
    endTime: '21:00',
    mode: 'offline',
    location: 'Galeri Seni Budaya Jawa Tengah, Jl. Sriwijaya No. 29, Semarang',
    registrationStatus: 'closed',
    maxParticipants: 500,
    currentParticipants: 320,
    createdAt: '2024-12-01T00:00:00Z',
  },
]

/**
 * Mengembalikan N kegiatan mendatang (date >= hari ini), diurutkan dari yang paling dekat
 */
export const getUpcomingActivities = (n = 3): Activity[] => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return [...mockActivities]
    .filter((a) => new Date(a.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, n)
}
