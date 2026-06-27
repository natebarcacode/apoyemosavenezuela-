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
          background: 'linear-gradient(135deg, #0f172a 0%, #7f1d1d 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
          <div style={{ fontSize: 120, lineHeight: 1 }}>🇻🇪</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <p style={{ fontSize: 56, fontWeight: 900, color: 'white', margin: 0, letterSpacing: -1 }}>
              Apoyemos a <span style={{ color: '#f87171' }}>Venezuela</span>
            </p>
            <p style={{ fontSize: 26, color: 'rgba(255,255,255,0.65)', margin: 0, textAlign: 'center' }}>
              Centros de acopio e iniciativas solidarias en Panamá
            </p>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
