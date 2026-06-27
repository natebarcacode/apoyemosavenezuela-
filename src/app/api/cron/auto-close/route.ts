import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

// Panama = UTC-5, sin DST
// datetime "YYYY-MM-DDTHH:MM" → sumar 5h para UTC
// date-only "YYYY-MM-DD" → vence al final del día en Panamá (siguiente día 05:00 UTC)
function toPanamaUTC(fechaFin: string): number {
  const s = fechaFin.slice(0, 16)
  if (s.includes('T')) {
    const [dp, tp] = s.split('T')
    const [y, mo, d] = dp.split('-').map(Number)
    const [h, m] = (tp || '00:00').split(':').map(Number)
    return Date.UTC(y, mo - 1, d, h + 5, m, 0)
  }
  const [y, mo, d] = s.split('-').map(Number)
  return Date.UTC(y, mo - 1, d + 1, 5, 0, 0)
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = getSupabaseAdmin()
  const now = Date.now()

  // Centros con fecha_fin vencida → marcar cerrado=true
  const { data: centros } = await supabase
    .from('centros_acopio')
    .select('id, fecha_fin')
    .eq('cerrado', false)
    .not('fecha_fin', 'is', null)

  const centrosVencidos = (centros ?? []).filter(c => toPanamaUTC(c.fecha_fin) <= now)
  if (centrosVencidos.length > 0) {
    await supabase
      .from('centros_acopio')
      .update({ cerrado: true })
      .in('id', centrosVencidos.map(c => c.id))
  }

  // Negocios con fecha_fin vencida → marcar activo=false
  const { data: negocios } = await supabase
    .from('negocios_solidarios')
    .select('id, fecha_fin')
    .eq('activo', true)
    .not('fecha_fin', 'is', null)

  const negociosVencidos = (negocios ?? []).filter(n => toPanamaUTC(n.fecha_fin) <= now)
  if (negociosVencidos.length > 0) {
    await supabase
      .from('negocios_solidarios')
      .update({ activo: false })
      .in('id', negociosVencidos.map(n => n.id))
  }

  return NextResponse.json({
    ok: true,
    centrosCerrados: centrosVencidos.length,
    negociosDesactivados: negociosVencidos.length,
    ids: {
      centros: centrosVencidos.map(c => c.id),
      negocios: negociosVencidos.map(n => n.id),
    },
  })
}
