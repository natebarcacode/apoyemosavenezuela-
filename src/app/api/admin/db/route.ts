import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, COOKIE_NAME } from '@/lib/adminAuth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

function unauthorized() {
  return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token || !verifyToken(token)) return unauthorized()

  const { table, op, data, eq, order, single } = await req.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = getSupabaseAdmin().from(table)

  try {
    if (op === 'select') {
      q = q.select('*')
      if (eq) for (const [col, val] of eq) q = q.eq(col, val)
      if (order) q = q.order(order.column, { ascending: order.ascending })
      return NextResponse.json(await q)
    }

    if (op === 'insert') {
      q = single ? q.insert(data).select('id').single() : q.insert(data)
      return NextResponse.json(await q)
    }

    if (op === 'update') {
      q = q.update(data)
      if (eq) for (const [col, val] of eq) q = q.eq(col, val)
      return NextResponse.json(await q)
    }

    if (op === 'delete') {
      q = q.delete()
      if (eq) for (const [col, val] of eq) q = q.eq(col, val)
      return NextResponse.json(await q)
    }

    return NextResponse.json({ data: null, error: 'Unknown operation' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ data: null, error: String(e) }, { status: 500 })
  }
}
