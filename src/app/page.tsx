'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase, CentroAcopio } from '@/lib/supabase'
import TarjetaCentro from '@/components/TarjetaCentro'
import { Heart, Search } from 'lucide-react'

const MapaCentros = dynamic(() => import('@/components/MapaCentros'), { ssr: false })

const CATEGORIAS = [
  { value: '', label: 'Todos' },
  { value: 'ropa', label: 'Ropa' },
  { value: 'medicina', label: 'Medicina' },
  { value: 'alimentos', label: 'Alimentos' },
  { value: 'agua', label: 'Agua' },
  { value: 'herramientas', label: 'Herramientas' },
  { value: 'higiene', label: 'Higiene' },
  { value: 'colchones', label: 'Colchones' },
  { value: 'otros', label: 'Otros' },
]

export default function Home() {
  const [centros, setCentros] = useState<CentroAcopio[]>([])
  const [seleccionado, setSeleccionado] = useState<CentroAcopio | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('')
  const [zona, setZona] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      const { data } = await supabase
        .from('centros_acopio')
        .select('*')
        .eq('activo', true)
        .order('zona')
      setCentros(data ?? [])
      setCargando(false)
    }
    cargar()
  }, [])

  const zonas = Array.from(new Set(centros.map((c) => c.zona))).sort()

  const filtrados = centros.filter((c) => {
    const matchBusqueda =
      busqueda === '' ||
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.direccion.toLowerCase().includes(busqueda.toLowerCase())
    const matchCategoria = categoria === '' || c.que_acepta.includes(categoria)
    const matchZona = zona === '' || c.zona === zona
    return matchBusqueda && matchCategoria && matchZona
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Heart size={20} className="text-red-500 fill-red-500" />
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
                Acopio <span className="text-red-500">Venezuela</span>
              </h1>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Centros de acopio activos en Panamá
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-red-500">{filtrados.length}</span>
            <p className="text-xs text-gray-500">centro{filtrados.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o dirección..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <select
            value={zona}
            onChange={(e) => setZona(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            <option value="">Todas las zonas</option>
            {zonas.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {cargando ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            Cargando centros...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1">
              {filtrados.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
                  No hay centros con esos filtros.
                </div>
              ) : (
                filtrados.map((centro) => (
                  <TarjetaCentro
                    key={centro.id}
                    centro={centro}
                    seleccionado={seleccionado?.id === centro.id}
                    onClick={() => setSeleccionado(centro)}
                  />
                ))
              )}
            </div>

            <div className="h-[70vh] rounded-xl overflow-hidden border border-gray-200 shadow-sm">
              <MapaCentros
                centros={filtrados}
                onSelect={setSeleccionado}
              />
            </div>
          </div>
        )}
      </div>

      <footer className="text-center py-6 text-xs text-gray-400 mt-4">
        Hecho con amor para Venezuela 🇻🇪
      </footer>
    </div>
  )
}
