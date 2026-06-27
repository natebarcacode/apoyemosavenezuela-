'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase, CentroAcopio, NegocioSolidario, Categoria } from '@/lib/supabase'
import TarjetaCentro from '@/components/TarjetaCentro'
import TarjetaNegocio from '@/components/TarjetaNegocio'
import ModalCentro from '@/components/ModalCentro'
import ModalNegocio from '@/components/ModalNegocio'
import { Search, Package, Store, MapPin, Users, X, Clock, Zap, Infinity } from 'lucide-react'
import { WhatsAppIcon } from '@/components/BrandIcons'
import ViendoAhora from '@/components/ViendoAhora'

const MapaCentros = dynamic(() => import('@/components/MapaCentros'), { ssr: false })
const MapaNegocios = dynamic(() => import('@/components/MapaNegocios'), { ssr: false })

type Tab = 'centros' | 'negocios'
type UrgenciaFiltro = 'todos' | 'hoy' | 'semana' | 'permanente'

function nivelUrgencia(fechaFin?: string | null): 'hoy' | 'semana' | 'normal' | 'permanente' | 'expirado' {
  if (!fechaFin) return 'permanente'
  const fin = new Date(fechaFin).getTime()
  const now = Date.now()
  if (fin <= now) return 'expirado'
  const finDeHoy = new Date(); finDeHoy.setHours(23, 59, 59, 999)
  if (fin <= finDeHoy.getTime()) return 'hoy'
  const en7dias = now + 7 * 24 * 3600000
  if (fin <= en7dias) return 'semana'
  return 'normal'
}

function urgenciaScore(fechaFin?: string | null) {
  const n = nivelUrgencia(fechaFin)
  if (n === 'hoy') return 0
  if (n === 'semana') return 1
  if (n === 'normal') return 2
  if (n === 'permanente') return 3
  return 4
}

function sortPorUrgencia<T extends { fecha_fin?: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => urgenciaScore(a.fecha_fin) - urgenciaScore(b.fecha_fin))
}

function groupByZona<T extends { zona: string }>(items: T[]): { zona: string; items: T[] }[] {
  const map = new Map<string, T[]>()
  for (const item of items) {
    if (!map.has(item.zona)) map.set(item.zona, [])
    map.get(item.zona)!.push(item)
  }
  return Array.from(map.entries())
    .map(([zona, items]) => ({ zona, items }))
    .sort((a, b) => a.zona.localeCompare(b.zona))
}

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
  const [urgenciaFiltro, setUrgenciaFiltro] = useState<UrgenciaFiltro>('todos')
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

  const centrosFiltrados = sortPorUrgencia(centros.filter(c => {
    const matchB = q === '' ||
      c.nombre.toLowerCase().includes(q) ||
      c.direccion.toLowerCase().includes(q) ||
      c.zona.toLowerCase().includes(q) ||
      c.que_acepta.some(i => i.toLowerCase().includes(q))
    const matchZ = zonasFiltro.length === 0 || zonasFiltro.includes(c.zona)
    const nivel = nivelUrgencia(c.fecha_fin)
    const matchU = urgenciaFiltro === 'todos' ||
      (urgenciaFiltro === 'hoy' && nivel === 'hoy') ||
      (urgenciaFiltro === 'semana' && (nivel === 'hoy' || nivel === 'semana')) ||
      (urgenciaFiltro === 'permanente' && nivel === 'permanente')
    return matchB && matchZ && matchU
  }))

  const negociosFiltrados = sortPorUrgencia(negocios.filter(n => {
    const matchB = q === '' ||
      n.nombre.toLowerCase().includes(q) ||
      n.iniciativa.toLowerCase().includes(q) ||
      n.zona.toLowerCase().includes(q) ||
      (n.tipo && n.tipo.toLowerCase().includes(q))
    const matchZ = zonasFiltro.length === 0 || zonasFiltro.includes(n.zona)
    const nivel = nivelUrgencia(n.fecha_fin)
    const matchU = urgenciaFiltro === 'todos' ||
      (urgenciaFiltro === 'hoy' && nivel === 'hoy') ||
      (urgenciaFiltro === 'semana' && (nivel === 'hoy' || nivel === 'semana')) ||
      (urgenciaFiltro === 'permanente' && nivel === 'permanente')
    return matchB && matchZ && matchU
  }))

  // Agrupar por zona solo cuando no hay filtros activos (para reducir scroll)
  const agruparPorZona = q === '' && zonasFiltro.length === 0 && urgenciaFiltro === 'todos'
  const centrosAgrupados = agruparPorZona ? groupByZona(centrosFiltrados) : null
  const negociosAgrupados = agruparPorZona ? groupByZona(negociosFiltrados) : null

  const filtrosActivos = q !== '' || zonasFiltro.length > 0 || urgenciaFiltro !== 'todos'

  function toggleZona(z: string) {
    setZonasFiltro(prev =>
      prev.includes(z) ? prev.filter(x => x !== z) : [...prev, z]
    )
  }

  function limpiarFiltros() {
    setBusqueda('')
    setZonasFiltro([])
    setUrgenciaFiltro('todos')
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
    setUrgenciaFiltro('todos')
    setSeleccionado(null)
    setSeleccionadoNegocio(null)
  }

  const negociosConMapa = negociosFiltrados.filter(n => n.lat != null && n.lng != null)
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)

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
            <div className="flex items-center gap-2">
              <ViendoAhora />
              <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
                <Package size={11} className="text-red-500" />
                <span className="text-sm font-bold text-red-600">{centros.length}</span>
                <span className="text-[10px] text-red-400 hidden sm:inline">centros</span>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                <Store size={11} className="text-amber-500" />
                <span className="text-sm font-bold text-amber-600">{negocios.length}</span>
                <span className="text-[10px] text-amber-400 hidden sm:inline">iniciativas</span>
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
              <Store size={14} /> Iniciativas
              {tab === 'negocios' && <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">{negocios.length}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* ── BANNER WhatsApp ── */}
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
            <a href="https://chat.whatsapp.com/I0L8IHvYpnJC6QVEdVF0o3?mode=gi_t"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-white text-emerald-800 font-bold text-sm px-5 py-2 hover:bg-emerald-50 transition-colors shadow-sm">
              <Users size={13} /> Unirme al grupo
            </a>
          </div>
        </div>
      </div>

      {/* ── BANNER CTA ── */}
      <div className="bg-amber-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <MapPin size={15} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">¿Conoces un centro de acopio o negocio?</p>
                <p className="text-xs text-amber-100">Escríbenos y lo publicamos.</p>
              </div>
            </div>
            <a href="https://wa.me/50767810189"
              target="_blank" rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-2 rounded-full bg-white text-amber-700 font-bold text-sm px-5 py-2 hover:bg-amber-50 transition-colors shadow-sm whitespace-nowrap">
              <WhatsAppIcon className="w-4 h-4 text-amber-600" /> Contáctanos
            </a>
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-10">

        {/* Filters — colapsables */}
        <div className="mb-4">
          {/* Botón toggle */}
          <button
            onClick={() => setFiltrosAbiertos(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all shadow-sm ${
              filtrosAbiertos
                ? 'bg-white border-gray-200 text-gray-700'
                : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Search size={14} />
            Filtros
            {filtrosActivos && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === 'centros' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                {tab === 'centros' ? `${centrosFiltrados.length}/${centros.length}` : `${negociosFiltrados.length}/${negocios.length}`}
              </span>
            )}
            <span className={`text-gray-400 transition-transform duration-200 ${filtrosAbiertos ? 'rotate-180' : ''}`}>▾</span>
          </button>

          {/* Panel expandido */}
          {filtrosAbiertos && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)] mt-2 overflow-hidden">
            <div className="px-4 pb-4 flex flex-col gap-3 pt-3">
              {/* Buscador */}
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
                  <button onClick={limpiarFiltros}
                    className="shrink-0 flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors">
                    <X size={13} /> Limpiar
                  </button>
                )}
              </div>

              {/* Zona */}
              {zonas.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="flex items-center gap-1 text-[11px] text-gray-400 mr-1 self-center"><MapPin size={11} /> Zona:</span>
                  {zonas.map(z => (
                    <button key={z} onClick={() => toggleZona(z)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                        zonasFiltro.includes(z)
                          ? tab === 'centros' ? 'bg-red-500 text-white border-red-500' : 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}>
                      {z}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}
        </div>

        {/* Cards + Map — scroll natural de página, mapa sticky */}
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-28 gap-3 text-gray-400">
            <div className="w-7 h-7 border-2 border-gray-200 border-t-red-400 rounded-full animate-spin" />
            <p className="text-sm">Cargando...</p>
          </div>
        ) : tab === 'centros' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {/* Lista — flujo natural, sin scroll interno */}
            <div className="flex flex-col gap-2 pb-6">
              {centrosFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                  <Package size={32} className="opacity-20" />
                  <p className="text-sm">No hay centros con esos filtros</p>
                </div>
              ) : centrosAgrupados ? (
                centrosAgrupados.map(({ zona, items }) => (
                  <div key={zona}>
                    <div className="flex items-center gap-2 px-1 pt-2 pb-1">
                      <MapPin size={11} className="text-gray-400 shrink-0" />
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{zona}</p>
                      <span className="text-[11px] text-gray-300">· {items.length}</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {items.map(centro => (
                        <div key={centro.id} id={`centro-${centro.id}`}>
                          <TarjetaCentro centro={centro} seleccionado={seleccionado?.id === centro.id} onClick={() => abrirCentro(centro)} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : centrosFiltrados.map(centro => (
                <div key={centro.id} id={`centro-${centro.id}`}>
                  <TarjetaCentro centro={centro} seleccionado={seleccionado?.id === centro.id} onClick={() => abrirCentro(centro)} />
                </div>
              ))}
            </div>
            {/* Mapa — sticky debajo del header */}
            <div className="hidden lg:block rounded-2xl overflow-hidden border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)] sticky"
              style={{ top: 112, height: 'calc(100vh - 120px)' }}>
              <MapaCentros centros={centrosFiltrados} onSelect={abrirCentro} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {/* Lista — flujo natural */}
            <div className="flex flex-col gap-2 pb-6">
              {negociosFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                  <Store size={32} className="opacity-20" />
                  <p className="text-sm">No hay negocios con esos filtros</p>
                </div>
              ) : negociosAgrupados ? (
                negociosAgrupados.map(({ zona, items }) => (
                  <div key={zona}>
                    <div className="flex items-center gap-2 px-1 pt-2 pb-1">
                      <MapPin size={11} className="text-gray-400 shrink-0" />
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{zona}</p>
                      <span className="text-[11px] text-gray-300">· {items.length}</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {items.map(n => (
                        <div key={n.id} id={`negocio-${n.id}`}>
                          <TarjetaNegocio negocio={n} seleccionado={seleccionadoNegocio?.id === n.id} onClick={() => abrirNegocio(n)} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : negociosFiltrados.map(n => (
                <div key={n.id} id={`negocio-${n.id}`}>
                  <TarjetaNegocio negocio={n} seleccionado={seleccionadoNegocio?.id === n.id} onClick={() => abrirNegocio(n)} />
                </div>
              ))}
            </div>
            {/* Mapa — sticky */}
            <div className="hidden lg:block rounded-2xl overflow-hidden border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)] sticky"
              style={{ top: 112, height: 'calc(100vh - 120px)' }}>
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
