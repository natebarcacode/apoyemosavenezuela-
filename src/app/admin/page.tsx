'use client'

import { useEffect, useState } from 'react'
import { CentroAcopio, NegocioSolidario, Categoria, GrupoCategoria, MensajeWA } from '@/lib/supabase'
import { useRef } from 'react'
import { Plus, Pencil, Eye, EyeOff, LogOut, Package, Store, Tag, Trash2, MessageSquare, Copy, Check, X } from 'lucide-react'
import BuscadorUbicacion from '@/components/BuscadorUbicacion'
import dynamic from 'next/dynamic'
const MapaPicker = dynamic(() => import('@/components/MapaPicker'), { ssr: false })

const TIPOS_NEGOCIO = [
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'cafe', label: 'Café' },
  { value: 'bar', label: 'Bar' },
  { value: 'tienda', label: 'Tienda' },
  { value: 'empresa', label: 'Empresa' },
  { value: 'otro', label: 'Otro' },
]

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const horarioVacio = () => DIAS_SEMANA.map(dia => ({ dia, activo: false, apertura: '', cierre: '' }))

const FORM_CENTRO_VACIO = () => ({
  nombre: '', direccion: '', zona: '',
  que_acepta: [] as string[], lat: '', lng: '', notas: '',
  instagram: '', sitio_web: '',
  horarios: horarioVacio(),
  fecha_inicio: '', fecha_fin: '',
})

const FORM_NEGOCIO_VACIO = () => ({
  nombre: '', tipo: 'restaurante', iniciativa: '', zona: '',
  direccion: '', instagram: '', sitio_web: '', vigencia: '',
  horarios: horarioVacio(),
  fecha_inicio: '', fecha_fin: '',
  lat: '', lng: '',
})

type Tab = 'centros' | 'negocios' | 'categorias'

async function resolverCoordsDeGoogleMaps(url: string): Promise<{ lat: string; lng: string } | string> {
  const res = await fetch('/api/resolve-maps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  const data = await res.json()
  if (data.error) return data.error as string
  return data as { lat: string; lng: string }
}

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

  const [formCentro, setFormCentro] = useState(FORM_CENTRO_VACIO())
  const [formNegocio, setFormNegocio] = useState(FORM_NEGOCIO_VACIO())
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [mensajesWA, setMensajesWA] = useState<MensajeWA[]>([])
  const [mensajesAbiertos, setMensajesAbiertos] = useState<Record<string, boolean>>({})
  const [copiandoMsgId, setCopiandoMsgId] = useState<number | null>(null)
  const [waMensaje, setWaMensaje] = useState('')
  const [waMostrar, setWaMostrar] = useState(false)
  const [waCopied, setWaCopied] = useState(false)
  const [notificarWA, setNotificarWA] = useState(true)

  // Check existing session on mount
  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(({ ok }) => { if (ok) setAutenticado(true) })
  }, [])

  async function db(params: Record<string, unknown>): Promise<{ data: unknown; error: unknown }> {
    const res = await fetch('/api/admin/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    return res.json()
  }

  async function login() {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const { ok } = await res.json()
    if (ok) {
      setAutenticado(true)
      setErrorAuth('')
    } else {
      setErrorAuth('Contraseña incorrecta')
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setAutenticado(false)
    setPassword('')
  }

  async function cargar() {
    const [{ data: dc }, { data: dn }, { data: dcat }, { data: dgr }, { data: dmsg }] = await Promise.all([
      db({ table: 'centros_acopio', op: 'select', order: { column: 'created_at', ascending: false } }),
      db({ table: 'negocios_solidarios', op: 'select', order: { column: 'created_at', ascending: false } }),
      db({ table: 'categorias', op: 'select', order: { column: 'nombre', ascending: true } }),
      db({ table: 'grupos_categorias', op: 'select', order: { column: 'nombre', ascending: true } }),
      db({ table: 'mensajes_wa', op: 'select', order: { column: 'created_at', ascending: false } }),
    ]) as Array<{ data: unknown; error: unknown }>
    setCentros((dc as CentroAcopio[]) ?? [])
    setNegocios((dn as NegocioSolidario[]) ?? [])
    setCategorias((dcat as Categoria[]) ?? [])
    setGrupos((dgr as GrupoCategoria[]) ?? [])
    setMensajesWA((dmsg as MensajeWA[]) ?? [])
  }

  useEffect(() => { if (autenticado) cargar() }, [autenticado])

  async function agregarGrupo() {
    const nombre = nuevoGrupo.trim()
    if (!nombre) return
    await db({ table: 'grupos_categorias', op: 'insert', data: { nombre } })
    setNuevoGrupo('')
    cargar()
  }

  async function eliminarGrupo(id: number, nombre: string) {
    await db({ table: 'categorias', op: 'update', data: { grupo: null }, eq: [['grupo', nombre]] })
    await db({ table: 'grupos_categorias', op: 'delete', eq: [['id', id]] })
    cargar()
  }

  async function agregarCategoria() {
    const nombre = nuevaCategoria.trim()
    if (!nombre) return
    await db({ table: 'categorias', op: 'insert', data: { nombre, grupo: null } })
    setNuevaCategoria('')
    cargar()
  }

  async function asignarGrupo(categoriaId: number, grupoNombre: string | null) {
    await db({ table: 'categorias', op: 'update', data: { grupo: grupoNombre }, eq: [['id', categoriaId]] })
    cargar()
  }

  async function eliminarCategoria(id: number) {
    await db({ table: 'categorias', op: 'delete', eq: [['id', id]] })
    cargar()
  }

  function abrirNuevo() {
    if (tab === 'centros') setFormCentro(FORM_CENTRO_VACIO())
    else setFormNegocio(FORM_NEGOCIO_VACIO())
    setEditandoId(null)
    setNotificarWA(true)
    setMostrarForm(true)
  }

  function abrirEditarCentro(c: CentroAcopio) {
    setFormCentro({
      nombre: c.nombre, direccion: c.direccion, zona: c.zona,
      que_acepta: c.que_acepta, lat: String(c.lat), lng: String(c.lng), notas: c.notas ?? '',
      instagram: c.instagram ?? '', sitio_web: c.sitio_web ?? '',
      horarios: DIAS_SEMANA.map(dia => {
        const found = (c.horarios ?? []).find((h: {dia:string}) => h.dia === dia)
        return found ? { dia, activo: true, apertura: (found as {apertura:string}).apertura || '', cierre: (found as {cierre:string}).cierre || '' } : { dia, activo: false, apertura: '', cierre: '' }
      }),
      fecha_inicio: c.fecha_inicio ? c.fecha_inicio.slice(0, 10) : '',
      fecha_fin: c.fecha_fin ? c.fecha_fin.slice(0, 16) : '',
    })
    setEditandoId(c.id)
    setNotificarWA(false)
    setMostrarForm(true)
  }

  function abrirEditarNegocio(n: NegocioSolidario) {
    setFormNegocio({
      nombre: n.nombre, tipo: n.tipo, iniciativa: n.iniciativa, zona: n.zona,
      direccion: n.direccion ?? '', instagram: n.instagram ?? '',
      sitio_web: n.sitio_web ?? '', vigencia: n.vigencia ?? '',
      lat: n.lat != null ? String(n.lat) : '',
      lng: n.lng != null ? String(n.lng) : '',
      horarios: DIAS_SEMANA.map(dia => {
        const found = (n.horarios ?? []).find((h: {dia:string}) => h.dia === dia)
        return found ? { dia, activo: true, apertura: (found as {apertura:string}).apertura || '', cierre: (found as {cierre:string}).cierre || '' } : { dia, activo: false, apertura: '', cierre: '' }
      }),
      fecha_inicio: n.fecha_inicio ?? '',
      fecha_fin: n.fecha_fin ? n.fecha_fin.slice(0, 16) : '',
    })
    setEditandoId(n.id)
    setNotificarWA(false)
    setMostrarForm(true)
  }

  async function toggleActivo(tabla: string, id: number, actual: boolean) {
    await db({ table: tabla, op: 'update', data: { activo: !actual }, eq: [['id', id]] })
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
      instagram: f.instagram || null, sitio_web: f.sitio_web || null,
      horarios: f.horarios.filter((h: {activo:boolean}) => h.activo).map(({dia, apertura, cierre}: {dia:string,apertura:string,cierre:string}) => ({ dia, apertura, cierre })),
      fecha_inicio: f.fecha_inicio || null,
      fecha_fin: f.fecha_fin || null,
    }
    const esNuevo = !editandoId
    let refId = editandoId
    if (editandoId) {
      await db({ table: 'centros_acopio', op: 'update', data: payload, eq: [['id', editandoId]] })
    } else {
      const { data: ins } = await db({ table: 'centros_acopio', op: 'insert', data: { ...payload, activo: true }, single: true }) as { data: { id: number } | null; error: unknown }
      refId = ins?.id ?? null
    }
    if (notificarWA && refId) {
      const texto = mensajeCentro(formCentro, esNuevo ? 'nuevo' : 'actualizado')
      await db({ table: 'mensajes_wa', op: 'insert', data: { tipo: 'centro', referencia_id: refId, texto } })
      setMensajesAbiertos(p => ({ ...p, [`centro-${refId}`]: true }))
      mostrarWA(texto)
    }
    finalizar(esNuevo ? 'Centro agregado.' : 'Centro actualizado.')
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
      sitio_web: f.sitio_web || null, vigencia: f.vigencia || null,
      lat: f.lat ? parseFloat(f.lat) : null,
      lng: f.lng ? parseFloat(f.lng) : null,
      horarios: f.horarios.filter((h: {activo:boolean}) => h.activo).map(({dia, apertura, cierre}: {dia:string,apertura:string,cierre:string}) => ({ dia, apertura, cierre })),
      fecha_inicio: f.fecha_inicio || null,
      fecha_fin: f.fecha_fin || null,
    }
    const esNuevo = !editandoId
    let refId = editandoId
    if (editandoId) {
      await db({ table: 'negocios_solidarios', op: 'update', data: payload, eq: [['id', editandoId]] })
    } else {
      const { data: ins } = await db({ table: 'negocios_solidarios', op: 'insert', data: { ...payload, activo: true }, single: true }) as { data: { id: number } | null; error: unknown }
      refId = ins?.id ?? null
    }
    if (notificarWA && refId) {
      const texto = mensajeNegocio(formNegocio, esNuevo ? 'nuevo' : 'actualizado')
      await db({ table: 'mensajes_wa', op: 'insert', data: { tipo: 'negocio', referencia_id: refId, texto } })
      setMensajesAbiertos(p => ({ ...p, [`negocio-${refId}`]: true }))
      mostrarWA(texto)
    }
    finalizar(esNuevo ? 'Negocio agregado.' : 'Negocio actualizado.')
  }

  function fmtHora(t: string) {
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'pm' : 'am'
    const h12 = h % 12 || 12
    return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`
  }

  function mensajeCentro(c: CentroAcopio | ReturnType<typeof FORM_CENTRO_VACIO>, tipo: 'nuevo' | 'actualizado' | 'cierre') {
    const dias = (c.horarios ?? []).map((h: {dia:string}) => h.dia).join(' · ')
    const cierre = c.fecha_fin ? new Date(c.fecha_fin).toLocaleString('es-PA', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : ''
    const dir = c.direccion && c.direccion.trim() !== c.nombre.trim() ? c.direccion : ''

    if (tipo === 'cierre') {
      let m = `⚠️ *¡ÚLTIMO MOMENTO!*\n\n📍 *${c.nombre}*`
      if (dir) m += `\n🗺️ ${dir}`
      m += `\n\n⏳ *Cierra el ${cierre}*\n\n👉 apoyemosavenezuela.vercel.app\n\n🇻🇪 _Todos con Venezuela_`
      return m
    }

    let m = tipo === 'nuevo' ? '🏠 *Nuevo centro de acopio*' : '🔄 *Centro de acopio actualizado*'
    m += `\n\n📍 *${c.nombre}*`
    if (dir) m += `\n🗺️ ${dir}`
    if (dias) m += `\n🕐 ${dias}`
    m += `\n\n👉 apoyemosavenezuela.vercel.app\n\n🇻🇪 _Todos con Venezuela_`
    return m
  }

  function mensajeNegocio(n: NegocioSolidario | ReturnType<typeof FORM_NEGOCIO_VACIO>, tipo: 'nuevo' | 'actualizado' | 'cierre') {
    const dias = (n.horarios ?? []).map((h: {dia:string}) => h.dia).join(' · ')
    const cierre = n.fecha_fin ? new Date(n.fecha_fin).toLocaleString('es-PA', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : ''
    const dir = n.direccion && n.direccion.trim() !== n.nombre.trim() ? n.direccion : ''

    if (tipo === 'cierre') {
      let m = `⚠️ *¡ÚLTIMO MOMENTO!*\n\n🏪 *${n.nombre}*`
      if (dir) m += `\n🗺️ ${dir}`
      m += `\n\n⏳ *Su iniciativa termina el ${cierre}*\n\n👉 apoyemosavenezuela.vercel.app\n\n🇻🇪 _Todos con Venezuela_`
      return m
    }

    let m = tipo === 'nuevo' ? '🤝 *Nuevo negocio solidario*' : '🔄 *Negocio solidario actualizado*'
    m += `\n\n🏪 *${n.nombre}*`
    if (dir) m += `\n🗺️ ${dir}`
    if (dias) m += `\n🕐 ${dias}`
    m += `\n\n👉 apoyemosavenezuela.vercel.app\n\n🇻🇪 _Todos con Venezuela_`
    return m
  }

  async function guardarYMostrarMensaje(tipo: 'centro' | 'negocio', refId: number, texto: string) {
    await db({ table: 'mensajes_wa', op: 'insert', data: { tipo, referencia_id: refId, texto } })
    setMensajesAbiertos(p => ({ ...p, [`${tipo}-${refId}`]: true }))
    mostrarWA(texto)
    cargar()
  }

  async function eliminarMensajeWA(id: number) {
    await db({ table: 'mensajes_wa', op: 'delete', eq: [['id', id]] })
    setMensajesWA(prev => prev.filter(m => m.id !== id))
  }

  async function copiarMensaje(id: number, texto: string) {
    await navigator.clipboard.writeText(texto)
    setCopiandoMsgId(id)
    setTimeout(() => setCopiandoMsgId(null), 2000)
  }

  function mostrarWA(texto: string) {
    setWaMensaje(texto)
    setWaMostrar(true)
    setWaCopied(false)
  }

  async function copiarWA() {
    await navigator.clipboard.writeText(waMensaje)
    setWaCopied(true)
    setTimeout(() => setWaCopied(false), 2000)
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

      {/* Modal WhatsApp */}
      {waMostrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-green-500" />
                <p className="font-bold text-gray-900 text-sm">Mensaje para WhatsApp</p>
              </div>
              <button onClick={() => setWaMostrar(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              <textarea
                readOnly
                value={waMensaje}
                rows={12}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-mono text-gray-800 resize-none focus:outline-none"
              />
              <button
                onClick={copiarWA}
                className={`mt-3 w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors ${
                  waCopied ? 'bg-green-500 text-white' : 'bg-gray-900 text-white hover:bg-gray-700'
                }`}
              >
                {waCopied ? <><Check size={15} /> ¡Copiado!</> : <><Copy size={15} /> Copiar mensaje</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-extrabold text-gray-900 leading-tight">Panel Admin</h1>
            <p className="text-[11px] text-gray-400">Apoyemos a Venezuela</p>
          </div>
          <div className="flex items-center gap-2">
            {tab !== 'categorias' && (
              <button onClick={abrirNuevo}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white transition-colors ${tab === 'centros' ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'}`}>
                <Plus size={15} />
                Agregar {tab === 'centros' ? 'centro' : 'negocio'}
              </button>
            )}
            <button onClick={logout} title="Cerrar sesión" className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 pb-3 flex gap-1">
          <button onClick={() => { setTab('centros'); setMostrarForm(false) }}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-xl transition-all ${
              tab === 'centros' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'
            }`}>
            <Package size={13} /> Centros <span className={`text-xs px-1.5 py-0.5 rounded-md font-bold ${tab === 'centros' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{centros.length}</span>
          </button>
          <button onClick={() => { setTab('negocios'); setMostrarForm(false) }}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-xl transition-all ${
              tab === 'negocios' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'
            }`}>
            <Store size={13} /> Negocios <span className={`text-xs px-1.5 py-0.5 rounded-md font-bold ${tab === 'negocios' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{negocios.length}</span>
          </button>
          <button onClick={() => { setTab('categorias'); setMostrarForm(false) }}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-xl transition-all ${
              tab === 'categorias' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'
            }`}>
            <Tag size={13} /> Insumos <span className={`text-xs px-1.5 py-0.5 rounded-md font-bold ${tab === 'categorias' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{categorias.length}</span>
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
              {editandoId ? 'Editar centro de acopio' : 'Agregar centro de acopio'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* ── Sección: Info básica ── */}
              <div className="sm:col-span-2 border-t border-gray-100 pt-3 -mt-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Información básica</p>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre del centro *</label>
                <input value={formCentro.nombre} onChange={(e) => setFormCentro({ ...formCentro, nombre: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="Ej: Supermercado El Rey - Paitilla" />
              </div>
              {/* ── Sección: Ubicación ── */}
              <div className="sm:col-span-2 border-t border-gray-100 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Ubicación</p>
              </div>
              <div className="sm:col-span-2">
                <BuscadorUbicacion
                  onSeleccionar={({ lat, lng, direccion, zona, nombre }) =>
                    setFormCentro((f) => ({ ...f, lat, lng, direccion, zona: zona || f.zona, nombre: nombre || f.nombre }))
                  }
                />
              </div>
              {formCentro.lat && formCentro.lng && (
                <div className="sm:col-span-2">
                  <MapaPicker
                    lat={formCentro.lat}
                    lng={formCentro.lng}
                    onChange={(lat, lng) => setFormCentro(f => ({ ...f, lat, lng }))}
                  />
                </div>
              )}
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
              {/* ── Sección: Horario ── */}
              <div className="sm:col-span-2 border-t border-gray-100 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Horario de atención</p>
              </div>
              <div className="sm:col-span-2">
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  {formCentro.horarios.map((h, i) => (
                    <div key={h.dia} className={`flex items-center gap-3 px-3 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <button type="button"
                        onClick={() => setFormCentro(f => ({ ...f, horarios: f.horarios.map(x => x.dia === h.dia ? { ...x, activo: !x.activo } : x) }))}
                        className={`w-10 shrink-0 text-xs font-bold rounded-full py-1 border transition-colors ${h.activo ? 'bg-red-500 text-white border-red-500' : 'text-gray-400 border-gray-200 hover:border-red-300'}`}>
                        {h.dia}
                      </button>
                      {h.activo ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input type="time" value={h.apertura}
                            onChange={e => setFormCentro(f => ({ ...f, horarios: f.horarios.map(x => x.dia === h.dia ? { ...x, apertura: e.target.value } : x) }))}
                            className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-300" />
                          <span className="text-xs text-gray-400">a</span>
                          <input type="time" value={h.cierre}
                            onChange={e => setFormCentro(f => ({ ...f, horarios: f.horarios.map(x => x.dia === h.dia ? { ...x, cierre: e.target.value } : x) }))}
                            className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-300" />
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300 italic">Cerrado</span>
                      )}
                    </div>
                  ))}
                </div>
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
              {formCentro.lat && formCentro.lng && (
                <div className="sm:col-span-2">
                  <a
                    href={`https://www.google.com/maps?q=${formCentro.lat},${formCentro.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    Verificar ubicación en Google Maps →
                  </a>
                  <p className="text-xs text-gray-400 mt-1">Si el pin está mal: right-click en el lugar correcto → copia las coordenadas → pégalas arriba.</p>
                </div>
              )}
              {/* ── Sección: Insumos ── */}
              <div className="sm:col-span-2 border-t border-gray-100 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Qué insumos acepta</p>
                {categorias.length === 0 && (
                  <p className="text-xs text-amber-500 mb-3">Primero agrega insumos en el tab "Insumos"</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="sr-only">Qué acepta</label>
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
              {/* ── Sección: Opcionales ── */}
              <div className="sm:col-span-2 border-t border-gray-100 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Fechas y detalles opcionales</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Fecha y hora de cierre</label>
                <input type="datetime-local" value={formCentro.fecha_fin}
                  onChange={(e) => setFormCentro({ ...formCentro, fecha_fin: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                <p className="text-xs text-gray-400 mt-1">El timer y el color de la tarjeta cambian según esta fecha.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notas</label>
                <textarea value={formCentro.notas} onChange={(e) => setFormCentro({ ...formCentro, notas: e.target.value })}
                  rows={2} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  placeholder="Ej: Solo medicamentos sellados" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Instagram (opcional)</label>
                <input value={formCentro.instagram} onChange={(e) => setFormCentro({ ...formCentro, instagram: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="@usuario" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Sitio web (opcional)</label>
                <input value={formCentro.sitio_web} onChange={(e) => setFormCentro({ ...formCentro, sitio_web: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="https://..." />
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={notificarWA}
                  onChange={e => setNotificarWA(e.target.checked)}
                  className="w-4 h-4 accent-red-500"
                />
                <span className="text-sm text-gray-600">Generar mensaje de WhatsApp</span>
              </label>
              <div className="flex gap-3">
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
          </div>
        )}

        {/* Formulario negocio */}
        {mostrarForm && tab === 'negocios' && (
          <div className="mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">
              {editandoId ? 'Editar negocio solidario' : 'Agregar negocio solidario'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* ── Sección: Ubicación ── */}
              <div className="sm:col-span-2 border-t border-gray-100 pt-3 -mt-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Ubicación</p>
              </div>
              <div className="sm:col-span-2">
                <BuscadorUbicacion
                  onSeleccionar={({ lat, lng, direccion, zona, nombre }) =>
                    setFormNegocio((f) => ({ ...f, lat, lng, direccion: direccion || f.direccion, zona: zona || f.zona, nombre: nombre || f.nombre }))
                  }
                />
              </div>
              {formNegocio.lat && formNegocio.lng && (
                <div className="sm:col-span-2">
                  <MapaPicker
                    lat={formNegocio.lat}
                    lng={formNegocio.lng}
                    onChange={(lat, lng) => setFormNegocio(f => ({ ...f, lat, lng }))}
                  />
                </div>
              )}
              {/* ── Sección: Info ── */}
              <div className="sm:col-span-2 border-t border-gray-100 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Información del negocio</p>
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
              {/* ── Sección: Horario negocio ── */}
              <div className="sm:col-span-2 border-t border-gray-100 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Horario de atención</p>
              </div>
              <div className="sm:col-span-2">
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  {formNegocio.horarios.map((h, i) => (
                    <div key={h.dia} className={`flex items-center gap-3 px-3 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <button type="button"
                        onClick={() => setFormNegocio(f => ({ ...f, horarios: f.horarios.map(x => x.dia === h.dia ? { ...x, activo: !x.activo } : x) }))}
                        className={`w-10 shrink-0 text-xs font-bold rounded-full py-1 border transition-colors ${h.activo ? 'bg-yellow-500 text-white border-yellow-500' : 'text-gray-400 border-gray-200 hover:border-yellow-300'}`}>
                        {h.dia}
                      </button>
                      {h.activo ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input type="time" value={h.apertura}
                            onChange={e => setFormNegocio(f => ({ ...f, horarios: f.horarios.map(x => x.dia === h.dia ? { ...x, apertura: e.target.value } : x) }))}
                            className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-yellow-300" />
                          <span className="text-xs text-gray-400">a</span>
                          <input type="time" value={h.cierre}
                            onChange={e => setFormNegocio(f => ({ ...f, horarios: f.horarios.map(x => x.dia === h.dia ? { ...x, cierre: e.target.value } : x) }))}
                            className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-yellow-300" />
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300 italic">Cerrado</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {/* ── Sección: Fechas negocio ── */}
              <div className="sm:col-span-2 border-t border-gray-100 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Fechas opcionales</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Fecha de inicio</label>
                <input type="date" value={formNegocio.fecha_inicio}
                  onChange={(e) => setFormNegocio({ ...formNegocio, fecha_inicio: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Fecha y hora de cierre (opcional)</label>
                <input type="datetime-local" value={formNegocio.fecha_fin}
                  onChange={(e) => setFormNegocio({ ...formNegocio, fecha_fin: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                <p className="text-xs text-gray-400 mt-1">El timer de la tarjeta cambia según esta fecha.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Vigencia (opcional)</label>
                <input value={formNegocio.vigencia} onChange={(e) => setFormNegocio({ ...formNegocio, vigencia: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="Ej: Permanente / Solo este mes" />
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={notificarWA}
                  onChange={e => setNotificarWA(e.target.checked)}
                  className="w-4 h-4 accent-yellow-500"
                />
                <span className="text-sm text-gray-600">Generar mensaje de WhatsApp</span>
              </label>
              <div className="flex gap-3">
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
          </div>
        )}

        {/* Lista centros */}
        {tab === 'centros' && (
          <div className="flex flex-col gap-3">
            {centros.map((c) => {
              const key = `centro-${c.id}`
              const msgs = mensajesWA.filter(m => m.tipo === 'centro' && m.referencia_id === c.id)
              const abierto = mensajesAbiertos[key]
              return (
                <div key={c.id} className={`bg-white rounded-xl border ${c.activo ? 'border-gray-200' : 'border-gray-100 opacity-50'}`}>
                  <div className="flex items-start gap-3 px-4 py-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${c.activo ? 'bg-green-400' : 'bg-gray-300'}`} title={c.activo ? 'Visible al público' : 'Oculto'} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{c.nombre}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{c.zona}{c.direccion ? ` · ${c.direccion}` : ''}</p>
                      {c.que_acepta?.length > 0 && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          <span className="font-medium text-gray-500">{c.que_acepta.length} insumos:</span>{' '}
                          {c.que_acepta.slice(0, 4).join(', ')}{c.que_acepta.length > 4 ? '...' : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => guardarYMostrarMensaje('centro', c.id, mensajeCentro(c, c.fecha_fin && new Date(c.fecha_fin).getTime() - Date.now() < 48 * 3600000 ? 'cierre' : 'actualizado'))}
                        title="Generar mensaje WhatsApp"
                        className="p-2 rounded-lg text-green-500 hover:bg-green-50 transition-colors"><MessageSquare size={15} /></button>
                      <button onClick={() => abrirEditarCentro(c)} title="Editar" className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><Pencil size={15} /></button>
                      <button onClick={() => toggleActivo('centros_acopio', c.id, c.activo)} title={c.activo ? 'Ocultar' : 'Publicar'}
                        className={`p-2 rounded-lg transition-colors ${c.activo ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}>
                        {c.activo ? <Eye size={15} /> : <EyeOff size={15} />}
                      </button>
                    </div>
                  </div>
                  {msgs.length > 0 && (
                    <div className="border-t border-gray-100">
                      <button
                        onClick={() => setMensajesAbiertos(p => ({ ...p, [key]: !p[key] }))}
                        className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        <span className="flex items-center gap-1.5"><MessageSquare size={12} className="text-green-500" /> Mensajes ({msgs.length})</span>
                        <span>{abierto ? '▲' : '▼'}</span>
                      </button>
                      {abierto && (
                        <div className="flex flex-col divide-y divide-gray-100">
                          {msgs.map(m => (
                            <div key={m.id} className="px-4 py-3 bg-gray-50">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-gray-400">{new Date(m.created_at).toLocaleString('es-PA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                <div className="flex gap-1">
                                  <button onClick={() => copiarMensaje(m.id, m.texto)}
                                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium transition-colors ${copiandoMsgId === m.id ? 'bg-green-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                                    {copiandoMsgId === m.id ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
                                  </button>
                                  <button onClick={() => eliminarMensajeWA(m.id)} className="p-1 rounded-lg text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                                </div>
                              </div>
                              <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">{m.texto}</pre>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Lista negocios */}
        {tab === 'negocios' && (
          <div className="flex flex-col gap-3">
            {negocios.map((n) => {
              const key = `negocio-${n.id}`
              const msgs = mensajesWA.filter(m => m.tipo === 'negocio' && m.referencia_id === n.id)
              const abierto = mensajesAbiertos[key]
              return (
                <div key={n.id} className={`bg-white rounded-xl border ${n.activo ? 'border-gray-200' : 'border-gray-100 opacity-50'}`}>
                  <div className="flex items-start gap-3 px-4 py-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.activo ? 'bg-green-400' : 'bg-gray-300'}`} title={n.activo ? 'Visible al público' : 'Oculto'} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <p className="font-semibold text-gray-900 text-sm truncate">{n.nombre}</p>
                        <span className="text-[10px] text-amber-500 font-medium shrink-0">{n.tipo}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{n.zona}</p>
                      {n.iniciativa && (
                        <p className="text-[10px] text-amber-600 bg-amber-50 rounded-md px-1.5 py-0.5 mt-1 line-clamp-1">
                          {n.iniciativa}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => guardarYMostrarMensaje('negocio', n.id, mensajeNegocio(n, n.fecha_fin && new Date(n.fecha_fin).getTime() - Date.now() < 48 * 3600000 ? 'cierre' : 'actualizado'))}
                        title="Generar mensaje WhatsApp"
                        className="p-2 rounded-lg text-green-500 hover:bg-green-50 transition-colors"><MessageSquare size={15} /></button>
                      <button onClick={() => abrirEditarNegocio(n)} title="Editar" className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><Pencil size={15} /></button>
                      <button onClick={() => toggleActivo('negocios_solidarios', n.id, n.activo)} title={n.activo ? 'Ocultar' : 'Publicar'}
                        className={`p-2 rounded-lg transition-colors ${n.activo ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}>
                        {n.activo ? <Eye size={15} /> : <EyeOff size={15} />}
                      </button>
                    </div>
                  </div>
                  {msgs.length > 0 && (
                    <div className="border-t border-gray-100">
                      <button
                        onClick={() => setMensajesAbiertos(p => ({ ...p, [key]: !p[key] }))}
                        className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        <span className="flex items-center gap-1.5"><MessageSquare size={12} className="text-green-500" /> Mensajes ({msgs.length})</span>
                        <span>{abierto ? '▲' : '▼'}</span>
                      </button>
                      {abierto && (
                        <div className="flex flex-col divide-y divide-gray-100">
                          {msgs.map(m => (
                            <div key={m.id} className="px-4 py-3 bg-gray-50">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-gray-400">{new Date(m.created_at).toLocaleString('es-PA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                <div className="flex gap-1">
                                  <button onClick={() => copiarMensaje(m.id, m.texto)}
                                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium transition-colors ${copiandoMsgId === m.id ? 'bg-green-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                                    {copiandoMsgId === m.id ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
                                  </button>
                                  <button onClick={() => eliminarMensajeWA(m.id)} className="p-1 rounded-lg text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                                </div>
                              </div>
                              <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">{m.texto}</pre>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
