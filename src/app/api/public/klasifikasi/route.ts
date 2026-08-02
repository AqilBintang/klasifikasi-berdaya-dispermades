import { NextResponse } from 'next/server'
import { getKlasifikasiKecamatanAggPerYear } from '@/lib/klasifikasi/aggregation'
import { getKabKotaJateng, getKecamatanMapJateng } from '@/lib/wilayah/jateng'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const kabKotaKode = searchParams.get('kabKotaKode')?.trim() || null
    const kecamatanKode = searchParams.get('kecamatanKode')?.trim() || null

    const [kabKota, kecamatanByKabKota] = await Promise.all([getKabKotaJateng(), getKecamatanMapJateng()])

    let kabupaten: string | undefined
    let kecamatan: string | undefined
    let label = 'Jawa Tengah'

    if (kabKotaKode) {
      const kab = kabKota.find((k) => k.kode === kabKotaKode)
      if (!kab) return NextResponse.json({ error: 'Kabupaten/kota tidak ditemukan.' }, { status: 400 })
      kabupaten = kab.nama
      label = kab.nama
    }

    if (kecamatanKode) {
      const kodeKabKota = kecamatanKode.slice(0, 5)
      const list = kecamatanByKabKota[kodeKabKota] ?? []
      const kec = list.find((k) => k.kode === kecamatanKode)
      if (!kec) return NextResponse.json({ error: 'Kecamatan tidak ditemukan.' }, { status: 400 })
      kecamatan = kec.nama
      label = kabupaten ? `${kabupaten} • ${kec.nama}` : kec.nama
    }

    const data = await getKlasifikasiKecamatanAggPerYear({ kabupaten, kecamatan })
    return NextResponse.json({ data: { ...data, label } })
  } catch (err) {
    console.error('[GET /api/public/klasifikasi]', err)
    return NextResponse.json({ error: 'Gagal memuat statistik klasifikasi.' }, { status: 500 })
  }
}
