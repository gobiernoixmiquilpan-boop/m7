"use client";

import { Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface Props {
  folio: string;
  nombre: string;
  comunidad: string;
  fecha: string;
  estado: string;
  estadoLabel: string;
  motivoRechazo?: string | null;
}

export default function PrintComprobanteButton({ folio, nombre, comunidad, fecha, estado, estadoLabel, motivoRechazo }: Props) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/consulta/${folio}` : `/consulta/${folio}`;

  const estadoColor: Record<string, string> = {
    pendiente: "#6b7280",
    revision:  "#d97706",
    aprobado:  "#059669",
    rechazado: "#dc2626",
  };

  return (
    <>
      {/* Área de impresión — oculta en pantalla */}
      <div id="print-comprobante" className="hidden print:block">
        <div style={{ fontFamily: "sans-serif", maxWidth: 480, margin: "0 auto", padding: "32px 24px", border: "1px solid #e5e7eb", borderRadius: 12 }}>
          {/* Encabezado */}
          <div style={{ borderBottom: "2px solid #6b1022", paddingBottom: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 2, margin: 0 }}>Contraloría Municipal · Ixmiquilpan</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#6b1022", margin: "4px 0 0" }}>Comprobante de solicitud</p>
              <p style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 0" }}>Regularización de Tierras · Capula 2026</p>
            </div>
            <QRCodeSVG value={url} size={72} fgColor="#6b1022" level="M" />
          </div>

          {/* Folio */}
          <div style={{ background: "#6b1022", borderRadius: 8, padding: "12px 16px", marginBottom: 20, textAlign: "center" }}>
            <p style={{ color: "#f5c6cc", fontSize: 9, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 4px" }}>Folio de registro</p>
            <p style={{ color: "#fff", fontSize: 22, fontWeight: 700, fontFamily: "monospace", letterSpacing: 4, margin: 0 }}>{folio}</p>
          </div>

          {/* Datos */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20, fontSize: 13 }}>
            <tbody>
              {[
                ["Solicitante", nombre],
                ["Comunidad",   comunidad],
                ["Fecha de registro", fecha],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "8px 4px", color: "#9ca3af", width: "40%" }}>{label}</td>
                  <td style={{ padding: "8px 4px", color: "#111827", fontWeight: 500 }}>{value}</td>
                </tr>
              ))}
              <tr>
                <td style={{ padding: "8px 4px", color: "#9ca3af" }}>Estado</td>
                <td style={{ padding: "8px 4px", fontWeight: 700, color: estadoColor[estado] ?? "#6b7280" }}>{estadoLabel}</td>
              </tr>
            </tbody>
          </table>

          {motivoRechazo && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 20 }}>
              <p style={{ fontSize: 10, color: "#f87171", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px", fontWeight: 700 }}>Motivo de no aprobación</p>
              <p style={{ fontSize: 12, color: "#dc2626", margin: 0, lineHeight: 1.5 }}>{motivoRechazo}</p>
            </div>
          )}

          {/* Pie */}
          <p style={{ fontSize: 10, color: "#9ca3af", borderTop: "1px solid #f3f4f6", paddingTop: 12, margin: 0, lineHeight: 1.6 }}>
            Conserve este comprobante. Para consultas acuda a la Contraloría Municipal de Ixmiquilpan
            o escanee el código QR con su teléfono.
          </p>
        </div>
      </div>

      {/* Botón visible en pantalla */}
      <button
        onClick={() => window.print()}
        className="flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-800 hover:bg-gray-50/80 font-bold py-3.5 rounded-2xl text-sm transition-all w-full active:scale-[.97]">
        <Printer className="w-4 h-4" strokeWidth={2} />
        Imprimir comprobante
      </button>
    </>
  );
}
