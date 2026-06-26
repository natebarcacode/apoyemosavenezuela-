'use client'

import { useState, useEffect } from 'react'
import { CentroAcopio, HorarioDia } from '@/lib/supabase'
import { Clock, MapPin, Package, Navigation, Calendar, ChevronDown } from 'lucide-react'
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
    const horas = ap && ci ? `${formatHora(ap)} – ${formatHora(ci)}` : ''
    return { dias, horas }
  })
}

function urgencia(fechaFin?: string) {
  if (!fechaFin) return 'normal'
  const h = (new Date(fechaFin).getTime() - Date.now()) / 3600000
  if (h <= 0) return 'expirado'
  if (h < 24) return 'urgente'
  if (h < 48) return 'proximo'
  return 'normal'
}

type Props = {
  centro: CentroAcopio
  seleccionado?: boolean
  onClick: () => void
}

export default function TarjetaCentro({ centro, seleccionado, onClick }: Props) {
  const [abierto, setAbierto] = useState(false)
  const nivel = urgencia(centro.fecha_fin)
  const wazeUrl = `https://waze.com/ul?ll=${centro.lat},${centro.lng}&navigate=yes`
  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${centro.lat},${centro.lng}`

  useEffect(() => {
    if (seleccionado) setAbierto(true)
  }, [seleccionado])

  function handleClick() {
    setAbierto(p => !p)
    onClick()
  }

  const borderClass = seleccionado
    ? 'border-red-400 shadow-md shadow-red-100 ring-2 ring-red-200 ring-offset-1'
    : nivel === 'urgente'
    ? 'border-red-200 shadow-sm hover:shadow-md'
    : nivel === 'proximo'
    ? 'border-yellow-200 shadow-sm hover:shadow-md'
    : nivel === 'expirado'
    ? 'border-gray-100 opacity-50'
    : 'border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200'

  const iconBg = nivel === 'urgente' ? 'bg-red-100' : nivel === 'proximo' ? 'bg-yellow-100' : 'bg-red-50'
  const iconColor = nivel === 'proximo' ? 'text-yellow-500' : 'text-red-500'

  return (
    <div
      onClick={handleClick}
      className={`cursor-pointer bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${borderClass}`}
    >
      {/* Header — siempre visible */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
          <Package size={16} className={iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-tight">{centro.nombre}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {centro.zona}
            {centro.que_acepta.length > 0 && (
              <span className="ml-1.5 text-gray-300">· {centro.que_acepta.length} insumos</span>
            )}
          </p>
        </div>
        <ChevronDown
          size={15}
          className={`text-gray-300 shrink-0 transition-transform duration-300 ${abierto ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Contenido desplegable */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${abierto ? 'max-h-[700px]' : 'max-h-0'}`}>
        <div className="border-t border-gray-100 px-4 pt-3 pb-4 flex flex-col gap-3">

          {/* Dirección */}
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <MapPin size={13} className="text-red-400 mt-0.5 shrink-0" />
            <span>{centro.direccion}</span>
          </div>

          {/* Horario */}
          {centro.horarios && centro.horarios.length > 0 && (
            <div className="flex items-start gap-2">
              <Clock size={13} className="text-red-400 mt-0.5 shrink-0" />
              <div className="flex flex-col gap-0.5">
                {agruparHorarios(centro.horarios).map((g, i) => (
                  <span key={i} className="text-sm text-gray-600">
                    {g.dias.join(' · ')}
                    {g.horas && <span className="text-gray-400 ml-2">{g.horas}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Fecha inicio */}
          {centro.fecha_inicio && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar size={13} className="text-red-400 shrink-0" />
              <span>
                Desde {new Date(centro.fecha_inicio).toLocaleDateString('es-PA', { day: 'numeric', month: 'long' })}
              </span>
            </div>
          )}

          {/* Insumos */}
          {centro.que_acepta.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Acepta</p>
              <div className="flex flex-wrap gap-1.5">
                {centro.que_acepta.map(item => (
                  <span
                    key={item}
                    className="rounded-full bg-red-50 border border-red-100 px-2.5 py-0.5 text-xs font-medium text-red-600"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notas */}
          {centro.notas && (
            <p className="text-xs text-gray-500 italic bg-gray-50 rounded-xl px-3 py-2.5 leading-relaxed">
              {centro.notas}
            </p>
          )}

          {/* Countdown */}
          {centro.fecha_fin && <CountdownTimer fechaFin={centro.fecha_fin} />}

          {/* Navegación */}
          <div className="flex gap-2 pt-0.5" onClick={e => e.stopPropagation()}>
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
    </div>
  )
}
