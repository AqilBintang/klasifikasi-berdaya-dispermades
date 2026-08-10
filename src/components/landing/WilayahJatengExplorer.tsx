'use client'

import { useMemo, useState } from 'react'
import type { KabKotaJateng, KecamatanJateng } from '@/types/wilayah'
import { JatengKabKotaMap } from '@/components/landing/JatengKabKotaMap'
import { extractRings, pickDeterministicPointInRings } from '@/lib/wilayah/geometry'

export type WilayahSelection = {
  kabKotaKode: string | null
  kecamatanKode: string
}

// ─── Tipe state yang di-share antara Filter dan Map ──────────────────────────

export type WilayahState = {
  selectedKabKotaKode: string | null
  selectedKecamatanKode: string
}

// ─── Hook untuk state wilayah — dipakai di parent ────────────────────────────

export function useWilayahState(allowAll = true): {
  state: WilayahState
  setKabKota: (kode: string | null) => void
  setKecamatan: (kode: string) => void
} {
  const [selectedKabKotaKode, setKabKotaKode] = useState<string | null>(allowAll ? null : null)
  const [selectedKecamatanKode, setKecamatanKode] = useState<string>('')

  const setKabKota = (kode: string | null) => {
    setKabKotaKode(kode)
    setKecamatanKode('')
  }

  const setKecamatan = (kode: string) => {
    setKecamatanKode(kode)
  }

  return {
    state: { selectedKabKotaKode, selectedKecamatanKode },
    setKabKota,
    setKecamatan,
  }
}

// ─── WilayahFilter ───────────────────────────────────────────────────────────

type FilterProps = {
  kabKota: KabKotaJateng[]
  kecamatanByKabKota: Record<string, KecamatanJateng[]>
  state: WilayahState
  allowAll?: boolean
  onKabKotaChange: (kode: string | null) => void
  onKecamatanChange: (kode: string) => void
}

export function WilayahFilter({
  kabKota,
  kecamatanByKabKota,
  state,
  allowAll = true,
  onKabKotaChange,
  onKecamatanChange,
}: FilterProps) {
  const { selectedKabKotaKode, selectedKecamatanKode } = state

  const kecamatan = useMemo(() => {
    if (!selectedKabKotaKode) return []
    return kecamatanByKabKota[selectedKabKotaKode] ?? []
  }, [kecamatanByKabKota, selectedKabKotaKode])

  const totalKecamatanAll = useMemo(
    () => Object.values(kecamatanByKabKota).reduce((acc, list) => acc + (list?.length ?? 0), 0),
    [kecamatanByKabKota]
  )

  const selectedKabKota = kabKota.find((k) => k.kode === selectedKabKotaKode) ?? null
  const selectedKecamatan = kecamatan.find((k) => k.kode === selectedKecamatanKode) ?? null

  const locationLabel = selectedKecamatan
    ? `${selectedKabKota?.nama ?? ''} › ${selectedKecamatan.nama}`
    : selectedKabKota?.nama ?? 'Seluruh Jawa Tengah'

  const countLabel = !selectedKabKotaKode
    ? `${totalKecamatanAll.toLocaleString('id-ID')} kecamatan`
    : selectedKecamatanKode
      ? '1 kecamatan'
      : `${kecamatan.length} kecamatan`

  return (
    <div className="flex flex-col sm:flex-row sm:items-end gap-3">
      {/* Kabupaten / Kota */}
      <div className="flex-1 space-y-1">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide" htmlFor="filter-kabkota">
          Kabupaten / Kota
        </label>
        <select
          id="filter-kabkota"
          value={selectedKabKotaKode ?? ''}
          onChange={(e) => onKabKotaChange(e.target.value || null)}
          className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-sky-300"
        >
          {allowAll && <option value="">Seluruh Jawa Tengah</option>}
          {kabKota.map((k) => (
            <option key={k.kode} value={k.kode}>{k.nama}</option>
          ))}
        </select>
      </div>

      {/* Kecamatan — hanya tampil saat kabupaten dipilih */}
      {selectedKabKotaKode && kecamatan.length > 0 && (
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide" htmlFor="filter-kecamatan">
            Kecamatan
          </label>
          <select
            id="filter-kecamatan"
            value={selectedKecamatanKode}
            onChange={(e) => onKecamatanChange(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-sky-300"
          >
            <option value="">Semua kecamatan</option>
            {kecamatan.map((k) => (
              <option key={k.kode} value={k.kode}>{k.nama}</option>
            ))}
          </select>
        </div>
      )}

      {/* Info pill */}
      <div className="shrink-0 flex items-center gap-2 h-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 whitespace-nowrap">
          {locationLabel}
        </span>
        <span className="text-xs text-gray-400 whitespace-nowrap">{countLabel}</span>
      </div>
    </div>
  )
}

// ─── WilayahMap ──────────────────────────────────────────────────────────────

type MapProps = {
  kabKota: KabKotaJateng[]
  kecamatanByKabKota: Record<string, KecamatanJateng[]>
  state: WilayahState
  onKabKotaChange: (kode: string | null) => void
}

export function WilayahMap({ kabKota, kecamatanByKabKota, state, onKabKotaChange }: MapProps) {
  const { selectedKabKotaKode, selectedKecamatanKode } = state

  const selectedKabKota = useMemo(
    () => kabKota.find((k) => k.kode === selectedKabKotaKode) ?? null,
    [kabKota, selectedKabKotaKode]
  )

  const selectedKabKotaRings = useMemo(() => {
    if (!selectedKabKota?.path) return []
    try { return extractRings(JSON.parse(selectedKabKota.path)) }
    catch { return [] }
  }, [selectedKabKota])

  const focusPoint = useMemo(() => {
    if (!selectedKecamatanKode) return null
    const fallback =
      selectedKabKota?.lat != null && selectedKabKota?.lng != null
        ? ([selectedKabKota.lat, selectedKabKota.lng] as [number, number])
        : null
    const { point } = pickDeterministicPointInRings(selectedKecamatanKode, selectedKabKotaRings, fallback)
    if (!point) return null
    return { lat: point[0], lng: point[1] }
  }, [selectedKecamatanKode, selectedKabKota, selectedKabKotaRings])

  return (
    <JatengKabKotaMap
      items={kabKota}
      selectedKode={selectedKabKotaKode}
      onSelect={(kode) => onKabKotaChange(kode)}
      focusPoint={focusPoint}
    />
  )
}

// ─── WilayahJatengExplorer (backward compat — dipakai admin/kecamatan) ────────

type ExplorerProps = {
  kabKota: KabKotaJateng[]
  kecamatanByKabKota: Record<string, KecamatanJateng[]>
  allowAll?: boolean
  onSelectionChange?: (selection: WilayahSelection) => void
}

export function WilayahJatengExplorer({ kabKota, kecamatanByKabKota, allowAll = false, onSelectionChange }: ExplorerProps) {
  const { state, setKabKota, setKecamatan } = useWilayahState(allowAll)

  const handleKabKota = (kode: string | null) => {
    setKabKota(kode)
    onSelectionChange?.({ kabKotaKode: kode, kecamatanKode: '' })
  }

  const handleKecamatan = (kode: string) => {
    setKecamatan(kode)
    onSelectionChange?.({ kabKotaKode: state.selectedKabKotaKode, kecamatanKode: kode })
  }

  return (
    <div className="space-y-4">
      <WilayahFilter
        kabKota={kabKota}
        kecamatanByKabKota={kecamatanByKabKota}
        state={state}
        allowAll={allowAll}
        onKabKotaChange={handleKabKota}
        onKecamatanChange={handleKecamatan}
      />
      <WilayahMap
        kabKota={kabKota}
        kecamatanByKabKota={kecamatanByKabKota}
        state={state}
        onKabKotaChange={handleKabKota}
      />
    </div>
  )
}
