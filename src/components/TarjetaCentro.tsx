'use client'

import { CentroAcopio, HorarioDia } from '@/lib/supabase'
import { ChevronRight, Clock, MapPin } from 'lucide-react'

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

function urgencia(fechaFin?: string) {
  if (!fechaFin) return 'normal'
  const diff = (toPanamaUTC(fechaFin) - Date.now()) / 3600000
  if (diff <= 0) return 'expirado'
  if (diff < 24) return 'urgente'
  if (diff < 72) return 'proximo'
  return 'normal'
}

function countdownCorto(fechaFin: string) {
  const h = (toPanamaUTC(fechaFin) - Date.now()) / 3600000
  if (h < 24) return `Cierra en ${Math.round(h)}h`
  return `Cierra en ${Math.ceil(h / 24)}d`
}

function formatHora(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`
}

const DIAS_ORDEN = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DIAS_JS   = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
function hoyPanamaIdx() {
  const p = new Date(Date.now() - 5 * 60 * 60 * 1000)
  const m: Record<number, number> = {1:0,2:1,3:2,4:3,5:4,6:5,0:6}
  return m[p.getUTCDay()]
}
function diaPasado(dia: string) {
  return DIAS_ORDEN.indexOf(dia) < hoyPanamaIdx()
}
// Devuelve el número de día del mes que corresponde a ese nombre de día
// dentro de la semana que incluye fechaFin
function numDiaMes(dia: string, fechaFin: string): number | null {
  const fin = new Date(fechaFin.slice(0, 10) + 'T12:00:00Z')
  for (let i = 6; i >= 0; i--) {
    const d = new Date(fin.getTime() - i * 86400000)
    if (DIAS_JS[d.getUTCDay()] === dia) return d.getUTCDate()
  }
  return null
}

// Panama = UTC-5, sin cambio de horario
function estaAbiertoAhora(horarios: HorarioDia[]): boolean {
  const p = new Date(Date.now() - 5 * 60 * 60 * 1000)
  const diasJS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const hoy = diasJS[p.getUTCDay()]
  const entrada = horarios.find(h => h.dia === hoy)
  if (!entrada || !entrada.apertura || !entrada.cierre) return false
  const [ha, ma] = entrada.apertura.split(':').map(Number)
  const [hc, mc] = entrada.cierre.split(':').map(Number)
  const min = p.getUTCHours() * 60 + p.getUTCMinutes()
  return min >= ha * 60 + ma && min < hc * 60 + mc
}

type Props = {
  centro: CentroAcopio
  seleccionado?: boolean
  onClick: () => void
}

export default function TarjetaCentro({ centro, seleccionado, onClick }: Props) {
  const nivel = urgencia(centro.fecha_fin)
  const preview = centro.que_acepta.slice(0, 3)
  const extra = centro.que_acepta.length - preview.length
  const cerrado = !!centro.cerrado

  const tieneHorarios = !!centro.horarios && centro.horarios.length > 0
  const tieneFechaFin = !!centro.fecha_fin
  const abiertoAhora = !cerrado && tieneHorarios && !tieneFechaFin
    ? estaAbiertoAhora(centro.horarios!)
    : null

  const dotColor = cerrado
    ? 'bg-red-400'
    : abiertoAhora === false
    ? 'bg-red-400'
    : nivel === 'urgente'
    ? 'bg-red-400 animate-pulse'
    : nivel === 'proximo'
    ? 'bg-yellow-400'
    : 'bg-emerald-400'

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer bg-white rounded-2xl border transition-all duration-150 overflow-hidden active:scale-[0.985] active:shadow-none
        ${seleccionado ? 'border-red-300 shadow-md ring-2 ring-red-100' : 'border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'}
        ${cerrado ? 'opacity-60' : ''}
      `}
    >
      <div className="px-4 py-3">
        {/* Fila principal */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`shrink-0 w-2 h-2 rounded-full ${dotColor}`} />
            <p className={`font-bold text-sm truncate ${cerrado ? 'line-through text-gray-400' : 'text-gray-900'}`}>
              {centro.nombre}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Cerrado (manual o por fecha) */}
            {cerrado && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500">
                Cerrado
              </span>
            )}
            {/* Abierto/Cerrado según horarios diarios */}
            {!cerrado && abiertoAhora === true && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                Abierto ahora
              </span>
            )}
            {!cerrado && abiertoAhora === false && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500">
                Cerrado ahora
              </span>
            )}
            {/* Countdown para fecha_fin próxima */}
            {!cerrado && tieneFechaFin && (nivel === 'urgente' || nivel === 'proximo') && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                nivel === 'urgente' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'
              }`}>
                <Clock size={8} className="inline mr-0.5" />
                {countdownCorto(centro.fecha_fin!)}
              </span>
            )}
            {/* Sin fecha ni horarios → invitar a entrar */}
            {!cerrado && !tieneFechaFin && !tieneHorarios && (
              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                <Clock size={9} />
                Ver horarios
              </span>
            )}
            <ChevronRight size={16} className="text-gray-400" />
          </div>
        </div>

        {/* Zona */}
        <div className="flex items-center gap-1 mt-0.5 ml-4">
          <MapPin size={10} className="text-gray-300 shrink-0" />
          <p className="text-xs text-gray-400">{centro.zona}</p>
        </div>

        {/* Items aceptados */}
        {preview.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2.5 ml-4">
            {preview.map(item => (
              <span key={item} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cerrado ? 'bg-gray-100 text-gray-400 line-through' : 'bg-slate-100 text-slate-500'}`}>
                {item}
              </span>
            ))}
            {extra > 0 && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-400 border border-slate-100">
                +{extra} más
              </span>
            )}
          </div>
        )}

        {/* Horarios en la tarjeta */}
        {!cerrado && tieneHorarios && (
          <div className="flex items-start gap-1.5 mt-2.5 ml-4">
            <Clock size={10} className="text-gray-300 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              {centro.horarios!.map(h => {
                const pasado = tieneFechaFin && diaPasado(h.dia)
                const ndm = tieneFechaFin ? numDiaMes(h.dia, centro.fecha_fin!) : null
                return (
                  <span key={h.dia} className={`text-[10px] flex gap-2 ${pasado ? 'line-through text-gray-300' : 'text-gray-500'}`}>
                    <span className="font-semibold w-14 shrink-0">
                      {h.dia}{ndm != null ? ` ${ndm}` : ''}
                    </span>
                    {h.apertura && h.cierre && (
                      <span className={pasado ? 'text-gray-300' : 'text-gray-400'}>
                        {formatHora(h.apertura)} – {formatHora(h.cierre)}
                      </span>
                    )}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
