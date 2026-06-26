import { NextRequest, NextResponse } from 'next/server'

const UA = 'ApoyemosVenezuela/1.0 (ayuda humanitaria Panama; contacto: apoyemosavenezuela@gmail.com)'

type NominatimResult = {
  display_name: string
  name?: string
  lat: string
  lon: string
  address: {
    road?: string
    house_number?: string
    suburb?: string
    neighbourhood?: string
    city_district?: string
    city?: string
    town?: string
    village?: string
    state?: string
    country?: string
  }
}

type PhotonFeature = {
  geometry: { coordinates: [number, number] }
  properties: {
    name?: string
    street?: string
    housenumber?: string
    suburb?: string
    district?: string
    city?: string
    town?: string
    village?: string
    municipality?: string
    state?: string
    country?: string
    osm_key?: string
    osm_value?: string
  }
}

function parseNominatim(items: NominatimResult[]) {
  return items.map(r => {
    const a = r.address
    const partes = [a.house_number, a.road].filter(Boolean).join(' ')
    const ciudad = a.city || a.town || a.village || ''
    const direccion = partes ? `${partes}${ciudad ? ', ' + ciudad : ''}` : r.display_name
    const zona = a.suburb || a.neighbourhood || a.city_district || ciudad || a.state || ''
    const nombre = r.name || r.display_name.split(',')[0].trim()
    const label = r.display_name
    return { label, lat: r.lat, lng: r.lon, direccion, zona, nombre }
  })
}

function parsePhoton(features: PhotonFeature[]) {
  return features.map(f => {
    const p = f.properties
    const [lng, lat] = f.geometry.coordinates
    const partes = [p.housenumber, p.street].filter(Boolean).join(' ')
    const ciudad = p.city || p.town || p.village || p.municipality || ''
    const direccion = partes ? `${partes}${ciudad ? ', ' + ciudad : ''}` : p.street || p.name || ''
    const zona = p.suburb || p.district || ciudad || p.state || ''
    const nombre = p.name || p.street || ''
    const labelPartes = [p.name, p.street, ciudad, p.state].filter(Boolean)
    const label = labelPartes.join(', ')
    return { label, lat: String(lat), lng: String(lng), direccion, zona, nombre }
  })
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json([])

  const headers = { 'User-Agent': UA, 'Accept-Language': 'es' }

  // Llamamos Photon y Nominatim en paralelo
  const [photonRes, nominatimRes] = await Promise.allSettled([
    fetch(
      `https://photon.komoot.io/api/?${new URLSearchParams({
        q,
        limit: '8',
        lang: 'es',
        lat: '8.9936',
        lon: '-79.5197',
      })}`,
      { headers }
    ),
    fetch(
      `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
        format: 'json',
        q,
        addressdetails: '1',
        limit: '8',
        countrycodes: 'pa',
        dedupe: '1',
        'accept-language': 'es',
      })}`,
      { headers }
    ),
  ])

  const resultados: ReturnType<typeof parsePhoton> = []
  const vistos = new Set<string>()

  if (photonRes.status === 'fulfilled' && photonRes.value.ok) {
    const data = await photonRes.value.json()
    const features: PhotonFeature[] = (data.features ?? []).filter(
      (f: PhotonFeature) => {
        const [lng, lat] = f.geometry?.coordinates ?? [0, 0]
        // Filtrar por bounding box de Panamá aproximada
        return lat >= 7.0 && lat <= 9.8 && lng >= -83.2 && lng <= -77.1
      }
    )
    for (const r of parsePhoton(features)) {
      const key = `${Number(r.lat).toFixed(4)},${Number(r.lng).toFixed(4)}`
      if (!vistos.has(key) && r.label) { vistos.add(key); resultados.push(r) }
    }
  }

  if (nominatimRes.status === 'fulfilled' && nominatimRes.value.ok) {
    const data: NominatimResult[] = await nominatimRes.value.json()
    for (const r of parseNominatim(data)) {
      const key = `${Number(r.lat).toFixed(4)},${Number(r.lng).toFixed(4)}`
      if (!vistos.has(key) && r.label) { vistos.add(key); resultados.push(r) }
    }
  }

  return NextResponse.json(resultados.slice(0, 10))
}
