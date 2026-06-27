'use client'

import { NegocioSolidario, HorarioDia } from '@/lib/supabase'
import { ChevronRight, Clock, MapPin } from 'lucide-react'

function urgencia(fechaFin?: string) {
  if (!fechaFin) return 'normal'
  const fin = new Date(fechaFin).getTime()
  const now = Date.now()
  if (fin <= now) return 'expirado'
  const h = (fin - now) / 3600000
  if (h < 24) return 'urgente'
  if (h < 72) return 'proximo'
  return 'normal'
}

function countdownCorto(fechaFin: string) {
  const h = (new Date(fechaFin).getTime() - Date.now()) / 3600000
  if (h < 24) return `Cierra en ${Math.round(h)}h`
  const d = Math.ceil(h / 24)
  return `Cierra en ${d}d`
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

const TIPOS: Record<string, string> = {
  restaurante: 'Restaurante', tienda: 'Tienda', empresa: 'Empresa',
  cafe: 'Café', bar: 'Bar', otro: 'Negocio',
}

type Props = {
  negocio: NegocioSolidario
  seleccionado?: boolean
  onClick?: () => void
}

export default function TarjetaNegocio({ negocio, seleccionado, onClick }: Props) {
  const nivel = urgencia(negocio.fecha_fin)
  const cerrado = !negocio.activo

  const tieneHorarios = !!negocio.horarios && negocio.horarios.length > 0
  const tieneFechaFin = !!negocio.fecha_fin
  const abiertoAhora = !cerrado && tieneHorarios && !tieneFechaFin
    ? estaAbiertoAhora(negocio.horarios!)
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
        ${seleccionado ? 'border-amber-300 shadow-md ring-2 ring-amber-100' : 'border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'}
        ${cerrado ? 'opacity-60' : nivel === 'expirado' ? 'opacity-40' : ''}
      `}
    >
      <div className="px-4 py-3">
        {/* Fila principal */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`shrink-0 w-2 h-2 rounded-full ${dotColor}`} />
            <p className={`font-bold text-sm truncate ${cerrado ? 'line-through text-gray-400' : 'text-gray-900'}`}>{negocio.nombre}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {cerrado && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500">
                Cerrado
              </span>
            )}
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
            {!cerrado && tieneFechaFin && (nivel === 'urgente' || nivel === 'proximo') && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                nivel === 'urgente' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'
              }`}>
                <Clock size={8} className="inline mr-0.5" />
                {countdownCorto(negocio.fecha_fin!)}
              </span>
            )}
            {!cerrado && !tieneFechaFin && !tieneHorarios && (
              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                <Clock size={9} />
                Ver horarios
              </span>
            )}
            <ChevronRight size={16} className="text-gray-400" />
          </div>
        </div>

        {/* Zona + tipo */}
        <div className="flex items-center gap-1 mt-0.5 ml-4">
          <MapPin size={10} className="text-gray-300 shrink-0" />
          <p className="text-xs text-gray-400">{negocio.zona} · {TIPOS[negocio.tipo] ?? negocio.tipo}</p>
        </div>

        {/* Iniciativa */}
        {negocio.iniciativa && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-1.5 mt-2.5 ml-4 line-clamp-2 leading-relaxed">
            {negocio.iniciativa}
          </p>
        )}

        {/* Horarios en la tarjeta */}
        {!cerrado && tieneHorarios && (
          <div className="flex items-start gap-1.5 mt-2.5 ml-4">
            <Clock size={10} className="text-gray-300 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              {negocio.horarios!.map(h => {
                const pasado = tieneFechaFin && diaPasado(h.dia)
                const ndm = tieneFechaFin ? numDiaMes(h.dia, negocio.fecha_fin!) : null
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
