'use client'

import { useState, useEffect } from 'react'
import { NegocioSolidario, HorarioDia } from '@/lib/supabase'
import { MapPin, Clock, AtSign, Globe, Store, Calendar, ChevronDown } from 'lucide-react'
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

const TIPOS: Record<string, string> = {
  restaurante: 'Restaurante',
  tienda: 'Tienda',
  empresa: 'Empresa',
  cafe: 'Café',
  bar: 'Bar',
  otro: 'Otro',
}

type Props = {
  negocio: NegocioSolidario
  seleccionado?: boolean
  onClick?: () => void
}

export default function TarjetaNegocio({ negocio, seleccionado, onClick }: Props) {
  const [abierto, setAbierto] = useState(false)
  const nivel = urgencia(negocio.fecha_fin)

  useEffect(() => {
    if (seleccionado) setAbierto(true)
  }, [seleccionado])

  function handleClick() {
    setAbierto(p => !p)
    onClick?.()
  }

  const borderClass = seleccionado
    ? 'border-yellow-400 shadow-md shadow-yellow-100 ring-2 ring-yellow-200 ring-offset-1'
    : nivel === 'urgente'
    ? 'border-red-200 shadow-sm hover:shadow-md'
    : nivel === 'proximo'
    ? 'border-yellow-200 shadow-sm hover:shadow-md'
    : nivel === 'expirado'
    ? 'border-gray-100 opacity-50'
    : 'border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200'

  return (
    <div
      onClick={handleClick}
      className={`cursor-pointer bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${borderClass}`}
    >
      {/* Header — siempre visible */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
          <Store size={16} className="text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{negocio.nombre}</p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {negocio.zona} · {TIPOS[negocio.tipo] ?? negocio.tipo}
          </p>
        </div>
        <ChevronDown
          size={15}
          className={`text-gray-300 shrink-0 transition-transform duration-300 ${abierto ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Contenido desplegable */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${abierto ? 'max-h-[600px]' : 'max-h-0'}`}>
        <div className="border-t border-gray-100 px-4 pt-3 pb-4 flex flex-col gap-3">

          {/* Iniciativa */}
          <p className="text-sm text-gray-700 leading-relaxed">{negocio.iniciativa}</p>

          {/* Dirección */}
          {(negocio.zona || negocio.direccion) && (
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin size={13} className="text-amber-400 mt-0.5 shrink-0" />
              <span>{negocio.zona}{negocio.direccion ? ` — ${negocio.direccion}` : ''}</span>
            </div>
          )}

          {/* Horario */}
          {negocio.horarios && negocio.horarios.length > 0 && (
            <div className="flex items-start gap-2">
              <Clock size={13} className="text-amber-400 mt-0.5 shrink-0" />
              <div className="flex flex-col gap-0.5">
                {agruparHorarios(negocio.horarios).map((g, i) => (
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
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar size={13} className="text-amber-400 shrink-0" />
              <span>
                Desde {new Date(negocio.fecha_inicio).toLocaleDateString('es-PA', { day: 'numeric', month: 'long' })}
              </span>
            </div>
          )}

          {/* Vigencia */}
          {negocio.vigencia && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock size={13} className="text-amber-400 shrink-0" />
              <span>Vigencia: {negocio.vigencia}</span>
            </div>
          )}

          {/* Countdown */}
          {negocio.fecha_fin && <CountdownTimer fechaFin={negocio.fecha_fin} />}

          {/* Links */}
          {(negocio.instagram || negocio.sitio_web) && (
            <div className="flex gap-2 pt-0.5" onClick={e => e.stopPropagation()}>
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
    </div>
  )
}
