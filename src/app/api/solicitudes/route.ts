import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { tipo, referencia_tipo, referencia_id, datos } = body
  if (!tipo) return NextResponse.json({ error: 'tipo requerido' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('solicitudes').insert({
    tipo,
    referencia_tipo: referencia_tipo ?? null,
    referencia_id: referencia_id ?? null,
    datos: datos ?? {},
    estado: 'pendiente',
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('solicitudes')
    .select('*')
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const { id, estado } = await req.json()
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('solicitudes').update({ estado }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
