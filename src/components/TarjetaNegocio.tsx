'use client'

import { NegocioSolidario } from '@/lib/supabase'
import { MapPin, Clock, AtSign, Globe, Store, Calendar } from 'lucide-react'

function formatHora(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`
}
import CountdownTimer from './CountdownTimer'

const TIPOS: Record<string, string> = {
  restaurante: 'Restaurante',
  tienda: 'Tienda',
  empresa: 'Empresa',
  cafe: 'Café',
  bar: 'Bar',
  otro: 'Otro',
}

function urgencia(fechaFin?: string) {
  if (!fechaFin) return 'normal'
  const h = (new Date(fechaFin).getTime() - Date.now()) / 3600000
  if (h <= 0) return 'expirado'
  if (h < 24) return 'urgente'
  if (h < 48) return 'proximo'
  return 'normal'
}

type Props = { negocio: NegocioSolidario }

export default function TarjetaNegocio({ negocio }: Props) {
  const nivel = urgencia(negocio.fecha_fin)

  const borderClass = nivel === 'urgente'
    ? 'border-red-400 bg-red-50'
    : nivel === 'proximo'
    ? 'border-yellow-400 bg-yellow-50'
    : nivel === 'expirado'
    ? 'border-gray-200 bg-gray-50 opacity-60'
    : 'border-gray-200 bg-white hover:border-yellow-300 hover:shadow-sm'

  return (
    <div className={`rounded-xl border p-4 transition-all ${borderClass}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-gray-900 text-base leading-tight">{negocio.nombre}</h3>
        <span className="shrink-0 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700 flex items-center gap-1">
          <Store size={11} />
          {TIPOS[negocio.tipo] ?? negocio.tipo}
        </span>
      </div>

      <p className="mt-2 text-sm text-gray-700 leading-snug">{negocio.iniciativa}</p>

      <div className="mt-3 flex flex-col gap-1.5">
        {negocio.zona && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin size={12} className="text-yellow-500 shrink-0" />
            <span>{negocio.zona}{negocio.direccion ? ` — ${negocio.direccion}` : ''}</span>
          </div>
        )}
        {negocio.dias_abierto && negocio.dias_abierto.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock size={12} className="text-yellow-500 shrink-0" />
            <span>
              {negocio.dias_abierto.join(' · ')}
              {(negocio.hora_apertura || negocio.hora_cierre) && (
                <> &nbsp;{negocio.hora_apertura && formatHora(negocio.hora_apertura)}{negocio.hora_cierre && ` – ${formatHora(negocio.hora_cierre)}`}</>
              )}
            </span>
          </div>
        )}
        {negocio.fecha_inicio && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar size={12} className="text-yellow-500 shrink-0" />
            <span>Desde {new Date(negocio.fecha_inicio).toLocaleDateString('es-PA', { day: 'numeric', month: 'short' })}</span>
          </div>
        )}
        {negocio.vigencia && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock size={12} className="text-yellow-500 shrink-0" />
            <span>Válido: {negocio.vigencia}</span>
          </div>
        )}
      </div>

      {negocio.fecha_fin && <CountdownTimer fechaFin={negocio.fecha_fin} />}

      {(negocio.instagram || negocio.sitio_web) && (
        <div className="mt-3 flex gap-2">
          {negocio.instagram && (
            <a href={`https://instagram.com/${negocio.instagram.replace('@', '')}`}
              target="_blank" rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 py-2 text-xs font-bold text-white hover:opacity-90 transition-opacity">
              <AtSign size={13} />
              {negocio.instagram.startsWith('@') ? negocio.instagram : `@${negocio.instagram}`}
            </a>
          )}
          {negocio.sitio_web && (
            <a href={negocio.sitio_web} target="_blank" rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gray-700 py-2 text-xs font-bold text-white hover:opacity-90 transition-opacity">
              <Globe size={13} /> Sitio web
            </a>
          )}
        </div>
      )}
    </div>
  )
}
