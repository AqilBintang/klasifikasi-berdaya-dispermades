import { getKabKotaJateng, getKecamatanMapJateng } from '@/lib/wilayah/jateng'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default async function AdminWilayahPage() {
  const [kabKota, kecamatanByKabKota] = await Promise.all([getKabKotaJateng(), getKecamatanMapJateng()])
  const totalKecamatan = Object.values(kecamatanByKabKota).reduce((acc, list) => acc + (list?.length ?? 0), 0)
  const kabKotaTanpaKecamatan = kabKota.filter((k) => (kecamatanByKabKota[k.kode] ?? []).length === 0)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Wilayah Jawa Tengah</CardTitle>
          <CardDescription>
            <div className="space-y-1">
              <div>Peta wilayah dipindahkan ke landing page agar bisa diakses publik.</div>
              <div className="text-xs text-muted-foreground">
                Kab/Kota: {kabKota.length.toLocaleString('id-ID')} • Kecamatan: {totalKecamatan.toLocaleString('id-ID')}
              </div>
              {kabKotaTanpaKecamatan.length > 0 && (
                <div className="text-xs text-red-600">
                  Kab/Kota tanpa kecamatan: {kabKotaTanpaKecamatan.map((k) => k.nama).join(', ')}
                </div>
              )}
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link className={cn(buttonVariants({ variant: 'default' }))} href="/home">
            Buka Peta di Landing Page
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
