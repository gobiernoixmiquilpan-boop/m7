"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Polygon, Popup, Marker, LayersControl, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { LOTES } from "@/lib/lots";

function makeUserIcon() {
  return L.divIcon({
    className: "",
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
      <circle cx="20" cy="20" r="16" fill="#6e112c" stroke="white" stroke-width="3" opacity="0.9"/>
      <circle cx="20" cy="20" r="7" fill="white"/>
      <circle cx="20" cy="20" r="16" fill="none" stroke="#6e112c" stroke-width="2" opacity="0.3">
        <animate attributeName="r" from="16" to="26" dur="1.6s" repeatCount="indefinite"/>
        <animate attributeName="opacity" from="0.4" to="0" dur="1.6s" repeatCount="indefinite"/>
      </circle>
    </svg>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -22],
  });
}

function makeLabelIcon(text: string, color: string) {
  const escaped = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-50%);background:white;border:2px solid ${color};border-radius:6px;padding:3px 8px;font-size:10px;font-weight:800;color:${color};white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.18);pointer-events:none;font-family:system-ui,sans-serif;letter-spacing:0.02em;">${escaped}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function MapController({ lat, lng, selectedLotes }: { lat?: number | null; lng?: number | null; selectedLotes?: string[] }) {
  const map = useMap();
  const prevRef = useRef<string[]>([]);

  useEffect(() => {
    const coords = LOTES.flatMap((l) => l.coords);
    if (coords.length > 0) {
      map.fitBounds(coords as L.LatLngBoundsExpression, { padding: [28, 28], maxZoom: 14, animate: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (lat && lng) map.flyTo([lat, lng], 16, { duration: 1.1 });
  }, [lat, lng, map]);

  // Volar al último polígono añadido
  useEffect(() => {
    const prev = prevRef.current;
    const curr = selectedLotes ?? [];
    const added = curr.find((l) => !prev.includes(l));
    prevRef.current = curr;
    if (!added) return;
    const lote = LOTES.find((l) => l.loteNum === added);
    if (!lote || !lote.coords.length) return;
    const bounds = L.polygon(lote.coords as L.LatLngTuple[]).getBounds();
    map.flyToBounds(bounds, { padding: [36, 36], maxZoom: 17, duration: 0.9 });
  }, [selectedLotes, map]);

  return null;
}

interface Props {
  lat?: number | null;
  lng?: number | null;
  selectedLotes?: string[];
  onSelectLote?: (loteNum: string, predioNum: string) => void;
  height?: number;
}

export default function LotesMap({ lat, lng, selectedLotes, onSelectLote, height = 340 }: Props) {
  const center: [number, number] = [20.510, -99.126];
  const userIcon = makeUserIcon();
  const selectedSet = new Set(selectedLotes ?? []);
  const selectedLoteObjs = LOTES.filter((l) => l.loteNum && selectedSet.has(l.loteNum));

  return (
    <div>
      {/* Instrucción cuando no hay lote seleccionado */}
      {selectedSet.size === 0 && (
        <div style={{
          marginBottom: 8, padding: "7px 12px",
          background: "#fffbeb", border: "1.5px solid #fbbf24",
          borderRadius: 10, fontSize: 12, color: "#92400e", fontWeight: 600,
          display: "flex", alignItems: "center", gap: 7,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          Toca un lote en el mapa o selecciónalo en la leyenda
        </div>
      )}

      <MapContainer
        center={center}
        zoom={13}
        style={{ height, width: "100%", borderRadius: 12 }}
        scrollWheelZoom={false}
        zoomControl
      >
        <MapController lat={lat} lng={lng} selectedLotes={selectedLotes} />

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

        {LOTES.map((lote) => {
          const isSelected = selectedSet.has(lote.loteNum) && lote.loteNum !== "";
          return (
            <Polygon
              key={lote.id}
              positions={lote.coords}
              pathOptions={{
                color: lote.color,
                fillColor: lote.fillColor,
                fillOpacity: isSelected ? 0.6 : 0.25,
                weight: isSelected ? 4 : 2,
                dashArray: lote.loteNum ? undefined : "6 4",
              }}
              eventHandlers={{
                mouseover: (e) => {
                  if (!isSelected) e.target.setStyle({ fillOpacity: 0.45, weight: 3 });
                },
                mouseout: (e) => {
                  if (!isSelected) e.target.setStyle({ fillOpacity: 0.25, weight: 2 });
                },
                click: () => {
                  if (lote.loteNum && onSelectLote) onSelectLote(lote.loteNum, lote.predioNum);
                },
              }}
            >
              <Popup>
                <div style={{ minWidth: 175 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                      backgroundColor: lote.fillColor, border: `2px solid ${lote.color}`,
                    }} />
                    <strong style={{ fontSize: 13, color: "#1f2937", lineHeight: 1.3 }}>
                      {lote.nombre}
                    </strong>
                  </div>

                  {lote.loteNum && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
                      <div style={{ background: "#f3f4f6", borderRadius: 6, padding: "4px 8px" }}>
                        <div style={{ color: "#9ca3af", fontWeight: 600, fontSize: 10, marginBottom: 1 }}>PREDIO</div>
                        <div style={{ color: "#111827", fontWeight: 800, fontSize: 14 }}>{lote.predioNum}</div>
                      </div>
                      <div style={{ background: "#f3f4f6", borderRadius: 6, padding: "4px 8px" }}>
                        <div style={{ color: "#9ca3af", fontWeight: 600, fontSize: 10, marginBottom: 1 }}>LOTE</div>
                        <div style={{ color: "#111827", fontWeight: 800, fontSize: 14 }}>{lote.loteNum}</div>
                      </div>
                    </div>
                  )}

                  {lote.loteNum && onSelectLote && (
                    <button
                      onClick={() => onSelectLote(lote.loteNum, lote.predioNum)}
                      style={{
                        width: "100%", padding: "7px 12px",
                        background: isSelected ? "#065f46" : "#6e112c",
                        color: "white", border: "none", borderRadius: 9,
                        fontSize: 12, fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      {isSelected ? "✓ Quitar selección" : "Seleccionar este lote"}
                    </button>
                  )}

                  {!lote.loteNum && (
                    <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>Perímetro de referencia</p>
                  )}
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* Etiquetas centradas */}
        {LOTES.filter((l) => l.loteNum).map((lote) => (
          <Marker
            key={`label-${lote.id}`}
            position={lote.centroid}
            icon={makeLabelIcon(lote.loteNum, lote.color)}
            interactive={false}
            zIndexOffset={-100}
          />
        ))}

        {lat && lng && (
          <Marker position={[lat, lng]} icon={userIcon}>
            <Popup>
              <p style={{ fontSize: 12, margin: 0, fontWeight: 600, color: "#6e112c" }}>
                Tu ubicación GPS
              </p>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Banner de selección activa */}
      {selectedLoteObjs.length > 0 && (
        <div style={{
          margin: "8px 0 4px", padding: "8px 14px",
          background: "#f0fdf4",
          border: "1.5px solid #86efac",
          borderRadius: 10, display: "flex", alignItems: "center", gap: 10,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span style={{ fontSize: 12, color: "#15803d", fontWeight: 700, flex: 1 }}>
            {selectedLoteObjs.length === 1
              ? `${selectedLoteObjs[0].nombre} · Predio ${selectedLoteObjs[0].predioNum} · Lote ${selectedLoteObjs[0].loteNum}`
              : `${selectedLoteObjs.length} polígonos seleccionados: ${selectedLoteObjs.map((l) => l.loteNum).join(", ")}`
            }
          </span>
        </div>
      )}

      {/* Leyenda */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: selectedLoteObjs.length > 0 ? "4px 0 2px" : "8px 0 2px" }}>
        {LOTES.filter((l) => l.loteNum).map((lote) => {
          const isSelected = selectedSet.has(lote.loteNum);
          return (
            <button
              key={lote.id}
              onClick={() => onSelectLote && onSelectLote(lote.loteNum, lote.predioNum)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 20,
                border: isSelected ? `2px solid ${lote.color}` : "2px solid transparent",
                background: isSelected ? `${lote.fillColor}22` : "#f3f4f6",
                cursor: onSelectLote ? "pointer" : "default",
                fontSize: 11, fontWeight: isSelected ? 700 : 500,
                color: isSelected ? lote.color : "#374151",
                transition: "all 0.15s",
              }}
            >
              <span style={{
                width: 10, height: 10, borderRadius: 3, flexShrink: 0,
                backgroundColor: lote.fillColor, border: `1.5px solid ${lote.color}`,
              }} />
              {lote.loteNum}
            </button>
          );
        })}
      </div>
    </div>
  );
}
