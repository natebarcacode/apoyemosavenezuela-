'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

type Props = {
  fechaFin: string
  label?: string  // si se pasa, sobreescribe la detección automática hoy/mañana/fecha
}

// Siempre interpreta fechaFin como hora de Panamá (UTC-5)
// independientemente de cómo lo devuelva Supabase
function toPanamaUTC(fechaFin: string): number {
  const s = fechaFin.slice(0, 16) // "2026-06-27T13:30"
  if (s.includes('T')) {
    const [datePart, timePart] = s.split('T')
    const [y, mo, d] = datePart.split('-').map(Number)
    const [h, m] = (timePart || '00:00').split(':').map(Number)
    // Panama = UTC-5 → sumar 5h para obtener UTC
    return Date.UTC(y, mo - 1, d, h + 5, m, 0)
  }
  // Solo fecha: fin del día en Panamá (medianoche = siguiente día 05:00 UTC)
  const [y, mo, d] = s.split('-').map(Number)
  return Date.UTC(y, mo - 1, d + 1, 5, 0, 0)
}

function labelFin(fechaFin: string): string {
  // Fecha Panama de hoy
  const ahoraPanama = new Date(Date.now() - 5 * 60 * 60 * 1000)
  const hoyY = ahoraPanama.getUTCFullYear()
  const hoyM = ahoraPanama.getUTCMonth()
  const hoyD = ahoraPanama.getUTCDate()
  // Fecha Panama del cierre (los primeros 10 chars son YYYY-MM-DD en hora Panama)
  const [y, mo, d] = fechaFin.slice(0, 10).split('-').map(Number)
  if (y === hoyY && mo - 1 === hoyM && d === hoyD) return 'Termina hoy ·'
  const mañana = new Date(Date.UTC(hoyY, hoyM, hoyD + 1))
  if (y === mañana.getUTCFullYear() && mo - 1 === mañana.getUTCMonth() && d === mañana.getUTCDate()) return 'Termina mañana ·'
  // Fecha formateada
  const fecha = new Date(fechaFin.slice(0, 10) + 'T12:00:00Z')
    .toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long' })
  return `Termina el ${fecha} ·`
}

function calcular(fechaFin: string) {
  const diff = toPanamaUTC(fechaFin) - Date.now()
  if (diff <= 0) return null
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return { d, h, m, s, totalHoras: diff / 3600000 }
}

export default function CountdownTimer({ fechaFin, label }: Props) {
  const [tiempo, setTiempo] = useState(() => calcular(fechaFin))

  useEffect(() => {
    const id = setInterval(() => setTiempo(calcular(fechaFin)), 1000)
    return () => clearInterval(id)
  }, [fechaFin])

  if (!tiempo) {
    return (
      <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5">
        <Clock size={12} className="text-gray-400" />
        <span className="text-xs font-medium text-gray-400">Centro cerrado</span>
      </div>
    )
  }

  const { d, h, m, s, totalHoras } = tiempo
  const urgente = totalHoras < 24
  const proximo = totalHoras >= 24 && totalHoras < 48

  const prefijo = label ?? labelFin(fechaFin)
  const texto = d > 0
    ? `${prefijo} en ${d}d ${h}h ${m}m`
    : h > 0
    ? `${prefijo} en ${h}h ${m}m ${s}s`
    : `${prefijo} en ${m}m ${s}s`

  if (urgente) return (
    <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 animate-pulse">
      <Clock size={12} className="text-red-500" />
      <span className="text-xs font-bold text-red-600">{texto}</span>
    </div>
  )

  if (proximo) return (
    <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-yellow-100 px-3 py-1.5">
      <Clock size={12} className="text-yellow-600" />
      <span className="text-xs font-bold text-yellow-700">{texto}</span>
    </div>
  )

  return (
    <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-green-100 px-3 py-1.5">
      <Clock size={12} className="text-green-600" />
      <span className="text-xs font-medium text-green-700">{texto}</span>
    </div>
  )
}
