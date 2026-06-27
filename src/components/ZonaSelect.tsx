'use client'

import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'

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
  const [dropRect, setDropRect] = useState<DOMRect | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = zonas.filter(z =>
    !value || z.toLowerCase().includes(value.toLowerCase())
  )

  function openWith() {
    if (inputRef.current) setDropRect(inputRef.current.getBoundingClientRect())
    setOpen(true)
  }

  const portal = open && dropRect && filtered.length > 0 && typeof document !== 'undefined'
    ? createPortal(
        <div
          style={{ position: 'fixed', top: dropRect.bottom + 4, left: dropRect.left, width: dropRect.width, zIndex: 9999, maxHeight: 220, overflowY: 'auto' }}
          className="bg-white rounded-xl border border-gray-200 shadow-2xl"
        >
          {filtered.map(z => (
            <button key={z} type="button"
              onPointerDown={() => { onChange(z); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-gray-50 last:border-0 ${
                value === z ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'
              }`}>
              {z}
            </button>
          ))}
        </div>,
        document.body
      )
    : null

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={e => { onChange(e.target.value); openWith() }}
        onFocus={openWith}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="Selecciona o escribe una zona..."
        className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${ringClass}`}
      />
      {portal}
    </div>
  )
}
