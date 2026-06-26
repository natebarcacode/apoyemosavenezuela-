import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, COOKIE_NAME } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  return NextResponse.json({ ok: Boolean(token && verifyToken(token)) })
}
