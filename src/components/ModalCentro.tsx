'use client'

import { CentroAcopio, HorarioDia, Categoria } from '@/lib/supabase'
import { X, MapPin, Clock, Calendar, Navigation, Package } from 'lucide-react'
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

type Props = {
  centro: CentroAcopio
  categorias: Categoria[]
  onClose: () => void
}

export default function ModalCentro({ centro, categorias, onClose }: Props) {
  const wazeUrl = `https://waze.com/ul?ll=${centro.lat},${centro.lng}&navigate=yes`
  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${centro.lat},${centro.lng}`

  // Group accepted items by their category group
  const aceptadasConInfo = categorias.filter(c => centro.que_acepta.includes(c.nombre))
  const porGrupo = aceptadasConInfo.reduce<Record<string, string[]>>((acc, c) => {
    const g = c.grupo || 'General'
    if (!acc[g]) acc[g] = []
    acc[g].push(c.nombre)
    return acc
  }, {})
  // Items not found in categorias (edge case)
  const sinCategoria = centro.que_acepta.filter(n => !aceptadasConInfo.find(c => c.nombre === n))
  if (sinCategoria.length > 0) porGrupo['General'] = [...(porGrupo['General'] ?? []), ...sinCategoria]

  const horarios = centro.horarios && centro.horarios.length > 0 ? agruparHorarios(centro.horarios) : []

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
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
            <Package size={18} className="text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900 text-base leading-tight">{centro.nombre}</h2>
            <span className="inline-block mt-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
              {centro.zona}
            </span>
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

          {/* Dirección */}
          <div className="flex items-start gap-2.5 text-sm text-gray-600">
            <MapPin size={15} className="text-red-400 mt-0.5 shrink-0" />
            <span>{centro.direccion}</span>
          </div>

          {/* Horario */}
          {horarios.length > 0 && (
            <div className="flex items-start gap-2.5">
              <Clock size={15} className="text-red-400 mt-0.5 shrink-0" />
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

          {/* Desde */}
          {centro.fecha_inicio && (
            <div className="flex items-center gap-2.5 text-sm text-gray-500">
              <Calendar size={15} className="text-red-400 shrink-0" />
              <span>
                Desde {new Date(centro.fecha_inicio).toLocaleDateString('es-PA', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          )}

          {/* Countdown */}
          {centro.fecha_fin && <CountdownTimer fechaFin={centro.fecha_fin} label="Iniciativa termina" />}

          {/* Notas */}
          {centro.notas && (
            <p className="text-xs text-gray-500 italic bg-gray-50 rounded-xl px-3.5 py-2.5 leading-relaxed">
              {centro.notas}
            </p>
          )}

          {/* Acepta — agrupado por categoría */}
          {Object.keys(porGrupo).length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Acepta</p>
              <div className="flex flex-col gap-3">
                {Object.entries(porGrupo).map(([grupo, items]) => (
                  <div key={grupo}>
                    <p className="text-xs font-semibold text-gray-500 mb-1.5">{grupo}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map(item => (
                        <span
                          key={item}
                          className="rounded-full bg-red-50 border border-red-100 px-2.5 py-1 text-xs text-red-600 leading-none"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer — navigation buttons */}
        <div className="p-4 pt-3 border-t border-gray-100 flex gap-2">
          <a
            href={wazeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#33CCFF] py-2.5 text-xs font-bold text-white hover:opacity-90 transition-opacity"
          >
            <Navigation size={13} /> Waze
          </a>
          <a
            href={gmapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#4285F4] py-2.5 text-xs font-bold text-white hover:opacity-90 transition-opacity"
          >
            <Navigation size={13} /> Google Maps
          </a>
        </div>
      </div>
    </div>
  )
}
