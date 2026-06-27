'use client'

import { CentroAcopio, HorarioDia } from '@/lib/supabase'
import { ChevronRight, Clock } from 'lucide-react'

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
  const ms = toPanamaUTC(fechaFin) - Date.now()
  const h = ms / 3600000
  if (h < 1) return `Termina en ${Math.max(1, Math.round(ms / 60000))}m`
  if (h < 24) return `Termina en ${Math.round(h)}h`
  return `Termina en ${Math.ceil(h / 24)}d`
}

function terminaLabel(fechaFin: string): string {
  const p = new Date(Date.now() - 5 * 60 * 60 * 1000)
  const [y, mo, d] = fechaFin.slice(0, 10).split('-').map(Number)
  if (y === p.getUTCFullYear() && mo - 1 === p.getUTCMonth() && d === p.getUTCDate()) return 'Termina hoy'
  const man = new Date(Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate() + 1))
  if (y === man.getUTCFullYear() && mo - 1 === man.getUTCMonth() && d === man.getUTCDate()) return 'Termina mañana'
  const fecha = new Date(fechaFin.slice(0, 10) + 'T12:00:00Z')
    .toLocaleDateString('es-PA', { weekday: 'short', day: 'numeric', month: 'short' })
  return `Termina el ${fecha}`
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
function diaPasado(dia: string) { return DIAS_ORDEN.indexOf(dia) < hoyPanamaIdx() }
function numDiaMes(dia: string, fechaFin: string): number | null {
  const fin = new Date(fechaFin.slice(0, 10) + 'T12:00:00Z')
  for (let i = 6; i >= 0; i--) {
    const d = new Date(fin.getTime() - i * 86400000)
    if (DIAS_JS[d.getUTCDay()] === dia) return d.getUTCDate()
  }
  return null
}

function toMin(h: number, m: number) { return h === 0 && m === 0 ? 1440 : h * 60 + m }

function estaAbiertoAhora(horarios: HorarioDia[]): boolean {
  const p = new Date(Date.now() - 5 * 60 * 60 * 1000)
  const diasJS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const hoyIdx = p.getUTCDay()
  const min = p.getUTCHours() * 60 + p.getUTCMinutes()

  const hoyEntry = horarios.find(h => h.dia === diasJS[hoyIdx])
  if (hoyEntry?.apertura && hoyEntry?.cierre) {
    const [ha, ma] = hoyEntry.apertura.split(':').map(Number)
    const [hc, mc] = hoyEntry.cierre.split(':').map(Number)
    const ap = ha * 60 + ma
    const ci = toMin(hc, mc)
    if (ci > ap) { if (min >= ap && min < ci) return true }
    else { if (min >= ap) return true }
  }

  const ayerEntry = horarios.find(h => h.dia === diasJS[(hoyIdx + 6) % 7])
  if (ayerEntry?.apertura && ayerEntry?.cierre) {
    const [ha, ma] = ayerEntry.apertura.split(':').map(Number)
    const [hc, mc] = ayerEntry.cierre.split(':').map(Number)
    const ap = ha * 60 + ma
    const ci = toMin(hc, mc)
    if (ci <= ap && min < ci) return true
  }

  return false
}

function proximaApertura(horarios: HorarioDia[]): string | null {
  const p = new Date(Date.now() - 5 * 60 * 60 * 1000)
  const diasJS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const hoyIdx = p.getUTCDay()
  const minActual = p.getUTCHours() * 60 + p.getUTCMinutes()
  for (let i = 0; i < 7; i++) {
    const diaNombre = diasJS[(hoyIdx + i) % 7]
    const entrada = horarios.find(h => h.dia === diaNombre)
    if (!entrada?.apertura) continue
    const [ha, ma] = entrada.apertura.split(':').map(Number)
    const ap = ha * 60 + ma
    if (i === 0) {
      const [hc, mc] = (entrada.cierre || '00:00').split(':').map(Number)
      const ci = toMin(hc, mc)
      const overnight = ci <= ap
      if (overnight) {
        if (minActual >= ap) continue
        if (minActual < ci) continue
      } else {
        if (minActual >= ci) continue
        if (minActual >= ap) continue
      }
    }
    const hora = formatHora(entrada.apertura)
    if (i === 0) return `Abre hoy a las ${hora}`
    if (i === 1) return `Abre mañana a las ${hora}`
    return `Abre el ${diaNombre} a las ${hora}`
  }
  return null
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
  const cerrado = !!centro.cerrado || (!!centro.fecha_fin && toPanamaUTC(centro.fecha_fin) <= Date.now())

  const tieneHorarios = !!centro.horarios && centro.horarios.length > 0
  const tieneFechaFin = !!centro.fecha_fin
  const abiertoAhora = !cerrado && tieneHorarios && nivel !== 'expirado'
    ? estaAbiertoAhora(centro.horarios!)
    : null

  const dotColor = cerrado
    ? 'bg-red-400'
    : abiertoAhora === false
    ? 'bg-slate-300'
    : nivel === 'urgente'
    ? 'bg-red-400 animate-pulse'
    : nivel === 'proximo'
    ? 'bg-amber-400'
    : 'bg-emerald-400'

  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer bg-white rounded-2xl border transition-all duration-150 overflow-hidden active:scale-[0.985]
        ${seleccionado
          ? 'border-red-300 shadow-[0_2px_12px_rgba(239,68,68,0.12)] ring-1 ring-red-200'
          : 'border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] hover:border-gray-200'}
        ${cerrado ? 'opacity-50' : ''}
      `}
    >
      <div className="px-4 py-3.5">

        {/* Fila nombre + badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`shrink-0 w-2 h-2 rounded-full mt-[3px] ${dotColor}`} />
            <p className={`font-semibold text-[15px] leading-snug truncate ${cerrado ? 'line-through text-gray-300' : 'text-gray-900'}`}>
              {centro.nombre}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            {cerrado && (
              <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-100">
                Cerrado
              </span>
            )}
            {!cerrado && abiertoAhora === true && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                Abierto
              </span>
            )}
            {!cerrado && abiertoAhora === false && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-50 text-gray-400 border border-gray-100">
                Cerrado ahora
              </span>
            )}
            {!cerrado && tieneFechaFin && (nivel === 'urgente' || nivel === 'proximo') && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                nivel === 'urgente'
                  ? 'bg-red-50 text-red-500 border-red-100'
                  : 'bg-amber-50 text-amber-600 border-amber-100'
              }`}>
                <Clock size={8} />
                {(centro.consultar_horarios || centro.todas_sucursales)
                  ? terminaLabel(centro.fecha_fin!)
                  : countdownCorto(centro.fecha_fin!)}
              </span>
            )}
            {!cerrado && !!centro.consultar_horarios && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-50 text-gray-400 border border-gray-100 flex items-center gap-1">
                <Clock size={8} /> Consultar horario
              </span>
            )}
            {!cerrado && !tieneHorarios && !centro.consultar_horarios && abiertoAhora === null && (
              <span className="text-[10px] text-gray-300 flex items-center gap-1">
                <Clock size={9} /> Ver horario
              </span>
            )}
            <ChevronRight size={15} className="text-gray-300 group-hover:text-gray-400 transition-colors" />
          </div>
        </div>

        {/* Meta: zona · sucursales */}
        <div className="flex items-center gap-2 mt-1 ml-[18px] flex-wrap">
          {centro.zona && <p className="text-xs text-gray-400">{centro.zona}</p>}
          {centro.todas_sucursales && (
            <span className="text-[10px] font-medium px-1.5 py-px rounded-md bg-blue-50 text-blue-400">Todas las sucursales</span>
          )}
          {!centro.todas_sucursales && centro.sucursales && centro.sucursales.length > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-px rounded-md bg-blue-50 text-blue-400">
              {centro.sucursales.length} sucursal{centro.sucursales.length > 1 ? 'es' : ''}
            </span>
          )}
        </div>

        {/* Próxima apertura */}
        {!cerrado && abiertoAhora === false && tieneHorarios && (() => {
          const prox = proximaApertura(centro.horarios!)
          return prox ? (
            <p className="text-[10px] text-gray-400 mt-1.5 ml-[18px]">{prox}</p>
          ) : null
        })()}

        {/* Insumos aceptados */}
        {preview.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2.5 ml-[18px]">
            {preview.map(item => (
              <span key={item} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                cerrado ? 'bg-gray-50 text-gray-300' : 'bg-slate-50 text-slate-500 border border-slate-100'
              }`}>
                {item}
              </span>
            ))}
            {extra > 0 && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full text-gray-400">
                +{extra} más
              </span>
            )}
          </div>
        )}

        {/* Horarios */}
        {!cerrado && tieneHorarios && (
          <div className="mt-2.5 ml-[18px] flex flex-col gap-0.5">
            {centro.horarios!.map(h => {
              const pasado = tieneFechaFin && diaPasado(h.dia)
              const ndm = tieneFechaFin ? numDiaMes(h.dia, centro.fecha_fin!) : null
              return (
                <div key={h.dia} className={`flex gap-3 text-[11px] ${pasado ? 'line-through text-gray-300' : 'text-gray-500'}`}>
                  <span className="font-medium w-14 shrink-0">{h.dia}{ndm != null ? ` ${ndm}` : ''}</span>
                  {h.apertura && h.cierre && (
                    <span className={pasado ? 'text-gray-300' : 'text-gray-400'}>
                      {formatHora(h.apertura)} – {formatHora(h.cierre)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
