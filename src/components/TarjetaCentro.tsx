'use client'

import { CentroAcopio } from '@/lib/supabase'
import { Package, ChevronRight, Clock } from 'lucide-react'

function urgencia(fechaFin?: string) {
  if (!fechaFin) return 'normal'
  const h = (new Date(fechaFin).getTime() - Date.now()) / 3600000
  if (h <= 0) return 'expirado'
  if (h < 24) return 'urgente'
  if (h < 48) return 'proximo'
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

  const leftBorder =
    seleccionado ? 'border-l-[3px] border-l-red-500' :
    nivel === 'urgente' ? 'border-l-[3px] border-l-red-400' :
    nivel === 'proximo' ? 'border-l-[3px] border-l-yellow-400' :
    'border-l-[3px] border-l-transparent'

  const preview = centro.que_acepta.slice(0, 3)
  const extra = centro.que_acepta.length - preview.length

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-150 overflow-hidden ${leftBorder} ${seleccionado ? 'ring-2 ring-red-200 ring-offset-1' : ''} ${nivel === 'expirado' ? 'opacity-50' : ''}`}
    >
      <div className="px-4 py-3.5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
            <Package size={15} className="text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{centro.nombre}</p>
                <p className="text-xs text-gray-400 mt-0.5">{centro.zona}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {nivel === 'urgente' && <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />}
                {nivel === 'proximo' && <span className="w-2 h-2 rounded-full bg-yellow-400" />}
                <ChevronRight size={14} className="text-gray-300" />
              </div>
            </div>
            {preview.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {preview.map(item => (
                  <span key={item} className="inline-block bg-red-50 text-red-600 text-[10px] font-medium px-2 py-0.5 rounded-full border border-red-100">
                    {item}
                  </span>
                ))}
                {extra > 0 && (
                  <span className="inline-block bg-gray-100 text-gray-400 text-[10px] font-medium px-2 py-0.5 rounded-full">
                    +{extra} más
                  </span>
                )}
              </div>
            )}
            {centro.fecha_fin && nivel !== 'normal' && (
              <p className={`text-[10px] font-medium mt-1.5 flex items-center gap-1 ${nivel === 'urgente' ? 'text-red-400' : 'text-yellow-500'}`}>
                <Clock size={10} />
                {countdownCorto(centro.fecha_fin)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
