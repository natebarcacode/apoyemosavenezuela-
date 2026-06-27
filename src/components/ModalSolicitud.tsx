'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Package, Store, Clock, DoorClosed, DoorOpen, PenLine, ChevronLeft, Check, Search, AlertTriangle } from 'lucide-react'
import { CentroAcopio, NegocioSolidario, Categoria, GrupoCategoria } from '@/lib/supabase'

const ZONAS_PANAMA = [
  'Albrook','Amador','Ancón','Arraiján','Balboa','Bella Vista','Betania','Boca la Caja',
  'Bocas del Toro','Bugaba','Buenaventura','Calidonia','Cangrejo','Casco Viejo','Cativá',
  'Chanis','Chame','Chilibre','Chitré','Chorrillo','Ciudad del Futuro','Ciudad Radial',
  'Clayton','Colón','Condado del Rey','Coronado','Costa del Este','Cristóbal','Curundú',
  'David','Don Bosco','El Carmen','El Dorado','El Ingenio','El Valle','Exposición',
  'Juan Díaz','La Alameda','La Chorrera','La Cresta','La Locería','La Villa de Los Santos',
  'Las Cumbres','Las Mañanitas','Las Tablas','Llano Bonito','Los Ángeles','Mañanitas',
  'Miraflores','Nuevo Arraiján','Nuevo Reparto','Obarrio','Paitilla','Parque Lefevre',
  'Pedregal','Penonomé','Perejil','Pueblo Nuevo','Puerto Armuelles','Punta Pacífica',
  'Río Abajo','Sabanitas','San Felipe','San Francisco','San Miguelito','Santa Ana',
  'Santiago','Tocumen','Transistmica','Vacamonte','Versalles','Via Argentina',
  'Via España','Vista Alegre','Vista Hermosa',
].sort()

type SolicitudPendiente = {
  id: number
  tipo: string
  referencia_tipo: string | null
  referencia_id: number | null
  datos: Record<string, unknown>
  created_at: string
}

function tiempoRelativo(fecha: string) {
  const mins = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000)
  if (mins < 1) return 'hace menos de 1 min'
  if (mins < 60) return `hace ${mins} min`
  const h = Math.floor(mins / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)} días`
}

type Tipo = 'nuevo_centro' | 'nuevo_negocio' | 'horarios' | 'cerrar' | 'reabrir' | 'correccion'

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const TIPOS_NEGOCIO = [
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'tienda', label: 'Tienda' },
  { value: 'cafeteria', label: 'Cafetería' },
  { value: 'ecommerce', label: 'Ecommerce' },
  { value: 'otro', label: 'Otro' },
]

const horarioVacio = () => DIAS.map(dia => ({ dia, activo: false, apertura: '08:00', cierre: '18:00' }))

type LugarRef = { id: number; nombre: string; zona: string; tipo_ref: 'centro' | 'negocio' }

function ZonaSelect({ value, onChange, zonas, ringClass }: {
  value: string; onChange: (v: string) => void; zonas: string[]; ringClass: string
}) {
  const [open, setOpen] = useState(false)
  const [dropRect, setDropRect] = useState<DOMRect | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = zonas.filter(z =>
    !value || z.toLowerCase().includes(value.toLowerCase())
  )

  function openWith() {
    if (inputRef.current) setDropRect(inputRef.current.getBoundingClientRect())
    setOpen(true)
  }

  const portal = open && dropRect && filtered.length > 0 && typeof document !== 'undefined'
    ? createPortal(
        <div
          style={{ position: 'fixed', top: dropRect.bottom + 4, left: dropRect.left, width: dropRect.width, zIndex: 9999, maxHeight: 220, overflowY: 'auto' }}
          className="bg-white rounded-xl border border-gray-200 shadow-2xl"
        >
          {filtered.map(z => (
            <button key={z} type="button"
              onPointerDown={() => { onChange(z); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-gray-50 last:border-0 ${
                value === z ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'
              }`}>
              {z}
            </button>
          ))}
        </div>,
        document.body
      )
    : null

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={e => { onChange(e.target.value); openWith() }}
        onFocus={openWith}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="Selecciona o escribe..."
        className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${ringClass}`}
      />
      {portal}
    </div>
  )
}

type Props = {
  centros: CentroAcopio[]
  negocios: NegocioSolidario[]
  onClose: () => void
}

export default function ModalSolicitud({ centros, negocios, onClose }: Props) {
  const [step, setStep] = useState<'tipo' | 'form' | 'exito'>('tipo')
  const [tipo, setTipo] = useState<Tipo | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [lugarSeleccionado, setLugarSeleccionado] = useState<LugarRef | null>(null)
  const [horarios, setHorarios] = useState(horarioVacio())
  const [notaCorreccion, setNotaCorreccion] = useState('')
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<SolicitudPendiente[]>([])
  const [duplicado, setDuplicado] = useState<SolicitudPendiente | null>(null)
  const [ignorarDuplicado, setIgnorarDuplicado] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [grupos, setGrupos] = useState<GrupoCategoria[]>([])
  const [gruposInsumosAbiertos, setGruposInsumosAbiertos] = useState<Set<string>>(new Set())

  // Nuevo centro
  const [ncNombre, setNcNombre] = useState('')
  const [ncZona, setNcZona] = useState('')
  const [ncDireccion, setNcDireccion] = useState('')
  const [ncQueAcepta, setNcQueAcepta] = useState<string[]>([])
  const [ncInstagram, setNcInstagram] = useState('')
  const [ncFechaFin, setNcFechaFin] = useState('')

  // Nuevo negocio
  const [nnNombre, setNnNombre] = useState('')
  const [nnTipo, setNnTipo] = useState('restaurante')
  const [nnZona, setNnZona] = useState('')
  const [nnDireccion, setNnDireccion] = useState('')
  const [nnIniciativa, setNnIniciativa] = useState('')
  const [nnInstagram, setNnInstagram] = useState('')
  const [nnFechaFin, setNnFechaFin] = useState('')

  // Cargar solicitudes pendientes + categorías al abrir
  useEffect(() => {
    fetch('/api/solicitudes')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setSolicitudesPendientes(data) })
      .catch(() => {})
    fetch('/api/categorias')
      .then(r => r.json())
      .then(({ categorias: cats, grupos: grps }) => {
        setCategorias((cats as Categoria[]) ?? [])
        setGrupos((grps as GrupoCategoria[]) ?? [])
      })
      .catch(() => {})
  }, [])

  // Detectar duplicados cuando cambia el lugar seleccionado o el nombre
  useEffect(() => {
    setIgnorarDuplicado(false)
    if (!tipo) { setDuplicado(null); return }

    if (lugarSeleccionado && (tipo === 'cerrar' || tipo === 'reabrir' || tipo === 'horarios' || tipo === 'correccion')) {
      const match = solicitudesPendientes.find(
        s => s.tipo === tipo && s.referencia_id === lugarSeleccionado.id
      )
      setDuplicado(match ?? null)
      return
    }
    setDuplicado(null)
  }, [tipo, lugarSeleccionado, solicitudesPendientes])

  // Detectar duplicados para nuevos lugares (con debounce)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if ((tipo !== 'nuevo_centro' && tipo !== 'nuevo_negocio')) return
    const nombre = tipo === 'nuevo_centro' ? ncNombre : nnNombre
    if (nombre.length < 4) { setDuplicado(null); return }
    debounceRef.current = setTimeout(() => {
      const needle = nombre.toLowerCase()
      const match = solicitudesPendientes.find(s => {
        if (s.tipo !== tipo) return false
        const n = typeof s.datos?.nombre === 'string' ? s.datos.nombre.toLowerCase() : ''
        return n.includes(needle.slice(0, 8)) || needle.includes(n.slice(0, 8))
      })
      setDuplicado(match ?? null)
      setIgnorarDuplicado(false)
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [ncNombre, nnNombre, tipo, solicitudesPendientes])

  const lugares: LugarRef[] = [
    ...centros.map(c => ({ id: c.id, nombre: c.nombre, zona: c.zona, tipo_ref: 'centro' as const })),
    ...negocios.map(n => ({ id: n.id, nombre: n.nombre, zona: n.zona, tipo_ref: 'negocio' as const })),
  ]

  const zonasDB = Array.from(new Set([...centros, ...negocios].map(x => x.zona)))
  const zonas = Array.from(new Set([...ZONAS_PANAMA, ...zonasDB])).sort()

  const lugaresFiltrados = busqueda.length > 1
    ? lugares.filter(l => l.nombre.toLowerCase().includes(busqueda.toLowerCase()) || l.zona.toLowerCase().includes(busqueda.toLowerCase()))
    : lugares.slice(0, 8)

  async function enviar() {
    setEnviando(true)
    let body: Record<string, unknown> = { tipo }

    if (tipo === 'nuevo_centro') {
      body.datos = { nombre: ncNombre, zona: ncZona, direccion: ncDireccion, que_acepta: ncQueAcepta, instagram: ncInstagram ? `@${ncInstagram}` : '', fecha_fin: ncFechaFin || null }
    } else if (tipo === 'nuevo_negocio') {
      body.datos = { nombre: nnNombre, tipo: nnTipo, zona: nnZona, direccion: nnDireccion, iniciativa: nnIniciativa, instagram: nnInstagram ? `@${nnInstagram}` : '', fecha_fin: nnFechaFin || null }
    } else if (lugarSeleccionado) {
      body.referencia_tipo = lugarSeleccionado.tipo_ref
      body.referencia_id = lugarSeleccionado.id
      if (tipo === 'horarios') {
        body.datos = { horarios: horarios.filter(h => h.activo).map(({ dia, apertura, cierre }) => ({ dia, apertura, cierre })) }
      } else if (tipo === 'correccion') {
        body.datos = { nota: notaCorreccion }
      } else {
        body.datos = {}
      }
    }

    await fetch('/api/solicitudes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setEnviando(false)
    setStep('exito')
  }

  function seleccionarTipo(t: Tipo) {
    setTipo(t)
    setLugarSeleccionado(null)
    setBusqueda('')
    setHorarios(horarioVacio())
    setNotaCorreccion('')
    setStep('form')
  }

  const puedeEnviar = () => {
    if (tipo === 'nuevo_centro') return !!(ncNombre.trim() && ncZona.trim())
    if (tipo === 'nuevo_negocio') return nnNombre.trim() && nnZona.trim() && nnIniciativa.trim()
    if (tipo === 'horarios') return lugarSeleccionado && horarios.some(h => h.activo)
    if (tipo === 'correccion') return lugarSeleccionado && notaCorreccion.trim()
    if (tipo === 'cerrar' || tipo === 'reabrir') return !!lugarSeleccionado
    return false
  }

  const OPCIONES: { tipo: Tipo; icon: React.ReactNode; label: string; desc: string; color: string }[] = [
    { tipo: 'nuevo_centro', icon: <Package size={22} />, label: 'Nuevo centro de acopio', desc: 'Un lugar que recibe donaciones', color: 'red' },
    { tipo: 'nuevo_negocio', icon: <Store size={22} />, label: 'Nueva iniciativa de comercio', desc: 'Un negocio que está ayudando', color: 'amber' },
    { tipo: 'horarios', icon: <Clock size={22} />, label: 'Horarios cambiaron', desc: 'Actualizar el horario de un lugar', color: 'blue' },
    { tipo: 'cerrar', icon: <DoorClosed size={22} />, label: 'Un lugar cerró', desc: 'Ya no está recibiendo donaciones', color: 'gray' },
    { tipo: 'reabrir', icon: <DoorOpen size={22} />, label: 'Un lugar reabrió', desc: 'Volvió a estar activo', color: 'green' },
    { tipo: 'correccion', icon: <PenLine size={22} />, label: 'Otro / Corrección', desc: '¿Hay algo más que corregir o reportar?', color: 'purple' },
  ]

  const colorMap: Record<string, string> = {
    red: 'bg-red-50 border-red-200 text-red-600',
    amber: 'bg-amber-50 border-amber-200 text-amber-600',
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    gray: 'bg-gray-50 border-gray-200 text-gray-600',
    green: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      <div
        className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {step === 'form' && (
              <button onClick={() => setStep('tipo')} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <ChevronLeft size={14} className="text-gray-500" />
              </button>
            )}
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {step === 'tipo' ? 'Reportar información' : step === 'exito' ? '¡Gracias!' : OPCIONES.find(o => o.tipo === tipo)?.label}
              </h2>
              {step === 'tipo' && <p className="text-xs text-gray-400 mt-0.5">Ayúdanos a mantener la info actualizada</p>}
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X size={14} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">

          {/* PASO: tipo */}
          {step === 'tipo' && (
            <div className="grid grid-cols-2 gap-2.5">
              {OPCIONES.map(op => (
                <button key={op.tipo} onClick={() => seleccionarTipo(op.tipo)}
                  className="flex flex-col items-start gap-2 p-3.5 rounded-2xl border-2 border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all text-left">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${colorMap[op.color]}`}>
                    {op.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 leading-tight">{op.label}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{op.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* PASO: form */}
          {step === 'form' && (
            <div className="flex flex-col gap-4">

              {/* Selector de lugar existente */}
              {(tipo === 'horarios' || tipo === 'cerrar' || tipo === 'reabrir' || tipo === 'correccion') && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-2 block">¿De qué lugar se trata?</label>
                  {lugarSeleccionado ? (
                    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{lugarSeleccionado.nombre}</p>
                        <p className="text-xs text-gray-400">{lugarSeleccionado.zona} · {lugarSeleccionado.tipo_ref === 'centro' ? 'Centro de acopio' : 'Iniciativa'}</p>
                      </div>
                      <button onClick={() => { setLugarSeleccionado(null); setBusqueda('') }} className="text-gray-400 hover:text-gray-600">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="relative mb-2">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          value={busqueda}
                          onChange={e => setBusqueda(e.target.value)}
                          placeholder="Buscar por nombre o zona..."
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white"
                        />
                      </div>
                      <div className="rounded-xl border border-gray-200 overflow-hidden max-h-48 overflow-y-auto">
                        {lugaresFiltrados.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-4">Sin resultados</p>
                        ) : lugaresFiltrados.map(l => (
                          <button key={`${l.tipo_ref}-${l.id}`} onClick={() => setLugarSeleccionado(l)}
                            className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{l.nombre}</p>
                              <p className="text-[11px] text-gray-400">{l.zona} · {l.tipo_ref === 'centro' ? 'Centro' : 'Iniciativa'}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Horarios */}
              {tipo === 'horarios' && lugarSeleccionado && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Nuevos horarios</label>
                  <p className="text-[11px] text-gray-400 mb-2">Toca un día para activarlo y configurar el horario</p>
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    {horarios.map((h, i) => (
                      <div key={h.dia} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <button type="button"
                          onClick={() => setHorarios(prev => prev.map(x => x.dia === h.dia ? { ...x, activo: !x.activo } : x))}
                          className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors ${h.activo ? 'bg-blue-50' : 'hover:bg-gray-100'}`}>
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${h.activo ? 'bg-blue-500' : 'bg-gray-200'}`} />
                            <span className={`text-sm font-semibold ${h.activo ? 'text-blue-700' : 'text-gray-500'}`}>{h.dia}</span>
                          </div>
                          {h.activo
                            ? <span className="text-[10px] font-bold text-blue-400 bg-blue-100 rounded-full px-2 py-0.5">Activo — toca para quitar</span>
                            : <span className="text-[10px] text-gray-300">+ Agregar horario</span>
                          }
                        </button>
                        {h.activo && (
                          <div className="flex items-center gap-2 px-3 pb-2.5 pt-1 bg-blue-50 border-t border-blue-100">
                            <input type="time" value={h.apertura}
                              onChange={e => setHorarios(prev => prev.map(x => x.dia === h.dia ? { ...x, apertura: e.target.value } : x))}
                              className="flex-1 rounded-lg border border-blue-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white" />
                            <span className="text-xs text-gray-400 shrink-0">a</span>
                            <input type="time" value={h.cierre}
                              onChange={e => setHorarios(prev => prev.map(x => x.dia === h.dia ? { ...x, cierre: e.target.value } : x))}
                              className="flex-1 rounded-lg border border-blue-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Corrección */}
              {tipo === 'correccion' && lugarSeleccionado && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-2 block">¿Qué hay que corregir o reportar?</label>
                  <textarea
                    value={notaCorreccion}
                    onChange={e => setNotaCorreccion(e.target.value)}
                    rows={3}
                    placeholder="Ej: El nombre está mal escrito, la dirección cambió, el lugar ya no existe..."
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none"
                  />
                </div>
              )}

              {/* Cerrar / Reabrir — solo confirmación */}
              {(tipo === 'cerrar' || tipo === 'reabrir') && lugarSeleccionado && (
                <div className={`rounded-xl p-4 ${tipo === 'cerrar' ? 'bg-red-50 border border-red-100' : 'bg-emerald-50 border border-emerald-100'}`}>
                  <p className={`text-sm font-semibold ${tipo === 'cerrar' ? 'text-red-700' : 'text-emerald-700'}`}>
                    {tipo === 'cerrar'
                      ? `Se reportará que "${lugarSeleccionado.nombre}" cerró.`
                      : `Se reportará que "${lugarSeleccionado.nombre}" reabrió.`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">El administrador lo revisará y aplicará el cambio.</p>
                </div>
              )}

              {/* Nuevo centro */}
              {tipo === 'nuevo_centro' && (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Nombre del centro *</label>
                    <input value={ncNombre} onChange={e => setNcNombre(e.target.value)} placeholder="Ej: Supermercado El Rey - Paitilla"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Zona *</label>
                      <ZonaSelect value={ncZona} onChange={setNcZona} zonas={zonas} ringClass="focus:ring-red-300" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Dirección</label>
                      <input value={ncDireccion} onChange={e => setNcDireccion(e.target.value)} placeholder="Calle, local..."
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-2 block">
                      ¿Qué insumos acepta?
                      {ncQueAcepta.length > 0 && (
                        <span className="ml-2 text-[10px] font-bold bg-red-100 text-red-600 rounded-full px-1.5 py-0.5">{ncQueAcepta.length} seleccionados</span>
                      )}
                    </label>
                    {categorias.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Cargando categorías...</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {grupos.map(grupo => {
                          const insumos = categorias.filter(c => c.grupo === grupo.nombre)
                          if (insumos.length === 0) return null
                          const abierto = gruposInsumosAbiertos.has(grupo.nombre)
                          const selCount = insumos.filter(i => ncQueAcepta.includes(i.nombre)).length
                          return (
                            <div key={grupo.id} className="rounded-xl border border-gray-200 overflow-hidden">
                              <button type="button"
                                onClick={() => setGruposInsumosAbiertos(prev => {
                                  const next = new Set(prev)
                                  next.has(grupo.nombre) ? next.delete(grupo.nombre) : next.add(grupo.nombre)
                                  return next
                                })}
                                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors text-left">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${selCount > 0 ? 'bg-red-400' : 'bg-gray-200'}`} />
                                  <span className="text-xs font-semibold text-gray-700">{grupo.nombre}</span>
                                  {selCount > 0 && (
                                    <span className="text-[10px] font-bold bg-red-100 text-red-600 rounded-full px-1.5 py-0.5">{selCount}</span>
                                  )}
                                </div>
                                <span className={`text-gray-400 text-xs transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}>▾</span>
                              </button>
                              {abierto && (
                                <div className="px-3 pb-3 pt-2 border-t border-gray-100 bg-gray-50">
                                  <div className="flex flex-wrap gap-1.5">
                                    {insumos.map(cat => (
                                      <button key={cat.id} type="button"
                                        onClick={() => setNcQueAcepta(prev =>
                                          prev.includes(cat.nombre) ? prev.filter(x => x !== cat.nombre) : [...prev, cat.nombre]
                                        )}
                                        className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
                                          ncQueAcepta.includes(cat.nombre) ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-500 border-gray-200 hover:border-red-300'
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
                          const abierto = gruposInsumosAbiertos.has('__sin_grupo__')
                          const selCount = sinGrupo.filter(i => ncQueAcepta.includes(i.nombre)).length
                          return (
                            <div className="rounded-xl border border-gray-200 overflow-hidden">
                              <button type="button"
                                onClick={() => setGruposInsumosAbiertos(prev => {
                                  const next = new Set(prev)
                                  next.has('__sin_grupo__') ? next.delete('__sin_grupo__') : next.add('__sin_grupo__')
                                  return next
                                })}
                                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors text-left">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${selCount > 0 ? 'bg-red-400' : 'bg-gray-200'}`} />
                                  <span className="text-xs font-semibold text-gray-500">Otros</span>
                                  {selCount > 0 && <span className="text-[10px] font-bold bg-red-100 text-red-600 rounded-full px-1.5 py-0.5">{selCount}</span>}
                                </div>
                                <span className={`text-gray-400 text-xs transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}>▾</span>
                              </button>
                              {abierto && (
                                <div className="px-3 pb-3 pt-2 border-t border-gray-100 bg-gray-50">
                                  <div className="flex flex-wrap gap-1.5">
                                    {sinGrupo.map(cat => (
                                      <button key={cat.id} type="button"
                                        onClick={() => setNcQueAcepta(prev =>
                                          prev.includes(cat.nombre) ? prev.filter(x => x !== cat.nombre) : [...prev, cat.nombre]
                                        )}
                                        className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
                                          ncQueAcepta.includes(cat.nombre) ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-500 border-gray-200 hover:border-red-300'
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
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Instagram (opcional)</label>
                    <div className="flex items-center rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-red-300 overflow-hidden">
                      <span className="pl-4 text-sm text-gray-400 select-none">@</span>
                      <input value={ncInstagram} onChange={e => setNcInstagram(e.target.value.replace('@', ''))} placeholder="usuario"
                        className="flex-1 px-2 py-2.5 text-sm focus:outline-none bg-transparent" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">¿Hasta cuándo serán centro de acopio? (opcional)</label>
                    <input type="datetime-local" value={ncFechaFin} onChange={e => setNcFechaFin(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                    <p className="text-[10px] text-gray-400 mt-1">Déjalo vacío si no tiene fecha límite.</p>
                  </div>
                </div>
              )}

              {/* Nuevo negocio */}
              {tipo === 'nuevo_negocio' && (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Nombre *</label>
                      <input value={nnNombre} onChange={e => setNnNombre(e.target.value)} placeholder="Ej: Restaurante La Palma"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Tipo *</label>
                      <select value={nnTipo} onChange={e => setNnTipo(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300">
                        {TIPOS_NEGOCIO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Zona *</label>
                      <ZonaSelect value={nnZona} onChange={setNnZona} zonas={zonas} ringClass="focus:ring-amber-300" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Dirección</label>
                      <input value={nnDireccion} onChange={e => setNnDireccion(e.target.value)} placeholder="Calle, local..."
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">¿En qué consiste la iniciativa? *</label>
                    <textarea value={nnIniciativa} onChange={e => setNnIniciativa(e.target.value)} rows={2}
                      placeholder="Ej: 20% de las ventas del fin de semana van directo a Venezuela"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Instagram (opcional)</label>
                    <div className="flex items-center rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-amber-300 overflow-hidden">
                      <span className="pl-4 text-sm text-gray-400 select-none">@</span>
                      <input value={nnInstagram} onChange={e => setNnInstagram(e.target.value.replace('@', ''))} placeholder="usuario"
                        className="flex-1 px-2 py-2.5 text-sm focus:outline-none bg-transparent" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">¿Hasta cuándo durará la iniciativa? (opcional)</label>
                    <input type="datetime-local" value={nnFechaFin} onChange={e => setNnFechaFin(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                    <p className="text-[10px] text-gray-400 mt-1">Déjalo vacío si no tiene fecha límite.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ÉXITO */}
          {step === 'exito' && (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check size={28} className="text-emerald-500" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-base">¡Reporte enviado!</p>
                <p className="text-sm text-gray-500 mt-1">El equipo lo revisará y aplicará el cambio pronto.</p>
              </div>
              <button onClick={onClose}
                className="mt-2 rounded-full bg-gray-900 text-white text-sm font-semibold px-6 py-2.5 hover:bg-gray-700 transition-colors">
                Cerrar
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'form' && (
          <div className="px-5 pb-5 pt-3 border-t border-gray-100 flex flex-col gap-3">
            {duplicado && !ignorarDuplicado && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-amber-700">Ya existe un reporte similar</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Alguien ya reportó algo parecido {tiempoRelativo(duplicado.created_at)}. El equipo lo está revisando.
                    </p>
                    <button
                      onClick={() => setIgnorarDuplicado(true)}
                      className="text-[11px] text-amber-600 underline mt-1.5 font-medium"
                    >
                      Enviar de todas formas →
                    </button>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={enviar}
              disabled={!puedeEnviar() || enviando || (!!duplicado && !ignorarDuplicado)}
              className="w-full rounded-2xl bg-gray-900 text-white text-sm font-bold py-3 hover:bg-gray-700 transition-colors disabled:opacity-40"
            >
              {enviando ? 'Enviando...' : 'Enviar reporte'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
