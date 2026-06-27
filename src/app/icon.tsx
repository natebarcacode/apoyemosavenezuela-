import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: 32, height: 32, display: 'flex', borderRadius: 6, overflow: 'hidden', flexDirection: 'column' }}>
        <div style={{ flex: 1, background: '#CF142B', display: 'flex' }} />
        <div style={{ flex: 1, background: '#00247D', display: 'flex' }} />
        <div style={{ flex: 1, background: '#CF142B', display: 'flex' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: 14, height: 12,
            background: '#FFCC00',
            borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
            display: 'flex',
          }} />
        </div>
      </div>
    ),
    { ...size }
  )
}
