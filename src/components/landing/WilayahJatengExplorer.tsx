'use client'

import { useMemo, useState } from 'react'
import type { KabKotaJateng, KecamatanJateng } from '@/types/wilayah'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { JatengKabKotaMap } from '@/components/landing/JatengKabKotaMap'
import { extractRings, pickDeterministicPointInRings } from '@/lib/wilayah/geometry'

type Selection = {
  kabKotaKode: string | null
  kecamatanKode: string
}

type Props = {
  kabKota: KabKotaJateng[]
  kecamatanByKabKota: Record<string, KecamatanJateng[]>
  allowAll?: boolean
  onSelectionChange?: (selection: Selection) => void
}

export function WilayahJatengExplorer({ kabKota, kecamatanByKabKota, allowAll = false, onSelectionChange }: Props) {
  const firstKode = allowAll ? null : (kabKota[0]?.kode ?? null)
  const [selectedKode, setSelectedKode] = useState<string | null>(firstKode)
  const [selectedKecamatanKode, setSelectedKecamatanKode] = useState<string>('')

  const totalKecamatanAll = useMemo(() => {
    return Object.values(kecamatanByKabKota).reduce((acc, list) => acc + (list?.length ?? 0), 0)
  }, [kecamatanByKabKota])

  const applySelection = (nextKabKotaKode: string | null, nextKecamatanKode: string) => {
    setSelectedKode(nextKabKotaKode)
    setSelectedKecamatanKode(nextKecamatanKode)
    onSelectionChange?.({ kabKotaKode: nextKabKotaKode, kecamatanKode: nextKecamatanKode })
  }

  const handleSelectKabKota = (kode: string | null) => {
    if (!kode) {
      applySelection(null, '')
      return
    }
    const firstKecamatanKode = (kecamatanByKabKota[kode] ?? [])[0]?.kode ?? ''
    applySelection(kode, firstKecamatanKode)
  }

  const selectedKabKota = useMemo(
    () => kabKota.find((k) => k.kode === selectedKode) ?? null,
    [kabKota, selectedKode]
  )

  const kecamatan = useMemo(() => {
    if (!selectedKode) return []
    return kecamatanByKabKota[selectedKode] ?? []
  }, [kecamatanByKabKota, selectedKode])

  const selectedKabKotaRings = useMemo(() => {
    if (!selectedKabKota?.path) return []
    try {
      return extractRings(JSON.parse(selectedKabKota.path))
    } catch {
      return []
    }
  }, [selectedKabKota])

  const selectedKecamatanPoint = useMemo(() => {
    if (!selectedKecamatanKode) return null
    const fallback =
      selectedKabKota?.lat != null && selectedKabKota?.lng != null ? ([selectedKabKota.lat, selectedKabKota.lng] as [number, number]) : null
    const { point, matchType } = pickDeterministicPointInRings(selectedKecamatanKode, selectedKabKotaRings, fallback)
    if (!point) return null
    return { lat: point[0], lng: point[1], matchType }
  }, [selectedKecamatanKode, selectedKabKota, selectedKabKotaRings])

  const visibleKecamatan = useMemo(() => {
    if (!selectedKecamatanKode) return kecamatan
    return kecamatan.filter((k) => k.kode === selectedKecamatanKode)
  }, [kecamatan, selectedKecamatanKode])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm font-medium text-gray-700" htmlFor="kabkota">
            Kabupaten/Kota
          </label>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
            <select
              id="kabkota"
              value={selectedKode ?? ''}
              onChange={(e) => handleSelectKabKota(e.target.value ? e.target.value : null)}
              className="h-10 w-full sm:w-[420px] rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-sky-300"
            >
              {allowAll && <option value="">Seluruh Jawa Tengah</option>}
              {kabKota.map((k) => (
                <option key={k.kode} value={k.kode}>
                  {k.nama}
                </option>
              ))}
            </select>
            {allowAll && (
              <button
                type="button"
                onClick={() => handleSelectKabKota(null)}
                className="h-10 w-full sm:w-auto rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 hover:bg-gray-50"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <JatengKabKotaMap
          items={kabKota}
          selectedKode={selectedKode}
          onSelect={handleSelectKabKota}
          focusPoint={selectedKecamatanPoint ? { lat: selectedKecamatanPoint.lat, lng: selectedKecamatanPoint.lng } : null}
        />
      </div>

      <div className="lg:col-span-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ringkasan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="text-gray-600">Terpilih</span>
              <span className="font-medium text-right">{selectedKabKota?.nama ?? (allowAll ? 'Seluruh Jawa Tengah' : '-')}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-gray-600">Kode</span>
              <span className="font-medium">{selectedKabKota?.kode ?? '-'}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-gray-600">Luas</span>
              <span className="font-medium">
                {selectedKabKota?.luas != null ? `${selectedKabKota.luas.toLocaleString('id-ID')} km²` : '-'}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-gray-600">Penduduk</span>
              <span className="font-medium">
                {selectedKabKota?.penduduk != null ? selectedKabKota.penduduk.toLocaleString('id-ID') : '-'}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-gray-600">Kecamatan</span>
              <span className="font-medium text-right">
                {!selectedKode
                  ? `${totalKecamatanAll.toLocaleString('id-ID')} kecamatan`
                  : selectedKecamatanKode
                    ? visibleKecamatan[0]?.nama ?? '-'
                    : 'Semua kecamatan'}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-gray-600">Latitude</span>
              <span className="font-medium">
                {selectedKecamatanPoint ? selectedKecamatanPoint.lat.toFixed(6) : '-'}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-gray-600">Longitude</span>
              <span className="font-medium">
                {selectedKecamatanPoint ? selectedKecamatanPoint.lng.toFixed(6) : '-'}
              </span>
            </div>
            {selectedKecamatanPoint?.matchType === 'fallback' && (
              <div className="text-xs text-gray-500">Koordinat diturunkan dari pusat kab/kota (perkiraan).</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kecamatan</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedKode && <div className="text-sm text-gray-600">Pilih kabupaten/kota untuk melihat daftar kecamatan.</div>}

            {selectedKode && kecamatan.length === 0 && (
              <div className="text-sm text-gray-600">Belum ada data kecamatan.</div>
            )}

            {selectedKode && kecamatan.length > 0 && (
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700" htmlFor="kecamatan">
                    Pilih Kecamatan
                  </label>
                  <select
                    id="kecamatan"
                    value={selectedKecamatanKode}
                    onChange={(e) => applySelection(selectedKode, e.target.value)}
                    className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-sky-300"
                  >
                    <option value="">Semua kecamatan</option>
                    {kecamatan.map((k) => (
                      <option key={k.kode} value={k.kode}>
                        {k.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-sm text-gray-600">
                  Total: <span className="font-medium text-gray-800">{visibleKecamatan.length}</span>
                </div>
                <div className="max-h-[320px] overflow-auto rounded-md border bg-white">
                  <ul className="divide-y">
                    {visibleKecamatan.map((k) => (
                      <li key={k.kode} className="px-3 py-2 text-sm">
                        <div className="font-medium text-gray-800">{k.nama}</div>
                        <div className="text-xs text-gray-500">{k.kode}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
