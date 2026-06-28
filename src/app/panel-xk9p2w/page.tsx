'use client'

import { useEffect, useState } from 'react'
import { CentroAcopio, NegocioSolidario, Categoria, GrupoCategoria, MensajeWA } from '@/lib/supabase'
import { useRef } from 'react'
import { Plus, Pencil, Eye, EyeOff, LogOut, Package, Store, Tag, Trash2, MessageSquare, Copy, Check, X, CopyPlus, DoorClosed, DoorOpen, Inbox } from 'lucide-react'
import BuscadorUbicacion from '@/components/BuscadorUbicacion'
import ZonaSelect, { ZONAS_PANAMA } from '@/components/ZonaSelect'
import dynamic from 'next/dynamic'
const MapaPicker = dynamic(() => import('@/components/MapaPicker'), { ssr: false })

const TIPOS_NEGOCIO = [
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'tienda', label: 'Tienda' },
  { value: 'cafeteria', label: 'Cafetería' },
  { value: 'ecommerce', label: 'Ecommerce' },
  { value: 'otro', label: 'Otro' },
]

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function fmtHora(t: string) {
  const [h, m] = t.split(':').map(Number)
  const h12 = h % 12 || 12
  const ap = h >= 12 ? 'pm' : 'am'
  return m === 0 ? `${h12}${ap}` : `${h12}:${String(m).padStart(2,'0')}${ap}`
}
function hoyIdx() {
  const p = new Date(Date.now() - 5*60*60*1000)
  const m: Record<number,number> = {1:0,2:1,3:2,4:3,5:4,6:5,0:6}
  return m[p.getUTCDay()]
}
function diaPasado(dia: string) { return DIAS_SEMANA.indexOf(dia) < hoyIdx() }

const horarioVacio = () => DIAS_SEMANA.map(dia => ({ dia, activo: false, apertura: '', cierre: '' }))

const FORM_CENTRO_VACIO = () => ({
  nombre: '', direccion: '', zona: '',
  que_acepta: [] as string[], lat: '', lng: '', notas: '',
  instagram: '', sitio_web: '',
  horarios: horarioVacio(),
  consultar_horarios: false,
  fecha_inicio: '', fecha_fin: '',
  sucursales: [] as { nombre: string; direccion: string; lat: string; lng: string }[],
  todas_sucursales: false,
})

const FORM_NEGOCIO_VACIO = () => ({
  nombre: '', tipo: 'restaurante', iniciativa: '', zona: '',
  direccion: '', instagram: '', sitio_web: '', vigencia: '',
  horarios: horarioVacio(),
  consultar_horarios: false,
  fecha_inicio: '', fecha_fin: '',
  lat: '', lng: '',
  sucursales: [] as { nombre: string; direccion: string; lat: string; lng: string }[],
  todas_sucursales: false,
})

type Tab = 'centros' | 'negocios' | 'categorias' | 'solicitudes'
type AdminEstado = 'todos' | 'abiertos' | 'cerrados_hoy' | 'cerrados_temp'

function toMinA(h: number, m: number) { return h === 0 && m === 0 ? 1440 : h * 60 + m }

function estaAbiertoAhoraAdmin(horarios: { dia: string; apertura: string; cierre: string }[]): boolean {
  const p = new Date(Date.now() - 5 * 60 * 60 * 1000)
  const diasJS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const hoyIdx = p.getUTCDay()
  const min = p.getUTCHours() * 60 + p.getUTCMinutes()

  const hoyE = horarios.find(h => h.dia === diasJS[hoyIdx])
  if (hoyE?.apertura && hoyE?.cierre) {
    const [ha, ma] = hoyE.apertura.split(':').map(Number)
    const [hc, mc] = hoyE.cierre.split(':').map(Number)
    const ap = ha * 60 + ma
    const ci = toMinA(hc, mc)
    if (ci > ap) { if (min >= ap && min < ci) return true }
    else { if (min >= ap) return true }
  }

  const ayerE = horarios.find(h => h.dia === diasJS[(hoyIdx + 6) % 7])
  if (ayerE?.apertura && ayerE?.cierre) {
    const [ha, ma] = ayerE.apertura.split(':').map(Number)
    const [hc, mc] = ayerE.cierre.split(':').map(Number)
    const ap = ha * 60 + ma
    const ci = toMinA(hc, mc)
    if (ci <= ap && min < ci) return true
  }

  return false
}

type Solicitud = {
  id: number
  tipo: string
  estado: string
  referencia_tipo: string | null
  referencia_id: number | null
  datos: Record<string, unknown>
  created_at: string
}

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
  const [editandoGrupoId, setEditandoGrupoId] = useState<number | null>(null)
  const [editandoGrupoNombre, setEditandoGrupoNombre] = useState('')
  const [editandoCatId, setEditandoCatId] = useState<number | null>(null)
  const [editandoCatNombre, setEditandoCatNombre] = useState('')

  const [formCentro, setFormCentro] = useState(FORM_CENTRO_VACIO())
  const [formNegocio, setFormNegocio] = useState(FORM_NEGOCIO_VACIO())
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [mensajesWA, setMensajesWA] = useState<MensajeWA[]>([])
  const [mensajesAbiertos, setMensajesAbiertos] = useState<Record<string, boolean>>({})
  const [copiandoMsgId, setCopiandoMsgId] = useState<number | null>(null)

  const [adminQ, setAdminQ] = useState('')
  const [adminEstado, setAdminEstado] = useState<AdminEstado>('todos')
  const [adminZona, setAdminZona] = useState('')

  const [tipoFechaCentro, setTipoFechaCentro] = useState<'date' | 'datetime'>('datetime')
  const [tipoFechaNegocio, setTipoFechaNegocio] = useState<'date' | 'datetime'>('datetime')
  const [waMensaje, setWaMensaje] = useState('')
  const [waMostrar, setWaMostrar] = useState(false)
  const [waCopied, setWaCopied] = useState(false)
  const [notificarWA, setNotificarWA] = useState(true)
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const solicitudIdAprobando = useRef<number | null>(null)
  const [gruposExpandidos, setGruposExpandidos] = useState<Set<string>>(new Set())

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
    cargarSolicitudes()
  }

  async function cargarSolicitudes() {
    const res = await fetch('/api/solicitudes')
    const data = await res.json()
    setSolicitudes(Array.isArray(data) ? data : [])
  }

  async function marcarSolicitud(id: number, estado: 'aprobado' | 'rechazado') {
    await fetch('/api/solicitudes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, estado }),
    })
    cargarSolicitudes()
  }

  async function aprobarSolicitud(s: Solicitud) {
    const datos = s.datos
    if (s.tipo === 'cerrar') {
      if (s.referencia_tipo === 'centro') {
        await db({ table: 'centros_acopio', op: 'update', data: { cerrado: true }, eq: [['id', s.referencia_id]] })
      } else {
        await db({ table: 'negocios_solidarios', op: 'update', data: { activo: false }, eq: [['id', s.referencia_id]] })
      }
      await marcarSolicitud(s.id, 'aprobado')
      cargar()
    } else if (s.tipo === 'reabrir') {
      if (s.referencia_tipo === 'centro') {
        await db({ table: 'centros_acopio', op: 'update', data: { cerrado: false }, eq: [['id', s.referencia_id]] })
      } else {
        await db({ table: 'negocios_solidarios', op: 'update', data: { activo: true }, eq: [['id', s.referencia_id]] })
      }
      await marcarSolicitud(s.id, 'aprobado')
      cargar()
    } else if (s.tipo === 'horarios') {
      const tabla = s.referencia_tipo === 'centro' ? 'centros_acopio' : 'negocios_solidarios'
      await db({ table: tabla, op: 'update', data: { horarios: datos.horarios }, eq: [['id', s.referencia_id]] })
      await marcarSolicitud(s.id, 'aprobado')
      cargar()
    } else if (s.tipo === 'nuevo_centro') {
      setFormCentro({
        nombre: String(datos.nombre ?? ''),
        direccion: String(datos.direccion ?? ''),
        zona: String(datos.zona ?? ''),
        que_acepta: Array.isArray(datos.que_acepta) ? (datos.que_acepta as string[]) : [],
        lat: '', lng: '',
        notas: '',
        instagram: String(datos.instagram ?? ''),
        sitio_web: '',
        horarios: horarioVacio(),
        consultar_horarios: false,
        fecha_inicio: '', fecha_fin: '',
        sucursales: [], todas_sucursales: false,
      })
      setEditandoId(null)
      setNotificarWA(true)
      setTab('centros')
      setMostrarForm(true)
      solicitudIdAprobando.current = s.id
    } else if (s.tipo === 'nuevo_negocio') {
      setFormNegocio({
        nombre: String(datos.nombre ?? ''),
        tipo: String(datos.tipo ?? 'restaurante'),
        iniciativa: String(datos.iniciativa ?? ''),
        zona: String(datos.zona ?? ''),
        direccion: String(datos.direccion ?? ''),
        instagram: String(datos.instagram ?? ''),
        sitio_web: '', vigencia: '',
        horarios: horarioVacio(),
        consultar_horarios: false,
        fecha_inicio: '', fecha_fin: '',
        lat: '', lng: '',
        sucursales: [], todas_sucursales: false,
      })
      setEditandoId(null)
      setNotificarWA(true)
      setTab('negocios')
      setMostrarForm(true)
      solicitudIdAprobando.current = s.id
    } else if (s.tipo === 'correccion') {
      await marcarSolicitud(s.id, 'aprobado')
    }
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

  async function renombrarGrupo(id: number, nombreViejo: string, nombreNuevo: string) {
    if (!nombreNuevo.trim() || nombreNuevo.trim() === nombreViejo) { setEditandoGrupoId(null); return }
    const nuevo = nombreNuevo.trim()
    await db({ table: 'grupos_categorias', op: 'update', data: { nombre: nuevo }, eq: [['id', id]] })
    await db({ table: 'categorias', op: 'update', data: { grupo: nuevo }, eq: [['grupo', nombreViejo]] })
    setEditandoGrupoId(null)
    cargar()
  }

  async function renombrarCategoria(id: number, nombreViejo: string, nombreNuevo: string) {
    if (!nombreNuevo.trim() || nombreNuevo.trim() === nombreViejo) { setEditandoCatId(null); return }
    const nuevo = nombreNuevo.trim()
    await db({ table: 'categorias', op: 'update', data: { nombre: nuevo }, eq: [['id', id]] })
    // Actualizar que_acepta en todos los centros que usan este insumo
    const { data: centrosAfectados } = await db({
      table: 'centros', op: 'select', contains: [['que_acepta', [nombreViejo]]],
    }) as { data: { id: number; que_acepta: string[] }[] | null; error: unknown }
    if (centrosAfectados) {
      for (const c of centrosAfectados) {
        await db({
          table: 'centros', op: 'update',
          data: { que_acepta: c.que_acepta.map((n: string) => n === nombreViejo ? nuevo : n) },
          eq: [['id', c.id]],
        })
      }
    }
    setEditandoCatId(null)
    cargar()
  }

  function abrirNuevo() {
    if (tab === 'centros') setFormCentro(FORM_CENTRO_VACIO())
    else setFormNegocio(FORM_NEGOCIO_VACIO())
    setEditandoId(null)
    setNotificarWA(true)
    setMostrarForm(true)
    setTimeout(() => document.getElementById('admin-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
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
      consultar_horarios: !!c.consultar_horarios,
      fecha_inicio: c.fecha_inicio ? c.fecha_inicio.slice(0, 10) : '',
      fecha_fin: c.fecha_fin ? (c.fecha_fin.includes('T') ? c.fecha_fin.slice(0, 16) : c.fecha_fin.slice(0, 10)) : '',
      sucursales: (c.sucursales ?? []).map((s: {nombre:string;direccion?:string;lat?:string;lng?:string}) => ({
        nombre: s.nombre, direccion: s.direccion ?? '', lat: s.lat ?? '', lng: s.lng ?? '',
      })),
      todas_sucursales: !!c.todas_sucursales,
    })
    setTipoFechaCentro(c.fecha_fin && !c.fecha_fin.includes('T') ? 'date' : 'datetime')
    setEditandoId(c.id)
    setNotificarWA(false)
    setMostrarForm(true)
    setTimeout(() => document.getElementById('admin-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
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
      consultar_horarios: !!n.consultar_horarios,
      fecha_inicio: n.fecha_inicio ?? '',
      fecha_fin: n.fecha_fin ? (n.fecha_fin.includes('T') ? n.fecha_fin.slice(0, 16) : n.fecha_fin.slice(0, 10)) : '',
      sucursales: (n.sucursales ?? []).map((s: {nombre:string;direccion?:string;lat?:string;lng?:string}) => ({
        nombre: s.nombre, direccion: s.direccion ?? '', lat: s.lat ?? '', lng: s.lng ?? '',
      })),
      todas_sucursales: !!n.todas_sucursales,
    })
    setTipoFechaNegocio(n.fecha_fin && !n.fecha_fin.includes('T') ? 'date' : 'datetime')
    setEditandoId(n.id)
    setNotificarWA(false)
    setMostrarForm(true)
    setTimeout(() => document.getElementById('admin-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  function duplicarCentro(c: CentroAcopio) {
    setFormCentro({
      nombre: c.nombre + ' — Sucursal',
      direccion: c.direccion,
      zona: c.zona,
      que_acepta: [...c.que_acepta],
      lat: String(c.lat),
      lng: String(c.lng),
      notas: c.notas ?? '',
      instagram: c.instagram ?? '',
      sitio_web: c.sitio_web ?? '',
      horarios: DIAS_SEMANA.map(dia => {
        const found = (c.horarios ?? []).find((h: {dia:string}) => h.dia === dia)
        return found ? { dia, activo: true, apertura: (found as {apertura:string}).apertura || '', cierre: (found as {cierre:string}).cierre || '' } : { dia, activo: false, apertura: '', cierre: '' }
      }),
      fecha_inicio: c.fecha_inicio ? c.fecha_inicio.slice(0, 10) : '',
      fecha_fin: c.fecha_fin ? c.fecha_fin.slice(0, 16) : '',
      consultar_horarios: false,
      sucursales: [], todas_sucursales: false,
    })
    setEditandoId(null)
    setNotificarWA(true)
    setMostrarForm(true)
  }

  function duplicarNegocio(n: NegocioSolidario) {
    setFormNegocio({
      nombre: n.nombre + ' — Sucursal',
      tipo: n.tipo,
      iniciativa: n.iniciativa,
      zona: n.zona,
      direccion: n.direccion ?? '',
      instagram: n.instagram ?? '',
      sitio_web: n.sitio_web ?? '',
      vigencia: n.vigencia ?? '',
      lat: n.lat != null ? String(n.lat) : '',
      lng: n.lng != null ? String(n.lng) : '',
      horarios: DIAS_SEMANA.map(dia => {
        const found = (n.horarios ?? []).find((h: {dia:string}) => h.dia === dia)
        return found ? { dia, activo: true, apertura: (found as {apertura:string}).apertura || '', cierre: (found as {cierre:string}).cierre || '' } : { dia, activo: false, apertura: '', cierre: '' }
      }),
      fecha_inicio: n.fecha_inicio ?? '',
      fecha_fin: n.fecha_fin ? n.fecha_fin.slice(0, 16) : '',
      consultar_horarios: false,
      sucursales: [], todas_sucursales: false,
    })
    setEditandoId(null)
    setNotificarWA(true)
    setMostrarForm(true)
  }

  async function toggleActivo(tabla: string, id: number, actual: boolean) {
    await db({ table: tabla, op: 'update', data: { activo: !actual }, eq: [['id', id]] })
    cargar()
  }

  async function toggleCerrado(id: number, actual: boolean) {
    await db({ table: 'centros_acopio', op: 'update', data: { cerrado: !actual }, eq: [['id', id]] })
    cargar()
  }

  async function guardarCentro() {
    const f = formCentro
    if (!f.nombre || !f.direccion || (!f.zona && !f.todas_sucursales) || !f.lat || !f.lng) {
      setMensaje('Completa todos los campos obligatorios.')
      return
    }
    setGuardando(true)
    const payload = {
      nombre: f.nombre, direccion: f.direccion, zona: f.zona,
      que_acepta: f.que_acepta, lat: parseFloat(f.lat), lng: parseFloat(f.lng),
      notas: f.notas || null,
      instagram: f.instagram || null, sitio_web: f.sitio_web || null,
      horarios: f.consultar_horarios ? [] : f.horarios.filter((h: {activo:boolean}) => h.activo).map(({dia, apertura, cierre}: {dia:string,apertura:string,cierre:string}) => ({ dia, apertura, cierre })),
      consultar_horarios: f.consultar_horarios,
      fecha_inicio: f.fecha_inicio || null,
      fecha_fin: f.fecha_fin || null,
      todas_sucursales: f.todas_sucursales,
      sucursales: f.todas_sucursales ? [] : f.sucursales.filter((s: {nombre:string}) => s.nombre.trim()).map((s: {nombre:string;direccion:string;lat:string;lng:string}) => ({
        nombre: s.nombre.trim(),
        direccion: s.direccion || undefined,
        lat: s.lat || undefined,
        lng: s.lng || undefined,
      })),
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
    if (!f.nombre || !f.tipo || !f.iniciativa || (f.tipo !== 'ecommerce' && !f.todas_sucursales && !f.zona)) {
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
      horarios: f.consultar_horarios ? [] : f.horarios.filter((h: {activo:boolean}) => h.activo).map(({dia, apertura, cierre}: {dia:string,apertura:string,cierre:string}) => ({ dia, apertura, cierre })),
      consultar_horarios: f.consultar_horarios,
      fecha_inicio: f.fecha_inicio || null,
      fecha_fin: f.fecha_fin || null,
      todas_sucursales: f.todas_sucursales,
      sucursales: f.todas_sucursales ? [] : f.sucursales.filter((s: {nombre:string}) => s.nombre.trim()).map((s: {nombre:string;direccion:string;lat:string;lng:string}) => ({
        nombre: s.nombre.trim(),
        direccion: s.direccion || undefined,
        lat: s.lat || undefined,
        lng: s.lng || undefined,
      })),
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
    if (solicitudIdAprobando.current) {
      marcarSolicitud(solicitudIdAprobando.current, 'aprobado')
      solicitudIdAprobando.current = null
    }
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

  function renderCentroForm() {
    return (
      <div id="admin-form" className="mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">
          {editandoId ? 'Editar centro de acopio' : 'Agregar centro de acopio'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 border-t border-gray-100 pt-3 -mt-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Información básica</p>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre del centro *</label>
            <input value={formCentro.nombre} onChange={(e) => setFormCentro({ ...formCentro, nombre: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="Ej: Supermercado El Rey - Paitilla" />
          </div>
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
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Dirección *</label>
            <input value={formCentro.direccion} onChange={(e) => setFormCentro({ ...formCentro, direccion: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="Se llena automáticamente o escribe manualmente" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Zona {formCentro.todas_sucursales ? <span className="text-gray-400 font-normal">(opcional — todas las sucursales)</span> : '*'}
            </label>
            <ZonaSelect value={formCentro.zona} onChange={zona => setFormCentro(f => ({ ...f, zona }))}
              zonas={ZONAS_PANAMA} ringClass="focus:ring-red-400" />
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
            <>
              <div className="sm:col-span-2">
                <MapaPicker lat={formCentro.lat} lng={formCentro.lng} onChange={(lat, lng) => setFormCentro(f => ({ ...f, lat, lng }))} />
              </div>
              <div className="sm:col-span-2">
                <a href={`https://www.google.com/maps?q=${formCentro.lat},${formCentro.lng}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors">
                  Verificar en Google Maps →
                </a>
              </div>
            </>
          )}
          <div className="sm:col-span-2 border-t border-gray-100 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Qué insumos acepta</p>
            {categorias.length === 0 && (
              <p className="text-xs text-amber-500 mb-3">Primero agrega insumos en el tab "Insumos"</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <div className="flex flex-col gap-2">
              {grupos.map((grupo) => {
                const insumos = categorias.filter(c => c.grupo === grupo.nombre)
                if (insumos.length === 0) return null
                const todosSeleccionados = insumos.every(i => formCentro.que_acepta.includes(i.nombre))
                const algunoSeleccionado = insumos.some(i => formCentro.que_acepta.includes(i.nombre))
                const abierto = gruposExpandidos.has(grupo.nombre)
                const selCount = insumos.filter(i => formCentro.que_acepta.includes(i.nombre)).length
                return (
                  <div key={grupo.id} className="rounded-xl border border-gray-200 overflow-hidden">
                    <button type="button"
                      onClick={() => setGruposExpandidos(prev => {
                        const next = new Set(prev)
                        next.has(grupo.nombre) ? next.delete(grupo.nombre) : next.add(grupo.nombre)
                        return next
                      })}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors text-left">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${todosSeleccionados ? 'bg-red-500' : algunoSeleccionado ? 'bg-red-300' : 'bg-gray-200'}`} />
                        <span className="text-xs font-bold text-gray-700">{grupo.nombre}</span>
                        {selCount > 0 && (
                          <span className="text-[10px] font-bold bg-red-100 text-red-600 rounded-full px-1.5 py-0.5">
                            {selCount}/{insumos.length}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!abierto && algunoSeleccionado && !todosSeleccionados && (
                          <button type="button" onClick={e => { e.stopPropagation(); toggleGrupoCompleto(grupo.nombre) }}
                            className="text-[10px] text-red-500 hover:underline font-medium">todos</button>
                        )}
                        <span className={`text-gray-400 text-xs transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}>▾</span>
                      </div>
                    </button>
                    {abierto && (
                      <div className="px-3 pb-3 pt-1 border-t border-gray-100 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <button type="button" onClick={() => toggleGrupoCompleto(grupo.nombre)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                              todosSeleccionados ? 'bg-red-500 text-white border-red-500'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-red-300'
                            }`}>
                            {todosSeleccionados ? '✓ Todos' : 'Seleccionar todos'}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {insumos.map((cat) => (
                            <button key={cat.id} type="button" onClick={() => toggleCategoria(cat.nombre)}
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors ${
                                formCentro.que_acepta.includes(cat.nombre) ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-500 border-gray-200 hover:border-red-300'
                              }`}>
                              {cat.nombre}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              {categorias.filter(c => !c.grupo).length > 0 && (() => {
                const sinGrupo = categorias.filter(c => !c.grupo)
                const abierto = gruposExpandidos.has('__sin_categoria__')
                const selCount = sinGrupo.filter(i => formCentro.que_acepta.includes(i.nombre)).length
                return (
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <button type="button"
                      onClick={() => setGruposExpandidos(prev => {
                        const next = new Set(prev)
                        next.has('__sin_categoria__') ? next.delete('__sin_categoria__') : next.add('__sin_categoria__')
                        return next
                      })}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors text-left">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${selCount > 0 ? 'bg-gray-400' : 'bg-gray-200'}`} />
                        <span className="text-xs font-bold text-gray-500">Sin categoría</span>
                        {selCount > 0 && (
                          <span className="text-[10px] font-bold bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5">{selCount}</span>
                        )}
                      </div>
                      <span className={`text-gray-400 text-xs transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}>▾</span>
                    </button>
                    {abierto && (
                      <div className="px-3 pb-3 pt-1 border-t border-gray-100 bg-gray-50">
                        <div className="flex flex-wrap gap-1.5">
                          {sinGrupo.map((cat) => (
                            <button key={cat.id} type="button" onClick={() => toggleCategoria(cat.nombre)}
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors ${
                                formCentro.que_acepta.includes(cat.nombre) ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-500 border-gray-200 hover:border-red-300'
                              }`}>
                              {cat.nombre}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
          {/* Horario */}
          <div className="sm:col-span-2 border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Horario de atención</p>
              <button type="button"
                onClick={() => setFormCentro(f => ({ ...f, consultar_horarios: !f.consultar_horarios }))}
                className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${formCentro.consultar_horarios ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>
                Consultar por otro medio
              </button>
            </div>
          </div>
          {!formCentro.consultar_horarios && (
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
          )}

          {/* Sucursales */}
          <div className="sm:col-span-2 border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sucursales</p>
              <button type="button"
                onClick={() => setFormCentro(f => ({ ...f, todas_sucursales: !f.todas_sucursales, sucursales: [] }))}
                className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${formCentro.todas_sucursales ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'}`}>
                Todas las sucursales
              </button>
            </div>
            {!formCentro.todas_sucursales && (
              <div className="flex flex-col gap-2">
                {formCentro.sucursales.map((s, i) => (
                  <div key={i} className="flex flex-col gap-2 p-3 rounded-xl border border-gray-100 bg-gray-50">
                    <div className="flex gap-2">
                      <input placeholder="Nombre de sucursal *" value={s.nombre}
                        onChange={e => { const ss = [...formCentro.sucursales]; ss[i] = { ...ss[i], nombre: e.target.value }; setFormCentro(f => ({ ...f, sucursales: ss })) }}
                        className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                      <button type="button" onClick={() => setFormCentro(f => ({ ...f, sucursales: f.sucursales.filter((_, j) => j !== i) }))}
                        className="text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                    </div>
                    <input placeholder="Dirección (opcional)" value={s.direccion}
                      onChange={e => { const ss = [...formCentro.sucursales]; ss[i] = { ...ss[i], direccion: e.target.value }; setFormCentro(f => ({ ...f, sucursales: ss })) }}
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                    <div className="flex gap-2">
                      <input placeholder="Lat (opcional)" value={s.lat}
                        onChange={e => { const ss = [...formCentro.sucursales]; ss[i] = { ...ss[i], lat: e.target.value }; setFormCentro(f => ({ ...f, sucursales: ss })) }}
                        className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                      <input placeholder="Lng (opcional)" value={s.lng}
                        onChange={e => { const ss = [...formCentro.sucursales]; ss[i] = { ...ss[i], lng: e.target.value }; setFormCentro(f => ({ ...f, sucursales: ss })) }}
                        className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                    </div>
                  </div>
                ))}
                <button type="button"
                  onClick={() => setFormCentro(f => ({ ...f, sucursales: [...f.sucursales, { nombre: '', direccion: '', lat: '', lng: '' }] }))}
                  className="flex items-center gap-1.5 text-sm text-red-500 font-semibold hover:text-red-600 transition-colors">
                  <Plus size={14} /> Agregar sucursal
                </button>
              </div>
            )}
          </div>

          <div className="sm:col-span-2 border-t border-gray-100 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Contacto y fecha de cierre</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Instagram (opcional)</label>
            <input value={formCentro.instagram} onChange={(e) => setFormCentro({ ...formCentro, instagram: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="@usuario" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600">Fecha de cierre</label>
              <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
                {(['date', 'datetime'] as const).map(tipo => (
                  <button key={tipo} type="button"
                    onClick={() => {
                      const cur = formCentro.fecha_fin
                      const next = tipo === 'date'
                        ? cur.slice(0, 10)
                        : cur ? cur.slice(0, 10) + 'T23:59' : ''
                      setTipoFechaCentro(tipo)
                      setFormCentro(f => ({ ...f, fecha_fin: next }))
                    }}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors ${tipoFechaCentro === tipo ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>
                    {tipo === 'date' ? 'Solo fecha' : 'Fecha y hora'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <input type={tipoFechaCentro === 'date' ? 'date' : 'datetime-local'} value={formCentro.fecha_fin}
                onChange={(e) => setFormCentro({ ...formCentro, fecha_fin: e.target.value })}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              {formCentro.fecha_fin && (
                <button type="button" onClick={() => setFormCentro(f => ({ ...f, fecha_fin: '' }))}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors text-sm">
                  ×
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {tipoFechaCentro === 'date' ? 'Cierra al final del día seleccionado.' : 'El timer de la tarjeta cambia según esta fecha.'}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={notificarWA} onChange={e => setNotificarWA(e.target.checked)} className="w-4 h-4 accent-red-500" />
            <span className="text-sm text-gray-600">Generar mensaje de WhatsApp</span>
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={guardarCentro} disabled={guardando}
              className="w-full sm:w-auto rounded-xl bg-red-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-600 transition-colors disabled:opacity-50">
              {guardando ? 'Guardando...' : editandoId ? 'Actualizar' : 'Agregar'}
            </button>
            <button onClick={() => setMostrarForm(false)}
              className="w-full sm:w-auto rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )
  }

  function renderNegocioForm() {
    return (
      <div id="admin-form" className="mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">
          {editandoId ? 'Editar negocio solidario' : 'Agregar negocio solidario'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 border-t border-gray-100 pt-3 -mt-1">
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
          <div className="sm:col-span-2 border-t border-gray-100 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Ubicación</p>
          </div>
          <div className="sm:col-span-2">
            <BuscadorUbicacion
              onSeleccionar={({ lat, lng, direccion, zona, nombre }) =>
                setFormNegocio((f) => ({ ...f, lat, lng, direccion: direccion || f.direccion, zona: zona || f.zona, nombre: nombre || f.nombre }))
              }
            />
          </div>
          {formNegocio.tipo !== 'ecommerce' && (
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Zona {formNegocio.todas_sucursales ? <span className="text-gray-400 font-normal">(opcional — todas las sucursales)</span> : '*'}
              </label>
              <ZonaSelect value={formNegocio.zona} onChange={zona => setFormNegocio(f => ({ ...f, zona }))}
                zonas={ZONAS_PANAMA} ringClass="focus:ring-yellow-400" />
            </div>
          )}
          {formNegocio.tipo !== 'ecommerce' && (
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Dirección (opcional)</label>
              <input value={formNegocio.direccion} onChange={(e) => setFormNegocio({ ...formNegocio, direccion: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="Ej: Calle 50, local 3" />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Latitud</label>
            <input value={formNegocio.lat} onChange={(e) => setFormNegocio({ ...formNegocio, lat: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="Ej: 8.9936" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Longitud</label>
            <input value={formNegocio.lng} onChange={(e) => setFormNegocio({ ...formNegocio, lng: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="Ej: -79.5197" />
          </div>
          {formNegocio.lat && formNegocio.lng && (
            <>
              <div className="sm:col-span-2">
                <MapaPicker lat={formNegocio.lat} lng={formNegocio.lng} onChange={(lat, lng) => setFormNegocio(f => ({ ...f, lat, lng }))} />
              </div>
              <div className="sm:col-span-2">
                <a href={`https://www.google.com/maps?q=${formNegocio.lat},${formNegocio.lng}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors">
                  Verificar en Google Maps →
                </a>
              </div>
            </>
          )}
          {/* Horario */}
          <div className="sm:col-span-2 border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Horario de atención</p>
              <button type="button"
                onClick={() => setFormNegocio(f => ({ ...f, consultar_horarios: !f.consultar_horarios }))}
                className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${formNegocio.consultar_horarios ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>
                Consultar por otro medio
              </button>
            </div>
          </div>
          {!formNegocio.consultar_horarios && (
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
          )}

          {/* Sucursales */}
          <div className="sm:col-span-2 border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sucursales</p>
              <button type="button"
                onClick={() => setFormNegocio(f => ({ ...f, todas_sucursales: !f.todas_sucursales, sucursales: [] }))}
                className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${formNegocio.todas_sucursales ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'}`}>
                Todas las sucursales
              </button>
            </div>
            {!formNegocio.todas_sucursales && (
              <div className="flex flex-col gap-2">
                {formNegocio.sucursales.map((s, i) => (
                  <div key={i} className="flex flex-col gap-2 p-3 rounded-xl border border-gray-100 bg-gray-50">
                    <div className="flex gap-2">
                      <input placeholder="Nombre de sucursal *" value={s.nombre}
                        onChange={e => { const ss = [...formNegocio.sucursales]; ss[i] = { ...ss[i], nombre: e.target.value }; setFormNegocio(f => ({ ...f, sucursales: ss })) }}
                        className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300" />
                      <button type="button" onClick={() => setFormNegocio(f => ({ ...f, sucursales: f.sucursales.filter((_, j) => j !== i) }))}
                        className="text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                    </div>
                    <input placeholder="Dirección (opcional)" value={s.direccion}
                      onChange={e => { const ss = [...formNegocio.sucursales]; ss[i] = { ...ss[i], direccion: e.target.value }; setFormNegocio(f => ({ ...f, sucursales: ss })) }}
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300" />
                    <div className="flex gap-2">
                      <input placeholder="Lat (opcional)" value={s.lat}
                        onChange={e => { const ss = [...formNegocio.sucursales]; ss[i] = { ...ss[i], lat: e.target.value }; setFormNegocio(f => ({ ...f, sucursales: ss })) }}
                        className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300" />
                      <input placeholder="Lng (opcional)" value={s.lng}
                        onChange={e => { const ss = [...formNegocio.sucursales]; ss[i] = { ...ss[i], lng: e.target.value }; setFormNegocio(f => ({ ...f, sucursales: ss })) }}
                        className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300" />
                    </div>
                  </div>
                ))}
                <button type="button"
                  onClick={() => setFormNegocio(f => ({ ...f, sucursales: [...f.sucursales, { nombre: '', direccion: '', lat: '', lng: '' }] }))}
                  className="flex items-center gap-1.5 text-sm text-yellow-600 font-semibold hover:text-yellow-700 transition-colors">
                  <Plus size={14} /> Agregar sucursal
                </button>
              </div>
            )}
          </div>

          <div className="sm:col-span-2 border-t border-gray-100 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Contacto y fecha de cierre</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Instagram (opcional)</label>
            <input value={formNegocio.instagram} onChange={(e) => setFormNegocio({ ...formNegocio, instagram: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="@nombredelnegocio" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600">Fecha de cierre (opcional)</label>
              <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
                {(['date', 'datetime'] as const).map(tipo => (
                  <button key={tipo} type="button"
                    onClick={() => {
                      const cur = formNegocio.fecha_fin
                      const next = tipo === 'date'
                        ? cur.slice(0, 10)
                        : cur ? cur.slice(0, 10) + 'T23:59' : ''
                      setTipoFechaNegocio(tipo)
                      setFormNegocio(f => ({ ...f, fecha_fin: next }))
                    }}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors ${tipoFechaNegocio === tipo ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>
                    {tipo === 'date' ? 'Solo fecha' : 'Fecha y hora'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <input type={tipoFechaNegocio === 'date' ? 'date' : 'datetime-local'} value={formNegocio.fecha_fin}
                onChange={(e) => setFormNegocio({ ...formNegocio, fecha_fin: e.target.value })}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              {formNegocio.fecha_fin && (
                <button type="button" onClick={() => setFormNegocio(f => ({ ...f, fecha_fin: '' }))}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors text-sm">
                  ×
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {tipoFechaNegocio === 'date' ? 'Cierra al final del día seleccionado.' : 'El timer de la tarjeta cambia según esta fecha.'}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={notificarWA} onChange={e => setNotificarWA(e.target.checked)} className="w-4 h-4 accent-yellow-500" />
            <span className="text-sm text-gray-600">Generar mensaje de WhatsApp</span>
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={guardarNegocio} disabled={guardando}
              className="w-full sm:w-auto rounded-xl bg-yellow-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-yellow-600 transition-colors disabled:opacity-50">
              {guardando ? 'Guardando...' : editandoId ? 'Actualizar' : 'Agregar'}
            </button>
            <button onClick={() => setMostrarForm(false)}
              className="w-full sm:w-auto rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )
  }

  const zonasCentros = [...new Set(centros.map(c => c.zona).filter(Boolean))].sort()
  const zonasNegocios = [...new Set(negocios.map(n => n.zona).filter(Boolean))].sort()

  function filtrarAdmin<T extends { nombre: string; zona?: string; horarios?: { dia: string; apertura: string; cierre: string }[]; fecha_fin?: string | null }>(
    items: T[],
    getCerrado: (item: T) => boolean
  ): T[] {
    return items.filter(item => {
      const cerrado = getCerrado(item)
      const tieneFechaFin = !!item.fecha_fin
      const exp = tieneFechaFin && new Date(item.fecha_fin!).getTime() <= Date.now()
      const tieneHorarios = !!item.horarios && item.horarios.length > 0
      const cerradoHoy = !cerrado && tieneHorarios && !exp && !estaAbiertoAhoraAdmin(item.horarios!)
      if (adminEstado === 'abiertos' && (cerrado || cerradoHoy)) return false
      if (adminEstado === 'cerrados_hoy' && !cerradoHoy) return false
      if (adminEstado === 'cerrados_temp' && !cerrado) return false
      if (adminZona && item.zona !== adminZona) return false
      if (adminQ) {
        const q = adminQ.toLowerCase()
        if (!item.nombre.toLowerCase().includes(q) && !(item.zona?.toLowerCase().includes(q))) return false
      }
      return true
    })
  }

  const centrosFiltradosAdmin = filtrarAdmin(centros, c => !!c.cerrado)
  const negociosFiltradosAdmin = filtrarAdmin(negocios, n => !n.activo)

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
                <span className="hidden sm:inline">Agregar </span>{tab === 'centros' ? 'Centro' : 'Negocio'}
              </button>
            )}
            <button onClick={logout} title="Cerrar sesión" className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 pb-3 flex gap-1 overflow-x-auto scrollbar-none">
          <button onClick={() => { setTab('centros'); setMostrarForm(false) }}
            className={`shrink-0 flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-xl transition-all ${
              tab === 'centros' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'
            }`}>
            <Package size={13} /> Centros <span className={`text-xs px-1.5 py-0.5 rounded-md font-bold ${tab === 'centros' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{centros.length}</span>
          </button>
          <button onClick={() => { setTab('negocios'); setMostrarForm(false) }}
            className={`shrink-0 flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-xl transition-all ${
              tab === 'negocios' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'
            }`}>
            <Store size={13} /> Negocios <span className={`text-xs px-1.5 py-0.5 rounded-md font-bold ${tab === 'negocios' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{negocios.length}</span>
          </button>
          <button onClick={() => { setTab('categorias'); setMostrarForm(false) }}
            className={`shrink-0 flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-xl transition-all ${
              tab === 'categorias' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'
            }`}>
            <Tag size={13} /> Insumos <span className={`text-xs px-1.5 py-0.5 rounded-md font-bold ${tab === 'categorias' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{categorias.length}</span>
          </button>
          <button onClick={() => { setTab('solicitudes'); setMostrarForm(false) }}
            className={`shrink-0 relative flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-xl transition-all ${
              tab === 'solicitudes' ? 'bg-violet-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'
            }`}>
            <Inbox size={13} /> Por revisar
            {solicitudes.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-md font-bold ${tab === 'solicitudes' ? 'bg-white/20 text-white' : 'bg-violet-100 text-violet-600'}`}>
                {solicitudes.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {mensaje && (
          <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${mensaje.includes('obligator') ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
            {mensaje}
          </div>
        )}

        {/* Tab solicitudes */}
        {tab === 'solicitudes' && (
          <div className="flex flex-col gap-3">
            {solicitudes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                <Inbox size={32} className="opacity-20" />
                <p className="text-sm">No hay solicitudes pendientes</p>
              </div>
            ) : solicitudes.map((s) => {
              const tipoLabel: Record<string, string> = {
                nuevo_centro: 'Nuevo centro de acopio',
                nuevo_negocio: 'Nueva iniciativa',
                horarios: 'Actualización de horarios',
                cerrar: 'Reportar cierre',
                reabrir: 'Reportar reapertura',
                correccion: 'Corrección de info',
              }
              const tipoColor: Record<string, string> = {
                nuevo_centro: 'bg-red-50 border-red-200 text-red-600',
                nuevo_negocio: 'bg-amber-50 border-amber-200 text-amber-600',
                horarios: 'bg-blue-50 border-blue-200 text-blue-600',
                cerrar: 'bg-gray-50 border-gray-200 text-gray-600',
                reabrir: 'bg-emerald-50 border-emerald-200 text-emerald-600',
                correccion: 'bg-purple-50 border-purple-200 text-purple-600',
              }
              const d = s.datos
              return (
                <div key={s.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border mb-2 ${tipoColor[s.tipo] ?? 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                          {tipoLabel[s.tipo] ?? s.tipo}
                        </span>
                        <p className="text-xs text-gray-400 mb-2">
                          {new Date(s.created_at).toLocaleString('es-PA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {/* Datos resumidos */}
                        {(s.tipo === 'nuevo_centro' || s.tipo === 'nuevo_negocio') && (
                          <div className="text-sm space-y-1">
                            {typeof d.nombre === 'string' && d.nombre && <p><span className="font-semibold text-gray-900">{d.nombre}</span></p>}
                            {typeof d.zona === 'string' && d.zona && (
                              <p className="text-gray-500 text-xs">{d.zona}{typeof d.direccion === 'string' && d.direccion ? ` · ${d.direccion}` : ''}</p>
                            )}
                            {s.tipo === 'nuevo_negocio' && typeof d.iniciativa === 'string' && d.iniciativa && (
                              <p className="text-xs text-amber-600 bg-amber-50 rounded-md px-2 py-1 mt-1">{d.iniciativa}</p>
                            )}
                            {s.tipo === 'nuevo_centro' && Array.isArray(d.que_acepta) && (d.que_acepta as string[]).length > 0 && (
                              <p className="text-xs text-gray-500 bg-gray-50 rounded-md px-2 py-1 mt-1">
                                <span className="font-medium">{(d.que_acepta as string[]).length} insumos:</span>{' '}
                                {(d.que_acepta as string[]).slice(0, 6).join(', ')}{(d.que_acepta as string[]).length > 6 ? '...' : ''}
                              </p>
                            )}
                            {typeof d.instagram === 'string' && d.instagram && <p className="text-xs text-gray-400">{d.instagram}</p>}
                          </div>
                        )}
                        {(s.tipo === 'cerrar' || s.tipo === 'reabrir' || s.tipo === 'horarios' || s.tipo === 'correccion') && s.referencia_id && (
                          <div className="text-sm">
                            {(() => {
                              const lista = s.referencia_tipo === 'centro' ? centros : negocios
                              const lugar = lista.find(x => x.id === s.referencia_id)
                              return lugar ? (
                                <div>
                                  <p className="font-semibold text-gray-900">{lugar.nombre}</p>
                                  <p className="text-xs text-gray-400">{lugar.zona}</p>
                                </div>
                              ) : <p className="text-xs text-gray-400">ID #{s.referencia_id} ({s.referencia_tipo})</p>
                            })()}
                          </div>
                        )}
                        {s.tipo === 'horarios' && Array.isArray(d.horarios) && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(d.horarios as Array<{dia:string; apertura:string; cierre:string}>).map(h => (
                              <span key={h.dia} className="text-[10px] bg-blue-50 text-blue-600 rounded-full px-2 py-0.5">
                                {h.dia} {h.apertura}–{h.cierre}
                              </span>
                            ))}
                          </div>
                        )}
                        {s.tipo === 'correccion' && typeof d.nota === 'string' && d.nota && (
                          <p className="mt-2 text-xs text-gray-600 bg-purple-50 rounded-lg px-3 py-2 border border-purple-100">
                            {d.nota}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
                    <button
                      onClick={() => aprobarSolicitud(s)}
                      className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white transition-colors ${
                        s.tipo === 'nuevo_centro' || s.tipo === 'nuevo_negocio' ? 'bg-violet-500 hover:bg-violet-600' : 'bg-emerald-500 hover:bg-emerald-600'
                      }`}
                    >
                      <Check size={13} />
                      {s.tipo === 'nuevo_centro' || s.tipo === 'nuevo_negocio'
                        ? 'Abrir formulario'
                        : s.tipo === 'correccion'
                        ? '✓ Marcar como revisado'
                        : 'Aplicar cambio'}
                    </button>
                    <button
                      onClick={() => marcarSolicitud(s.id, 'rechazado')}
                      className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      <X size={13} /> Descartar
                    </button>
                  </div>
                </div>
              )
            })}
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
                        {editandoGrupoId === grupo.id ? (
                          <input
                            autoFocus
                            value={editandoGrupoNombre}
                            onChange={e => setEditandoGrupoNombre(e.target.value)}
                            onBlur={() => renombrarGrupo(grupo.id, grupo.nombre, editandoGrupoNombre)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') renombrarGrupo(grupo.id, grupo.nombre, editandoGrupoNombre)
                              if (e.key === 'Escape') setEditandoGrupoId(null)
                            }}
                            className="flex-1 text-xs font-bold text-gray-600 uppercase tracking-wide border-b border-blue-400 bg-transparent focus:outline-none mr-2"
                          />
                        ) : (
                          <button
                            onClick={() => { setEditandoGrupoId(grupo.id); setEditandoGrupoNombre(grupo.nombre) }}
                            className="text-xs font-bold text-gray-600 uppercase tracking-wide hover:text-blue-600 transition-colors text-left"
                          >
                            {grupo.nombre}
                          </button>
                        )}
                        <button onClick={() => eliminarGrupo(grupo.id, grupo.nombre)}
                          className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {insumos.map(cat => (
                          <div
                            key={cat.id}
                            draggable={editandoCatId !== cat.id}
                            onDragStart={() => { dragId.current = cat.id }}
                            className="flex items-center gap-1 rounded-full bg-blue-100 pl-2.5 pr-1.5 py-1 cursor-grab active:cursor-grabbing"
                          >
                            {editandoCatId === cat.id ? (
                              <input
                                autoFocus
                                value={editandoCatNombre}
                                onChange={e => setEditandoCatNombre(e.target.value)}
                                onBlur={() => renombrarCategoria(cat.id, cat.nombre, editandoCatNombre)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') renombrarCategoria(cat.id, cat.nombre, editandoCatNombre)
                                  if (e.key === 'Escape') setEditandoCatId(null)
                                }}
                                className="text-xs font-medium text-blue-700 bg-transparent border-b border-blue-400 focus:outline-none w-24"
                                onClick={e => e.stopPropagation()}
                              />
                            ) : (
                              <span
                                className="text-xs font-medium text-blue-700 cursor-text"
                                onDoubleClick={() => { setEditandoCatId(cat.id); setEditandoCatNombre(cat.nombre) }}
                              >{cat.nombre}</span>
                            )}
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
                      draggable={editandoCatId !== cat.id}
                      onDragStart={() => { dragId.current = cat.id }}
                      className="flex items-center gap-1 rounded-full bg-gray-100 pl-2.5 pr-1.5 py-1 cursor-grab active:cursor-grabbing"
                    >
                      {editandoCatId === cat.id ? (
                        <input
                          autoFocus
                          value={editandoCatNombre}
                          onChange={e => setEditandoCatNombre(e.target.value)}
                          onBlur={() => renombrarCategoria(cat.id, cat.nombre, editandoCatNombre)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') renombrarCategoria(cat.id, cat.nombre, editandoCatNombre)
                            if (e.key === 'Escape') setEditandoCatId(null)
                          }}
                          className="text-xs font-medium text-gray-700 bg-transparent border-b border-blue-400 focus:outline-none w-24"
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <span
                          className="text-xs font-medium text-gray-700 cursor-text"
                          onDoubleClick={() => { setEditandoCatId(cat.id); setEditandoCatNombre(cat.nombre) }}
                        >{cat.nombre}</span>
                      )}
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

        {/* Formulario centro — solo para nuevos (edición aparece inline en la lista) */}
        {mostrarForm && tab === 'centros' && !editandoId && renderCentroForm()}


        {/* Formulario negocio — solo para nuevos */}
        {mostrarForm && tab === 'negocios' && !editandoId && renderNegocioForm()}


        {/* Barra de filtros admin */}
        {(tab === 'centros' || tab === 'negocios') && (
          <div className="mb-4 flex flex-col gap-2">
            {/* Búsqueda + zona */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  value={adminQ}
                  onChange={e => setAdminQ(e.target.value)}
                  placeholder="Buscar por nombre o zona…"
                  className="w-full text-sm rounded-xl border border-gray-200 bg-white px-3 py-2 pl-8 focus:outline-none focus:ring-2 focus:ring-red-200"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300">
                  <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2"/><path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </span>
              </div>
              <select
                value={adminZona}
                onChange={e => setAdminZona(e.target.value)}
                className="text-sm rounded-xl border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 text-gray-600"
              >
                <option value="">Todas las zonas</option>
                {(tab === 'centros' ? zonasCentros : zonasNegocios).map(z => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>
            {/* Chips de estado */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
              {([
                { id: 'todos', label: 'Todos' },
                { id: 'abiertos', label: 'Abiertos' },
                { id: 'cerrados_hoy', label: 'Cerrados por hoy' },
                { id: 'cerrados_temp', label: 'Cerrados temporalmente' },
              ] as { id: AdminEstado; label: string }[]).map(({ id, label }) => (
                <button key={id} onClick={() => setAdminEstado(id)}
                  className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                    adminEstado === id
                      ? id === 'abiertos' ? 'bg-emerald-500 text-white'
                        : id === 'cerrados_hoy' ? 'bg-orange-400 text-white'
                        : id === 'cerrados_temp' ? 'bg-gray-500 text-white'
                        : 'bg-gray-800 text-white'
                      : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >{label}</button>
              ))}
            </div>
          </div>
        )}

        {/* Lista centros */}
        {tab === 'centros' && (
          <div className="flex flex-col gap-3">
            {centrosFiltradosAdmin.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-10">No hay centros con esos filtros</p>
            )}
            {centrosFiltradosAdmin.map((c) => {
              const key = `centro-${c.id}`
              const msgs = mensajesWA.filter(m => m.tipo === 'centro' && m.referencia_id === c.id)
              const abierto = mensajesAbiertos[key]
              return (
                <div key={c.id}>
                <div className={`bg-white rounded-xl border ${c.activo ? 'border-gray-200' : 'border-gray-100 opacity-50'} ${c.cerrado ? 'bg-gray-50' : ''}`}>
                  <div className="flex items-start gap-3 px-4 pt-3 pb-1">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!c.activo ? 'bg-gray-300' : c.cerrado ? 'bg-red-400' : 'bg-green-400'}`}
                      title={!c.activo ? 'Oculto' : c.cerrado ? 'Cerrado' : 'Abierto'} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold text-sm truncate ${c.cerrado ? 'line-through text-gray-400' : 'text-gray-900'}`}>{c.nombre}</p>
                        {c.cerrado && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-500 shrink-0">CERRADO</span>}
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{c.zona}{c.direccion ? ` · ${c.direccion}` : ''}</p>
                      {c.que_acepta?.length > 0 && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          <span className="font-medium text-gray-500">{c.que_acepta.length} insumos:</span>{' '}
                          {c.que_acepta.slice(0, 4).join(', ')}{c.que_acepta.length > 4 ? '...' : ''}
                        </p>
                      )}
                      {c.horarios && c.horarios.length > 0 && (
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                          {c.horarios.map((h: {dia:string;apertura:string;cierre:string}) => {
                            const pasado = !!c.fecha_fin && diaPasado(h.dia)
                            return (
                              <span key={h.dia} className={`text-[10px] ${pasado ? 'line-through text-gray-300' : 'text-gray-500'}`}>
                                <span className="font-semibold">{h.dia}</span>
                                {h.apertura && h.cierre && <span className="text-gray-400 ml-1">{fmtHora(h.apertura)}–{fmtHora(h.cierre)}</span>}
                              </span>
                            )
                          })}
                          {c.fecha_fin && <span className="text-[10px] text-red-400 font-medium">· cierra {new Date(c.fecha_fin).toLocaleDateString('es-PA',{day:'numeric',month:'short'})}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 justify-end px-4 pb-2">
                    <button onClick={() => guardarYMostrarMensaje('centro', c.id, mensajeCentro(c, c.fecha_fin && new Date(c.fecha_fin).getTime() - Date.now() < 48 * 3600000 ? 'cierre' : 'actualizado'))}
                      title="Generar mensaje WhatsApp"
                      className="p-2 rounded-lg text-green-500 hover:bg-green-50 transition-colors"><MessageSquare size={15} /></button>
                    <button onClick={() => duplicarCentro(c)} title="Duplicar como sucursal" className="p-2 rounded-lg text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><CopyPlus size={15} /></button>
                    <button onClick={() => abrirEditarCentro(c)} title="Editar" className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><Pencil size={15} /></button>
                    <button onClick={() => toggleCerrado(c.id, !!c.cerrado)} title={c.cerrado ? 'Marcar como abierto' : 'Marcar como cerrado'}
                      className={`p-2 rounded-lg transition-colors ${c.cerrado ? 'text-red-400 hover:bg-red-50' : 'text-gray-400 hover:bg-red-50 hover:text-red-400'}`}>
                      {c.cerrado ? <DoorOpen size={15} /> : <DoorClosed size={15} />}
                    </button>
                    <button onClick={() => toggleActivo('centros_acopio', c.id, c.activo)} title={c.activo ? 'Ocultar' : 'Publicar'}
                      className={`p-2 rounded-lg transition-colors ${c.activo ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}>
                      {c.activo ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
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
                {editandoId === c.id && mostrarForm && renderCentroForm()}
                </div>
              )
            })}
          </div>
        )}

        {/* Lista negocios */}
        {tab === 'negocios' && (
          <div className="flex flex-col gap-3">
            {negociosFiltradosAdmin.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-10">No hay negocios con esos filtros</p>
            )}
            {negociosFiltradosAdmin.map((n) => {
              const key = `negocio-${n.id}`
              const msgs = mensajesWA.filter(m => m.tipo === 'negocio' && m.referencia_id === n.id)
              const abierto = mensajesAbiertos[key]
              return (
                <div key={n.id}>
                <div className={`bg-white rounded-xl border ${n.activo ? 'border-gray-200' : 'border-gray-100 opacity-50'}`}>
                  <div className="flex items-start gap-3 px-4 pt-3 pb-1">
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
                      {n.horarios && n.horarios.length > 0 && (
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                          {n.horarios.map((h: {dia:string;apertura:string;cierre:string}) => {
                            const pasado = !!n.fecha_fin && diaPasado(h.dia)
                            return (
                              <span key={h.dia} className={`text-[10px] ${pasado ? 'line-through text-gray-300' : 'text-gray-500'}`}>
                                <span className="font-semibold">{h.dia}</span>
                                {h.apertura && h.cierre && <span className="text-gray-400 ml-1">{fmtHora(h.apertura)}–{fmtHora(h.cierre)}</span>}
                              </span>
                            )
                          })}
                          {n.fecha_fin && <span className="text-[10px] text-red-400 font-medium">· cierra {new Date(n.fecha_fin).toLocaleDateString('es-PA',{day:'numeric',month:'short'})}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 justify-end px-4 pb-2">
                    <button onClick={() => guardarYMostrarMensaje('negocio', n.id, mensajeNegocio(n, n.fecha_fin && new Date(n.fecha_fin).getTime() - Date.now() < 48 * 3600000 ? 'cierre' : 'actualizado'))}
                      title="Generar mensaje WhatsApp"
                      className="p-2 rounded-lg text-green-500 hover:bg-green-50 transition-colors"><MessageSquare size={15} /></button>
                    <button onClick={() => duplicarNegocio(n)} title="Duplicar como sucursal" className="p-2 rounded-lg text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><CopyPlus size={15} /></button>
                    <button onClick={() => abrirEditarNegocio(n)} title="Editar" className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><Pencil size={15} /></button>
                    <button onClick={() => toggleActivo('negocios_solidarios', n.id, n.activo)} title={n.activo ? 'Ocultar' : 'Publicar'}
                      className={`p-2 rounded-lg transition-colors ${n.activo ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}>
                      {n.activo ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
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
                {editandoId === n.id && mostrarForm && renderNegocioForm()}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
