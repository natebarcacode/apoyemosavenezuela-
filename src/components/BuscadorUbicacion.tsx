'use client'

import { useState, useRef, useEffect } from 'react'
import { MapPin, Loader2 } from 'lucide-react'

type Resultado = {
  label: string
  lat: string
  lng: string
  direccion: string
  zona: string
  nombre: string
}

type Props = {
  onSeleccionar: (datos: { lat: string; lng: string; direccion: string; zona: string; nombre: string }) => void
}

export default function BuscadorUbicacion({ onSeleccionar }: Props) {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [buscando, setBuscando] = useState(false)
  const [abierto, setAbierto] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function buscar(valor: string) {
    setQuery(valor)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (!valor.trim()) { setResultados([]); setAbierto(false); return }

    timeoutRef.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(valor)}`)
        const data: Resultado[] = await res.json()
        setResultados(data)
        setAbierto(data.length > 0)
      } catch {
        setResultados([])
      } finally {
        setBuscando(false)
      }
    }, 400)
  }

  function seleccionar(r: Resultado) {
    onSeleccionar({ lat: r.lat, lng: r.lng, direccion: r.direccion, zona: r.zona, nombre: r.nombre })
    setQuery(r.label)
    setAbierto(false)
    setResultados([])
  }

  return (
    <div ref={ref} className="relative">
      <label className="text-xs font-medium text-gray-600 mb-1 block">
        Buscar lugar — llena todos los campos automáticamente
      </label>
      <div className="relative">
        <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => buscar(e.target.value)}
          onFocus={() => resultados.length > 0 && setAbierto(true)}
          placeholder="Ej: Super Rey Paitilla, Riba Smith Vía España..."
          className="w-full rounded-xl border border-blue-200 bg-blue-50 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        {buscando && (
          <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
        )}
      </div>

      {abierto && resultados.length > 0 && (
        <div className="absolute z-[2000] mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden max-h-72 overflow-y-auto">
          {resultados.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => seleccionar(r)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
