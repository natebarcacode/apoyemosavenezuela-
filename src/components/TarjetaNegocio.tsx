'use client'

import { NegocioSolidario } from '@/lib/supabase'
import { Store, ChevronRight, Clock } from 'lucide-react'

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
  if (h <= 0) return 'Terminó'
  if (h < 24) return `Termina en ${Math.round(h)}h`
  const d = Math.ceil(h / 24)
  return `Termina en ${d}d`
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

  const leftBorder =
    seleccionado ? 'border-l-[3px] border-l-amber-500' :
    nivel === 'urgente' ? 'border-l-[3px] border-l-red-400' :
    nivel === 'proximo' ? 'border-l-[3px] border-l-yellow-400' :
    'border-l-[3px] border-l-transparent'

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-150 overflow-hidden ${leftBorder} ${seleccionado ? 'ring-2 ring-amber-200 ring-offset-1' : ''} ${nivel === 'expirado' ? 'opacity-50' : ''}`}
    >
      <div className="px-4 py-3.5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
            <Store size={15} className="text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{negocio.nombre}</p>
                <p className="text-xs text-gray-400 mt-0.5">{negocio.zona} · {TIPOS[negocio.tipo] ?? negocio.tipo}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {nivel === 'urgente' && <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />}
                {nivel === 'proximo' && <span className="w-2 h-2 rounded-full bg-yellow-400" />}
                <ChevronRight size={14} className="text-gray-300" />
              </div>
            </div>
            {negocio.iniciativa && (
              <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1 mt-2 line-clamp-2 leading-relaxed border border-amber-100">
                {negocio.iniciativa}
              </p>
            )}
            {negocio.fecha_fin && nivel !== 'normal' && (
              <p className={`text-[10px] font-medium mt-1.5 flex items-center gap-1 ${nivel === 'urgente' ? 'text-red-400' : 'text-yellow-500'}`}>
                <Clock size={10} />
                {countdownCorto(negocio.fecha_fin)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
