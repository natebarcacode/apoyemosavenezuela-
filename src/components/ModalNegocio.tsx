'use client'

import { NegocioSolidario, HorarioDia } from '@/lib/supabase'
import { X, MapPin, Clock, Calendar, Globe, Store } from 'lucide-react'
import { InstagramIcon, WazeIcon, GoogleMapsIcon } from './BrandIcons'
import CountdownTimer from './CountdownTimer'

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

const TIPOS: Record<string, string> = {
  restaurante: 'Restaurante', tienda: 'Tienda', empresa: 'Empresa',
  cafe: 'Café', bar: 'Bar', otro: 'Otro',
}

type Props = {
  negocio: NegocioSolidario
  onClose: () => void
}

export default function ModalNegocio({ negocio, onClose }: Props) {
  const horarios = negocio.horarios ?? []
  const tieneFechaFin = !!negocio.fecha_fin

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '92dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
            <Store size={18} className="text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900 text-base leading-tight">{negocio.nombre}</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="rounded-full bg-amber-50 border border-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-600">
                {TIPOS[negocio.tipo] ?? negocio.tipo}
              </span>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                {negocio.zona}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0"
          >
            <X size={14} className="text-gray-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-4" style={{ scrollbarWidth: 'thin' }}>

          {/* Iniciativa */}
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-1">Iniciativa</p>
            <p className="text-sm font-semibold text-gray-800 leading-relaxed">{negocio.iniciativa}</p>
          </div>

          {/* Zona */}
          <div className="flex items-center gap-2.5 text-sm text-gray-600">
            <MapPin size={15} className="text-amber-400 shrink-0" />
            <span>{negocio.zona}</span>
          </div>

          {/* Horario */}
          {horarios.length > 0 && (
            <div className="flex items-start gap-2.5">
              <Clock size={15} className="text-amber-400 mt-1 shrink-0" />
              <div className="flex flex-col gap-1">
                {horarios.map(h => {
                  const pasado = tieneFechaFin && diaPasado(h.dia)
                  const ndm = tieneFechaFin ? numDiaMes(h.dia, negocio.fecha_fin!) : null
                  return (
                    <div key={h.dia} className={`flex gap-3 text-sm ${pasado ? 'line-through text-gray-300' : 'text-gray-700'}`}>
                      <span className="font-semibold w-16 shrink-0">
                        {h.dia}{ndm != null ? ` ${ndm}` : ''}
                      </span>
                      {h.apertura && h.cierre && (
                        <span className={pasado ? 'text-gray-300' : 'text-gray-400'}>
                          {formatHora(h.apertura)} – {formatHora(h.cierre)}
                        </span>
                      )}
                    </div>
                  )
                })}
                {!tieneFechaFin && (
                  <span className="text-[11px] text-gray-400 mt-0.5">Horario semanal recurrente</span>
                )}
              </div>
            </div>
          )}

          {/* Fecha inicio */}
          {negocio.fecha_inicio && (
            <div className="flex items-center gap-2.5 text-sm text-gray-500">
              <Calendar size={15} className="text-amber-400 shrink-0" />
              <span>
                Desde {new Date(negocio.fecha_inicio).toLocaleDateString('es-PA', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          )}

          {/* Vigencia — solo si no hay fecha_fin exacta */}
          {negocio.vigencia && !negocio.fecha_fin && (
            <div className="flex items-center gap-2.5 text-sm text-gray-500">
              <Clock size={15} className="text-amber-400 shrink-0" />
              <span>{negocio.vigencia}</span>
            </div>
          )}

          {/* Fecha exacta de cierre + countdown */}
          {negocio.fecha_fin && (
            <CountdownTimer
              fechaFin={negocio.fecha_fin}
              label={`Termina el ${new Date(negocio.fecha_fin).toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long' })} ·`}
            />
          )}
        </div>

        {/* Footer — navegación + redes */}
        {(negocio.lat || negocio.instagram || negocio.sitio_web) && (
          <div className="p-4 pt-3 border-t border-gray-100 flex flex-col gap-2">
          {negocio.lat && negocio.lng && (
            <div className="flex gap-2">
              <a href={`https://waze.com/ul?ll=${negocio.lat},${negocio.lng}&navigate=yes`}
                target="_blank" rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white hover:opacity-90 transition-opacity"
                style={{ background: '#00D4E4' }}>
                <WazeIcon className="w-4 h-4" /> Waze
              </a>
              <a href={`https://www.google.com/maps?q=${negocio.lat},${negocio.lng}`}
                target="_blank" rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white hover:opacity-90 transition-opacity"
                style={{ background: '#4285F4' }}>
                <GoogleMapsIcon className="w-4 h-4" /> Google Maps
              </a>
            </div>
          )}
          {(negocio.instagram || negocio.sitio_web) && (
          <div className="flex gap-2">
            {negocio.instagram && (
              <a
                href={`https://instagram.com/${negocio.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white hover:opacity-90 transition-opacity"
                style={{ background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}
              >
                <InstagramIcon className="w-4 h-4" />
                {negocio.instagram.startsWith('@') ? negocio.instagram : `@${negocio.instagram}`}
              </a>
            )}
            {negocio.sitio_web && (
              <a
                href={negocio.sitio_web}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-800 py-2.5 text-xs font-bold text-white hover:opacity-90 transition-opacity"
              >
                <Globe size={13} /> Sitio web
              </a>
            )}
          </div>
          )}
          </div>
        )}
      </div>
    </div>
  )
}
