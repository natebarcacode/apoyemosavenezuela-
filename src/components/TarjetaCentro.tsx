'use client'

import { CentroAcopio } from '@/lib/supabase'
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

type Props = {
  centro: CentroAcopio
  seleccionado?: boolean
  onClick: () => void
}

export default function TarjetaCentro({ centro, seleccionado, onClick }: Props) {
  const nivel = urgencia(centro.fecha_fin)
  const preview = centro.que_acepta.slice(0, 3)
  const extra = centro.que_acepta.length - preview.length
  const cerrado = !!centro.cerrado
  const abierto = !cerrado && nivel !== 'expirado'

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer bg-white rounded-2xl border transition-all duration-150 overflow-hidden
        ${seleccionado ? 'border-red-300 shadow-md ring-2 ring-red-100' : 'border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200'}
        ${cerrado ? 'opacity-60' : ''}
        ${nivel === 'expirado' && !cerrado ? 'opacity-40' : ''}
      `}
    >
      <div className="px-4 py-3">
        {/* Fila principal */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`shrink-0 w-2 h-2 rounded-full ${
              cerrado ? 'bg-gray-300' :
              !abierto ? 'bg-gray-300' :
              nivel === 'urgente' ? 'bg-red-400 animate-pulse' :
              nivel === 'proximo' ? 'bg-yellow-400' :
              'bg-emerald-400'
            }`} />
            <p className={`font-bold text-sm truncate ${cerrado ? 'line-through text-gray-400' : 'text-gray-900'}`}>
              {centro.nombre}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {cerrado && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                Cerrado
              </span>
            )}
            {!cerrado && centro.fecha_fin && nivel !== 'normal' && nivel !== 'expirado' && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                nivel === 'urgente' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'
              }`}>
                <Clock size={8} className="inline mr-0.5" />
                {countdownCorto(centro.fecha_fin)}
              </span>
            )}
            <ChevronRight size={14} className="text-gray-300" />
          </div>
        </div>

        {/* Zona */}
        <div className="flex items-center gap-1 mt-0.5 ml-4">
          <MapPin size={10} className="text-gray-300 shrink-0" />
          <p className="text-xs text-gray-400">{centro.zona}</p>
        </div>

        {/* Items aceptados */}
        {preview.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2.5 ml-4">
            {preview.map(item => (
              <span key={item} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cerrado ? 'bg-gray-100 text-gray-400 line-through' : 'bg-slate-100 text-slate-500'}`}>
                {item}
              </span>
            ))}
            {extra > 0 && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-400 border border-slate-100">
                +{extra} más
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
