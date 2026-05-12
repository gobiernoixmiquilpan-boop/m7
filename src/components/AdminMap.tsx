"use client";

import { MapContainer, TileLayer, Marker, Popup, Polygon, LayersControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { LOTES } from "@/lib/lots";

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

function makeLabelIcon(text: string, color: string) {
  const escaped = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-50%);background:white;border:2px solid ${color};border-radius:5px;padding:2px 7px;font-size:10px;font-weight:800;color:${color};white-space:nowrap;box-shadow:0 1px 5px rgba(0,0,0,0.22);pointer-events:none;font-family:system-ui,sans-serif;">${escaped}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
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

export default function AdminMap({ submissions, onSelectSubmission }: { submissions: Submission[]; onSelectSubmission?: (id: string) => void }) {
  const center: [number, number] =
    submissions.length > 0
      ? [
          submissions.reduce((s, x) => s + x.lat, 0) / submissions.length,
          submissions.reduce((s, x) => s + x.lng, 0) / submissions.length,
        ]
      : [20.500, -99.116];

  const icon = makeIcon();

  return (
    <div>
      <MapContainer
        center={center}
        zoom={submissions.length > 0 ? 14 : 13}
        style={{ height: 360, width: "100%", borderRadius: 16 }}
        scrollWheelZoom={false}
      >
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

        {/* Polígonos de lotes */}
        {LOTES.map((lote) => (
          <Polygon
            key={lote.id}
            positions={lote.coords}
            pathOptions={{
              color: lote.color,
              fillColor: lote.fillColor,
              fillOpacity: 0.18,
              weight: 2,
            }}
          >
            <Popup>
              <div style={{ minWidth: 150 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: 3, flexShrink: 0,
                    backgroundColor: lote.fillColor, border: `2px solid ${lote.color}`,
                  }} />
                  <strong style={{ fontSize: 13 }}>{lote.nombre}</strong>
                </div>
                {lote.loteNum && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 4 }}>
                    <div style={{ background: "#f3f4f6", borderRadius: 5, padding: "3px 6px", fontSize: 10 }}>
                      <div style={{ color: "#9ca3af", fontWeight: 600 }}>PREDIO</div>
                      <div style={{ color: "#111827", fontWeight: 800 }}>{lote.predioNum}</div>
                    </div>
                    <div style={{ background: "#f3f4f6", borderRadius: 5, padding: "3px 6px", fontSize: 10 }}>
                      <div style={{ color: "#9ca3af", fontWeight: 600 }}>LOTE</div>
                      <div style={{ color: "#111827", fontWeight: 800 }}>{lote.loteNum}</div>
                    </div>
                  </div>
                )}
              </div>
            </Popup>
          </Polygon>
        ))}

        {/* Etiquetas centradas en cada polígono */}
        {LOTES.filter((l) => l.loteNum).map((lote) => (
          <Marker
            key={`label-${lote.id}`}
            position={lote.centroid}
            icon={makeLabelIcon(lote.loteNum, lote.color)}
            interactive={false}
            zIndexOffset={-100}
          />
        ))}

        {/* Marcadores de solicitudes */}
        {submissions.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lng]} icon={icon}>
            <Popup>
              <div className="text-sm" style={{ minWidth: 160 }}>
                <p className="font-bold text-gray-800">{s.nombreCompleto}</p>
                <p className="text-gray-500">{s.comunidad}</p>
                <p className="mt-1">
                  Predio <strong>{s.predio}</strong> · Lote <strong>{s.lote}</strong>
                </p>
                <p>
                  {s.tipoTierra === "riego" ? "💧 Riego" : "🌧 Temporal"} ·{" "}
                  {s.superficie} ha
                </p>
                {onSelectSubmission && (
                  <button
                    onClick={() => onSelectSubmission(s.id)}
                    style={{
                      marginTop: 8, width: "100%", padding: "6px 10px",
                      background: "#6e112c", color: "white", border: "none",
                      borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    Ver expediente →
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Leyenda de lotes */}
      <div className="flex flex-wrap gap-2 mt-3">
        {LOTES.filter((l) => l.loteNum).map((lote) => (
          <div key={lote.id}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: `${lote.fillColor}22`, border: `1.5px solid ${lote.color}`, color: lote.color }}>
            <div style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: lote.fillColor, border: `1.5px solid ${lote.color}`, flexShrink: 0 }} />
            {lote.nombre}
          </div>
        ))}
      </div>
    </div>
  );
}
