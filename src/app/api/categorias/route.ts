import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  const supabase = getSupabaseAdmin()
  const [{ data: cats }, { data: grps }] = await Promise.all([
    supabase.from('categorias').select('*').order('nombre'),
    supabase.from('grupos_categorias').select('*').order('nombre'),
  ])
  return NextResponse.json({ categorias: cats ?? [], grupos: grps ?? [] })
}
