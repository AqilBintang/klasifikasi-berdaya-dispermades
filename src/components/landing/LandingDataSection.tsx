'use client'

import { useCallback } from 'react'
import {
  WilayahFilter,
  WilayahMap,
  useWilayahState,
} from '@/components/landing/WilayahJatengExplorer'
import {
  LandingDistribusiChart,
  LandingKecamatanChart,
  type DistribusiChartRow,
  type SkorPerTahunRow,
} from '@/components/landing/LandingDistribusiChart'
import type { KabKotaJateng, KecamatanJateng } from '@/types/wilayah'
import { useState } from 'react'

type Props = {
  kabKota: KabKotaJateng[]
  kecamatanByKabKota: Record<string, KecamatanJateng[]>
  initialChartData?: DistribusiChartRow[]
}

type DistribusiState =
  | { mode: 'distribusi'; status: 'loading' | 'error'; label: string }
  | { mode: 'distribusi'; status: 'ok'; label: string; data: DistribusiChartRow[] }

type KecamatanState =
  | { mode: 'kecamatan'; status: 'loading' | 'error'; label: string; kabupaten: string; kecamatan: string }
  | { mode: 'kecamatan'; status: 'ok'; label: string; kabupaten: string; kecamatan: string; data: SkorPerTahunRow[] }

type ChartState = DistribusiState | KecamatanState

export function LandingDataSection({ kabKota, kecamatanByKabKota, initialChartData }: Props) {
  const { state, setKabKota, setKecamatan } = useWilayahState(true)

  const [chart, setChart] = useState<ChartState>(() =>
    initialChartData != null
      ? { mode: 'distribusi', status: 'ok', label: 'Jawa Tengah', data: initialChartData }
      : { mode: 'distribusi', status: 'loading', label: 'Jawa Tengah' }
  )

  const fetchChart = useCallback((
    kabKotaKode: string | null,
    kecamatanKode: string,
    kabupatenNama: string,
    kecamatanNama: string,
  ) => {
    const params = new URLSearchParams()
    if (kabKotaKode) params.set('kabKotaKode', kabKotaKode)
    if (kecamatanKode) params.set('kecamatanKode', kecamatanKode)

    const isKecamatan = Boolean(kecamatanKode)
    const label = kecamatanNama
      ? `${kabupatenNama} › ${kecamatanNama}`
      : kabupatenNama || 'Jawa Tengah'

    if (isKecamatan) {
      setChart({ mode: 'kecamatan', status: 'loading', label, kabupaten: kabupatenNama, kecamatan: kecamatanNama })
    } else {
      setChart({ mode: 'distribusi', status: 'loading', label })
    }

    fetch(`/api/public/klasifikasi?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => {
        const d = json?.data
        const responseLabel = d?.label ?? label
        if (isKecamatan) {
          setChart({ mode: 'kecamatan', status: 'ok', label: responseLabel, kabupaten: kabupatenNama, kecamatan: kecamatanNama, data: d?.skorPerTahun ?? [] })
        } else {
          setChart({ mode: 'distribusi', status: 'ok', label: responseLabel, data: d?.chartData ?? [] })
        }
      })
      .catch(() => {
        if (isKecamatan) {
          setChart({ mode: 'kecamatan', status: 'error', label, kabupaten: kabupatenNama, kecamatan: kecamatanNama })
        } else {
          setChart({ mode: 'distribusi', status: 'error', label })
        }
      })
  }, [])

  const handleKabKota = (kode: string | null) => {
    setKabKota(kode)
    const kabObj = kabKota.find((k) => k.kode === kode)
    fetchChart(kode, '', kabObj?.nama ?? '', '')
  }

  const handleKecamatan = (kode: string) => {
    setKecamatan(kode)
    const kabObj = kabKota.find((k) => k.kode === state.selectedKabKotaKode)
    const kabupatenNama = kabObj?.nama ?? ''
    const kecList = state.selectedKabKotaKode ? (kecamatanByKabKota[state.selectedKabKotaKode] ?? []) : []
    const kecObj = kecList.find((k) => k.kode === kode)
    fetchChart(state.selectedKabKotaKode, kode, kabupatenNama, kecObj?.nama ?? '')
  }

  return (
    <div className="space-y-3">

      {/* ── Filter: full width ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
        <WilayahFilter
          kabKota={kabKota}
          kecamatanByKabKota={kecamatanByKabKota}
          state={state}
          allowAll
          onKabKotaChange={handleKabKota}
          onKecamatanChange={handleKecamatan}
        />
      </div>

      {/* ── Peta + Chart: satu card ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100 items-stretch">

          {/* Peta */}
          <div className="p-3">
            <WilayahMap
              kabKota={kabKota}
              kecamatanByKabKota={kecamatanByKabKota}
              state={state}
              onKabKotaChange={handleKabKota}
            />
          </div>

          {/* Chart */}
          <div className="p-4 flex flex-col justify-center">
            {/* Header */}
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {chart.mode === 'kecamatan' ? 'Hasil Klasifikasi' : 'Distribusi Klasifikasi'}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-gray-800 truncate">{chart.label}</p>
            </div>

            {/* Loading skeleton */}
            {chart.status === 'loading' && (
              <div className="flex flex-col gap-3 animate-pulse py-4">
                <div className="h-40 rounded-lg bg-gray-100" />
                <div className="h-3 w-40 rounded bg-gray-100" />
                <div className="h-3 w-32 rounded bg-gray-100" />
              </div>
            )}

            {/* Error */}
            {chart.status === 'error' && (
              <div className="flex flex-col items-center justify-center gap-1.5 py-10 rounded-xl bg-red-50">
                <span className="text-sm font-medium text-red-500">Gagal memuat data</span>
                <span className="text-xs text-red-400">Coba pilih wilayah lain</span>
              </div>
            )}

            {/* Empty */}
            {chart.status === 'ok' && chart.data.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-1.5 py-10 rounded-xl bg-gray-50">
                <span className="text-sm font-medium text-gray-500">Belum ada data</span>
                <span className="text-xs text-gray-400">
                  {chart.mode === 'kecamatan'
                    ? 'Kecamatan ini belum memiliki data tervalidasi.'
                    : 'Wilayah ini belum memiliki data tervalidasi.'}
                </span>
              </div>
            )}

            {/* Distribusi */}
            {chart.status === 'ok' && chart.mode === 'distribusi' && chart.data.length > 0 && (
              <LandingDistribusiChart data={chart.data} />
            )}

            {/* Kecamatan */}
            {chart.status === 'ok' && chart.mode === 'kecamatan' && chart.data.length > 0 && (
              <LandingKecamatanChart
                data={chart.data}
                kabupaten={chart.kabupaten}
                kecamatan={chart.kecamatan}
              />
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
