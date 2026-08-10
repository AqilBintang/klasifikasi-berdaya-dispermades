'use client'

import { useMemo } from 'react'
import type { KabKotaJateng } from '@/types/wilayah'
import { extractRings, type LatLng, type Ring } from '@/lib/wilayah/geometry'

type Props = {
  items: KabKotaJateng[]
  selectedKode: string | null
  onSelect: (kode: string) => void
  focusPoint?: { lat: number; lng: number } | null
}

function buildPath(ring: Ring, project: (p: [number, number]) => [number, number]): string {
  if (ring.length === 0) return ''
  const [x0, y0] = project(ring[0]!)
  let d = `M ${x0.toFixed(2)} ${y0.toFixed(2)}`
  for (let i = 1; i < ring.length; i++) {
    const [x, y] = project(ring[i]!)
    d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`
  }
  d += ' Z'
  return d
}

export function JatengKabKotaMap({ items, selectedKode, onSelect, focusPoint }: Props) {
  const prepared = useMemo(() => {
    const shapes = items
      .filter((it) => Boolean(it.path))
      .map((it) => {
        let rings: Ring[] = []
        try {
          rings = extractRings(JSON.parse(it.path ?? '[]'))
        } catch {
          rings = []
        }
        return { kode: it.kode, nama: it.nama, rings }
      })
      .filter((it) => it.rings.length > 0)

    let minLng = Infinity
    let maxLng = -Infinity
    let minLat = Infinity
    let maxLat = -Infinity

    for (const s of shapes) {
      for (const ring of s.rings) {
        for (const [lat, lng] of ring) {
          if (lng < minLng) minLng = lng
          if (lng > maxLng) maxLng = lng
          if (lat < minLat) minLat = lat
          if (lat > maxLat) maxLat = lat
        }
      }
    }

    if (!Number.isFinite(minLng) || !Number.isFinite(maxLng) || !Number.isFinite(minLat) || !Number.isFinite(maxLat)) {
      return { shapes: [], viewBox: '0 0 1000 600', vbWidth: 1000, vbHeight: 600, project: () => [0, 0] as [number, number] }
    }

    const vbWidth = 1000
    const ratio = (maxLat - minLat) / (maxLng - minLng)
    const vbHeight = Math.max(520, Math.min(1200, vbWidth * ratio))

    const project = ([lat, lng]: [number, number]) => {
      const x = ((lng - minLng) / (maxLng - minLng)) * vbWidth
      const y = ((maxLat - lat) / (maxLat - minLat)) * vbHeight
      return [x, y] as [number, number]
    }

    const viewBox = `0 0 ${vbWidth} ${vbHeight}`
    return { shapes, viewBox, vbWidth, vbHeight, project }
  }, [items])

  const focus = useMemo(() => {
    if (!focusPoint) return null
    const p: LatLng = [focusPoint.lat, focusPoint.lng]
    const [x, y] = prepared.project(p)
    return { x, y }
  }, [focusPoint, prepared])

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={prepared.viewBox} className="w-full h-[300px] md:h-[360px]" role="img" aria-label="Peta kabupaten/kota Jawa Tengah">
        {focus && (
          <g>
            <line
              x1={focus.x}
              y1={0}
              x2={focus.x}
              y2={prepared.vbHeight}
              stroke="rgb(2 132 199 / 0.65)"
              strokeWidth={1}
            />
            <line
              x1={0}
              y1={focus.y}
              x2={prepared.vbWidth}
              y2={focus.y}
              stroke="rgb(2 132 199 / 0.65)"
              strokeWidth={1}
            />
            <circle cx={focus.x} cy={focus.y} r={4.5} fill="rgb(2 132 199)" />
            <circle cx={focus.x} cy={focus.y} r={9} fill="rgb(2 132 199 / 0.18)" />
          </g>
        )}
        {prepared.shapes.map((s) => {
          const isSelected = selectedKode === s.kode
          const fill = isSelected ? 'rgb(14 165 233 / 0.35)' : 'rgb(148 163 184 / 0.35)'
          const stroke = isSelected ? 'rgb(2 132 199)' : 'rgb(255 255 255)'

          const d = s.rings.map((r) => buildPath(r, prepared.project)).join(' ')
          if (!d) return null

          return (
            <path
              key={s.kode}
              d={d}
              fill={fill}
              stroke={stroke}
              strokeWidth={1.2}
              className="cursor-pointer hover:fill-sky-200/70 transition-colors"
              onClick={() => onSelect(s.kode)}
            >
              <title>{s.nama}</title>
            </path>
          )
        })}
      </svg>
    </div>
  )
}
