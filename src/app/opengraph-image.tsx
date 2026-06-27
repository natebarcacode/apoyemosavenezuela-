import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Apoyemos a Venezuela'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#ffffff',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
          <div style={{ fontSize: 120, lineHeight: 1 }}>🫀</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', fontSize: 64, fontWeight: 900, color: '#111827', margin: 0, letterSpacing: -1 }}>
              <span>Apoyemos a&nbsp;</span><span style={{ color: '#dc2626' }}>Venezuela</span>
            </div>
            <p style={{ fontSize: 28, color: '#6b7280', margin: 0, textAlign: 'center' }}>
              Centros de acopio e iniciativas en Panamá
            </p>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
