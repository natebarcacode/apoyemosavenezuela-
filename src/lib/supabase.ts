import { createClient } from '@supabase/supabase-js'

export type GrupoCategoria = {
  id: number
  nombre: string
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
  fecha_fin?: string
  activo: boolean
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
  notas?: string
  fecha_inicio?: string
  fecha_fin?: string
}

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseUrl = rawUrl.startsWith('https://') ? rawUrl : 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
