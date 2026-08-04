import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { auth } from '@/auth'

const DATA_PATH = path.join(process.cwd(), 'src/data/landing-page.json')

async function readData() {
  const raw = await fs.readFile(DATA_PATH, 'utf-8')
  return JSON.parse(raw)
}

export async function GET() {
  try {
    const data = await readData()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Gagal membaca data' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const current = await readData()

    // Merge partial update — hanya bagian yang dikirim
    const updated = {
      banner: body.banner ?? current.banner,
      tentangPlatform: body.tentangPlatform ?? current.tentangPlatform,
    }

    await fs.writeFile(DATA_PATH, JSON.stringify(updated, null, 2), 'utf-8')
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Gagal menyimpan data' }, { status: 500 })
  }
}
