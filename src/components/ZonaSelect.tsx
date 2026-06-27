'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Search, X } from 'lucide-react'

export const ZONAS_PANAMA = [
  'Albrook','Amador','Ancón','Arraiján','Balboa','Bella Vista','Betania','Boca la Caja',
  'Bocas del Toro','Bugaba','Buenaventura','Calidonia','Cangrejo','Casco Viejo','Cativá',
  'Chanis','Chame','Chilibre','Chitré','Chorrillo','Ciudad del Futuro','Ciudad Radial',
  'Clayton','Colón','Condado del Rey','Coronado','Costa del Este','Cristóbal','Curundú',
  'David','Don Bosco','El Carmen','El Dorado','El Ingenio','El Valle','Exposición',
  'Juan Díaz','La Alameda','La Chorrera','La Cresta','La Locería','La Villa de Los Santos',
  'Las Cumbres','Las Mañanitas','Las Tablas','Llano Bonito','Los Ángeles','Mañanitas',
  'Miraflores','Nuevo Arraiján','Nuevo Reparto','Obarrio','Paitilla','Parque Lefevre',
  'Pedregal','Penonomé','Perejil','Pueblo Nuevo','Puerto Armuelles','Punta Pacífica',
  'Río Abajo','Sabanitas','San Felipe','San Francisco','San Miguelito','Santa Ana',
  'Santiago','Tocumen','Transistmica','Vacamonte','Versalles','Via Argentina',
  'Via España','Vista Alegre','Vista Hermosa',
].sort()

export default function ZonaSelect({ value, onChange, zonas = ZONAS_PANAMA, ringClass = 'focus:ring-red-300' }: {
  value: string
  onChange: (v: string) => void
  zonas?: string[]
  ringClass?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-left focus:outline-none focus:ring-2 ${ringClass} ${value ? 'text-gray-900' : 'text-gray-400'}`}
      >
        {value || 'Selecciona una zona...'}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <ZonaPicker
          zonas={zonas}
          value={value}
          onChange={v => { onChange(v); setOpen(false) }}
          onClose={() => setOpen(false)}
        />,
        document.body
      )}
    </>
  )
}

function ZonaPicker({ zonas, value, onChange, onClose }: {
  zonas: string[]
  value: string
  onChange: (v: string) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 100)
  }, [])

  const filtered = zonas.filter(z => !q || z.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl flex flex-col shadow-2xl"
        style={{ maxHeight: '75dvh' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100 shrink-0">
          <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              ref={searchRef}
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar zona..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
            {q && (
              <button type="button" onClick={() => setQ('')}>
                <X size={14} className="text-gray-400" />
              </button>
            )}
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Sin resultados</p>
          )}
          {filtered.map(z => (
            <button key={z} type="button"
              onClick={() => onChange(z)}
              className={`w-full text-left px-4 py-3 text-sm border-b border-gray-50 last:border-0 transition-colors ${
                value === z ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-700 active:bg-gray-100'
              }`}>
              {z}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
