# Klas Berdaya

Aplikasi dashboard untuk **klasifikasi indeks desa berdaya** di Jawa Tengah. Digunakan oleh pihak kecamatan untuk mengisi self-assessment, dan oleh admin untuk memvalidasi, mengelola data, serta mengekspor hasil ke Excel.

## Fitur Utama

- **Landing page** — tampilan publik hasil klasifikasi desa per kabupaten/kota
- **Dashboard kecamatan** — self-assessment per indikator, lihat statistik, dan riwayat pengisian
- **Dashboard admin** — validasi assessment, manajemen user, kelola rubrik penilaian, backup/export Excel
- **Autentikasi berbasis role** — `admin`, `kecamatan`, dan akses publik (landing)
- **Export data** — download rekapitulasi ke `.xlsx` (per kecamatan, rekap status akhir, snapshot penuh)

## Tech Stack

| Kategori | Library/Tool |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| Auth | NextAuth v5 (beta) |
| Database | PostgreSQL + Prisma v6 |
| Chart | Recharts |
| Export | xlsx |
| Validasi | Zod v4 |

## Struktur Project

```
src/
├── app/
│   ├── (admin)/admin/      # Halaman admin (assessment, validasi, user, backup, dll)
│   ├── (kecamatan)/        # Halaman kecamatan (dashboard, assessment, statistik)
│   ├── (landing)/          # Halaman publik
│   ├── admin/login/        # Login khusus admin
│   ├── login/              # Login kecamatan
│   └── api/                # API routes (assessment, rubric, users, export, wilayah)
├── components/
│   ├── admin/              # Komponen halaman admin
│   ├── kecamatan/          # Komponen halaman kecamatan
│   ├── landing/            # Komponen halaman publik
│   ├── shared/ui/          # Komponen UI reusable (YearFilter, dll)
│   └── ui/                 # shadcn/ui components
├── data/                   # Data statis (wilayah Jateng, mock data)
├── hooks/                  # Custom hooks (useAutoSave, useUnsavedWarning)
├── lib/                    # Utilities (prisma client, excel, scoring, export, klasifikasi)
└── types/                  # TypeScript type definitions
prisma/
├── schema.prisma           # Database schema
├── seed.ts                 # Database seeder
└── migrations/             # Migration history
scripts/                    # Skrip utilitas (backfill, backup preview)
```

## Setup & Menjalankan

### Prasyarat

- Node.js 20+
- PostgreSQL

### Instalasi

```bash
npm install
```

### Konfigurasi Environment

Buat file `.env` dari contoh berikut:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/klas-berdaya"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

### Database

```bash
# Generate Prisma client
npm run db:generate

# Jalankan migrasi
npm run db:migrate

# Seed data awal (opsional)
npm run db:seed
```

### Development

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

### Build Production

```bash
npm run build
npm run start
```

## Scripts Tersedia

| Script | Keterangan |
|---|---|
| `npm run dev` | Jalankan development server |
| `npm run build` | Build untuk production |
| `npm run lint` | Jalankan ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Jalankan migrasi database |
| `npm run db:seed` | Seed data awal |
| `npm run db:studio` | Buka Prisma Studio |
| `npm run backup:backfill` | Backfill data backup assessment |

## Role & Akses

| Role | Path | Keterangan |
|---|---|---|
| Admin | `/admin` | Validasi, manajemen user/rubrik, export |
| Kecamatan | `/kecamatan` | Self-assessment dan lihat statistik |
| Publik | `/` | Lihat hasil klasifikasi desa |
