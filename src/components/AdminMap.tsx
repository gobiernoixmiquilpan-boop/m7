"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

/* Marcador SVG guinda */
function makeIcon(color = "#6e112c") {
  return L.divIcon({
    className: "",
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 40" width="28" height="40">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10 14 26 14 26S28 24 28 14C28 6.268 21.732 0 14 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="14" cy="14" r="5.5" fill="white"/>
    </svg>`,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -42],
  });
}

interface Submission {
  id: string;
  nombreCompleto: string;
  comunidad: string;
  ubicacion: string;
  lat: number;
  lng: number;
  tipoTierra: string;
  superficie: string;
  predio: string;
  lote: string;
}

export default function AdminMap({ submissions }: { submissions: Submission[] }) {
  const center: [number, number] =
    submissions.length > 0
      ? [
          submissions.reduce((s, x) => s + x.lat, 0) / submissions.length,
          submissions.reduce((s, x) => s + x.lng, 0) / submissions.length,
        ]
      : [20.49, -99.21]; // Ixmiquilpan por defecto

  const icon = makeIcon();

  return (
    <MapContainer
      center={center}
      zoom={submissions.length > 0 ? 14 : 12}
      style={{ height: 360, width: "100%", borderRadius: 16 }}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a>'
      />
      {submissions.map((s) => (
        <Marker key={s.id} position={[s.lat, s.lng]} icon={icon}>
          <Popup>
            <div className="text-sm">
              <p className="font-bold text-gray-800">{s.nombreCompleto}</p>
              <p className="text-gray-500">{s.comunidad}</p>
              <p className="mt-1">
                Predio <strong>{s.predio}</strong> · Lote <strong>{s.lote}</strong>
              </p>
              <p>
                {s.tipoTierra === "riego" ? "💧 Riego" : "🌧 Temporal"} ·{" "}
                {s.superficie} ha
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
