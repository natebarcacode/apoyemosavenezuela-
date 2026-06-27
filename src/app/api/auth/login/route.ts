import { NextRequest, NextResponse } from 'next/server'
import { makeToken, COOKIE_NAME } from '@/lib/adminAuth'

// In-memory brute force guard (resets on cold start, good enough for serverless)
const attempts = new Map<string, { count: number; until: number }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000 // 15 min

function getIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
}

export async function POST(req: NextRequest) {
  const ip = getIP(req)
  const now = Date.now()
  const entry = attempts.get(ip)

  if (entry && entry.count >= MAX_ATTEMPTS && now < entry.until) {
    const waitMin = Math.ceil((entry.until - now) / 60000)
    return NextResponse.json({ ok: false, error: `Demasiados intentos. Espera ${waitMin} min.` }, { status: 429 })
  }

  const { password } = await req.json()

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    const prev = attempts.get(ip) ?? { count: 0, until: 0 }
    const count = prev.count + 1
    attempts.set(ip, { count, until: count >= MAX_ATTEMPTS ? now + LOCKOUT_MS : prev.until })
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  attempts.delete(ip)
  const token = makeToken()
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 3600,
    path: '/',
  })
  return res
}
