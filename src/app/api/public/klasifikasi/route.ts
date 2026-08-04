import { NextResponse } from 'next/server'
import { getKlasifikasiKecamatanAggPerYear } from '@/lib/klasifikasi/aggregation'
import { getKabKotaJateng, getKecamatanMapJateng } from '@/lib/wilayah/jateng'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const kabKotaKode = searchParams.get('kabKotaKode')?.trim() || null
    const kecamatanKode = searchParams.get('kecamatanKode')?.trim() || null

    const [kabKota, kecamatanByKabKota] = await Promise.all([getKabKotaJateng(), getKecamatanMapJateng()])

    let label = 'Jawa Tengah'
    let kabupatenId: number | undefined
    let kecamatanId: number | undefined

    if (kabKotaKode) {
      const kab = kabKota.find((k) => k.kode === kabKotaKode)
      if (!kab) return NextResponse.json({ error: 'Kabupaten/kota tidak ditemukan.' }, { status: 400 })

      label = kab.nama

      // Resolve ke DB id
      const wilayah = await prisma.wilayah.findFirst({
        where: { kode: kabKotaKode, level: 2 },
        select: { id: true },
      })
      if (wilayah) kabupatenId = wilayah.id
    }

    if (kecamatanKode) {
      const kodeKabKota = kecamatanKode.slice(0, 5)
      const list = kecamatanByKabKota[kodeKabKota] ?? []
      const kec = list.find((k) => k.kode === kecamatanKode)
      if (!kec) return NextResponse.json({ error: 'Kecamatan tidak ditemukan.' }, { status: 400 })

      label = kabupatenId ? `${label} › ${kec.nama}` : kec.nama

      // Resolve ke DB id
      const wilayah = await prisma.wilayah.findFirst({
        where: { kode: kecamatanKode, level: 3 },
        select: { id: true },
      })
      if (wilayah) kecamatanId = wilayah.id
    }

    const data = await getKlasifikasiKecamatanAggPerYear({ kabupatenId, kecamatanId })
    return NextResponse.json({ data: { ...data, label } })
  } catch (err) {
    console.error('[GET /api/public/klasifikasi]', err)
    return NextResponse.json({ error: 'Gagal memuat statistik klasifikasi.' }, { status: 500 })
  }
}
