'use client'

import { CentroAcopio } from '@/lib/supabase'
import { Clock, MapPin, Package, Navigation, Calendar } from 'lucide-react'
import CountdownTimer from './CountdownTimer'

type Props = {
  centro: CentroAcopio
  seleccionado?: boolean
  onClick: () => void
}

function formatHora(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`
}

function urgencia(fechaFin?: string) {
  if (!fechaFin) return 'normal'
  const h = (new Date(fechaFin).getTime() - Date.now()) / 3600000
  if (h <= 0) return 'expirado'
  if (h < 24) return 'urgente'
  if (h < 48) return 'proximo'
  return 'normal'
}

export default function TarjetaCentro({ centro, seleccionado, onClick }: Props) {
  const wazeUrl = `https://waze.com/ul?ll=${centro.lat},${centro.lng}&navigate=yes`
  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${centro.lat},${centro.lng}`
  const nivel = urgencia(centro.fecha_fin)

  const borderClass = seleccionado
    ? 'border-red-500 bg-red-50 shadow-md'
    : nivel === 'urgente'
    ? 'border-red-400 bg-red-50 hover:shadow-sm'
    : nivel === 'proximo'
    ? 'border-yellow-400 bg-yellow-50 hover:shadow-sm'
    : nivel === 'expirado'
    ? 'border-gray-200 bg-gray-50 opacity-60'
    : 'border-gray-200 bg-white hover:border-red-300 hover:shadow-sm'

  return (
    <div onClick={onClick} className={`cursor-pointer rounded-xl border p-4 transition-all ${borderClass}`}>
      <h3 className="font-bold text-gray-900 text-base leading-tight">{centro.nombre}</h3>

      <div className="mt-2 flex items-start gap-1.5 text-sm text-gray-600">
        <MapPin size={14} className="mt-0.5 shrink-0 text-red-500" />
        <span>{centro.direccion}</span>
      </div>

      {(centro.dias_abierto && centro.dias_abierto.length > 0) && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
          <Clock size={13} className="shrink-0 text-red-400" />
          <span>
            {centro.dias_abierto.join(' · ')}
            {(centro.hora_apertura || centro.hora_cierre) && (
              <> &nbsp;{centro.hora_apertura && formatHora(centro.hora_apertura)}{centro.hora_cierre && ` – ${formatHora(centro.hora_cierre)}`}</>
            )}
          </span>
        </div>
      )}
      {centro.fecha_inicio && (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
          <Calendar size={13} className="shrink-0 text-red-400" />
          <span>Desde {new Date(centro.fecha_inicio).toLocaleDateString('es-PA', { day: 'numeric', month: 'short' })}</span>
        </div>
      )}

      {centro.que_acepta.length > 0 && (
        <div className="mt-2 flex items-start gap-1.5">
          <Package size={14} className="mt-0.5 shrink-0 text-red-500" />
          <div className="flex flex-wrap gap-1">
            {centro.que_acepta.map((item) => (
              <span key={item} className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {centro.notas && (
        <p className="mt-2 text-xs text-gray-500 italic">{centro.notas}</p>
      )}

      {centro.fecha_fin && <CountdownTimer fechaFin={centro.fecha_fin} />}

      <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
        <a href={wazeUrl} target="_blank" rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#33CCFF] py-2 text-xs font-bold text-white hover:opacity-90 transition-opacity">
          <Navigation size={13} /> Waze
        </a>
        <a href={gmapsUrl} target="_blank" rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#4285F4] py-2 text-xs font-bold text-white hover:opacity-90 transition-opacity">
          <Navigation size={13} /> Google Maps
        </a>
      </div>
    </div>
  )
}
