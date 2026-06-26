'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const icon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.setView([lat, lng], map.getZoom()) }, [lat, lng])
  return null
}

function ClickHandler({ onChange }: { onChange: (lat: string, lng: string) => void }) {
  useMapEvents({
    click(e) { onChange(String(e.latlng.lat), String(e.latlng.lng)) },
  })
  return null
}

type Props = {
  lat: string
  lng: string
  onChange: (lat: string, lng: string) => void
}

export default function MapaPicker({ lat, lng, onChange }: Props) {
  const latN = parseFloat(lat)
  const lngN = parseFloat(lng)
  if (!lat || !lng || isNaN(latN) || isNaN(lngN)) return null

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 mt-2">
      <p className="text-xs text-gray-500 bg-gray-50 px-3 py-1.5 border-b border-gray-100">
        Arrastra el marcador o haz click en el mapa para ajustar la ubicación exacta
      </p>
      <MapContainer
        center={[latN, lngN]}
        zoom={17}
        style={{ height: '220px', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Recenter lat={latN} lng={lngN} />
        <ClickHandler onChange={onChange} />
        <Marker
          position={[latN, lngN]}
          icon={icon}
          draggable
          eventHandlers={{
            dragend(e) {
              const { lat, lng } = (e.target as L.Marker).getLatLng()
              onChange(String(lat), String(lng))
            },
          }}
        />
      </MapContainer>
    </div>
  )
}
