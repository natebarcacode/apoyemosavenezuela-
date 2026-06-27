import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Apoyemos a Venezuela'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ background: '#ffffff', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', gap: 28 }}>
        {/* Logo corazón venezolano */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://apoyemosavenezuela.vercel.app/logo.svg"
          width={130}
          height={120}
          alt="Venezuela"
        />
        {/* Título */}
        <div style={{ display: 'flex', fontSize: 72, fontWeight: 900, color: '#111827', letterSpacing: -2 }}>
          {'Apoyemos a '}
          <span style={{ color: '#dc2626', marginLeft: 12 }}>Venezuela</span>
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
