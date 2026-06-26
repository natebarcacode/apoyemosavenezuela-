'use client'

import { useEffect, useState } from 'react'
import { supabase, CentroAcopio } from '@/lib/supabase'
import { Plus, Pencil, Eye, EyeOff, LogOut } from 'lucide-react'

const CATEGORIAS = [
  { value: 'ropa', label: 'Ropa' },
  { value: 'medicina', label: 'Medicina' },
  { value: 'alimentos', label: 'Alimentos' },
  { value: 'agua', label: 'Agua' },
  { value: 'herramientas', label: 'Herramientas' },
  { value: 'higiene', label: 'Higiene' },
  { value: 'colchones', label: 'Colchones' },
  { value: 'otros', label: 'Otros' },
]

const FORM_VACIO = {
  nombre: '',
  direccion: '',
  zona: '',
  horario: '',
  que_acepta: [] as string[],
  lat: '',
  lng: '',
  notas: '',
}

export default function AdminPage() {
  const [autenticado, setAutenticado] = useState(false)
  const [password, setPassword] = useState('')
  const [errorAuth, setErrorAuth] = useState('')

  const [centros, setCentros] = useState<CentroAcopio[]>([])
  const [form, setForm] = useState(FORM_VACIO)
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
    const { data } = await supabase
      .from('centros_acopio')
      .select('*')
      .order('created_at', { ascending: false })
    setCentros(data ?? [])
  }

  useEffect(() => {
    if (autenticado) cargar()
  }, [autenticado])

  function abrirNuevo() {
    setForm(FORM_VACIO)
    setEditandoId(null)
    setMostrarForm(true)
  }

  function abrirEditar(c: CentroAcopio) {
    setForm({
      nombre: c.nombre,
      direccion: c.direccion,
      zona: c.zona,
      horario: c.horario,
      que_acepta: c.que_acepta,
      lat: String(c.lat),
      lng: String(c.lng),
      notas: c.notas ?? '',
    })
    setEditandoId(c.id)
    setMostrarForm(true)
  }

  async function toggleActivo(c: CentroAcopio) {
    await supabase
      .from('centros_acopio')
      .update({ activo: !c.activo })
      .eq('id', c.id)
    cargar()
  }

  async function guardar() {
    if (!form.nombre || !form.direccion || !form.zona || !form.horario || !form.lat || !form.lng) {
      setMensaje('Completa todos los campos obligatorios.')
      return
    }
    setGuardando(true)
    const payload = {
      nombre: form.nombre,
      direccion: form.direccion,
      zona: form.zona,
      horario: form.horario,
      que_acepta: form.que_acepta,
      lat: parseFloat(form.lat),
      lng: parseFloat(form.lng),
      notas: form.notas || null,
    }
    if (editandoId) {
      await supabase.from('centros_acopio').update(payload).eq('id', editandoId)
    } else {
      await supabase.from('centros_acopio').insert({ ...payload, activo: true })
    }
    setGuardando(false)
    setMostrarForm(false)
    setMensaje(editandoId ? 'Centro actualizado.' : 'Centro agregado.')
    setTimeout(() => setMensaje(''), 3000)
    cargar()
  }

  function toggleCategoria(val: string) {
    setForm((f) => ({
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
          <p className="text-sm text-gray-500 mb-6">Acopio Venezuela</p>
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          {errorAuth && <p className="text-red-500 text-sm mb-3">{errorAuth}</p>}
          <button
            onClick={login}
            className="w-full rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600 transition-colors"
          >
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
            Panel Admin — <span className="text-red-500">Acopio Venezuela</span>
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={abrirNuevo}
              className="flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 transition-colors"
            >
              <Plus size={15} />
              Agregar centro
            </button>
            <button
              onClick={() => setAutenticado(false)}
              className="text-gray-400 hover:text-gray-600"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {mensaje && (
          <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            {mensaje}
          </div>
        )}

        {/* Formulario */}
        {mostrarForm && (
          <div className="mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">
              {editandoId ? 'Editar centro' : 'Nuevo centro'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre *</label>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="Ej: Supermercado El Rey - Paitilla"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Dirección *</label>
                <input
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="Ej: Av. Balboa, Paitilla, Ciudad de Panamá"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Zona *</label>
                <input
                  value={form.zona}
                  onChange={(e) => setForm({ ...form, zona: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="Ej: Ciudad de Panamá"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Horario *</label>
                <input
                  value={form.horario}
                  onChange={(e) => setForm({ ...form, horario: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="Ej: Lun-Sáb 8am-6pm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Latitud *</label>
                <input
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="Ej: 8.9936"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Longitud *</label>
                <input
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="Ej: -79.5197"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-2 block">Qué acepta</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIAS.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => toggleCategoria(cat.value)}
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                        form.que_acepta.includes(cat.value)
                          ? 'bg-red-500 text-white border-red-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notas (opcional)</label>
                <textarea
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  placeholder="Ej: Solo medicamentos sellados, no vencidos"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={guardar}
                disabled={guardando}
                className="rounded-xl bg-red-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : editandoId ? 'Actualizar' : 'Agregar'}
              </button>
              <button
                onClick={() => setMostrarForm(false)}
                className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="flex flex-col gap-3">
          {centros.map((c) => (
            <div
              key={c.id}
              className={`flex items-center gap-4 bg-white rounded-xl border px-4 py-3 ${
                c.activo ? 'border-gray-200' : 'border-gray-100 opacity-50'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{c.nombre}</p>
                <p className="text-xs text-gray-500 truncate">{c.zona} — {c.horario}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => abrirEditar(c)}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  title="Editar"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => toggleActivo(c)}
                  className={`p-2 rounded-lg transition-colors ${
                    c.activo
                      ? 'text-green-500 hover:text-green-600 hover:bg-green-50'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                  title={c.activo ? 'Desactivar' : 'Activar'}
                >
                  {c.activo ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
