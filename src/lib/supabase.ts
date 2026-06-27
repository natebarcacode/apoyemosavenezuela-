import { createClient } from '@supabase/supabase-js'

export type GrupoCategoria = {
  id: number
  nombre: string
}

export type HorarioDia = {
  dia: string
  apertura: string
  cierre: string
}

export type MensajeWA = {
  id: number
  tipo: string
  referencia_id: number
  texto: string
  created_at: string
}

export type Categoria = {
  id: number
  nombre: string
  grupo?: string
}

export type NegocioSolidario = {
  id: number
  nombre: string
  tipo: string
  iniciativa: string
  zona: string
  direccion?: string
  instagram?: string
  sitio_web?: string
  vigencia?: string
  horarios?: HorarioDia[]
  fecha_inicio?: string
  fecha_fin?: string
  activo: boolean
  lat?: number
  lng?: number
}

export type CentroAcopio = {
  id: number
  nombre: string
  direccion: string
  zona: string
  que_acepta: string[]
  lat: number
  lng: number
  activo: boolean
  cerrado?: boolean
  notas?: string
  horarios?: HorarioDia[]
  fecha_inicio?: string
  fecha_fin?: string
  instagram?: string
  sitio_web?: string
}

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseUrl = rawUrl.startsWith('https://') ? rawUrl : 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
