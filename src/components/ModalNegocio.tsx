'use client'

import { NegocioSolidario, HorarioDia } from '@/lib/supabase'
import { X, MapPin, Clock, Calendar, AtSign, Globe, Store } from 'lucide-react'
import CountdownTimer from './CountdownTimer'

function formatHora(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`
}

function agruparHorarios(horarios: HorarioDia[]) {
  const map = new Map<string, string[]>()
  for (const h of horarios) {
    const key = `${h.apertura}|${h.cierre}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(h.dia)
  }
  return Array.from(map.entries()).map(([key, dias]) => {
    const [ap, ci] = key.split('|')
    return { dias, horas: ap && ci ? `${formatHora(ap)} – ${formatHora(ci)}` : '' }
  })
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
  const horarios = negocio.horarios && negocio.horarios.length > 0 ? agruparHorarios(negocio.horarios) : []

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
        style={{ maxHeight: '90vh' }}
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-1">Iniciativa solidaria</p>
            <p className="text-sm font-semibold text-gray-800 leading-relaxed">{negocio.iniciativa}</p>
          </div>

          {/* Dirección */}
          {(negocio.direccion || negocio.zona) && (
            <div className="flex items-start gap-2.5 text-sm text-gray-600">
              <MapPin size={15} className="text-amber-400 mt-0.5 shrink-0" />
              <span>{negocio.zona}{negocio.direccion ? ` — ${negocio.direccion}` : ''}</span>
            </div>
          )}

          {/* Horario */}
          {horarios.length > 0 && (
            <div className="flex items-start gap-2.5">
              <Clock size={15} className="text-amber-400 mt-0.5 shrink-0" />
              <div className="flex flex-col gap-0.5">
                {horarios.map((g, i) => (
                  <span key={i} className="text-sm text-gray-600">
                    {g.dias.join(' · ')}
                    {g.horas && <span className="text-gray-400 ml-2">{g.horas}</span>}
                  </span>
                ))}
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
            <>
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <Clock size={15} className="text-amber-400 shrink-0" />
                <span>
                  Termina el{' '}
                  <span className="font-semibold">
                    {new Date(negocio.fecha_fin).toLocaleDateString('es-PA', {
                      weekday: 'long', day: 'numeric', month: 'long',
                    })}
                  </span>
                </span>
              </div>
              <CountdownTimer fechaFin={negocio.fecha_fin} label="Iniciativa termina" />
            </>
          )}
        </div>

        {/* Footer — links */}
        {(negocio.instagram || negocio.sitio_web) && (
          <div className="p-4 pt-3 border-t border-gray-100 flex gap-2">
            {negocio.instagram && (
              <a
                href={`https://instagram.com/${negocio.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 py-2.5 text-xs font-bold text-white hover:opacity-90 transition-opacity"
              >
                <AtSign size={13} />
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
    </div>
  )
}
