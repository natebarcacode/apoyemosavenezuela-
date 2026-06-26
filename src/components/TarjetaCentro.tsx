'use client'

import { CentroAcopio } from '@/lib/supabase'
import { Clock, MapPin, Package, Navigation } from 'lucide-react'

type Props = {
  centro: CentroAcopio
  seleccionado?: boolean
  onClick: () => void
}

const CATEGORIAS: Record<string, string> = {
  ropa: 'Ropa',
  medicina: 'Medicina',
  alimentos: 'Alimentos',
  agua: 'Agua',
  herramientas: 'Herramientas',
  higiene: 'Higiene',
  colchones: 'Colchones',
  otros: 'Otros',
}

export default function TarjetaCentro({ centro, seleccionado, onClick }: Props) {
  const wazeUrl = `https://waze.com/ul?ll=${centro.lat},${centro.lng}&navigate=yes`
  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${centro.lat},${centro.lng}`

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-xl border p-4 transition-all ${
        seleccionado
          ? 'border-red-500 bg-red-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-red-300 hover:shadow-sm'
      }`}
    >
      <h3 className="font-bold text-gray-900 text-base leading-tight">{centro.nombre}</h3>

      <div className="mt-2 flex items-start gap-1.5 text-sm text-gray-600">
        <MapPin size={14} className="mt-0.5 shrink-0 text-red-500" />
        <span>{centro.direccion}</span>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-600">
        <Clock size={14} className="shrink-0 text-red-500" />
        <span>{centro.horario}</span>
      </div>

      <div className="mt-2 flex items-start gap-1.5">
        <Package size={14} className="mt-0.5 shrink-0 text-red-500" />
        <div className="flex flex-wrap gap-1">
          {centro.que_acepta.map((item) => (
            <span
              key={item}
              className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
            >
              {CATEGORIAS[item] ?? item}
            </span>
          ))}
        </div>
      </div>

      {centro.notas && (
        <p className="mt-2 text-xs text-gray-500 italic">{centro.notas}</p>
      )}

      <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
        <a
          href={wazeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#33CCFF] py-2 text-xs font-bold text-white hover:opacity-90 transition-opacity"
        >
          <Navigation size={13} />
          Waze
        </a>
        <a
          href={gmapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#4285F4] py-2 text-xs font-bold text-white hover:opacity-90 transition-opacity"
        >
          <Navigation size={13} />
          Google Maps
        </a>
      </div>
    </div>
  )
}
