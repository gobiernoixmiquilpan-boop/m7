"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polygon, LayersControl, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { LOTES } from "@/lib/lots";

const STATUS_COLORS: Record<string, string> = {
  pendiente:  "#6b7280",
  revision:   "#f59e0b",
  aprobado:   "#10b981",
  rechazado:  "#ef4444",
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

function makeLabelIcon(text: string, color: string) {
  const escaped = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-50%);background:white;border:2px solid ${color};border-radius:6px;padding:3px 8px;font-size:10px;font-weight:800;color:${color};white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.18);pointer-events:none;font-family:system-ui,sans-serif;">${escaped}</div>`,
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
  status?: string;
}

/* ── Auto-encuadre al cambiar las solicitudes ── */
function MapController({ submissions }: { submissions: Submission[] }) {
  const map = useMap();

  useEffect(() => {
    if (submissions.length > 0) {
      const bounds = submissions.map((s) => [s.lat, s.lng] as L.LatLngTuple);
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [48, 48], maxZoom: 16, animate: true });
    } else {
      const coords = LOTES.flatMap((l) => l.coords);
      if (coords.length > 0) map.fitBounds(coords as L.LatLngBoundsExpression, { padding: [28, 28], maxZoom: 14, animate: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissions.length]);

  return null;
}

export default function AdminMap({ submissions, onSelectSubmission }: { submissions: Submission[]; onSelectSubmission?: (id: string) => void }) {
  const center: [number, number] = [20.510, -99.126];

  return (
    <div>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: 420, width: "100%", borderRadius: 16 }}
        scrollWheelZoom
      >
        <MapController submissions={submissions} />

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

        {/* Polígonos de lotes con conteo de solicitudes */}
        {LOTES.map((lote) => {
          const count = lote.loteNum
            ? submissions.filter((s) => s.lote === lote.loteNum).length
            : 0;
          const byStatus = Object.entries(STATUS_LABELS).map(([key, label]) => ({
            key, label, n: submissions.filter((s) => s.lote === lote.loteNum && (s.status ?? "pendiente") === key).length,
          })).filter((x) => x.n > 0);

          return (
            <Polygon
              key={lote.id}
              positions={lote.coords}
              pathOptions={{
                color: lote.color,
                fillColor: lote.fillColor,
                fillOpacity: count > 0 ? 0.28 : 0.12,
                weight: count > 0 ? 2.5 : 1.5,
                dashArray: lote.loteNum ? undefined : "6 4",
              }}
              eventHandlers={{
                mouseover: (e) => e.target.setStyle({ fillOpacity: 0.42, weight: 3 }),
                mouseout: (e) => e.target.setStyle({ fillOpacity: count > 0 ? 0.28 : 0.12, weight: count > 0 ? 2.5 : 1.5 }),
              }}
            >
              <Popup>
                <div style={{ minWidth: 165 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                    <div style={{ width: 13, height: 13, borderRadius: 4, flexShrink: 0, backgroundColor: lote.fillColor, border: `2px solid ${lote.color}` }} />
                    <strong style={{ fontSize: 13, color: "#1f2937" }}>{lote.nombre}</strong>
                  </div>
                  {lote.loteNum && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 8 }}>
                      <div style={{ background: "#f3f4f6", borderRadius: 5, padding: "3px 7px" }}>
                        <div style={{ color: "#9ca3af", fontWeight: 600, fontSize: 9 }}>PREDIO</div>
                        <div style={{ color: "#111827", fontWeight: 800, fontSize: 13 }}>{lote.predioNum}</div>
                      </div>
                      <div style={{ background: "#f3f4f6", borderRadius: 5, padding: "3px 7px" }}>
                        <div style={{ color: "#9ca3af", fontWeight: 600, fontSize: 9 }}>LOTE</div>
                        <div style={{ color: "#111827", fontWeight: 800, fontSize: 13 }}>{lote.loteNum}</div>
                      </div>
                    </div>
                  )}
                  <div style={{ background: count > 0 ? "#fdf2f8" : "#f9fafb", borderRadius: 7, padding: "5px 8px", marginBottom: byStatus.length ? 6 : 0 }}>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>Solicitudes: </span>
                    <strong style={{ fontSize: 13, color: count > 0 ? "#6e112c" : "#9ca3af" }}>{count}</strong>
                  </div>
                  {byStatus.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {byStatus.map(({ key, label, n }) => (
                        <span key={key} style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
                          background: `${STATUS_COLORS[key]}18`, color: STATUS_COLORS[key],
                          border: `1px solid ${STATUS_COLORS[key]}40`,
                        }}>
                          {label}: {n}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* Etiquetas de lotes */}
        {LOTES.filter((l) => l.loteNum).map((lote) => (
          <Marker
            key={`label-${lote.id}`}
            position={lote.centroid}
            icon={makeLabelIcon(lote.loteNum, lote.color)}
            interactive={false}
            zIndexOffset={-100}
          />
        ))}

        {/* Marcadores de solicitudes con color por estado */}
        {submissions.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lng]} icon={makeIcon(s.status ?? "pendiente")}>
            <Popup>
              <div style={{ minWidth: 170 }}>
                <p style={{ fontWeight: 700, fontSize: 13, color: "#111827", margin: "0 0 2px" }}>{s.nombreCompleto}</p>
                <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 6px" }}>{s.comunidad}</p>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 7 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: `${STATUS_COLORS[s.status ?? "pendiente"]}18`, color: STATUS_COLORS[s.status ?? "pendiente"], border: `1px solid ${STATUS_COLORS[s.status ?? "pendiente"]}40` }}>
                    {STATUS_LABELS[s.status ?? "pendiente"]}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: "#f3f4f6", color: "#374151" }}>
                    {s.tipoTierra === "riego" ? "Riego" : "Temporal"}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 8 }}>
                  <div style={{ background: "#f3f4f6", borderRadius: 5, padding: "3px 7px" }}>
                    <div style={{ color: "#9ca3af", fontWeight: 600, fontSize: 9 }}>LOTE</div>
                    <div style={{ color: "#111827", fontWeight: 800, fontSize: 12 }}>{s.lote || "—"}</div>
                  </div>
                  <div style={{ background: "#f3f4f6", borderRadius: 5, padding: "3px 7px" }}>
                    <div style={{ color: "#9ca3af", fontWeight: 600, fontSize: 9 }}>SUPERFICIE</div>
                    <div style={{ color: "#111827", fontWeight: 800, fontSize: 12 }}>{s.superficie} ha</div>
                  </div>
                </div>
                {onSelectSubmission && (
                  <button
                    onClick={() => onSelectSubmission(s.id)}
                    style={{ width: "100%", padding: "6px 10px", background: "#6e112c", color: "white", border: "none", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                  >
                    Ver expediente →
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Leyenda de estados */}
      <div className="flex flex-wrap gap-2 mt-3">
        {Object.entries(STATUS_LABELS).map(([key, label]) => {
          const n = submissions.filter((s) => (s.status ?? "pendiente") === key).length;
          if (n === 0) return null;
          return (
            <div key={key} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: `${STATUS_COLORS[key]}15`, border: `1.5px solid ${STATUS_COLORS[key]}60`, color: STATUS_COLORS[key] }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: STATUS_COLORS[key], flexShrink: 0 }} />
              {label}: {n}
            </div>
          );
        })}
        {submissions.length === 0 && (
          <p className="text-xs text-gray-400">Sin solicitudes con GPS registradas aún</p>
        )}
      </div>
    </div>
  );
}
