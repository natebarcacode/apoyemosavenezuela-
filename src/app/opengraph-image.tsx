import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Apoyemos a Venezuela'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ background: '#ffffff', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', gap: 24 }}>
        {/* Bandera venezolana — 3 franjas */}
        <div style={{ display: 'flex', flexDirection: 'column', width: 120, height: 80, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ flex: 1, background: '#FFCC00', display: 'flex' }} />
          <div style={{ flex: 1, background: '#00247D', display: 'flex' }} />
          <div style={{ flex: 1, background: '#CF142B', display: 'flex' }} />
        </div>
        {/* Título */}
        <div style={{ display: 'flex', fontSize: 72, fontWeight: 900, color: '#111827', letterSpacing: -2 }}>
          Apoyemos a{' '}
          <span style={{ color: '#dc2626', marginLeft: 16 }}>Venezuela</span>
        </div>
        {/* Subtítulo */}
        <div style={{ fontSize: 30, color: '#6b7280', display: 'flex' }}>
          Centros de acopio e iniciativas en Panamá
        </div>
      </div>
    ),
    { ...size }
  )
}
