'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type ExportOptions = {
  periodes: string[]
  kecamatans: string[]
  default: { periode: string | null; kecamatan: string | null }
}

export function BackupExportClient(props: { role: string | null; defaultKecamatan: string | null }) {
  const [options, setOptions] = useState<ExportOptions>({
    periodes: [],
    kecamatans: [],
    default: { periode: null, kecamatan: null },
  })
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [periode, setPeriode] = useState('')
  const [kecamatan, setKecamatan] = useState(props.defaultKecamatan ?? '')

  const urls = useMemo(() => {
    const p1 = new URLSearchParams()
    if (periode.trim()) p1.set('periode', periode.trim())
    if (kecamatan.trim()) p1.set('kecamatan', kecamatan.trim())

    const rekapParams = new URLSearchParams()
    if (periode.trim()) rekapParams.set('periode', periode.trim())

    return {
      snapshot: `/api/export/backup/snapshot?${p1.toString()}`,
      rekap: `/api/export/backup/rekap-status-akhir?${rekapParams.toString()}`,
    }
  }, [periode, kecamatan])

  useEffect(() => {
    let cancelled = false
    setLoadingOptions(true)

    fetch('/api/export/options', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Gagal memuat opsi'))))
      .then((json) => {
        if (cancelled) return
        const data = (json?.data ?? {}) as ExportOptions
        setOptions(data)
        setPeriode((p) => p || data.default.periode || '')
        setKecamatan((k) => k || props.defaultKecamatan || data.default.kecamatan || '')
      })
      .catch(() => {
        if (cancelled) return
        setOptions({ periodes: [], kecamatans: [], default: { periode: null, kecamatan: props.defaultKecamatan ?? null } })
      })
      .finally(() => {
        if (cancelled) return
        setLoadingOptions(false)
      })

    return () => { cancelled = true }
  }, [props.defaultKecamatan])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Backup & Export</h2>
        <p className="text-sm text-gray-600 mt-1">Export Excel dibuat multi-sheet dan kolom diatur agar mudah dibaca.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Export</CardTitle>
          <CardDescription>Pilih periode dan kecamatan agar export tetap lengkap tapi tidak terlalu besar.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <div className="text-sm font-medium text-gray-700">Periode</div>
            <select
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              disabled={loadingOptions}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200 disabled:opacity-60"
            >
              <option value="" disabled>Pilih Periode</option>
              {options.periodes.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <div className="text-sm font-medium text-gray-700">Kecamatan</div>
            <select
              value={kecamatan}
              onChange={(e) => setKecamatan(e.target.value)}
              disabled={loadingOptions || props.role === 'USER'}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200 disabled:opacity-60"
            >
              <option value="" disabled>Pilih Kecamatan</option>
              {options.kecamatans.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </label>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setPeriode(options.default.periode ?? '')
              setKecamatan(props.defaultKecamatan ?? options.default.kecamatan ?? '')
            }}
          >
            Reset
          </Button>
        </CardFooter>
      </Card>

      <div className="text-xs text-gray-600">{loadingOptions ? 'Memuat opsi periode & kecamatan…' : null}</div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Backup Data Lengkap</CardTitle>
            <CardDescription>Judul assessment, kategori, indikator, deskripsi, skor, dokumen, total & klasifikasi.</CardDescription>
          </CardHeader>
          <CardFooter className="justify-end">
            <a
              href={periode && kecamatan ? urls.snapshot : undefined}
              aria-disabled={!periode || !kecamatan}
              className={cn(
                buttonVariants({ variant: 'default', size: 'default' }),
                (!periode || !kecamatan) && 'pointer-events-none opacity-50'
              )}
            >
              Download
            </a>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rekap Status Akhir</CardTitle>
            <CardDescription>Semua kecamatan dalam periode terpilih, dikelompokkan per kabupaten/kota dalam sheet terpisah.</CardDescription>
          </CardHeader>
          <CardFooter className="justify-end">
            <a
              href={props.role === 'ADMIN' && periode ? urls.rekap : undefined}
              aria-disabled={props.role !== 'ADMIN' || !periode}
              className={cn(
                buttonVariants({ variant: 'default', size: 'default' }),
                (props.role !== 'ADMIN' || !periode) && 'pointer-events-none opacity-50'
              )}
            >
              Download
            </a>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

