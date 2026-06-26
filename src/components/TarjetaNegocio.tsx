'use client'

import { NegocioSolidario } from '@/lib/supabase'
import { Store, ChevronRight } from 'lucide-react'

function urgencia(fechaFin?: string) {
  if (!fechaFin) return 'normal'
  const h = (new Date(fechaFin).getTime() - Date.now()) / 3600000
  if (h <= 0) return 'expirado'
  if (h < 24) return 'urgente'
  if (h < 48) return 'proximo'
  return 'normal'
}

const TIPOS: Record<string, string> = {
  restaurante: 'Restaurante', tienda: 'Tienda', empresa: 'Empresa',
  cafe: 'Café', bar: 'Bar', otro: 'Otro',
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
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
          <Store size={15} className="text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{negocio.nombre}</p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {negocio.zona} · {TIPOS[negocio.tipo] ?? negocio.tipo}
          </p>
        </div>
        {nivel === 'urgente' && <span className="w-2 h-2 rounded-full bg-red-400 shrink-0 animate-pulse" />}
        {nivel === 'proximo' && <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />}
        <ChevronRight size={14} className="text-gray-300 shrink-0" />
      </div>
    </div>
  )
}
