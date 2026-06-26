import { createHmac, timingSafeEqual } from 'crypto'

const secret = () => process.env.ADMIN_SESSION_SECRET ?? 'fallback-dev-secret-change-in-prod'

export function makeToken(): string {
  const ts = Date.now().toString()
  const sig = createHmac('sha256', secret()).update(ts).digest('hex')
  return Buffer.from(`${ts}:${sig}`).toString('base64url')
}

export function verifyToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString()
    const colonIdx = decoded.indexOf(':')
    if (colonIdx < 0) return false
    const ts = decoded.slice(0, colonIdx)
    const sig = decoded.slice(colonIdx + 1)
    const expected = createHmac('sha256', secret()).update(ts).digest('hex')
    const sigBuf = Buffer.from(sig, 'hex')
    const expBuf = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expBuf.length) return false
    if (!timingSafeEqual(sigBuf, expBuf)) return false
    // 7-day expiry
    if (Date.now() - parseInt(ts, 10) > 7 * 24 * 3600 * 1000) return false
    return true
  } catch {
    return false
  }
}

export const COOKIE_NAME = 'admin_session'
