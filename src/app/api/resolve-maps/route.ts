import { NextRequest, NextResponse } from 'next/server'

function extractCoords(text: string) {
  // @lat,lng,zoom (address bar URL)
  const atMatch = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (atMatch) return { lat: atMatch[1], lng: atMatch[2] }
  // ?q=lat,lng
  const qMatch = text.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (qMatch) return { lat: qMatch[1], lng: qMatch[2] }
  // !3dlat!4dlng (data URLs)
  const dataMatch = text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  if (dataMatch) return { lat: dataMatch[1], lng: dataMatch[2] }
  // ll=lat,lng
  const llMatch = text.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (llMatch) return { lat: llMatch[1], lng: llMatch[2] }
  return null
}

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 })

  // Try direct parse first
  const direct = extractCoords(url)
  if (direct) return NextResponse.json(direct)

  // Follow redirects
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    // Check final URL
    const fromUrl = extractCoords(res.url)
    if (fromUrl) return NextResponse.json(fromUrl)
    // Check HTML body (Google embeds coords in page source)
    const html = await res.text()
    const fromBody = extractCoords(html)
    if (fromBody) return NextResponse.json(fromBody)
    return NextResponse.json({ error: 'No se encontraron coordenadas. Usa el link de la barra de dirección del navegador en vez del link compartido.' }, { status: 422 })
  } catch {
    return NextResponse.json({ error: 'No se pudo resolver el link' }, { status: 500 })
  }
}
