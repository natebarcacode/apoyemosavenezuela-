import { NextRequest, NextResponse } from 'next/server'
import { makeToken, COOKIE_NAME } from '@/lib/adminAuth'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

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
