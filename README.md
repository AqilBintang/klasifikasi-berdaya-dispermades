# Klas Berdaya

Aplikasi dashboard untuk **klasifikasi indeks kecamatan berdaya** di Jawa Tengah. Digunakan oleh pihak kecamatan untuk mengisi self-assessment, dan oleh admin untuk memvalidasi, mengelola data, serta mengekspor hasil ke Excel.

## Fitur Utama

- **Landing page** — tampilan publik hasil klasifikasi kecamatan per kabupaten/kota
- **Dashboard kecamatan** — self-assessment per indikator, lihat statistik, dan riwayat pengisian
- **Dashboard admin** — validasi assessment, manajemen user, kelola rubrik penilaian, backup/export Excel
- **Dashboard validator** — validasi assessment yang disubmit kecamatan
- **Autentikasi berbasis role** — `super_admin`, `admin`, `validator`, `kecamatan`, dan akses publik (landing)
- **Export data** — download rekapitulasi ke `.xlsx` (per kecamatan, rekap status akhir, snapshot penuh)

## Tech Stack

| Kategori | Library/Tool |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| Auth | NextAuth v5 (beta) |
| Database | MySQL + Prisma v6 |
| Chart | Recharts |
| Export | xlsx |
| Validasi | Zod v4 |

## Struktur Project

```
src/
├── app/
│   ├── (admin)/admin/      # Halaman admin (assessment, validasi, user, backup, dll)
│   ├── (kecamatan)/        # Halaman kecamatan (dashboard, assessment, statistik)
│   ├── (validator)/        # Halaman validator (validasi assessment)
│   ├── (landing)/          # Halaman publik
│   ├── admin/login/        # Login khusus admin & validator
│   ├── kecamatan/login/    # Login kecamatan
│   └── api/                # API routes (assessment, rubric, users, export, wilayah)
├── components/
│   ├── admin/              # Komponen halaman admin
│   ├── kecamatan/          # Komponen halaman kecamatan
│   ├── landing/            # Komponen halaman publik
│   ├── shared/ui/          # Komponen UI reusable
│   └── ui/                 # shadcn/ui components
├── data/                   # Data statis
├── hooks/                  # Custom hooks
├── lib/                    # Utilities (prisma client, scoring, export, klasifikasi)
└── types/                  # TypeScript type definitions
db/
├── wilayah_jateng.sql              # Data kecamatan Jawa Tengah
└── wilayah_level_1_2_jateng.sql    # Data provinsi & kabupaten/kota Jawa Tengah
prisma/
├── schema.prisma           # Database schema
├── seed.ts                 # Database seeder
└── migrations/             # Migration history
scripts/                    # Skrip utilitas (backfill, backup preview)
```

## Role & Akses

| Role | Login | Path | Keterangan |
|---|---|---|---|
| Super Admin | `/admin/login` | `/admin` | Semua akses termasuk manajemen admin |
| Admin | `/admin/login` | `/admin` | Validasi, manajemen user/rubrik, export |
| Validator | `/admin/login` | `/validator` | Validasi assessment kecamatan |
| Kecamatan | `/kecamatan/login` | `/kecamatan` | Self-assessment dan lihat statistik |
| Publik | — | `/` | Lihat hasil klasifikasi kecamatan |

---

## Setup & Menjalankan

### Prasyarat

- Node.js 20+
- MySQL 8+

### 1. Clone & Install

```bash
git clone https://github.com/AqilBintang/klasifikasi-berdaya-dispermades.git
cd klasifikasi-berdaya-dispermades
npm install
```

### 2. Buat Database MySQL

```sql
CREATE DATABASE klas_berdaya;
```

### 3. Konfigurasi Environment

Salin `.env.example` menjadi `.env` lalu isi nilainya:

```bash
cp .env.example .env
```

```env
# Koneksi database MySQL
DATABASE_URL="mysql://root:password@localhost:3306/klas_berdaya"

# URL aplikasi
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXTAUTH_URL="http://localhost:3000"

# Secret NextAuth — generate dengan: openssl rand -base64 32
NEXTAUTH_SECRET="isi_dengan_random_string_min_32_karakter"

# Akun Super Admin (dibuat saat db:seed)
SUPER_ADMIN_EMAIL="superadmin@example.com"
SUPER_ADMIN_PASSWORD="password_anda"

# Akun Admin (dibuat saat db:seed)
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="password_anda"
```

### 4. Generate Prisma Client

```bash
npm run db:generate
```

### 5. Jalankan Migrasi Database

```bash
npm run db:migrate
```

### 6. Seed Data Awal

```bash
npm run db:seed
```

Perintah ini akan:
- Membuat akun Super Admin dan Admin dari env vars
- Mengisi tabel wilayah dengan data provinsi, kabupaten/kota, dan kecamatan Jawa Tengah
- Meng-update referensi wilayah user yang sudah ada

### 7. Jalankan Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

---

## Reset Database (untuk testing)

Untuk menghapus semua data dan mulai dari awal:

```bash
# Hapus semua tabel dan buat ulang
npm run db:migrate -- --reset

# Seed ulang data awal
npm run db:seed
```

Atau via MySQL langsung:

```sql
DROP DATABASE klas_berdaya;
CREATE DATABASE klas_berdaya;
```

Lalu jalankan ulang langkah 5 dan 6.

---

## Build Production

```bash
npm run build
npm run start
```

---

## Scripts Tersedia

| Script | Keterangan |
|---|---|
| `npm run dev` | Jalankan development server |
| `npm run build` | Build untuk production |
| `npm run lint` | Jalankan ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Jalankan migrasi database |
| `npm run db:seed` | Seed data awal (admin, wilayah) |
| `npm run db:studio` | Buka Prisma Studio (GUI database) |
| `npm run backup:backfill` | Backfill data backup assessment |
