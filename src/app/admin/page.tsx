'use client'

import { useEffect, useState } from 'react'
import { supabase, CentroAcopio, NegocioSolidario, Categoria } from '@/lib/supabase'
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

const FORM_CENTRO_VACIO = {
  nombre: '', direccion: '', zona: '', horario: '',
  que_acepta: [] as string[], lat: '', lng: '', notas: '', fecha_fin: '',
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
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [nuevaGrupo, setNuevaGrupo] = useState('')

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
    const [{ data: dc }, { data: dn }, { data: dcat }] = await Promise.all([
      supabase.from('centros_acopio').select('*').order('created_at', { ascending: false }),
      supabase.from('negocios_solidarios').select('*').order('created_at', { ascending: false }),
      supabase.from('categorias').select('*').order('nombre'),
    ])
    setCentros(dc ?? [])
    setNegocios(dn ?? [])
    setCategorias(dcat ?? [])
  }

  useEffect(() => { if (autenticado) cargar() }, [autenticado])

  async function agregarCategoria() {
    const nombre = nuevaCategoria.trim()
    if (!nombre) return
    await supabase.from('categorias').insert({ nombre, grupo: nuevaGrupo.trim() || null })
    setNuevaCategoria('')
    setNuevaGrupo('')
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
      nombre: c.nombre, direccion: c.direccion, zona: c.zona, horario: c.horario,
      que_acepta: c.que_acepta, lat: String(c.lat), lng: String(c.lng), notas: c.notas ?? '',
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
    if (!f.nombre || !f.direccion || !f.zona || !f.horario || !f.lat || !f.lng) {
      setMensaje('Completa todos los campos obligatorios.')
      return
    }
    setGuardando(true)
    const payload = {
      nombre: f.nombre, direccion: f.direccion, zona: f.zona, horario: f.horario,
      que_acepta: f.que_acepta, lat: parseFloat(f.lat), lng: parseFloat(f.lng),
      notas: f.notas || null, fecha_fin: f.fecha_fin || null,
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
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-1">Categorías de insumos</h2>
            <p className="text-xs text-gray-500 mb-4">Estas categorías aparecen en el formulario de centros de acopio.</p>

            <div className="flex flex-col sm:flex-row gap-2 mb-6">
              <input
                value={nuevaGrupo}
                onChange={(e) => setNuevaGrupo(e.target.value)}
                placeholder="Grupo (ej: Alimentos no perecederos)"
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && agregarCategoria()}
                placeholder="Insumo (ej: Galletas saladas)"
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button onClick={agregarCategoria}
                className="flex items-center gap-1.5 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-600 transition-colors">
                <Plus size={15} /> Agregar
              </button>
            </div>

            {categorias.length === 0 ? (
              <p className="text-sm text-gray-400">No hay categorías todavía. Agrega la primera.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {Object.entries(
                  categorias.reduce<Record<string, typeof categorias>>((acc, cat) => {
                    const g = cat.grupo || 'Sin grupo'
                    if (!acc[g]) acc[g] = []
                    acc[g].push(cat)
                    return acc
                  }, {})
                ).map(([grupo, cats]) => (
                  <div key={grupo}>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{grupo}</p>
                    <div className="flex flex-wrap gap-2">
                      {cats.map((cat) => (
                        <div key={cat.id} className="flex items-center gap-1.5 rounded-full bg-gray-100 pl-3 pr-2 py-1.5">
                          <span className="text-sm font-medium text-gray-700">{cat.nombre}</span>
                          <button onClick={() => eliminarCategoria(cat.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Horario *</label>
                <input value={formCentro.horario} onChange={(e) => setFormCentro({ ...formCentro, horario: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="Ej: Lun-Sáb 8am-6pm" />
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
                <div className="flex flex-wrap gap-2">
                  {categorias.map((cat) => (
                    <button key={cat.id} type="button" onClick={() => toggleCategoria(cat.nombre)}
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                        formCentro.que_acepta.includes(cat.nombre)
                          ? 'bg-red-500 text-white border-red-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'
                      }`}>
                      {cat.nombre}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Fecha y hora de cierre (opcional)</label>
                <input type="datetime-local" value={formCentro.fecha_fin}
                  onChange={(e) => setFormCentro({ ...formCentro, fecha_fin: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
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
                  <p className="text-xs text-gray-500 truncate">{c.zona} — {c.horario}</p>
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
