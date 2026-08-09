import { NextResponse } from 'next/server'
import { getKabKotaJateng } from '@/lib/wilayah/jateng'

export async function GET() {
  try {
    const data = await getKabKotaJateng()
    return NextResponse.json({ data })
  } catch (err) {
    console.error('[GET /api/wilayah/jateng/kabkota]', err)
    return NextResponse.json({ error: 'Gagal memuat data kabupaten/kota Jawa Tengah.' }, { status: 500 })
  }
}

