import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { auth } from '@/auth'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'banners')

export async function POST(request: Request) {
  const session = await auth()
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user?.role ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file')

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Tipe file tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.' },
      { status: 400 }
    )
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'Ukuran file maksimal 5 MB.' },
      { status: 400 }
    )
  }

  // Pastikan direktori ada
  await fs.mkdir(UPLOAD_DIR, { recursive: true })

  // Derive extension from MIME type, not filename (prevents "malware.php.jpg" tricks)
  const EXT_MAP: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png':  'png',
    'image/webp': 'webp',
    'image/gif':  'gif',
  }
  const ext = EXT_MAP[file.type] ?? 'jpg'
  const safeName = `banner-${Date.now()}.${ext}`
  const filePath = path.join(UPLOAD_DIR, safeName)

  const buffer = Buffer.from(await file.arrayBuffer())
  const signatures: Record<string, number[]> = {
    'image/jpeg': [0xff, 0xd8, 0xff],
    'image/png': [0x89, 0x50, 0x4e, 0x47],
    'image/gif': [0x47, 0x49, 0x46, 0x38],
    'image/webp': [0x52, 0x49, 0x46, 0x46],
  }
  if (!signatures[file.type].every((byte, index) => buffer[index] === byte)) {
    return NextResponse.json({ error: 'Isi file tidak sesuai dengan tipe gambar.' }, { status: 400 })
  }
  await fs.writeFile(filePath, buffer)

  return NextResponse.json({ url: `/banners/${safeName}` })
}
