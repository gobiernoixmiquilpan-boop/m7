"use client";

import { MapContainer, TileLayer, Polygon, Popup, Marker, LayersControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { LOTES } from "@/lib/lots";

function makeUserIcon() {
  return L.divIcon({
    className: "",
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <circle cx="16" cy="16" r="12" fill="#6e112c" stroke="white" stroke-width="3"/>
      <circle cx="16" cy="16" r="5" fill="white"/>
    </svg>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
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

interface Props {
  lat?: number | null;
  lng?: number | null;
  selectedLote?: string;
  onSelectLote?: (loteNum: string, predioNum: string) => void;
  height?: number;
}

export default function LotesMap({ lat, lng, selectedLote, onSelectLote, height = 320 }: Props) {
  const center: [number, number] = lat && lng ? [lat, lng] : [20.500, -99.116];
  const userIcon = makeUserIcon();
  const selectedLoteObj = LOTES.find((l) => l.loteNum === selectedLote && l.loteNum !== "");

  return (
    <div>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height, width: "100%", borderRadius: 12 }}
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

        {LOTES.map((lote) => {
          const isSelected = selectedLote === lote.loteNum && lote.loteNum !== "";
          return (
            <Polygon
              key={lote.id}
              positions={lote.coords}
              pathOptions={{
                color: lote.color,
                fillColor: lote.fillColor,
                fillOpacity: isSelected ? 0.55 : 0.22,
                weight: isSelected ? 4 : 2,
              }}
              eventHandlers={{
                mouseover: (e) => {
                  if (!isSelected) e.target.setStyle({ fillOpacity: 0.42, weight: 3 });
                },
                mouseout: (e) => {
                  if (!isSelected) e.target.setStyle({ fillOpacity: 0.22, weight: 2 });
                },
                click: () => {
                  if (lote.loteNum && onSelectLote) {
                    onSelectLote(lote.loteNum, lote.predioNum);
                  }
                },
              }}
            >
              <Popup>
                <div style={{ minWidth: 170 }}>
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
                      {isSelected ? "✓ Seleccionado" : "Seleccionar este lote"}
                    </button>
                  )}

                  {!lote.loteNum && (
                    <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>Perímetro exterior de referencia</p>
                  )}
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* Etiquetas de nombre centradas en cada polígono */}
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
      {selectedLoteObj && (
        <div style={{
          margin: "8px 0 4px",
          padding: "8px 14px",
          background: `${selectedLoteObj.fillColor}18`,
          border: `1.5px solid ${selectedLoteObj.color}`,
          borderRadius: 10,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 12, height: 12, borderRadius: 3, flexShrink: 0,
            backgroundColor: selectedLoteObj.fillColor, border: `2px solid ${selectedLoteObj.color}`,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Seleccionado: </span>
            <span style={{ fontSize: 12, color: "#111827", fontWeight: 700 }}>
              Predio {selectedLoteObj.predioNum} · Lote {selectedLoteObj.loteNum}
            </span>
          </div>
          {onSelectLote && (
            <button
              onClick={() => onSelectLote("", "")}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 16, color: "#9ca3af", padding: 2, lineHeight: 1, flexShrink: 0,
              }}
              title="Limpiar selección"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Leyenda de lotes */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: selectedLoteObj ? "4px 0 2px" : "8px 0 2px" }}>
        {LOTES.filter((l) => l.loteNum).map((lote) => {
          const isSelected = selectedLote === lote.loteNum;
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
