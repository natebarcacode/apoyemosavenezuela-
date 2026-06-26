'use client'

import { useState, useRef, useEffect } from 'react'
import { MapPin, Loader2 } from 'lucide-react'

type Resultado = {
  display_name: string
  name: string
  lat: string
  lon: string
  address: {
    road?: string
    house_number?: string
    suburb?: string
    neighbourhood?: string
    city_district?: string
    city?: string
    town?: string
    village?: string
    state?: string
    country?: string
  }
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
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(valor)}&addressdetails=1&limit=5`,
          { headers: { 'Accept-Language': 'es' } }
        )
        const data: Resultado[] = await res.json()
        setResultados(data)
        setAbierto(data.length > 0)
      } catch {
        setResultados([])
      } finally {
        setBuscando(false)
      }
    }, 500)
  }

  function seleccionar(r: Resultado) {
    const a = r.address
    const partesDireccion = [a.house_number, a.road].filter(Boolean).join(' ')
    const ciudad = a.city || a.town || a.village || ''
    const direccion = partesDireccion
      ? `${partesDireccion}, ${ciudad}`.trim().replace(/,\s*$/, '')
      : r.display_name
    const zona = a.suburb || a.neighbourhood || a.city_district || ciudad || a.state || ''

    const nombre = r.name || r.display_name.split(',')[0].trim()
    onSeleccionar({ lat: r.lat, lng: r.lon, direccion, zona, nombre })
    setQuery(r.display_name)
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
          placeholder="Ej: Super Rey Paitilla, Ciudad de Panamá"
          className="w-full rounded-xl border border-blue-200 bg-blue-50 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        {buscando && (
          <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
        )}
      </div>

      {abierto && resultados.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
          {resultados.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => seleccionar(r)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors"
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
