import { Announcement } from '@/types/announcement'

export const mockAnnouncements: Announcement[] = [
  {
    id: 'ann-001',
    title: 'Pendaftaran Program Digitalisasi Desa 2025 Dibuka!',
    content: `Kami dengan bangga mengumumkan bahwa pendaftaran Program Digitalisasi Desa 2025 resmi dibuka mulai hari ini. Program ini dirancang khusus untuk membantu masyarakat desa memanfaatkan teknologi digital dalam kehidupan sehari-hari dan kegiatan ekonomi.

Pendaftaran dapat dilakukan secara online melalui platform Klas Berdaya. Kuota terbatas untuk 100 peserta. Segera daftarkan diri Anda sebelum 31 Januari 2025!

Syarat dan ketentuan lengkap dapat dilihat di halaman program.`,
    summary:
      'Pendaftaran Program Digitalisasi Desa 2025 resmi dibuka! Kuota terbatas 100 peserta. Daftarkan diri Anda sebelum 31 Januari 2025.',
    category: 'Program',
    publishedAt: '2025-01-15T08:00:00Z',
    isImportant: true,
    authorName: 'Tim Klas Berdaya',
    tags: ['pendaftaran', 'digitalisasi', 'desa', 'program-baru'],
  },
  {
    id: 'ann-002',
    title: 'Beasiswa Penuh untuk Program Leadership Academy',
    content: `Kabar gembira! Klas Berdaya membuka beasiswa penuh untuk 10 peserta terpilih dalam Program Leadership Academy Jawa Tengah 2025. Beasiswa ini mencakup seluruh biaya program, akomodasi selama pelatihan luar kota, dan biaya perjalanan.

Kriteria penerima beasiswa:
- Usia 18–25 tahun
- Berdomisili di Jawa Tengah
- Aktif dalam kegiatan sosial/organisasi
- Memiliki motivasi kuat untuk berkontribusi bagi masyarakat

Ajukan lamaran beasiswa Anda sebelum 20 Januari 2025.`,
    summary:
      'Beasiswa penuh untuk 10 peserta terpilih di Program Leadership Academy Jawa Tengah 2025. Ajukan lamaran sebelum 20 Januari 2025.',
    category: 'Beasiswa',
    publishedAt: '2025-01-10T09:00:00Z',
    isImportant: true,
    authorName: 'Tim Klas Berdaya',
    tags: ['beasiswa', 'kepemimpinan', 'pemuda'],
  },
  {
    id: 'ann-003',
    title: 'Update: Jadwal Workshop Next.js Dipindahkan',
    content: `Kami ingin menginformasikan bahwa jadwal Workshop Pembuatan Website dengan Next.js yang semula dijadwalkan pada 10 Februari 2025 telah dipindahkan menjadi 15 Februari 2025. Perubahan ini dilakukan untuk mengakomodasi jadwal narasumber.

Bagi peserta yang sudah mendaftar, perubahan ini tidak mempengaruhi status pendaftaran Anda. Link Zoom yang sama tetap berlaku.

Mohon maaf atas ketidaknyamanan yang ditimbulkan.`,
    summary:
      'Jadwal Workshop Next.js dipindahkan dari 10 Februari menjadi 15 Februari 2025. Peserta yang sudah mendaftar tidak perlu mendaftar ulang.',
    category: 'Kegiatan',
    publishedAt: '2025-01-20T10:30:00Z',
    isImportant: false,
    authorName: 'Tim Klas Berdaya',
    tags: ['perubahan-jadwal', 'workshop', 'next-js'],
  },
  {
    id: 'ann-004',
    title: 'Pemeliharaan Sistem Platform Klas Berdaya',
    content: `Kami akan melakukan pemeliharaan sistem terjadwal pada platform Klas Berdaya pada:

Tanggal: Minggu, 26 Januari 2025
Waktu: 02.00 – 06.00 WIB

Selama pemeliharaan berlangsung, platform tidak dapat diakses. Semua data dan progres Anda aman dan tidak akan terpengaruh.

Kami mohon maaf atas gangguan ini dan mengucapkan terima kasih atas pengertian Anda.`,
    summary:
      'Pemeliharaan sistem terjadwal pada 26 Januari 2025, pukul 02.00–06.00 WIB. Platform tidak dapat diakses selama periode tersebut.',
    category: 'Penting',
    publishedAt: '2025-01-22T14:00:00Z',
    isImportant: true,
    authorName: 'Tim Teknis Klas Berdaya',
    tags: ['maintenance', 'sistem', 'gangguan'],
  },
  {
    id: 'ann-005',
    title: 'Selamat Datang di Klas Berdaya 2025!',
    content: `Tahun baru, semangat baru! Klas Berdaya dengan bangga menyambut seluruh anggota dan calon anggota di tahun 2025.

Tahun ini kami hadir dengan lebih banyak program, lebih banyak kegiatan, dan lebih banyak kesempatan untuk Anda berkembang. Kami berkomitmen untuk terus menghadirkan program-program berkualitas yang relevan dengan kebutuhan pemuda Indonesia.

Nantikan berbagai program dan kegiatan menarik yang akan segera kami luncurkan. Tetap semangat dan terus berkarya!`,
    summary:
      'Sambutan tahun baru 2025 dari Klas Berdaya. Nantikan berbagai program dan kegiatan menarik yang akan segera diluncurkan tahun ini.',
    category: 'Umum',
    publishedAt: '2025-01-01T00:00:00Z',
    isImportant: false,
    authorName: 'Direktur Klas Berdaya',
    tags: ['tahun-baru', 'sambutan', '2025'],
  },
  {
    id: 'ann-006',
    title: 'Rekrutmen Relawan Mentor Program 2025',
    content: `Klas Berdaya membuka pendaftaran relawan mentor untuk mendampingi peserta program selama tahun 2025. Kami mencari individu berpengalaman di bidang teknologi, kepemimpinan, wirausaha, seni budaya, lingkungan, dan kesehatan.

Komitmen: 4 jam per bulan selama 6 bulan
Benefit: sertifikat, jaringan profesional, dan kepuasan membantu sesama

Daftarkan diri Anda melalui formulir di platform atau hubungi kami di volunteer@klasberdaya.id`,
    summary:
      'Klas Berdaya membuka rekrutmen relawan mentor untuk program 2025. Komitmen 4 jam/bulan selama 6 bulan. Daftar sekarang!',
    category: 'Program',
    publishedAt: '2025-01-18T08:00:00Z',
    isImportant: false,
    authorName: 'Tim Klas Berdaya',
    tags: ['relawan', 'mentor', 'rekrutmen'],
  },
]

/**
 * Mengembalikan N pengumuman terbaru berdasarkan publishedAt (terbaru duluan)
 */
export const getRecentAnnouncements = (n = 3): Announcement[] =>
  [...mockAnnouncements]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, n)
