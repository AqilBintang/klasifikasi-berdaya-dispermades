export type FaqItem = {
  question: string
  answer: string
}

export type FaqCategory = {
  category: string
  items: FaqItem[]
}

export const FAQ_DATA: FaqCategory[] = [
  {
    category: 'Umum',
    items: [
      {
        question: 'Apa itu Klasifikasi Indeks Kecamatan Berdaya?',
        answer:
          'Klasifikasi Indeks Kecamatan Berdaya adalah sistem penilaian mandiri berbasis indikator yang mengukur kapasitas dan kinerja kecamatan dalam menjalankan program pemberdayaan masyarakat di Jawa Tengah. Setiap kecamatan dinilai dan diklasifikasikan ke dalam empat level: Rintisan, Berkembang, Maju, atau Berdaya.',
      },
      {
        question: 'Siapa saja yang bisa mengakses platform ini?',
        answer:
          'Platform ini terbuka untuk masyarakat umum yang ingin melihat data klasifikasi kecamatan di Jawa Tengah. Untuk mengisi self-assessment, hanya pihak kecamatan yang memiliki akun terdaftar yang dapat melakukannya.',
      },
      {
        question: 'Seberapa sering data klasifikasi diperbarui?',
        answer:
          'Data klasifikasi diperbarui setiap tahun seiring dengan siklus pengisian self-assessment oleh kecamatan. Data yang ditampilkan adalah data tervalidasi oleh tim teknis.',
      },
    ],
  },
  {
    category: 'Penilaian & Klasifikasi',
    items: [
      {
        question: 'Bagaimana cara kerja sistem penilaian?',
        answer:
          'Setiap kecamatan mengisi self-assessment secara mandiri berdasarkan indikator-indikator yang telah ditentukan. Jawaban kemudian divalidasi oleh tim teknis, dan skor tertimbang dihitung untuk menentukan level klasifikasi kecamatan tersebut.',
      },
      {
        question: 'Apa perbedaan antara keempat level klasifikasi?',
        answer:
          'Terdapat empat level: Rintisan (skor ≤ 14,41) — kecamatan yang baru memulai inisiatif pemberdayaan; Berkembang (skor ≤ 29,13) — sudah memiliki sistem dasar; Maju (skor ≤ 43,23) — sistem pemberdayaan berjalan terstruktur; Berdaya (skor ≥ 43,24) — mencapai tingkat pemberdayaan optimal dan dapat menjadi percontohan.',
      },
      {
        question: 'Apakah hasil klasifikasi bisa berubah setiap tahun?',
        answer:
          'Ya. Klasifikasi dihitung ulang setiap periode penilaian berdasarkan data self-assessment terbaru.',
      },
      {
        question: 'Siapa yang memvalidasi hasil penilaian?',
        answer:
          'Validasi dilakukan oleh tim teknis yang berwenang. Setiap jawaban self-assessment yang dikirimkan oleh kecamatan akan ditinjau dan dapat diberikan skor tervalidasi yang berbeda dari skor awal jika diperlukan.',
      },
    ],
  },
  {
    category: 'Data & Transparansi',
    items: [
      {
        question: 'Dari mana data klasifikasi yang ditampilkan berasal?',
        answer:
          'Data berasal dari self-assessment yang diisi langsung oleh pihak kecamatan, kemudian divalidasi oleh tim teknis. Hanya data yang telah tervalidasi yang ditampilkan kepada publik.',
      },
    ],
  },
]
