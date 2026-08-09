import { NextRequest, NextResponse } from 'next/server'
import { getKecamatanByKabKotaJateng } from '@/lib/wilayah/jateng'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ kode: string }> }) {
  try {
    const { kode } = await ctx.params
    const data = await getKecamatanByKabKotaJateng(kode)
    return NextResponse.json({ data })
  } catch (err) {
    console.error('[GET /api/wilayah/jateng/kabkota/[kode]/kecamatan]', err)
    return NextResponse.json({ error: 'Gagal memuat data kecamatan.' }, { status: 500 })
  }
}

