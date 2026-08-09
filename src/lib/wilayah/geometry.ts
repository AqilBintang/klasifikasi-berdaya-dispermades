export type LatLng = [number, number]
export type Ring = LatLng[]

function isCoordPair(value: unknown): value is LatLng {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    Number.isFinite(value[0]) &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[1])
  )
}

export function extractRings(value: unknown): Ring[] {
  const rings: Ring[] = []

  const visit = (v: unknown) => {
    if (!Array.isArray(v)) return

    if (v.length > 0 && isCoordPair(v[0])) {
      rings.push(v as Ring)
      return
    }

    let pending: Ring = []
    for (const child of v) {
      if (isCoordPair(child)) {
        pending.push(child)
        continue
      }

      if (pending.length >= 3) rings.push(pending)
      pending = []
      visit(child)
    }

    if (pending.length >= 3) rings.push(pending)
  }

  visit(value)
  return rings
}

export function getBoundingBox(rings: Ring[]) {
  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity

  for (const ring of rings) {
    for (const [lat, lng] of ring) {
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
    }
  }

  return { minLat, maxLat, minLng, maxLng }
}

export function pointInRing(lat: number, lng: number, ring: Ring): boolean {
  if (ring.length < 3) return false

  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [latI, lngI] = ring[i]!
    const [latJ, lngJ] = ring[j]!

    const intersect = (latI > lat) !== (latJ > lat) && lng < ((lngJ - lngI) * (lat - latI)) / ((latJ - latI) || 1e-12) + lngI
    if (intersect) inside = !inside
  }

  return inside
}

export function pointInRings(lat: number, lng: number, rings: Ring[]): boolean {
  for (const ring of rings) {
    if (pointInRing(lat, lng, ring)) return true
  }
  return false
}

function seededUnitFloat(seed: string, step: number): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h ^= step + 0x9e3779b9
  h = Math.imul(h, 2246822507)
  h ^= h >>> 13
  h = Math.imul(h, 3266489909)
  h ^= h >>> 16
  return (h >>> 0) / 0xffffffff
}

export function pickDeterministicPointInRings(
  seed: string,
  rings: Ring[],
  fallback: LatLng | null
): { point: LatLng | null; matchType: 'polygon' | 'fallback' } {
  if (rings.length === 0) return { point: fallback, matchType: 'fallback' }

  const { minLat, maxLat, minLng, maxLng } = getBoundingBox(rings)
  if (!Number.isFinite(minLat) || !Number.isFinite(maxLat) || !Number.isFinite(minLng) || !Number.isFinite(maxLng)) {
    return { point: fallback, matchType: 'fallback' }
  }

  for (let i = 0; i < 220; i++) {
    const u = seededUnitFloat(seed, i * 2)
    const v = seededUnitFloat(seed, i * 2 + 1)
    const lat = minLat + (maxLat - minLat) * u
    const lng = minLng + (maxLng - minLng) * v
    if (pointInRings(lat, lng, rings)) return { point: [lat, lng], matchType: 'polygon' }
  }

  return { point: fallback, matchType: 'fallback' }
}

