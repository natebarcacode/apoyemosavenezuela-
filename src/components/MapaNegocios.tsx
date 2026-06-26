'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { NegocioSolidario } from '@/lib/supabase'
import 'leaflet/dist/leaflet.css'

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

type Props = {
  negocios: NegocioSolidario[]
  onSelect: (negocio: NegocioSolidario) => void
}

export default function MapaNegocios({ negocios, onSelect }: Props) {
  useEffect(() => {
    L.Marker.prototype.options.icon = icon
  }, [])

  const withCoords = negocios.filter(n => n.lat != null && n.lng != null)

  const center: [number, number] = withCoords.length > 0
    ? [withCoords[0].lat!, withCoords[0].lng!]
    : [8.9936, -79.5197]

  return (
    <MapContainer
      center={center}
      zoom={12}
      className="w-full h-full"
      style={{ minHeight: '400px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {withCoords.map(n => (
        <Marker
          key={n.id}
          position={[n.lat!, n.lng!]}
          icon={icon}
          eventHandlers={{ click: () => onSelect(n) }}
        >
          <Popup>
            <div className="font-semibold text-sm">{n.nombre}</div>
            <div className="text-xs text-gray-500 mt-0.5">{n.zona} · {n.tipo}</div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
