'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase, CentroAcopio, NegocioSolidario, Categoria } from '@/lib/supabase'
import TarjetaCentro from '@/components/TarjetaCentro'
import TarjetaNegocio from '@/components/TarjetaNegocio'
import { Heart, Search, Package, Store, ChevronDown } from 'lucide-react'

const MapaCentros = dynamic(() => import('@/components/MapaCentros'), { ssr: false })

type Tab = 'centros' | 'negocios'

export default function Home() {
  const [tab, setTab] = useState<Tab>('centros')

  const [centros, setCentros] = useState<CentroAcopio[]>([])
  const [negocios, setNegocios] = useState<NegocioSolidario[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [seleccionado, setSeleccionado] = useState<CentroAcopio | null>(null)

  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('')
  const [zona, setZona] = useState('')
  const [cargando, setCargando] = useState(true)
  const [gruposAbiertos, setGruposAbiertos] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function cargar() {
      const [{ data: datosCentros }, { data: datosNegocios }, { data: datosCat }] = await Promise.all([
        supabase.from('centros_acopio').select('*').eq('activo', true).order('zona'),
        supabase.from('negocios_solidarios').select('*').eq('activo', true).order('zona'),
        supabase.from('categorias').select('*').order('nombre'),
      ])
      setCentros(datosCentros ?? [])
      setNegocios(datosNegocios ?? [])
      setCategorias(datosCat ?? [])
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

      {/* Banner WhatsApp */}
      <div className="bg-[#25D366] text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 shrink-0">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.528 5.845L.057 23.547a.5.5 0 0 0 .609.61l5.757-1.509A11.946 11.946 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.9a9.885 9.885 0 0 1-5.031-1.373l-.361-.214-3.741.981.999-3.648-.235-.374A9.86 9.86 0 0 1 2.1 12C2.1 6.533 6.533 2.1 12 2.1c5.466 0 9.9 4.433 9.9 9.9 0 5.466-4.434 9.9-9.9 9.9z"/>
            </svg>
            <p className="text-sm font-semibold text-center sm:text-left">
              Únete al grupo de WhatsApp para recibir actualizaciones en tiempo real
            </p>
          </div>
          <a
            href="https://chat.whatsapp.com/I0L8IHvYpnJC6QVEdVF0o3?mode=gi_t"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-full bg-white text-[#25D366] font-bold text-sm px-5 py-1.5 hover:bg-green-50 transition-colors whitespace-nowrap"
          >
            Unirme al grupo →
          </a>
        </div>
      </div>

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
          {tab === 'centros' && categorias.length > 0 && (
            <div className="relative">
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm min-w-[180px]">
                <p className="text-gray-500 text-xs font-medium mb-2">Filtrar por insumo</p>
                <button
                  onClick={() => setCategoria('')}
                  className={`mb-2 text-xs px-2 py-0.5 rounded-full border transition-colors ${categoria === '' ? 'bg-red-500 text-white border-red-500' : 'text-gray-500 border-gray-200 hover:border-red-300'}`}
                >
                  Todos
                </button>
                {Object.entries(
                  categorias.reduce<Record<string, Categoria[]>>((acc, cat) => {
                    const g = cat.grupo || 'General'
                    if (!acc[g]) acc[g] = []
                    acc[g].push(cat)
                    return acc
                  }, {})
                ).map(([grupo, cats]) => (
                  <div key={grupo} className="mb-2">
                    <button
                      onClick={() => setGruposAbiertos(p => ({ ...p, [grupo]: !p[grupo] }))}
                      className="flex items-center gap-1 text-xs font-bold text-gray-600 w-full text-left mb-1"
                    >
                      <ChevronDown size={12} className={`transition-transform ${gruposAbiertos[grupo] ? 'rotate-180' : ''}`} />
                      {grupo}
                    </button>
                    {gruposAbiertos[grupo] && (
                      <div className="flex flex-wrap gap-1 pl-3">
                        {cats.map(c => (
                          <button
                            key={c.id}
                            onClick={() => setCategoria(c.nombre === categoria ? '' : c.nombre)}
                            className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${categoria === c.nombre ? 'bg-red-500 text-white border-red-500' : 'text-gray-500 border-gray-200 hover:border-red-300'}`}
                          >
                            {c.nombre}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
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
