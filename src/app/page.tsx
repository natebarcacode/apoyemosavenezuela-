'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase, CentroAcopio, NegocioSolidario } from '@/lib/supabase'
import TarjetaCentro from '@/components/TarjetaCentro'
import TarjetaNegocio from '@/components/TarjetaNegocio'
import { Heart, Search, Package, Store } from 'lucide-react'

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

type Tab = 'centros' | 'negocios'

export default function Home() {
  const [tab, setTab] = useState<Tab>('centros')

  const [centros, setCentros] = useState<CentroAcopio[]>([])
  const [negocios, setNegocios] = useState<NegocioSolidario[]>([])
  const [seleccionado, setSeleccionado] = useState<CentroAcopio | null>(null)

  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('')
  const [zona, setZona] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      const [{ data: datosCentros }, { data: datosNegocios }] = await Promise.all([
        supabase.from('centros_acopio').select('*').eq('activo', true).order('zona'),
        supabase.from('negocios_solidarios').select('*').eq('activo', true).order('zona'),
      ])
      setCentros(datosCentros ?? [])
      setNegocios(datosNegocios ?? [])
      setCargando(false)
    }
    cargar()
  }, [])

  const zonas = Array.from(
    new Set((tab === 'centros' ? centros : negocios).map((c) => c.zona))
  ).sort()

  const centrosFiltrados = centros.filter((c) => {
    const matchBusqueda =
      busqueda === '' ||
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.direccion.toLowerCase().includes(busqueda.toLowerCase())
    const matchCategoria = categoria === '' || c.que_acepta.includes(categoria)
    const matchZona = zona === '' || c.zona === zona
    return matchBusqueda && matchCategoria && matchZona
  })

  const negociosFiltrados = negocios.filter((n) => {
    const matchBusqueda =
      busqueda === '' ||
      n.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      n.iniciativa.toLowerCase().includes(busqueda.toLowerCase())
    const matchZona = zona === '' || n.zona === zona
    return matchBusqueda && matchZona
  })

  function cambiarTab(t: Tab) {
    setTab(t)
    setBusqueda('')
    setCategoria('')
    setZona('')
    setSeleccionado(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Heart size={20} className="text-red-500 fill-red-500" />
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
                Apoyemos a <span className="text-red-500">Venezuela</span>
              </h1>
            </div>
          </div>
          <div className="flex gap-4 text-right">
            <div>
              <span className="text-2xl font-bold text-red-500">{centros.length}</span>
              <p className="text-xs text-gray-500">centros</p>
            </div>
            <div>
              <span className="text-2xl font-bold text-yellow-500">{negocios.length}</span>
              <p className="text-xs text-gray-500">negocios</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 pb-0">
          <button
            onClick={() => cambiarTab('centros')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'centros'
                ? 'border-red-500 text-red-500'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Package size={15} />
            Centros de acopio
          </button>
          <button
            onClick={() => cambiarTab('negocios')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'negocios'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Store size={15} />
            Negocios solidarios
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={tab === 'centros' ? 'Buscar por nombre o dirección...' : 'Buscar por nombre o iniciativa...'}
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
          {tab === 'centros' && (
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          )}
        </div>

        {cargando ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            Cargando...
          </div>
        ) : tab === 'centros' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1">
              {centrosFiltrados.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
                  No hay centros con esos filtros.
                </div>
              ) : (
                centrosFiltrados.map((centro) => (
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
              <MapaCentros centros={centrosFiltrados} onSelect={setSeleccionado} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {negociosFiltrados.length === 0 ? (
              <div className="col-span-full flex items-center justify-center py-16 text-gray-400 text-sm">
                No hay negocios con esos filtros.
              </div>
            ) : (
              negociosFiltrados.map((negocio) => (
                <TarjetaNegocio key={negocio.id} negocio={negocio} />
              ))
            )}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="max-w-7xl mx-auto px-4 pb-8 mt-2">
        <div className="rounded-2xl bg-red-50 border border-red-200 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-bold text-gray-900 text-sm">¿Conoces un centro de acopio o negocio solidario?</p>
            <p className="text-sm text-gray-600 mt-0.5">Escríbenos y lo publicamos aquí para que más personas puedan encontrarlo.</p>
          </div>
          <a
            href="mailto:apoyemosavenezuela@gmail.com"
            className="shrink-0 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-600 transition-colors whitespace-nowrap"
          >
            apoyemosavenezuela@gmail.com
          </a>
        </div>
      </div>

      <footer className="text-center py-6 text-xs text-gray-400">
        Todos con Venezuela 🇻🇪
      </footer>
    </div>
  )
}
