'use client'

import { useMemo, useState } from 'react'
import type { KabKotaJateng, KecamatanJateng } from '@/types/wilayah'
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

  const applySelection = (nextKabKotaKode: string | null, nextKecamatanKode: string) => {
    setSelectedKode(nextKabKotaKode)
    setSelectedKecamatanKode(nextKecamatanKode)
    onSelectionChange?.({ kabKotaKode: nextKabKotaKode, kecamatanKode: nextKecamatanKode })
  }

  const handleSelectKabKota = (kode: string | null) => {
    // Reset kecamatan ke '' saat ganti kabupaten — chart menampilkan semua kecamatan dalam kabupaten
    applySelection(kode, '')
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
      selectedKabKota?.lat != null && selectedKabKota?.lng != null
        ? ([selectedKabKota.lat, selectedKabKota.lng] as [number, number])
        : null
    const { point } = pickDeterministicPointInRings(selectedKecamatanKode, selectedKabKotaRings, fallback)
    if (!point) return null
    return { lat: point[0], lng: point[1] }
  }, [selectedKecamatanKode, selectedKabKota, selectedKabKotaRings])

  const totalKecamatanAll = useMemo(
    () => Object.values(kecamatanByKabKota).reduce((acc, list) => acc + (list?.length ?? 0), 0),
    [kecamatanByKabKota]
  )

  return (
    <div className="space-y-4">
      {/* Filter row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide" htmlFor="kabkota">
            Kabupaten / Kota
          </label>
          <select
            id="kabkota"
            value={selectedKode ?? ''}
            onChange={(e) => handleSelectKabKota(e.target.value || null)}
            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-sky-300"
          >
            {allowAll && <option value="">Seluruh Jawa Tengah</option>}
            {kabKota.map((k) => (
              <option key={k.kode} value={k.kode}>{k.nama}</option>
            ))}
          </select>
        </div>

        {selectedKode && kecamatan.length > 0 && (
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide" htmlFor="kecamatan">
              Kecamatan
            </label>
            <select
              id="kecamatan"
              value={selectedKecamatanKode}
              onChange={(e) => applySelection(selectedKode, e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-sky-300"
            >
              <option value="">Semua kecamatan</option>
              {kecamatan.map((k) => (
                <option key={k.kode} value={k.kode}>{k.nama}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Info pill */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700">
          {selectedKabKota?.nama ?? 'Seluruh Jawa Tengah'}
          {selectedKecamatanKode
            ? ` › ${kecamatan.find((k) => k.kode === selectedKecamatanKode)?.nama ?? ''}`
            : ''}
        </span>
        <span>
          {!selectedKode
            ? `${totalKecamatanAll.toLocaleString('id-ID')} kecamatan`
            : selectedKecamatanKode
              ? '1 kecamatan'
              : `${kecamatan.length} kecamatan`}
        </span>
      </div>

      {/* Peta */}
      <JatengKabKotaMap
        items={kabKota}
        selectedKode={selectedKode}
        onSelect={handleSelectKabKota}
        focusPoint={selectedKecamatanPoint}
      />
    </div>
  )
}
