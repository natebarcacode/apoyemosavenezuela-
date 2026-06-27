'use client'

import { NegocioSolidario } from '@/lib/supabase'
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
  if (h <= 0) return 'Cerrado'
  if (h < 24) return `Cierra en ${Math.round(h)}h`
  const d = Math.ceil(h / 24)
  return `Cierra en ${d}d`
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
  const abierto = negocio.activo && nivel !== 'expirado'

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer bg-white rounded-2xl border transition-all duration-150 overflow-hidden
        ${seleccionado ? 'border-amber-300 shadow-md ring-2 ring-amber-100' : 'border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200'}
        ${nivel === 'expirado' ? 'opacity-40' : ''}
      `}
    >
      <div className="px-4 py-3">
        {/* Fila principal */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`shrink-0 w-2 h-2 rounded-full ${
              !abierto ? 'bg-gray-300' :
              nivel === 'urgente' ? 'bg-red-400 animate-pulse' :
              nivel === 'proximo' ? 'bg-yellow-400' :
              'bg-emerald-400'
            }`} />
            <p className="font-bold text-gray-900 text-sm truncate">{negocio.nombre}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {negocio.fecha_fin && nivel !== 'normal' && nivel !== 'expirado' && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                nivel === 'urgente' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'
              }`}>
                <Clock size={8} className="inline mr-0.5" />
                {countdownCorto(negocio.fecha_fin)}
              </span>
            )}
            <ChevronRight size={14} className="text-gray-300" />
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
      </div>
    </div>
  )
}
