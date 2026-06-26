import { NextRequest, NextResponse } from 'next/server'

function extractCoords(url: string) {
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (atMatch) return { lat: atMatch[1], lng: atMatch[2] }
  const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (qMatch) return { lat: qMatch[1], lng: qMatch[2] }
  return null
}

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 })

  // Try to parse directly first
  const direct = extractCoords(url)
  if (direct) return NextResponse.json(direct)

  // Follow redirects to expand shortened URLs
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow' })
    const coords = extractCoords(res.url)
    if (coords) return NextResponse.json(coords)
    return NextResponse.json({ error: 'No se encontraron coordenadas en el link' }, { status: 422 })
  } catch {
    return NextResponse.json({ error: 'No se pudo resolver el link' }, { status: 500 })
  }
}
