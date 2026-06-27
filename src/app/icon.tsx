import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #7f1d1d 100%)',
          borderRadius: 6,
        }}
      >
        <div style={{ fontSize: 22, lineHeight: 1 }}>🇻🇪</div>
      </div>
    ),
    { ...size }
  )
}
