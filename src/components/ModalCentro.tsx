'use client'

import { useState } from 'react'
import { CentroAcopio, HorarioDia, Categoria } from '@/lib/supabase'
import { X, MapPin, Clock, Calendar, Package, Globe, ChevronDown, Building2 } from 'lucide-react'
import { WazeIcon, GoogleMapsIcon, InstagramIcon } from './BrandIcons'
import CountdownTimer from './CountdownTimer'

function formatHora(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`
}

const DIAS_ORDEN = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DIAS_JS   = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
function hoyPanamaIdx() {
  const p = new Date(Date.now() - 5 * 60 * 60 * 1000)
  const m: Record<number, number> = {1:0,2:1,3:2,4:3,5:4,6:5,0:6}
  return m[p.getUTCDay()]
}
function diaPasado(dia: string) { return DIAS_ORDEN.indexOf(dia) < hoyPanamaIdx() }
function numDiaMes(dia: string, fechaFin: string): number | null {
  const fin = new Date(fechaFin.slice(0, 10) + 'T12:00:00Z')
  for (let i = 6; i >= 0; i--) {
    const d = new Date(fin.getTime() - i * 86400000)
    if (DIAS_JS[d.getUTCDay()] === dia) return d.getUTCDate()
  }
  return null
}

type Props = {
  centro: CentroAcopio
  categorias: Categoria[]
  onClose: () => void
}

export default function ModalCentro({ centro, categorias, onClose }: Props) {
  const [gruposAbiertos, setGruposAbiertos] = useState<Set<string>>(new Set())

  function toggleGrupo(g: string) {
    setGruposAbiertos(prev => {
      const next = new Set(prev)
      next.has(g) ? next.delete(g) : next.add(g)
      return next
    })
  }

  const wazeUrl = `https://waze.com/ul?ll=${centro.lat},${centro.lng}&navigate=yes`
  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${centro.lat},${centro.lng}`

  // Group accepted items by their category group
  const aceptadasConInfo = categorias.filter(c => centro.que_acepta.includes(c.nombre))
  const porGrupo = aceptadasConInfo.reduce<Record<string, string[]>>((acc, c) => {
    const g = c.grupo || 'General'
    if (!acc[g]) acc[g] = []
    acc[g].push(c.nombre)
    return acc
  }, {})
  // Items not found in categorias (edge case)
  const sinCategoria = centro.que_acepta.filter(n => !aceptadasConInfo.find(c => c.nombre === n))
  if (sinCategoria.length > 0) porGrupo['General'] = [...(porGrupo['General'] ?? []), ...sinCategoria]

  const horarios = centro.horarios ?? []
  const tieneFechaFin = !!centro.fecha_fin

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '92dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
            <Package size={18} className="text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900 text-base leading-tight">{centro.nombre}</h2>
            <span className="inline-block mt-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
              {centro.zona}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0"
          >
            <X size={14} className="text-gray-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-4" style={{ scrollbarWidth: 'thin' }}>

          {/* Zona */}
          {centro.zona && (
            <div className="flex items-center gap-2.5 text-sm text-gray-600">
              <MapPin size={15} className="text-gray-400 shrink-0" />
              <span>{centro.zona}</span>
            </div>
          )}

          {/* Sucursales */}
          {centro.todas_sucursales && (
            <div className="flex items-center gap-2.5 rounded-xl bg-blue-50 border border-blue-100 px-4 py-2.5">
              <Building2 size={15} className="text-blue-400 shrink-0" />
              <span className="text-sm font-semibold text-blue-700">Disponible en todas las sucursales</span>
            </div>
          )}
          {!centro.todas_sucursales && centro.sucursales && centro.sucursales.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sucursales</p>
              {centro.sucursales.map((s, i) => (
                <div key={i} className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Building2 size={13} className="text-blue-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 leading-tight">{s.nombre}</p>
                      {s.direccion && <p className="text-xs text-gray-400 mt-0.5 leading-snug">{s.direccion}</p>}
                    </div>
                  </div>
                  {s.lat && s.lng && (
                    <div className="flex gap-1.5 shrink-0">
                      <a href={`https://waze.com/ul?ll=${s.lat},${s.lng}&navigate=yes`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-white hover:opacity-90"
                        style={{ background: '#00D4E4' }}><WazeIcon className="w-3 h-3" /> Waze</a>
                      <a href={`https://www.google.com/maps?q=${s.lat},${s.lng}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-white hover:opacity-90"
                        style={{ background: '#4285F4' }}><GoogleMapsIcon className="w-3 h-3" /> Maps</a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Horario */}
          {centro.consultar_horarios && (
            <div className="flex items-center gap-2.5 text-sm text-gray-500 bg-gray-50 rounded-xl px-3.5 py-2.5">
              <Clock size={15} className="text-gray-400 shrink-0" />
              <span>Consultar horarios directamente con el centro</span>
            </div>
          )}
          {!centro.consultar_horarios && horarios.length > 0 && (
            <div className="flex items-start gap-2.5">
              <Clock size={15} className="text-gray-400 mt-1 shrink-0" />
              <div className="flex flex-col gap-1">
                {horarios.map(h => {
                  const pasado = tieneFechaFin && diaPasado(h.dia)
                  const ndm = tieneFechaFin ? numDiaMes(h.dia, centro.fecha_fin!) : null
                  return (
                    <div key={h.dia} className={`flex gap-3 text-sm ${pasado ? 'line-through text-gray-300' : 'text-gray-700'}`}>
                      <span className="font-semibold w-16 shrink-0">
                        {h.dia}{ndm != null ? ` ${ndm}` : ''}
                      </span>
                      {h.apertura && h.cierre && (
                        <span className={pasado ? 'text-gray-300' : 'text-gray-400'}>
                          {formatHora(h.apertura)} – {formatHora(h.cierre)}
                        </span>
                      )}
                    </div>
                  )
                })}
                {!tieneFechaFin && (
                  <span className="text-[11px] text-gray-400 mt-0.5">Horario semanal recurrente</span>
                )}
              </div>
            </div>
          )}

          {/* Desde */}
          {centro.fecha_inicio && (
            <div className="flex items-center gap-2.5 text-sm text-gray-500">
              <Calendar size={15} className="text-gray-400 shrink-0" />
              <span>
                Desde {new Date(centro.fecha_inicio).toLocaleDateString('es-PA', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          )}

          {/* Countdown con fecha exacta */}
          {centro.fecha_fin && (
            <CountdownTimer
              fechaFin={centro.fecha_fin}
            />
          )}

          {/* Notas */}
          {centro.notas && (
            <p className="text-xs text-gray-500 italic bg-gray-50 rounded-xl px-3.5 py-2.5 leading-relaxed">
              {centro.notas}
            </p>
          )}

          {/* Acepta — agrupado por categoría, colapsable */}
          {Object.keys(porGrupo).length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Acepta</p>
              <div className="flex flex-col gap-1.5">
                {Object.entries(porGrupo).map(([grupo, items]) => {
                  const abierto = gruposAbiertos.has(grupo)
                  return (
                    <div key={grupo} className="rounded-xl border border-gray-100 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleGrupo(grupo)}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-700">{grupo}</span>
                          <span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5 font-medium">
                            {items.length}
                          </span>
                        </div>
                        <ChevronDown
                          size={14}
                          className={`text-gray-400 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {abierto && (
                        <div className="px-3.5 pb-3 pt-1 border-t border-gray-100 bg-gray-50">
                          <div className="flex flex-wrap gap-1.5">
                            {items.map(item => (
                              <span
                                key={item}
                                className="rounded-full bg-white border border-gray-200 px-2.5 py-1 text-xs text-gray-600 leading-none"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer — navegación + redes sociales */}
        <div className="p-4 pt-3 border-t border-gray-100 flex flex-col gap-2">
          <div className="flex gap-2">
            <a href={wazeUrl} target="_blank" rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white hover:opacity-90 transition-opacity"
              style={{ background: '#00D4E4' }}>
              <WazeIcon className="w-4 h-4" /> Waze
            </a>
            <a href={gmapsUrl} target="_blank" rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white hover:opacity-90 transition-opacity"
              style={{ background: '#4285F4' }}>
              <GoogleMapsIcon className="w-4 h-4" /> Google Maps
            </a>
          </div>
          {(centro.instagram || centro.sitio_web) && (
            <div className="flex gap-2">
              {centro.instagram && (
                <a href={`https://instagram.com/${centro.instagram.replace('@', '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white hover:opacity-90 transition-opacity"
                  style={{ background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}>
                  <InstagramIcon className="w-4 h-4" />
                  {centro.instagram.startsWith('@') ? centro.instagram : `@${centro.instagram}`}
                </a>
              )}
              {centro.sitio_web && (
                <a href={centro.sitio_web} target="_blank" rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-800 py-2.5 text-xs font-bold text-white hover:opacity-90 transition-opacity">
                  <Globe size={13} /> Sitio web
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
