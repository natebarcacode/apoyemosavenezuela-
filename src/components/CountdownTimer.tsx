'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

type Props = {
  fechaFin: string
  label?: string
}

function calcular(fechaFin: string) {
  const diff = new Date(fechaFin).getTime() - Date.now()
  if (diff <= 0) return null
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  const d = Math.floor(h / 24)
  return { d, h: h % 24, m, s, totalHoras: h }
}

export default function CountdownTimer({ fechaFin, label = 'Cierra' }: Props) {
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

  const texto = d > 0
    ? `${label} en ${d}d ${h}h ${m}m`
    : h > 0
    ? `${label} en ${h}h ${m}m ${s}s`
    : `${label} en ${m}m ${s}s`

  if (urgente) {
    return (
      <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 animate-pulse">
        <Clock size={12} className="text-red-500" />
        <span className="text-xs font-bold text-red-600">{texto}</span>
      </div>
    )
  }

  if (proximo) {
    return (
      <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-yellow-100 px-3 py-1.5">
        <Clock size={12} className="text-yellow-600" />
        <span className="text-xs font-bold text-yellow-700">{texto}</span>
      </div>
    )
  }

  return (
    <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-green-100 px-3 py-1.5">
      <Clock size={12} className="text-green-600" />
      <span className="text-xs font-medium text-green-700">{texto}</span>
    </div>
  )
}
