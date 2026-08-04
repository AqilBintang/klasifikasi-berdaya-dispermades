'use client'

import { useCallback, useEffect, useState } from 'react'
import { WilayahJatengExplorer } from '@/components/landing/WilayahJatengExplorer'
import { KlasifikasiBerdayaChart } from '@/components/admin/KlasifikasiBerdayaChart'
import type { KlasifikasiBerdayaChartRow } from '@/components/admin/KlasifikasiBerdayaChart'
import { KecamatanSkorChart } from '@/components/landing/KecamatanSkorChart'
import type { SkorPerTahunRow } from '@/components/landing/KecamatanSkorChart'
import type { KabKotaJateng, KecamatanJateng } from '@/types/wilayah'

type Props = {
  kabKota: KabKotaJateng[]
  kecamatanByKabKota: Record<string, KecamatanJateng[]>
}

// Mode distribusi: banyak kecamatan
type DistribusiState = {
  mode: 'distribusi'
  status: 'loading' | 'error'
  label: string
} | {
  mode: 'distribusi'
  status: 'ok'
  label: string
  data: KlasifikasiBerdayaChartRow[]
}

// Mode kecamatan: satu kecamatan
type KecamatanState = {
  mode: 'kecamatan'
  status: 'loading' | 'error'
  label: string
  kabupaten: string
  kecamatan: string
} | {
  mode: 'kecamatan'
  status: 'ok'
  label: string
  kabupaten: string
  kecamatan: string
  data: SkorPerTahunRow[]
}

type ChartState = DistribusiState | KecamatanState

export function LandingDataSection({ kabKota, kecamatanByKabKota }: Props) {
  const [chart, setChart] = useState<ChartState>({
    mode: 'distribusi',
    status: 'loading',
    label: 'Jawa Tengah',
  })

  const fetchChart = useCallback((
    kabKotaKode: string | null,
    kecamatanKode: string,
    kabupatenNama: string,
    kecamatanNama: string,
  ) => {
    const params = new URLSearchParams()
    if (kabKotaKode) params.set('kabKotaKode', kabKotaKode)
    if (kecamatanKode) params.set('kecamatanKode', kecamatanKode)

    const isKecamatanMode = Boolean(kecamatanKode)
    const label = kecamatanNama
      ? `${kabupatenNama} › ${kecamatanNama}`
      : (kabupatenNama || 'Jawa Tengah')

    if (isKecamatanMode) {
      setChart({ mode: 'kecamatan', status: 'loading', label, kabupaten: kabupatenNama, kecamatan: kecamatanNama })
    } else {
      setChart({ mode: 'distribusi', status: 'loading', label })
    }

    fetch(`/api/public/klasifikasi?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => {
        const d = json?.data
        const responseLabel = d?.label ?? label

        if (isKecamatanMode) {
          setChart({
            mode: 'kecamatan',
            status: 'ok',
            label: responseLabel,
            kabupaten: kabupatenNama,
            kecamatan: kecamatanNama,
            data: d?.skorPerTahun ?? [],
          })
        } else {
          setChart({
            mode: 'distribusi',
            status: 'ok',
            label: responseLabel,
            data: d?.chartData ?? [],
          })
        }
      })
      .catch(() => {
        if (isKecamatanMode) {
          setChart({ mode: 'kecamatan', status: 'error', label, kabupaten: kabupatenNama, kecamatan: kecamatanNama })
        } else {
          setChart({ mode: 'distribusi', status: 'error', label })
        }
      })
  }, [])

  useEffect(() => { fetchChart(null, '', '', '') }, [fetchChart])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

      {/* ── Kiri: Peta ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Peta Wilayah</h3>
        <WilayahJatengExplorer
          kabKota={kabKota}
          kecamatanByKabKota={kecamatanByKabKota}
          allowAll
          onSelectionChange={({ kabKotaKode, kecamatanKode }) => {
            const kabObj = kabKota.find((k) => k.kode === kabKotaKode)
            const kabupatenNama = kabObj?.nama ?? ''
            const kecList = kabKotaKode ? (kecamatanByKabKota[kabKotaKode] ?? []) : []
            const kecObj = kecList.find((k) => k.kode === kecamatanKode)
            const kecamatanNama = kecObj?.nama ?? ''
            fetchChart(kabKotaKode, kecamatanKode, kabupatenNama, kecamatanNama)
          }}
        />
      </div>

      {/* ── Kanan: Chart ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            {chart.mode === 'kecamatan' ? 'Skor Klasifikasi per Tahun' : 'Distribusi Klasifikasi per Tahun'}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{chart.label}</p>
        </div>

        {chart.status === 'loading' && (
          <div className="h-[360px] flex items-center justify-center">
            <span className="text-sm text-gray-400">Memuat data…</span>
          </div>
        )}

        {chart.status === 'error' && (
          <div className="h-[360px] flex items-center justify-center rounded-xl bg-red-50">
            <span className="text-sm text-red-500">Gagal memuat data.</span>
          </div>
        )}

        {chart.status === 'ok' && chart.mode === 'distribusi' && chart.data.length === 0 && (
          <div className="h-[360px] flex flex-col items-center justify-center gap-2 rounded-xl bg-gray-50">
            <span className="text-sm text-gray-500 font-medium">Belum ada data</span>
            <span className="text-xs text-gray-400">Wilayah ini belum memiliki data klasifikasi tervalidasi.</span>
          </div>
        )}

        {chart.status === 'ok' && chart.mode === 'kecamatan' && chart.data.length === 0 && (
          <div className="h-[360px] flex flex-col items-center justify-center gap-2 rounded-xl bg-gray-50">
            <span className="text-sm text-gray-500 font-medium">Belum ada data</span>
            <span className="text-xs text-gray-400">Kecamatan ini belum memiliki data klasifikasi tervalidasi.</span>
          </div>
        )}

        {chart.status === 'ok' && chart.mode === 'distribusi' && chart.data.length > 0 && (
          <KlasifikasiBerdayaChart data={chart.data} />
        )}

        {chart.status === 'ok' && chart.mode === 'kecamatan' && chart.data.length > 0 && (
          <KecamatanSkorChart
            data={chart.data}
            kabupaten={chart.kabupaten}
            kecamatan={chart.kecamatan}
          />
        )}
      </div>

    </div>
  )
}
