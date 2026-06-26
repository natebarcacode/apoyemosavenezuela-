'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase, CentroAcopio, NegocioSolidario, Categoria } from '@/lib/supabase'
import TarjetaCentro from '@/components/TarjetaCentro'
import TarjetaNegocio from '@/components/TarjetaNegocio'
import ModalCentro from '@/components/ModalCentro'
import ModalNegocio from '@/components/ModalNegocio'
import { Search, Package, Store, MapPin, Users, X } from 'lucide-react'
import { WhatsAppIcon } from '@/components/BrandIcons'

const MapaCentros = dynamic(() => import('@/components/MapaCentros'), { ssr: false })
const MapaNegocios = dynamic(() => import('@/components/MapaNegocios'), { ssr: false })

type Tab = 'centros' | 'negocios'

export default function Home() {
  const [tab, setTab] = useState<Tab>('centros')
  const [centros, setCentros] = useState<CentroAcopio[]>([])
  const [negocios, setNegocios] = useState<NegocioSolidario[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [seleccionado, setSeleccionado] = useState<CentroAcopio | null>(null)
  const [seleccionadoNegocio, setSeleccionadoNegocio] = useState<NegocioSolidario | null>(null)
  const [modalCentro, setModalCentro] = useState<CentroAcopio | null>(null)
  const [modalNegocio, setModalNegocio] = useState<NegocioSolidario | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [zonasFiltro, setZonasFiltro] = useState<string[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      const [{ data: dc }, { data: dn }, { data: dcat }] = await Promise.all([
        supabase.from('centros_acopio').select('*').eq('activo', true).order('zona'),
        supabase.from('negocios_solidarios').select('*').eq('activo', true).order('zona'),
        supabase.from('categorias').select('*').order('nombre'),
      ])
      setCentros(dc ?? [])
      setNegocios(dn ?? [])
      setCategorias(dcat ?? [])
      setCargando(false)
    }
    cargar()
  }, [])

  const zonas = Array.from(
    new Set((tab === 'centros' ? centros : negocios).map(c => c.zona))
  ).sort()

  const q = busqueda.toLowerCase().trim()

  const centrosFiltrados = centros.filter(c => {
    const matchB = q === '' ||
      c.nombre.toLowerCase().includes(q) ||
      c.direccion.toLowerCase().includes(q) ||
      c.zona.toLowerCase().includes(q) ||
      c.que_acepta.some(i => i.toLowerCase().includes(q))
    const matchZ = zonasFiltro.length === 0 || zonasFiltro.includes(c.zona)
    return matchB && matchZ
  })

  const negociosFiltrados = negocios.filter(n => {
    const matchB = q === '' ||
      n.nombre.toLowerCase().includes(q) ||
      n.iniciativa.toLowerCase().includes(q) ||
      n.zona.toLowerCase().includes(q) ||
      (n.tipo && n.tipo.toLowerCase().includes(q))
    const matchZ = zonasFiltro.length === 0 || zonasFiltro.includes(n.zona)
    return matchB && matchZ
  })

  const filtrosActivos = q !== '' || zonasFiltro.length > 0

  function toggleZona(z: string) {
    setZonasFiltro(prev =>
      prev.includes(z) ? prev.filter(x => x !== z) : [...prev, z]
    )
  }

  function limpiarFiltros() {
    setBusqueda('')
    setZonasFiltro([])
  }

  function abrirCentro(c: CentroAcopio) {
    setSeleccionado(c)
    setModalCentro(c)
    setTimeout(() => {
      document.getElementById(`centro-${c.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 50)
  }

  function abrirNegocio(n: NegocioSolidario) {
    setSeleccionadoNegocio(n)
    setModalNegocio(n)
    setTimeout(() => {
      document.getElementById(`negocio-${n.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 50)
  }

  function cambiarTab(t: Tab) {
    setTab(t)
    setBusqueda('')
    setZonasFiltro([])
    setSeleccionado(null)
    setSeleccionadoNegocio(null)
  }

  const negociosConMapa = negociosFiltrados.filter(n => n.lat != null && n.lng != null)

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── HEADER ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-[0_1px_6px_rgba(0,0,0,0.07)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" className="h-9 w-auto" alt="Logo" />
              <div>
                <h1 className="text-[15px] font-extrabold text-gray-900 leading-tight tracking-tight">
                  Apoyemos a <span className="text-red-500">Venezuela</span>
                </h1>
                <p className="text-[11px] text-gray-400 leading-none mt-0.5">Encuentra dónde donar · Panamá</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
                <Package size={11} className="text-red-500" />
                <span className="text-sm font-bold text-red-600">{centros.length}</span>
                <span className="text-[10px] text-red-400 hidden sm:inline">centros</span>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                <Store size={11} className="text-amber-500" />
                <span className="text-sm font-bold text-amber-600">{negocios.length}</span>
                <span className="text-[10px] text-amber-400 hidden sm:inline">negocios</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 pb-3">
            <button
              onClick={() => cambiarTab('centros')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                tab === 'centros'
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              <Package size={14} /> Centros de acopio
              {tab === 'centros' && <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">{centros.length}</span>}
            </button>
            <button
              onClick={() => cambiarTab('negocios')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                tab === 'negocios'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              <Store size={14} /> Negocios solidarios
              {tab === 'negocios' && <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">{negocios.length}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* ── WA BANNER ── */}
      <div style={{ background: 'linear-gradient(135deg,#064e3b 0%,#065f46 60%,#047857 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <WhatsAppIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Actualizaciones en tiempo real</p>
                <p className="text-xs text-emerald-200">Únete a nuestro grupo de WhatsApp</p>
              </div>
            </div>
            <a
              href="https://chat.whatsapp.com/I0L8IHvYpnJC6QVEdVF0o3?mode=gi_t"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-2 rounded-full bg-white text-emerald-800 font-bold text-sm px-5 py-2 hover:bg-emerald-50 transition-colors shadow-sm"
            >
              <Users size={13} /> Unirme al grupo
            </a>
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-3.5 mb-4 flex flex-col gap-3">
          {/* Fila 1: buscador + limpiar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder={tab === 'centros' ? 'Buscar por nombre, zona o insumo...' : 'Buscar por nombre, zona o iniciativa...'}
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 focus:bg-white transition-all placeholder-gray-400"
              />
              {busqueda && (
                <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>
            {filtrosActivos && (
              <button
                onClick={limpiarFiltros}
                className="shrink-0 flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <X size={13} /> Limpiar
              </button>
            )}
          </div>

          {/* Fila 2: chips de zona */}
          {zonas.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="flex items-center gap-1 text-[11px] text-gray-400 mr-1">
                <MapPin size={11} /> Zona:
              </span>
              {zonas.map(z => (
                <button
                  key={z}
                  onClick={() => toggleZona(z)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    zonasFiltro.includes(z)
                      ? tab === 'centros'
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {z}
                </button>
              ))}
            </div>
          )}

          {/* Contador de resultados */}
          {filtrosActivos && (
            <p className="text-xs text-gray-400">
              {tab === 'centros'
                ? `${centrosFiltrados.length} de ${centros.length} centros`
                : `${negociosFiltrados.length} de ${negocios.length} negocios`}
            </p>
          )}
        </div>

        {/* Cards + Map */}
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-28 gap-3 text-gray-400">
            <div className="w-7 h-7 border-2 border-gray-200 border-t-red-400 rounded-full animate-spin" />
            <p className="text-sm">Cargando...</p>
          </div>
        ) : tab === 'centros' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Lista */}
            <div
              className="flex flex-col gap-2 overflow-y-auto pr-0.5"
              style={{ maxHeight: 'calc(100vh - 230px)', scrollbarWidth: 'thin', scrollbarColor: '#E5E7EB transparent' }}
            >
              {centrosFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                  <Package size={32} className="opacity-20" />
                  <p className="text-sm">No hay centros con esos filtros</p>
                </div>
              ) : centrosFiltrados.map(centro => (
                <div key={centro.id} id={`centro-${centro.id}`}>
                  <TarjetaCentro
                    centro={centro}
                    seleccionado={seleccionado?.id === centro.id}
                    onClick={() => abrirCentro(centro)}
                  />
                </div>
              ))}
            </div>
            {/* Mapa */}
            <div
              className="rounded-2xl overflow-hidden border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)] sticky top-[105px]"
              style={{ height: 'calc(100vh - 230px)' }}
            >
              <MapaCentros centros={centrosFiltrados} onSelect={abrirCentro} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Lista */}
            <div
              className="flex flex-col gap-2 overflow-y-auto pr-0.5"
              style={{ maxHeight: 'calc(100vh - 230px)', scrollbarWidth: 'thin', scrollbarColor: '#E5E7EB transparent' }}
            >
              {negociosFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                  <Store size={32} className="opacity-20" />
                  <p className="text-sm">No hay negocios con esos filtros</p>
                </div>
              ) : negociosFiltrados.map(n => (
                <div key={n.id} id={`negocio-${n.id}`}>
                  <TarjetaNegocio
                    negocio={n}
                    seleccionado={seleccionadoNegocio?.id === n.id}
                    onClick={() => abrirNegocio(n)}
                  />
                </div>
              ))}
            </div>
            {/* Mapa */}
            <div
              className="rounded-2xl overflow-hidden border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)] sticky top-[105px]"
              style={{ height: 'calc(100vh - 230px)' }}
            >
              {negociosConMapa.length > 0 ? (
                <MapaNegocios negocios={negociosConMapa} onSelect={abrirNegocio} />
              ) : (
                <div className="w-full h-full bg-amber-50/40 flex flex-col items-center justify-center gap-3">
                  <Store size={36} className="text-amber-200" />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-amber-400">Mapa próximamente</p>
                    <p className="text-xs text-amber-300 mt-1">Los negocios con ubicación aparecerán aquí</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── CTA ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-10 mt-6">
        <div
          className="rounded-2xl px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ background: 'linear-gradient(135deg,#1e3a5f 0%,#7f1d1d 100%)' }}
        >
          <div>
            <p className="font-bold text-white text-sm">¿Conoces un centro o negocio solidario?</p>
            <p className="text-sm text-white/60 mt-1">Escríbenos y lo publicamos aquí.</p>
          </div>
          <a
            href="mailto:apoyemosavenezuela@gmail.com"
            className="shrink-0 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-gray-900 hover:bg-gray-100 transition-colors whitespace-nowrap shadow-sm"
          >
            Contáctanos →
          </a>
        </div>
      </div>

      <footer className="flex items-center justify-center gap-2 pb-8 text-xs text-gray-400">
        Todos con Venezuela <img src="/logo.svg" className="h-4 w-auto" alt="" />
      </footer>

      {/* Modals */}
      {modalCentro && (
        <ModalCentro
          centro={modalCentro}
          categorias={categorias}
          onClose={() => setModalCentro(null)}
        />
      )}
      {modalNegocio && (
        <ModalNegocio
          negocio={modalNegocio}
          onClose={() => setModalNegocio(null)}
        />
      )}
    </div>
  )
}
