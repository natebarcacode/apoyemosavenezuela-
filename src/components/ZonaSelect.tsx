'use client'

import { useState, useRef, useEffect } from 'react'
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
  const [rect, setRect] = useState<DOMRect | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = zonas.filter(z =>
    !value || z.toLowerCase().includes(value.toLowerCase())
  )

  function measure() {
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect())
  }

  // Reposition when keyboard resizes the visual viewport
  useEffect(() => {
    if (!open) return
    const vv = window.visualViewport
    if (!vv) return
    vv.addEventListener('resize', measure)
    vv.addEventListener('scroll', measure)
    return () => {
      vv.removeEventListener('resize', measure)
      vv.removeEventListener('scroll', measure)
    }
  }, [open])

  function handleFocus() {
    measure()
    setOpen(true)
  }

  const portal = open && rect && filtered.length > 0 && typeof document !== 'undefined'
    ? createPortal(
        <DropdownPanel
          rect={rect}
          filtered={filtered}
          value={value}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />,
        document.body
      )
    : null

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={e => { onChange(e.target.value); measure(); setOpen(true) }}
        onFocus={handleFocus}
        onBlur={() => setTimeout(() => setOpen(false), 300)}
        placeholder="Selecciona o escribe una zona..."
        className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${ringClass}`}
      />
      {portal}
    </div>
  )
}

function DropdownPanel({ rect, filtered, value, onChange, onClose }: {
  rect: DOMRect
  filtered: string[]
  value: string
  onChange: (v: string) => void
  onClose: () => void
}) {
  const vw = window.innerWidth
  const vh = window.visualViewport?.height ?? window.innerHeight
  const offsetTop = window.visualViewport?.offsetTop ?? 0

  const minWidth = Math.min(260, vw - 16)
  const dropWidth = Math.max(rect.width, minWidth)
  const dropLeft = Math.max(8, Math.min(rect.left, vw - dropWidth - 8))

  const spaceBelow = vh - (rect.bottom - offsetTop) - 8
  const spaceAbove = (rect.top - offsetTop) - 8
  const useAbove = spaceBelow < 140 && spaceAbove > spaceBelow
  const maxHeight = Math.min(220, useAbove ? spaceAbove : Math.max(100, spaceBelow))

  const top = useAbove
    ? (rect.top - offsetTop) - maxHeight - 4
    : (rect.bottom - offsetTop) + 4

  return (
    <div
      // Prevent input blur when touching the dropdown (enables scroll + tap)
      onPointerDown={e => e.preventDefault()}
      style={{
        position: 'fixed',
        top,
        left: dropLeft,
        width: dropWidth,
        zIndex: 9999,
        maxHeight,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
      className="bg-white rounded-xl border border-gray-200 shadow-2xl"
    >
      {filtered.map(z => (
        <button key={z} type="button"
          onPointerDown={() => { onChange(z); onClose() }}
          className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-gray-50 last:border-0 ${
            value === z ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-700 active:bg-gray-100'
          }`}>
          {z}
        </button>
      ))}
    </div>
  )
}
