'use client'

import { useEffect, useState } from 'react'
import { supabase, CentroAcopio, NegocioSolidario, Categoria, GrupoCategoria } from '@/lib/supabase'
import { useRef } from 'react'
import { Plus, Pencil, Eye, EyeOff, LogOut, Package, Store, Tag, Trash2 } from 'lucide-react'
import BuscadorUbicacion from '@/components/BuscadorUbicacion'

const TIPOS_NEGOCIO = [
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'cafe', label: 'Café' },
  { value: 'bar', label: 'Bar' },
  { value: 'tienda', label: 'Tienda' },
  { value: 'empresa', label: 'Empresa' },
  { value: 'otro', label: 'Otro' },
]

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const FORM_CENTRO_VACIO = {
  nombre: '', direccion: '', zona: '',
  que_acepta: [] as string[], lat: '', lng: '', notas: '',
  dias_abierto: [] as string[], hora_apertura: '', hora_cierre: '',
  fecha_inicio: '', fecha_fin: '',
}

const FORM_NEGOCIO_VACIO = {
  nombre: '', tipo: 'restaurante', iniciativa: '', zona: '',
  direccion: '', instagram: '', sitio_web: '', vigencia: '', fecha_fin: '',
}

type Tab = 'centros' | 'negocios' | 'categorias'

export default function AdminPage() {
  const [autenticado, setAutenticado] = useState(false)
  const [password, setPassword] = useState('')
  const [errorAuth, setErrorAuth] = useState('')
  const [tab, setTab] = useState<Tab>('centros')

  const [centros, setCentros] = useState<CentroAcopio[]>([])
  const [negocios, setNegocios] = useState<NegocioSolidario[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [grupos, setGrupos] = useState<GrupoCategoria[]>([])
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [nuevoGrupo, setNuevoGrupo] = useState('')
  const dragId = useRef<number | null>(null)

  const [formCentro, setFormCentro] = useState(FORM_CENTRO_VACIO)
  const [formNegocio, setFormNegocio] = useState(FORM_NEGOCIO_VACIO)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  function login() {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setAutenticado(true)
      setErrorAuth('')
    } else {
      setErrorAuth('Contraseña incorrecta')
    }
  }

  async function cargar() {
    const [{ data: dc }, { data: dn }, { data: dcat }, { data: dgr }] = await Promise.all([
      supabase.from('centros_acopio').select('*').order('created_at', { ascending: false }),
      supabase.from('negocios_solidarios').select('*').order('created_at', { ascending: false }),
      supabase.from('categorias').select('*').order('nombre'),
      supabase.from('grupos_categorias').select('*').order('nombre'),
    ])
    setCentros(dc ?? [])
    setNegocios(dn ?? [])
    setCategorias(dcat ?? [])
    setGrupos(dgr ?? [])
  }

  useEffect(() => { if (autenticado) cargar() }, [autenticado])

  async function agregarGrupo() {
    const nombre = nuevoGrupo.trim()
    if (!nombre) return
    await supabase.from('grupos_categorias').insert({ nombre })
    setNuevoGrupo('')
    cargar()
  }

  async function eliminarGrupo(id: number, nombre: string) {
    await supabase.from('categorias').update({ grupo: null }).eq('grupo', nombre)
    await supabase.from('grupos_categorias').delete().eq('id', id)
    cargar()
  }

  async function agregarCategoria() {
    const nombre = nuevaCategoria.trim()
    if (!nombre) return
    await supabase.from('categorias').insert({ nombre, grupo: null })
    setNuevaCategoria('')
    cargar()
  }

  async function asignarGrupo(categoriaId: number, grupoNombre: string | null) {
    await supabase.from('categorias').update({ grupo: grupoNombre }).eq('id', categoriaId)
    cargar()
  }

  async function eliminarCategoria(id: number) {
    await supabase.from('categorias').delete().eq('id', id)
    cargar()
  }

  function abrirNuevo() {
    if (tab === 'centros') setFormCentro(FORM_CENTRO_VACIO)
    else setFormNegocio(FORM_NEGOCIO_VACIO)
    setEditandoId(null)
    setMostrarForm(true)
  }

  function abrirEditarCentro(c: CentroAcopio) {
    setFormCentro({
      nombre: c.nombre, direccion: c.direccion, zona: c.zona,
      que_acepta: c.que_acepta, lat: String(c.lat), lng: String(c.lng), notas: c.notas ?? '',
      dias_abierto: c.dias_abierto ?? [],
      hora_apertura: c.hora_apertura ?? '',
      hora_cierre: c.hora_cierre ?? '',
      fecha_inicio: c.fecha_inicio ? c.fecha_inicio.slice(0, 10) : '',
      fecha_fin: c.fecha_fin ? c.fecha_fin.slice(0, 16) : '',
    })
    setEditandoId(c.id)
    setMostrarForm(true)
  }

  function abrirEditarNegocio(n: NegocioSolidario) {
    setFormNegocio({
      nombre: n.nombre, tipo: n.tipo, iniciativa: n.iniciativa, zona: n.zona,
      direccion: n.direccion ?? '', instagram: n.instagram ?? '',
      sitio_web: n.sitio_web ?? '', vigencia: n.vigencia ?? '',
      fecha_fin: n.fecha_fin ? n.fecha_fin.slice(0, 16) : '',
    })
    setEditandoId(n.id)
    setMostrarForm(true)
  }

  async function toggleActivo(tabla: string, id: number, actual: boolean) {
    await supabase.from(tabla).update({ activo: !actual }).eq('id', id)
    cargar()
  }

  async function guardarCentro() {
    const f = formCentro
    if (!f.nombre || !f.direccion || !f.zona || !f.lat || !f.lng) {
      setMensaje('Completa todos los campos obligatorios.')
      return
    }
    setGuardando(true)
    const payload = {
      nombre: f.nombre, direccion: f.direccion, zona: f.zona,
      que_acepta: f.que_acepta, lat: parseFloat(f.lat), lng: parseFloat(f.lng),
      notas: f.notas || null,
      dias_abierto: f.dias_abierto,
      hora_apertura: f.hora_apertura || null,
      hora_cierre: f.hora_cierre || null,
      fecha_inicio: f.fecha_inicio || null,
      fecha_fin: f.fecha_fin || null,
    }
    if (editandoId) {
      await supabase.from('centros_acopio').update(payload).eq('id', editandoId)
    } else {
      await supabase.from('centros_acopio').insert({ ...payload, activo: true })
    }
    finalizar(editandoId ? 'Centro actualizado.' : 'Centro agregado.')
  }

  async function guardarNegocio() {
    const f = formNegocio
    if (!f.nombre || !f.tipo || !f.iniciativa || !f.zona) {
      setMensaje('Completa todos los campos obligatorios.')
      return
    }
    setGuardando(true)
    const payload = {
      nombre: f.nombre, tipo: f.tipo, iniciativa: f.iniciativa, zona: f.zona,
      direccion: f.direccion || null, instagram: f.instagram || null,
      sitio_web: f.sitio_web || null, vigencia: f.vigencia || null, fecha_fin: f.fecha_fin || null,
    }
    if (editandoId) {
      await supabase.from('negocios_solidarios').update(payload).eq('id', editandoId)
    } else {
      await supabase.from('negocios_solidarios').insert({ ...payload, activo: true })
    }
    finalizar(editandoId ? 'Negocio actualizado.' : 'Negocio agregado.')
  }

  function finalizar(msg: string) {
    setGuardando(false)
    setMostrarForm(false)
    setMensaje(msg)
    setTimeout(() => setMensaje(''), 3000)
    cargar()
  }

  function toggleCategoria(val: string) {
    setFormCentro((f) => ({
      ...f,
      que_acepta: f.que_acepta.includes(val)
        ? f.que_acepta.filter((x) => x !== val)
        : [...f.que_acepta, val],
    }))
  }

  function toggleGrupoCompleto(nombreGrupo: string) {
    const insumos = categorias.filter(c => c.grupo === nombreGrupo).map(c => c.nombre)
    setFormCentro((f) => {
      const todosSeleccionados = insumos.every(i => f.que_acepta.includes(i))
      return {
        ...f,
        que_acepta: todosSeleccionados
          ? f.que_acepta.filter(x => !insumos.includes(x))
          : [...new Set([...f.que_acepta, ...insumos])],
      }
    })
  }

  if (!autenticado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Panel Admin</h1>
          <p className="text-sm text-gray-500 mb-6">Apoyemos a Venezuela</p>
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          {errorAuth && <p className="text-red-500 text-sm mb-3">{errorAuth}</p>}
          <button onClick={login}
            className="w-full rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600 transition-colors">
            Entrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">
            Panel Admin — <span className="text-red-500">Apoyemos a Venezuela</span>
          </h1>
          <div className="flex items-center gap-3">
            {tab !== 'categorias' && (
              <button onClick={abrirNuevo}
                className="flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 transition-colors">
                <Plus size={15} />
                Agregar {tab === 'centros' ? 'centro' : 'negocio'}
              </button>
            )}
            <button onClick={() => setAutenticado(false)} className="text-gray-400 hover:text-gray-600">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 flex gap-1 pb-0">
          <button onClick={() => { setTab('centros'); setMostrarForm(false) }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'centros' ? 'border-red-500 text-red-500' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <Package size={14} /> Centros ({centros.length})
          </button>
          <button onClick={() => { setTab('negocios'); setMostrarForm(false) }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'negocios' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <Store size={14} /> Negocios ({negocios.length})
          </button>
          <button onClick={() => { setTab('categorias'); setMostrarForm(false) }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'categorias' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <Tag size={14} /> Categorías ({categorias.length})
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {mensaje && (
          <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${mensaje.includes('obligator') ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
            {mensaje}
          </div>
        )}

        {/* Tab categorías */}
        {tab === 'categorias' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Columna izquierda: Categorías (grupos) */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-1">Categorías</h2>
              <p className="text-xs text-gray-400 mb-3">Crea categorías y arrastra insumos desde la derecha.</p>
              <div className="flex gap-2 mb-4">
                <input
                  value={nuevoGrupo}
                  onChange={(e) => setNuevoGrupo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && agregarGrupo()}
                  placeholder="Ej: Alimentos no perecederos"
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button onClick={agregarGrupo}
                  className="flex items-center gap-1 rounded-xl bg-blue-500 px-3 py-2 text-sm font-bold text-white hover:bg-blue-600 transition-colors">
                  <Plus size={14} />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {grupos.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">Aún no hay categorías. Crea la primera.</p>
                )}
                {grupos.map((grupo) => {
                  const insumos = categorias.filter(c => c.grupo === grupo.nombre)
                  return (
                    <div
                      key={grupo.id}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => { if (dragId.current !== null) asignarGrupo(dragId.current, grupo.nombre) }}
                      className="rounded-xl border-2 border-dashed border-gray-200 p-3 min-h-[60px] hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">{grupo.nombre}</p>
                        <button onClick={() => eliminarGrupo(grupo.id, grupo.nombre)}
                          className="text-gray-300 hover:text-red-400 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {insumos.map(cat => (
                          <div
                            key={cat.id}
                            draggable
                            onDragStart={() => { dragId.current = cat.id }}
                            className="flex items-center gap-1 rounded-full bg-blue-100 pl-2.5 pr-1.5 py-1 cursor-grab active:cursor-grabbing"
                          >
                            <span className="text-xs font-medium text-blue-700">{cat.nombre}</span>
                            <button onClick={() => eliminarCategoria(cat.id)}
                              className="text-blue-300 hover:text-red-400 transition-colors">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                        {insumos.length === 0 && (
                          <p className="text-xs text-gray-300 italic">Suelta insumos aquí...</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Columna derecha: Insumos */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-1">Insumos</h2>
              <p className="text-xs text-gray-400 mb-3">Crea insumos y arrástralos a una categoría.</p>
              <div className="flex gap-2 mb-4">
                <input
                  value={nuevaCategoria}
                  onChange={(e) => setNuevaCategoria(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && agregarCategoria()}
                  placeholder="Ej: Galletas saladas"
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button onClick={agregarCategoria}
                  className="flex items-center gap-1 rounded-xl bg-blue-500 px-3 py-2 text-sm font-bold text-white hover:bg-blue-600 transition-colors">
                  <Plus size={14} />
                </button>
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragId.current !== null) asignarGrupo(dragId.current, null) }}
                className="min-h-[100px] rounded-xl border-2 border-dashed border-gray-100 p-3"
              >
                <div className="flex flex-wrap gap-2">
                  {categorias.filter(c => !c.grupo).map(cat => (
                    <div
                      key={cat.id}
                      draggable
                      onDragStart={() => { dragId.current = cat.id }}
                      className="flex items-center gap-1 rounded-full bg-gray-100 pl-2.5 pr-1.5 py-1 cursor-grab active:cursor-grabbing"
                    >
                      <span className="text-xs font-medium text-gray-700">{cat.nombre}</span>
                      <button onClick={() => eliminarCategoria(cat.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                  {categorias.filter(c => !c.grupo).length === 0 && (
                    <p className="text-xs text-gray-300 italic">Todos los insumos están asignados a una categoría.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Formulario centro */}
        {mostrarForm && tab === 'centros' && (
          <div className="mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">
              {editandoId ? 'Editar centro' : 'Nuevo centro'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre *</label>
                <input value={formCentro.nombre} onChange={(e) => setFormCentro({ ...formCentro, nombre: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="Ej: Supermercado El Rey - Paitilla" />
              </div>
              <div className="sm:col-span-2">
                <BuscadorUbicacion
                  onSeleccionar={({ lat, lng, direccion, zona, nombre }) =>
                    setFormCentro((f) => ({ ...f, lat, lng, direccion, zona: zona || f.zona, nombre: nombre || f.nombre }))
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Dirección *</label>
                <input value={formCentro.direccion} onChange={(e) => setFormCentro({ ...formCentro, direccion: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="Se llena automáticamente o escribe manualmente" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Zona *</label>
                <input value={formCentro.zona} onChange={(e) => setFormCentro({ ...formCentro, zona: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="Ej: Ciudad de Panamá" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-2 block">Días abierto</label>
                <div className="flex flex-wrap gap-2">
                  {DIAS_SEMANA.map((dia) => (
                    <button key={dia} type="button"
                      onClick={() => setFormCentro((f) => ({
                        ...f,
                        dias_abierto: f.dias_abierto.includes(dia)
                          ? f.dias_abierto.filter(d => d !== dia)
                          : [...f.dias_abierto, dia],
                      }))}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold border transition-colors ${
                        formCentro.dias_abierto.includes(dia)
                          ? 'bg-red-500 text-white border-red-500'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-red-300'
                      }`}>
                      {dia}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Hora de apertura</label>
                <input type="time" value={formCentro.hora_apertura}
                  onChange={(e) => setFormCentro({ ...formCentro, hora_apertura: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Hora de cierre diario</label>
                <input type="time" value={formCentro.hora_cierre}
                  onChange={(e) => setFormCentro({ ...formCentro, hora_cierre: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Fecha de inicio (opcional)</label>
                <input type="date" value={formCentro.fecha_inicio}
                  onChange={(e) => setFormCentro({ ...formCentro, fecha_inicio: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Latitud *</label>
                <input value={formCentro.lat} onChange={(e) => setFormCentro({ ...formCentro, lat: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="Ej: 8.9936" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Longitud *</label>
                <input value={formCentro.lng} onChange={(e) => setFormCentro({ ...formCentro, lng: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="Ej: -79.5197" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-2 block">
                  Qué acepta
                  {categorias.length === 0 && (
                    <span className="ml-2 text-gray-400 font-normal">— agrega categorías primero en el tab Categorías</span>
                  )}
                </label>
                <div className="flex flex-col gap-3">
                  {grupos.map((grupo) => {
                    const insumos = categorias.filter(c => c.grupo === grupo.nombre)
                    if (insumos.length === 0) return null
                    const todosSeleccionados = insumos.every(i => formCentro.que_acepta.includes(i.nombre))
                    const algunoSeleccionado = insumos.some(i => formCentro.que_acepta.includes(i.nombre))
                    return (
                      <div key={grupo.id} className="rounded-xl border border-gray-200 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <button
                            type="button"
                            onClick={() => toggleGrupoCompleto(grupo.nombre)}
                            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border transition-colors ${
                              todosSeleccionados
                                ? 'bg-red-500 text-white border-red-500'
                                : algunoSeleccionado
                                ? 'bg-red-100 text-red-600 border-red-300'
                                : 'bg-gray-100 text-gray-600 border-gray-200 hover:border-red-300'
                            }`}
                          >
                            {todosSeleccionados ? '✓ ' : algunoSeleccionado ? '— ' : '+ '}{grupo.nombre}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-1">
                          {insumos.map((cat) => (
                            <button key={cat.id} type="button" onClick={() => toggleCategoria(cat.nombre)}
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors ${
                                formCentro.que_acepta.includes(cat.nombre)
                                  ? 'bg-red-500 text-white border-red-500'
                                  : 'bg-white text-gray-500 border-gray-200 hover:border-red-300'
                              }`}>
                              {cat.nombre}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  {/* Insumos sin grupo */}
                  {categorias.filter(c => !c.grupo).length > 0 && (
                    <div className="rounded-xl border border-gray-200 p-3">
                      <p className="text-xs font-bold text-gray-500 mb-2">Sin categoría</p>
                      <div className="flex flex-wrap gap-1.5">
                        {categorias.filter(c => !c.grupo).map((cat) => (
                          <button key={cat.id} type="button" onClick={() => toggleCategoria(cat.nombre)}
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors ${
                              formCentro.que_acepta.includes(cat.nombre)
                                ? 'bg-red-500 text-white border-red-500'
                                : 'bg-white text-gray-500 border-gray-200 hover:border-red-300'
                            }`}>
                            {cat.nombre}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Fecha y hora de cierre (opcional)</label>
                <input type="datetime-local" value={formCentro.fecha_fin}
                  onChange={(e) => setFormCentro({ ...formCentro, fecha_fin: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                <p className="text-xs text-gray-400 mt-1">El timer y el color de la tarjeta cambian según esta fecha.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notas (opcional)</label>
                <textarea value={formCentro.notas} onChange={(e) => setFormCentro({ ...formCentro, notas: e.target.value })}
                  rows={2} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  placeholder="Ej: Solo medicamentos sellados" />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={guardarCentro} disabled={guardando}
                className="rounded-xl bg-red-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-600 transition-colors disabled:opacity-50">
                {guardando ? 'Guardando...' : editandoId ? 'Actualizar' : 'Agregar'}
              </button>
              <button onClick={() => setMostrarForm(false)}
                className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Formulario negocio */}
        {mostrarForm && tab === 'negocios' && (
          <div className="mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">
              {editandoId ? 'Editar negocio' : 'Nuevo negocio'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <BuscadorUbicacion
                  onSeleccionar={({ direccion, zona, nombre }) =>
                    setFormNegocio((f) => ({ ...f, direccion: direccion || f.direccion, zona: zona || f.zona, nombre: nombre || f.nombre }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre *</label>
                <input value={formNegocio.nombre} onChange={(e) => setFormNegocio({ ...formNegocio, nombre: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="Ej: Restaurante La Palma" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo *</label>
                <select value={formNegocio.tipo} onChange={(e) => setFormNegocio({ ...formNegocio, tipo: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400">
                  {TIPOS_NEGOCIO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Iniciativa / Qué están donando *</label>
                <textarea value={formNegocio.iniciativa} onChange={(e) => setFormNegocio({ ...formNegocio, iniciativa: e.target.value })}
                  rows={2} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                  placeholder="Ej: 20% de las ventas del fin de semana van directo a Venezuela" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Zona *</label>
                <input value={formNegocio.zona} onChange={(e) => setFormNegocio({ ...formNegocio, zona: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="Ej: Miraflores" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Dirección (opcional)</label>
                <input value={formNegocio.direccion} onChange={(e) => setFormNegocio({ ...formNegocio, direccion: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="Ej: Calle 50, local 3" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Instagram (opcional)</label>
                <input value={formNegocio.instagram} onChange={(e) => setFormNegocio({ ...formNegocio, instagram: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="@nombredelnegocio" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Sitio web (opcional)</label>
                <input value={formNegocio.sitio_web} onChange={(e) => setFormNegocio({ ...formNegocio, sitio_web: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="https://..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Vigencia (opcional)</label>
                <input value={formNegocio.vigencia} onChange={(e) => setFormNegocio({ ...formNegocio, vigencia: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="Ej: Hasta el 30 de junio / Permanente" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Fecha y hora de cierre (opcional)</label>
                <input type="datetime-local" value={formNegocio.fecha_fin}
                  onChange={(e) => setFormNegocio({ ...formNegocio, fecha_fin: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={guardarNegocio} disabled={guardando}
                className="rounded-xl bg-yellow-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-yellow-600 transition-colors disabled:opacity-50">
                {guardando ? 'Guardando...' : editandoId ? 'Actualizar' : 'Agregar'}
              </button>
              <button onClick={() => setMostrarForm(false)}
                className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista centros */}
        {tab === 'centros' && (
          <div className="flex flex-col gap-3">
            {centros.map((c) => (
              <div key={c.id} className={`flex items-center gap-4 bg-white rounded-xl border px-4 py-3 ${c.activo ? 'border-gray-200' : 'border-gray-100 opacity-50'}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{c.nombre}</p>
                  <p className="text-xs text-gray-500 truncate">{c.zona}{c.direccion ? ` — ${c.direccion}` : ''}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => abrirEditarCentro(c)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><Pencil size={15} /></button>
                  <button onClick={() => toggleActivo('centros_acopio', c.id, c.activo)}
                    className={`p-2 rounded-lg transition-colors ${c.activo ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}>
                    {c.activo ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lista negocios */}
        {tab === 'negocios' && (
          <div className="flex flex-col gap-3">
            {negocios.map((n) => (
              <div key={n.id} className={`flex items-center gap-4 bg-white rounded-xl border px-4 py-3 ${n.activo ? 'border-gray-200' : 'border-gray-100 opacity-50'}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{n.nombre}</p>
                  <p className="text-xs text-gray-500 truncate">{n.zona} — {n.tipo}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => abrirEditarNegocio(n)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><Pencil size={15} /></button>
                  <button onClick={() => toggleActivo('negocios_solidarios', n.id, n.activo)}
                    className={`p-2 rounded-lg transition-colors ${n.activo ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}>
                    {n.activo ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
