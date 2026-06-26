'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { CentroAcopio } from '@/lib/supabase'
import 'leaflet/dist/leaflet.css'

// Fix default marker icons in Next.js
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

type Props = {
  centros: CentroAcopio[]
  onSelect: (centro: CentroAcopio) => void
}

export default function MapaCentros({ centros, onSelect }: Props) {
  useEffect(() => {
    L.Marker.prototype.options.icon = icon
  }, [])

  const center: [number, number] = centros.length > 0
    ? [centros[0].lat, centros[0].lng]
    : [8.9936, -79.5197] // Ciudad de Panamá por defecto

  return (
    <MapContainer
      center={center}
      zoom={12}
      className="w-full h-full rounded-xl"
      style={{ minHeight: '400px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {centros.map((centro) => (
        <Marker
          key={centro.id}
          position={[centro.lat, centro.lng]}
          icon={icon}
          eventHandlers={{ click: () => onSelect(centro) }}
        >
          <Popup>
            <div className="font-semibold">{centro.nombre}</div>
            <div className="text-sm text-gray-600">{centro.direccion}</div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
