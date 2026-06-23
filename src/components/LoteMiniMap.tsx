"use client";

import { useEffect } from "react";
import {
  MapContainer, TileLayer, Marker, Popup,
  Polygon, LayersControl, useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { LOTES } from "@/lib/lots";

const STATUS_COLORS: Record<string, string> = {
  pendiente: "#6b7280",
  revision:  "#f59e0b",
  aprobado:  "#10b981",
  rechazado: "#ef4444",
};
const STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  revision:  "En revisión",
  aprobado:  "Aprobado",
  rechazado: "Rechazado",
};

function makeIcon(status = "pendiente") {
  const color = STATUS_COLORS[status] ?? STATUS_COLORS.pendiente;
  return L.divIcon({
    className: "",
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 40" width="28" height="40">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10 14 26 14 26S28 24 28 14C28 6.268 21.732 0 14 0z" fill="${color}" stroke="white" stroke-width="2"/>
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
  lat: number | null;
  lng: number | null;
  lote: string;
  superficie: string;
  tipoTierra: string;
  status?: string;
}

function FitToLote({ loteNum }: { loteNum: string }) {
  const map = useMap();
  useEffect(() => {
    const loteObj = LOTES.find((l) => l.loteNum === loteNum);
    if (!loteObj) return;
    const bounds = loteObj.coords as L.LatLngBoundsExpression;
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 18, animate: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loteNum]);
  return null;
}

export default function LoteMiniMap({ loteNum, color, fillColor, items, onSelect }: {
  loteNum: string;
  color: string;
  fillColor: string;
  items: Submission[];
  onSelect: (s: Submission) => void;
}) {
  const loteObj = LOTES.find((l) => l.loteNum === loteNum);
  if (!loteObj) return null;

  const center: [number, number] = loteObj.centroid as [number, number];

  return (
    <MapContainer
      center={center}
      zoom={15}
      style={{ height: 260, width: "100%", borderRadius: 12 }}
      scrollWheelZoom
      zoomControl
    >
      <FitToLote loteNum={loteNum} />

      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Mapa">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a>'
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satélite">
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri"
            maxZoom={19}
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      <Polygon
        positions={loteObj.coords}
        pathOptions={{ color, fillColor, fillOpacity: 0.25, weight: 2.5 }}
      />

      {items.map((s) => {
        const hasGps = s.lat != null && s.lng != null;
        const position: [number, number] = hasGps
          ? [s.lat!, s.lng!]
          : (loteObj.centroid as [number, number]);
        return (
          <Marker key={s.id} position={position} icon={makeIcon(s.status ?? "pendiente")}>
            <Popup>
              <div style={{ minWidth: 160 }}>
                <p style={{ fontWeight: 700, fontSize: 13, color: "#111827", margin: "0 0 2px" }}>
                  {s.nombreCompleto}
                </p>
                <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 6px" }}>{s.comunidad}</p>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 7 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
                    background: `${STATUS_COLORS[s.status ?? "pendiente"]}18`,
                    color: STATUS_COLORS[s.status ?? "pendiente"],
                    border: `1px solid ${STATUS_COLORS[s.status ?? "pendiente"]}40`,
                  }}>
                    {STATUS_LABELS[s.status ?? "pendiente"]}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: "#f3f4f6", color: "#374151" }}>
                    {s.superficie} m²
                  </span>
                </div>
                {!hasGps && (
                  <p style={{ fontSize: 9, color: "#9ca3af", marginBottom: 5 }}>
                    📍 Posición aproximada al centro del polígono
                  </p>
                )}
                <button
                  onClick={() => onSelect(s)}
                  style={{ width: "100%", padding: "6px 10px", background: "#6e112c", color: "white", border: "none", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                >
                  Ver expediente →
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
