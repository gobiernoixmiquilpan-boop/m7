"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { LOTES, type Lote } from "@/lib/lots";
import {
  Users, MapPin, Droplets, CloudRain, LogOut, Download,
  Search, ChevronLeft, ChevronRight, ChevronDown, RefreshCw,
  FileText, MessageCircle, ExternalLink, X, Trash2, Loader2, Printer,
  ArrowUp, ArrowDown, ZoomIn, Check, Copy, Layers, BarChart2, Clock,
  Archive, ArchiveRestore,
} from "lucide-react";

function Eye({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOff({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

const AdminMap = dynamic(() => import("@/components/AdminMap"), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-gray-100 rounded-2xl flex items-center justify-center text-sm text-gray-400 animate-pulse">
      Cargando mapa…
    </div>
  ),
});

const LoteMiniMap = dynamic(() => import("@/components/LoteMiniMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[260px] bg-gray-100 rounded-xl animate-pulse mx-3 mb-3" />
  ),
});

interface Submission {
  id: string;
  timestamp: string;
  nombreCompleto: string;
  comunidad: string;
  ubicacion: string;
  lat: number | null;
  lng: number | null;
  celular: string;
  curp: string;
  predio: string;
  lote: string;
  tipoTierra: string;
  superficie: string;
  hablaDialecto: string;
  status: string;
  fotoCasaUrl?: string;
  fotoINEFrenteUrl?: string;
  fotoINEAtrasUrl?: string;
  fotoPredioNorteUrl?: string;
  fotoPredioSurUrl?: string;
  fotoPredioEsteUrl?: string;
  fotoPredioOesteUrl?: string;
  motivoRechazo?: string;
  notas?: string;
  updated_at?: string;
  archived_at?: string;
}

const COMUNIDADES = ["San Pedro Capula", "Capula Centro", "La Huerta de Capula"];
const G = "#6e112c";
const G2 = "#c42a53";
const G3 = "#f5b3c7";
const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "pendiente",  label: "Pendiente",    cls: "bg-gray-100 text-gray-600" },
  { value: "revision",   label: "En revisión",  cls: "bg-yellow-100 text-yellow-700" },
  { value: "aprobado",   label: "Aprobado",     cls: "bg-emerald-100 text-emerald-700" },
  { value: "rechazado",  label: "Rechazado",    cls: "bg-red-100 text-red-700" },
];

function statusCls(s?: string) {
  return STATUS_OPTIONS.find((o) => o.value === s)?.cls ?? "bg-gray-100 text-gray-600";
}
function statusLabel(s?: string) {
  return STATUS_OPTIONS.find((o) => o.value === s)?.label ?? "Pendiente";
}
function photoSrc(path?: string) {
  if (!path) return null;
  return `/api/photo?p=${encodeURIComponent(path)}`;
}
function folio(id: string) {
  return `CAP-2026-${id.slice(-6).toUpperCase()}`;
}

/* ──────────────────── Delete confirm modal ──────────────────── */
function DeleteConfirmModal({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div role="dialog" aria-modal="true" aria-labelledby="archive-modal-title"
        className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-xs w-full text-center animate-slide-up">
        <div className="w-14 h-14 bg-amber-50 border-2 border-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Archive className="w-6 h-6 text-amber-500" strokeWidth={1.5} />
        </div>
        <h3 id="archive-modal-title" className="font-black text-gray-800 text-base mb-1">¿Archivar registro?</h3>
        {name && (
          <div className="bg-gray-50 rounded-xl px-3 py-2 mb-3 mx-1">
            <p className="text-sm font-semibold text-gray-700 truncate">{name}</p>
          </div>
        )}
        <p className="text-xs text-gray-400 mb-5 leading-relaxed">El registro se moverá a archivados y podrá restaurarse en cualquier momento.</p>
        <div className="flex gap-2.5">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold text-sm transition-all">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-all shadow-sm">
            Archivar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────── Login ──────────────────── */
function LoginScreen({ email, setEmail, pw, setPw, onLogin, loading, error, expired, remaining, blocked }: {
  email: string; setEmail: (v: string) => void;
  pw: string; setPw: (v: string) => void;
  onLogin: () => void; loading: boolean; error: boolean; expired: boolean;
  remaining: number | null; blocked: boolean;
}) {
  const [showPw, setShowPw] = useState(false);
  return (
    <main className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden"
      style={{ background: "linear-gradient(145deg,#3d0918 0%,#6e112c 55%,#8e1a3c 100%)" }}>
      {/* Patrón de puntos */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      {/* Círculos decorativos */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-[0.12]"
          style={{ background: "radial-gradient(circle,white 0%,transparent 70%)" }} />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-[0.08]"
          style={{ background: "radial-gradient(circle,white 0%,transparent 70%)" }} />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo + título */}
        <div className="text-center mb-7">
          <div className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center mx-auto mb-4 shadow-2xl">
            <Image src="/logo.svg" alt="RegulaTierra" width={46} height={46} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Panel Admin</h1>
          <p className="text-white/40 text-sm mt-1">Regularización · Capula 2026</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 text-center">Iniciar sesión</p>
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Correo electrónico</label>
              <input
                type="email" placeholder="admin@ejemplo.com" value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !blocked && onLogin()}
                disabled={blocked}
                className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-guinda-300 focus:bg-white bg-gray-50 transition-all disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"} placeholder="••••••••" value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !blocked && onLogin()}
                  disabled={blocked}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:border-guinda-300 focus:bg-white bg-gray-50 transition-all disabled:opacity-50"
                />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-300 hover:text-gray-500 transition-colors"
                  tabIndex={-1} aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mensajes de error */}
          {expired && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-4">
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" strokeWidth={2.5} />
              <p className="text-xs text-amber-700 font-medium">Sesión expirada. Vuelve a ingresar.</p>
            </div>
          )}
          {blocked && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mb-4">
              <X className="w-3.5 h-3.5 text-red-500 shrink-0" strokeWidth={2.5} />
              <p className="text-xs text-red-700 font-semibold">Acceso bloqueado 15 min por demasiados intentos.</p>
            </div>
          )}
          {error && !blocked && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mb-4">
              <X className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" strokeWidth={2.5} />
              <div>
                <p className="text-xs text-red-700 font-semibold">Correo o contraseña incorrectos.</p>
                {remaining !== null && remaining <= 2 && remaining > 0 && (
                  <p className="text-xs text-orange-600 mt-0.5">
                    {remaining} intento{remaining !== 1 ? "s" : ""} restante{remaining !== 1 ? "s" : ""} antes del bloqueo.
                  </p>
                )}
              </div>
            </div>
          )}

          <button onClick={onLogin} disabled={loading || blocked}
            className="w-full text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 active:scale-[.98] shadow-lg shadow-guinda-900/30 mt-1"
            style={{ background: loading || blocked ? "#9ca3af" : "linear-gradient(135deg,#530d21 0%,#8b1438 50%,#6e112c 100%)" }}>
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} /> Ingresando…</>
              : "Ingresar al panel"}
          </button>
        </div>

        <div className="flex items-center justify-center gap-3 mt-6">
          <div className="h-px flex-1 bg-white/10" />
          <p className="text-white/30 text-[11px] font-medium shrink-0">Contraloría Municipal · Ixmiquilpan</p>
          <div className="h-px flex-1 bg-white/10" />
        </div>
      </div>
    </main>
  );
}

/* ──────────────────── Por lote ──────────────────── */
function LoteCard({ lote, items, onSelect }: {
  lote: Pick<Lote, "id" | "nombre" | "color" | "fillColor" | "loteNum" | "predioNum">;
  items: Submission[];
  onSelect: (s: Submission) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const PAGE = 5;
  const totalSup = items.reduce((a, s) => a + parseFloat(s.superficie || "0"), 0);
  const riego = items.filter((s) => s.tipoTierra === "riego").length;
  const visible = showAll ? items : items.slice(0, PAGE);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-stretch">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex-1 flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/70 transition-colors text-left min-w-0"
        >
          <div className="w-1 self-stretch rounded-full shrink-0 min-h-[36px]" style={{ background: lote.fillColor }} />
          <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-center"
            style={{ background: `${lote.fillColor}20`, border: `1.5px solid ${lote.color}40` }}>
            <span className="font-black leading-none" style={{ fontSize: 9, color: lote.color }}>
              {lote.loteNum.length > 6 ? lote.loteNum.slice(0, 5) + "…" : lote.loteNum}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800 truncate">{lote.nombre}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Predio {lote.predioNum} · {totalSup.toFixed(0)} m²
              {riego > 0 && ` · ${riego} riego`}
              {(items.length - riego) > 0 && ` · ${items.length - riego} temporal`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <span className="text-2xl font-black text-gray-800 tabular-nums">{items.length}</span>
              <p className="text-[10px] text-gray-400 leading-none">solicitud{items.length !== 1 ? "es" : ""}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform duration-200 ${open ? "rotate-180" : ""}`} strokeWidth={2} />
          </div>
        </button>
        {lote.loteNum !== "—" && items.length > 0 && (
          <button
            onClick={() => printLoteReport(lote, items)}
            title="Imprimir reporte de este polígono"
            aria-label="Imprimir reporte del polígono"
            className="px-3 border-l border-gray-100 text-gray-300 hover:text-guinda-600 hover:bg-guinda-50 transition-all shrink-0"
          >
            <Printer className="w-4 h-4" strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="flex gap-1.5 px-4 pb-3 flex-wrap">
        {STATUS_OPTIONS.map((o) => {
          const n = items.filter((s) => (s.status ?? "pendiente") === o.value).length;
          if (!n) return null;
          return (
            <span key={o.value} className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${o.cls}`}>
              {o.label}: {n}
            </span>
          );
        })}
      </div>

      {open && (
        <div className="border-t border-gray-100">
          {/* Mini-mapa del polígono */}
          {items.length > 0 && lote.loteNum !== "—" && (
            <div className="p-3 pb-0">
              <LoteMiniMap
                loteNum={lote.loteNum}
                color={lote.color}
                fillColor={lote.fillColor}
                items={items}
                onSelect={onSelect}
              />
            </div>
          )}
          {visible.map((s) => {
            const av = avatarCls(s.nombreCompleto);
            return (
              <button key={s.id} onClick={() => onSelect(s)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-guinda-50/40 border-b border-gray-50 last:border-0 transition-colors text-left">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 select-none ${av.bg} ${av.text}`}>
                  {initials(s.nombreCompleto)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{s.nombreCompleto}</p>
                  <p className="text-xs text-gray-400">{s.comunidad} · {s.superficie} m² · {s.tipoTierra === "riego" ? "Riego" : "Temporal"}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusCls(s.status)}`}>
                    {statusLabel(s.status)}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" strokeWidth={2} />
                </div>
              </button>
            );
          })}
          {items.length > PAGE && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="w-full py-3 text-xs font-semibold text-guinda-600 hover:text-guinda-800 hover:bg-guinda-50/40 transition-colors border-t border-gray-50"
            >
              {showAll ? "Ver menos" : `Ver ${items.length - PAGE} más`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function LotesView({ submissions, onSelect }: { submissions: Submission[]; onSelect: (s: Submission) => void }) {
  const porLote = LOTES.filter((l) => l.loteNum).map((lote) => ({
    lote,
    items: submissions.filter((s) => s.lote === lote.loteNum),
  }));
  const conItems = porLote.filter((x) => x.items.length > 0);
  const sinItems = porLote.filter((x) => x.items.length === 0);
  const sinLote  = submissions.filter((s) => !s.lote || !LOTES.find((l) => l.loteNum === s.lote));
  const totalSup = submissions.reduce((a, s) => a + parseFloat(s.superficie || "0"), 0);
  const statusTotals = STATUS_OPTIONS.map((o) => ({
    ...o,
    n: submissions.filter((s) => (s.status ?? "pendiente") === o.value).length,
  })).filter((x) => x.n > 0);

  if (submissions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 text-gray-400">
        <Layers className="w-10 h-10 mb-2 opacity-25" strokeWidth={1} />
        <p className="text-sm">Aún no hay registros</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Resumen global */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-gray-800">{submissions.length}</span>
          <span className="text-xs font-medium text-gray-400">solicitudes</span>
        </div>
        <div className="w-px h-6 bg-gray-100 shrink-0" />
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-gray-800">{totalSup.toFixed(1)}</span>
          <span className="text-xs font-medium text-gray-400">m²</span>
        </div>
        {statusTotals.length > 0 && <div className="w-px h-6 bg-gray-100 shrink-0 hidden sm:block" />}
        <div className="flex flex-wrap gap-1.5">
          {statusTotals.map(({ value, label, cls, n }) => (
            <span key={value} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>
              {label}: {n}
            </span>
          ))}
        </div>
      </div>

      {conItems.map(({ lote, items }) => (
        <LoteCard key={lote.id} lote={lote} items={items} onSelect={onSelect} />
      ))}
      {sinLote.length > 0 && (
        <LoteCard
          lote={{ id: "sin-lote", nombre: "Sin lote asignado", color: "#9ca3af", fillColor: "#d1d5db", loteNum: "—", predioNum: "—" }}
          items={sinLote}
          onSelect={onSelect}
        />
      )}
      {sinItems.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 px-1">Lotes sin solicitudes</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {sinItems.map(({ lote }) => (
              <div key={lote.id} className="rounded-xl border border-gray-100 px-3 py-2 flex items-center gap-2 opacity-40">
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: lote.fillColor, border: `1.5px solid ${lote.color}` }} />
                <span className="text-xs font-semibold text-gray-500 truncate">{lote.loteNum}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────── Stat card ──────────────────── */
function StatCard({ label, value, sub, icon, color = "guinda" }: {
  label: string; value: number | string; sub?: string; icon: React.ReactNode; color?: string;
}) {
  const bg     = color === "blue" ? "bg-blue-100"    : color === "emerald" ? "bg-emerald-100"    : "bg-guinda-100";
  const text   = color === "blue" ? "text-blue-700"  : color === "emerald" ? "text-emerald-700"  : "text-guinda-700";
  const accent = color === "blue" ? "#3b82f6"        : color === "emerald" ? "#10b981"           : "#6e112c";
  const gradFrom = color === "blue" ? "rgba(59,130,246,0.04)" : color === "emerald" ? "rgba(16,185,129,0.04)" : "rgba(110,17,44,0.04)";
  return (
    <div className="rounded-2xl shadow-sm p-5 flex items-center gap-4 border border-gray-100/80 border-l-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-default bg-white"
      style={{ borderLeftColor: accent }}>
      <div className={`w-11 h-11 rounded-xl ${bg} ${text} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-black text-gray-800 leading-none">{value}</p>
        <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ──────────────────── Print ──────────────────── */
function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function printSubmission(s: Submission) {
  const f = `CAP-2026-${s.id.slice(-6).toUpperCase()}`;
  const fecha = new Date(s.timestamp).toLocaleString("es-MX", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const statusLabel = STATUS_OPTIONS.find((o) => o.value === (s.status ?? "pendiente"))?.label ?? "Pendiente";

  const row = (label: string, value: string, mono = false) =>
    `<tr><td class="label">${escHtml(label)}</td><td class="${mono ? "mono" : ""}">${escHtml(value)}</td></tr>`;

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Solicitud ${escHtml(f)} — RegulaTierra</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;padding:28px}
  .header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #6e112c}
  .org{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px}
  .title{font-size:18px;font-weight:700;color:#6e112c}
  .folio-box{background:#6e112c;color:#fff;padding:8px 18px;border-radius:8px;text-align:center}
  .folio-lbl{font-size:9px;letter-spacing:.1em;text-transform:uppercase;opacity:.7;margin-bottom:2px}
  .folio-num{font-family:monospace;font-size:17px;font-weight:700;letter-spacing:.1em}
  .status{display:inline-block;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;background:#f3f4f6;color:#444;margin-bottom:18px}
  h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#888;margin:16px 0 6px}
  table{width:100%;border-collapse:collapse;margin-bottom:4px}
  td{padding:6px 4px;border-bottom:1px solid #eee;vertical-align:top}
  td.label{color:#888;font-size:11px;width:38%;white-space:nowrap}
  td.mono{font-family:monospace;font-size:11px;word-break:break-all}
  .footer{margin-top:32px;padding-top:14px;border-top:1px solid #ddd;display:flex;justify-content:space-between;font-size:11px;color:#999}
  .sign{margin-top:36px;display:flex;gap:40px}
  .sign-box{flex:1;border-top:1px solid #888;padding-top:4px;font-size:11px;color:#888;text-align:center}
  @media print{button{display:none!important}}
</style></head><body>
<div class="header">
  <div>
    <div class="org">Contraloría Municipal · Ixmiquilpan</div>
    <div class="title">Solicitud de Regularización de Tierras</div>
    <div class="org" style="margin-top:3px">Capula 2026</div>
  </div>
  <div class="folio-box">
    <div class="folio-lbl">Folio</div>
    <div class="folio-num">${escHtml(f)}</div>
  </div>
</div>
<span class="status">Estado: ${escHtml(statusLabel)}</span>
<h2>Datos del solicitante</h2>
<table>
  ${row("Nombre completo", s.nombreCompleto)}
  ${row("CURP", s.curp, true)}
  ${row("Celular", s.celular)}
</table>
<h2>Datos del polígono</h2>
<table>
  ${row("Comunidad", s.comunidad)}
  ${row("Predio", s.predio)}
  ${row("Polígono", s.lote)}
  ${row("Tipo de tierra", s.tipoTierra === "riego" ? "Riego" : "Temporal")}
  ${row("Superficie", `${s.superficie} m²`)}
  ${row("Habla ñhañhu", s.hablaDialecto === "si" ? "Sí" : "No")}
</table>
<h2>Ubicación</h2>
<table>
  ${row("Dirección / referencia", s.ubicacion)}
  ${s.lat && s.lng ? row("Coordenadas", `${s.lat.toFixed(6)}, ${s.lng.toFixed(6)}`) : ""}
</table>
<div class="sign">
  <div class="sign-box">Firma del solicitante</div>
  <div class="sign-box">Sello y firma del funcionario</div>
</div>
<div class="footer">
  <span>Registrado: ${escHtml(fecha)}</span>
  <span>Folio: ${escHtml(f)}</span>
</div>
<script>window.onload=()=>{window.print()}<\/script>
</body></html>`;

  const w = window.open("about:blank", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

/* ──────────────────── Print resumen por comunidad ──────────────────── */
function printCommunitySummary(submissions: Submission[]) {
  const now = new Date().toLocaleString("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const COMMS = ["San Pedro Capula", "Capula Centro", "La Huerta de Capula"];

  function stats(subs: Submission[]) {
    const total     = subs.length;
    const pendiente = subs.filter((s) => (s.status ?? "pendiente") === "pendiente").length;
    const revision  = subs.filter((s) => s.status === "revision").length;
    const aprobado  = subs.filter((s) => s.status === "aprobado").length;
    const rechazado = subs.filter((s) => s.status === "rechazado").length;
    const superficie = subs.reduce((a, s) => a + parseFloat(s.superficie || "0"), 0);
    const riego     = subs.filter((s) => s.tipoTierra === "riego").length;
    const temporal  = subs.filter((s) => s.tipoTierra === "temporal").length;
    const dialecto  = subs.filter((s) => s.hablaDialecto === "si").length;
    const pct = (n: number) => total > 0 ? ` (${Math.round((n / total) * 100)}%)` : "";
    return { total, pendiente, revision, aprobado, rechazado, superficie, riego, temporal, dialecto, pct };
  }

  const byComm = COMMS.map((c) => ({ nombre: c, ...stats(submissions.filter((s) => s.comunidad === c)) }));
  const tot    = stats(submissions);

  const tr = (d: typeof byComm[0], cls = "") => `
    <tr class="${cls}">
      <td class="comm">${escHtml(d.nombre)}</td>
      <td class="n">${d.total}</td>
      <td class="n pend">${d.pendiente}</td>
      <td class="n rev">${d.revision}</td>
      <td class="n apro">${d.aprobado}</td>
      <td class="n rech">${d.rechazado}</td>
      <td class="n">${d.superficie.toFixed(0)} m²</td>
      <td class="n">${d.riego}${d.pct(d.riego)}</td>
      <td class="n">${d.temporal}${d.pct(d.temporal)}</td>
      <td class="n">${d.dialecto}${d.pct(d.dialecto)}</td>
    </tr>`;

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Resumen por Comunidad — RegulaTierra Capula 2026</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:11.5px;color:#111;padding:28px}
  .hdr{border-bottom:3px solid #6e112c;padding-bottom:12px;margin-bottom:18px}
  .org{font-size:9.5px;color:#888;text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px}
  .tit{font-size:18px;font-weight:800;color:#6e112c;margin-bottom:2px}
  .sub{font-size:9.5px;color:#888}
  table{width:100%;border-collapse:collapse}
  th{background:#6e112c;color:#fff;padding:7px 5px;font-size:9px;text-transform:uppercase;letter-spacing:.05em;text-align:center}
  th:first-child{text-align:left}
  td{padding:7px 5px;border-bottom:1px solid #eee;vertical-align:middle}
  td.comm{font-weight:700;font-size:11px}
  td.n{text-align:center;font-size:10.5px}
  td.pend{color:#78350f}
  td.rev{color:#92400e}
  td.apro{color:#065f46;font-weight:700}
  td.rech{color:#7f1d1d}
  tr.total{background:#fdf1f4;border-top:2px solid #6e112c}
  tr.total td{font-weight:800}
  tr:hover{background:#fafafa}
  .footer{margin-top:20px;padding-top:10px;border-top:1px solid #ddd;font-size:9px;color:#999;display:flex;justify-content:space-between}
  @media print{@page{margin:15mm}button{display:none!important}body{padding:0}}
</style></head><body>
<div class="hdr">
  <div class="org">Contraloría Municipal · Ixmiquilpan · Regularización de Tierras Capula 2026</div>
  <div class="tit">Resumen por Comunidad</div>
  <div class="sub">Generado: ${escHtml(now)} &nbsp;·&nbsp; Total: ${tot.total} solicitudes &nbsp;·&nbsp; Superficie: ${tot.superficie.toFixed(0)} m²</div>
</div>
<table>
  <thead><tr>
    <th>Comunidad</th>
    <th>Total</th><th>Pendiente</th><th>Revisión</th><th>Aprobado</th><th>Rechazado</th>
    <th>Sup. (m²)</th><th>Riego</th><th>Temporal</th><th>Habla Ñhañhu</th>
  </tr></thead>
  <tbody>
    ${byComm.map((d) => tr(d)).join("")}
    ${tr({ nombre: "TOTAL GENERAL", ...tot }, "total")}
  </tbody>
</table>
<div class="footer">
  <span>RegulaTierra — Contraloría Municipal de Ixmiquilpan</span>
  <span>${escHtml(now)}</span>
</div>
<script>window.onload=()=>{window.print()}<\/script>
</body></html>`;

  const w = window.open("about:blank", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

function printLoteReport(
  lote: Pick<Lote, "id" | "nombre" | "color" | "fillColor" | "loteNum" | "predioNum">,
  items: Submission[]
) {
  const loteObj = LOTES.find((l) => l.loteNum === lote.loteNum);
  const date = new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });

  let svgMap = "";
  if (loteObj) {
    const W = 560, H = 300, PAD = 24;
    const coords = loteObj.coords;
    const lats = coords.map((c) => c[0]);
    const lngs = coords.map((c) => c[1]);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const ranLat = maxLat - minLat || 0.0001;
    const ranLng = maxLng - minLng || 0.0001;
    const scaleX = (W - 2 * PAD) / ranLng;
    const scaleY = (H - 2 * PAD) / ranLat;
    const scale = Math.min(scaleX, scaleY);
    const offX = PAD + ((W - 2 * PAD) - ranLng * scale) / 2;
    const offY = PAD + ((H - 2 * PAD) - ranLat * scale) / 2;
    const toXY = (lat: number, lng: number): [number, number] => [
      offX + (lng - minLng) * scale,
      H - offY - (lat - minLat) * scale,
    ];
    const polyPts = coords.map(([lat, lng]) => toXY(lat, lng).map((v) => v.toFixed(1)).join(",")).join(" ");
    const SC: Record<string, string> = { pendiente: "#6b7280", revision: "#f59e0b", aprobado: "#10b981", rechazado: "#ef4444" };
    const markers = items.map((s) => {
      const [mlat, mlng] = (s.lat && s.lng) ? [s.lat, s.lng] : loteObj.centroid;
      const [x, y] = toXY(mlat, mlng);
      const c = SC[s.status ?? "pendiente"] ?? SC.pendiente;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="${c}" stroke="white" stroke-width="2.5" opacity="0.9"/>`;
    }).join("");
    svgMap = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;margin:auto">
      <rect width="${W}" height="${H}" rx="8" fill="#e8edf3"/>
      <polygon points="${polyPts}" fill="${lote.fillColor}55" stroke="${lote.color}" stroke-width="2.5" stroke-linejoin="round"/>
      ${markers}
      <text x="${W - 18}" y="22" font-size="11" text-anchor="middle" fill="#444" font-family="system-ui,sans-serif" font-weight="bold">N</text>
      <path d="M${W - 18},26 L${W - 21},36 L${W - 18},34 L${W - 15},36 Z" fill="#444"/>
    </svg>`;
  }

  const SL: Record<string, string> = { pendiente: "Pendiente", revision: "En revisión", aprobado: "Aprobado", rechazado: "Rechazado" };
  const SC2: Record<string, string> = { pendiente: "#6b7280", revision: "#d97706", aprobado: "#059669", rechazado: "#dc2626" };
  const totalSup = items.reduce((a, s) => a + parseFloat(s.superficie || "0"), 0);
  const riego = items.filter((s) => s.tipoTierra === "riego").length;
  const temporal = items.length - riego;
  const rows = items.map((s, i) => `<tr style="background:${i % 2 === 0 ? "#fff" : "#f9fafb"}">
    <td>${i + 1}</td>
    <td><strong>${escHtml(s.nombreCompleto)}</strong></td>
    <td>${escHtml(s.comunidad)}</td>
    <td style="font-family:monospace;font-size:9px">${escHtml(s.curp)}</td>
    <td>${escHtml(s.celular.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3"))}</td>
    <td>${escHtml(s.superficie)} m²</td>
    <td>${s.tipoTierra === "riego" ? "Riego" : "Temporal"}</td>
    <td style="color:${SC2[s.status ?? "pendiente"]};font-weight:700">${SL[s.status ?? "pendiente"] ?? "—"}</td>
  </tr>`).join("");

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
  <title>Polígono ${lote.loteNum} — Capula 2026</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,-apple-system,sans-serif;font-size:11px;color:#111;padding:28px 32px;background:#fff}h1{font-size:18px;font-weight:900;color:#370916}h2{font-size:11px;font-weight:700;color:#6e112c;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #6e112c}.stats{display:flex;gap:14px;margin:14px 0 18px;flex-wrap:wrap}.stat{background:#f3f4f6;border-radius:8px;padding:8px 14px;min-width:80px}.stat-n{font-size:22px;font-weight:900;color:#111;line-height:1}.stat-l{font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin-top:2px}.map-wrap{border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:14px}table{width:100%;border-collapse:collapse;margin-top:6px}th{background:#370916;color:#fff;padding:6px 8px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em}td{padding:5px 8px;border-bottom:1px solid #f3f4f6;font-size:10.5px;vertical-align:top}.legend{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px}.leg-item{display:flex;align-items:center;gap:5px;font-size:10px;color:#555}.leg-dot{width:10px;height:10px;border-radius:50%;border:1.5px solid white;box-shadow:0 0 0 1px #0002}.footer{margin-top:18px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af;display:flex;justify-content:space-between}@media print{button{display:none!important}@page{margin:1cm}}</style>
  </head><body>
  <div class="header">
    <div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <div style="width:14px;height:14px;border-radius:4px;background:${lote.fillColor};border:2px solid ${lote.color};flex-shrink:0"></div>
        <h1>Polígono ${lote.loteNum}</h1>
      </div>
      <p style="color:#374151;font-size:12px">${escHtml(lote.nombre)}</p>
      <p style="color:#9ca3af;font-size:10px;margin-top:2px">Predio ${escHtml(lote.predioNum)} · Regularización Capula 2026</p>
    </div>
    <div style="text-align:right">
      <p style="font-size:9px;color:#9ca3af">Impreso el ${date}</p>
      <p style="font-size:9px;color:#9ca3af;margin-top:2px">Contraloría Municipal · Ixmiquilpan</p>
      <button onclick="window.print()" style="margin-top:8px;padding:5px 12px;background:#6e112c;color:#fff;border:none;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer">Imprimir</button>
    </div>
  </div>
  <div class="stats">
    <div class="stat"><div class="stat-n">${items.length}</div><div class="stat-l">Solicitudes</div></div>
    <div class="stat"><div class="stat-n">${totalSup.toFixed(0)}</div><div class="stat-l">m² totales</div></div>
    <div class="stat"><div class="stat-n">${riego}</div><div class="stat-l">Riego</div></div>
    <div class="stat"><div class="stat-n">${temporal}</div><div class="stat-l">Temporal</div></div>
    <div class="stat"><div class="stat-n">${items.filter((s) => (s.status ?? "pendiente") === "aprobado").length}</div><div class="stat-l">Aprobados</div></div>
    <div class="stat"><div class="stat-n">${items.filter((s) => (s.status ?? "pendiente") === "pendiente").length}</div><div class="stat-l">Pendientes</div></div>
  </div>
  ${svgMap ? `<div class="map-wrap">${svgMap}</div>` : ""}
  <div class="legend">
    <span style="font-size:10px;font-weight:700;color:#374151;margin-right:4px">Marcadores:</span>
    <div class="leg-item"><div class="leg-dot" style="background:#6b7280"></div>Pendiente</div>
    <div class="leg-item"><div class="leg-dot" style="background:#f59e0b"></div>En revisión</div>
    <div class="leg-item"><div class="leg-dot" style="background:#10b981"></div>Aprobado</div>
    <div class="leg-item"><div class="leg-dot" style="background:#ef4444"></div>Rechazado</div>
  </div>
  <h2>Registro de solicitantes</h2>
  <table><thead><tr><th>#</th><th>Nombre</th><th>Comunidad</th><th>CURP</th><th>Celular</th><th>Superficie</th><th>Tipo</th><th>Estado</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div class="footer"><span>Documento generado automáticamente · RegulaTierra Capula 2026</span><span>Total: ${items.length} solicitudes · ${totalSup.toFixed(1)} m²</span></div>
  </body></html>`;

  const win = window.open("", "_blank", "width=920,height=700");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

type HistoryEntry = { id: number; status: string; motivo: string | null; created_at: string };

/* ──────────────────── Detail modal ──────────────────── */
function DetailModal({ s, onClose, onStatusChange, onSaveNotes, onDelete, isArchivedView, onRestore }: {
  s: Submission;
  onClose: () => void;
  onStatusChange: (id: string, status: string, extras?: { motivoRechazo?: string }) => Promise<void>;
  onSaveNotes: (id: string, notas: string) => Promise<void>;
  onDelete: (id: string) => void;
  isArchivedView: boolean;
  onRestore: (id: string) => void;
}) {
  const [status,        setStatus]       = useState(s.status ?? "pendiente");
  const [saving,        setSaving]       = useState(false);
  const [lightbox,      setLightbox]     = useState<string | null>(null);
  const [copied,        setCopied]       = useState(false);
  const [copiedCurp,    setCopiedCurp]   = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState(s.motivoRechazo ?? "");
  const [notasLocal,    setNotasLocal]   = useState(s.notas ?? "");
  const [history,       setHistory]      = useState<HistoryEntry[]>([]);
  const [justChanged,   setJustChanged]  = useState<string | null>(null);
  const notasTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const motivoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (lightbox) setLightbox(null); else onClose(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, lightbox]);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
  useEffect(() => {
    fetch(`/api/submissions/history?id=${s.id}`)
      .then((r) => r.json())
      .then((d: HistoryEntry[]) => setHistory(d))
      .catch(() => {});
  }, [s.id]);

  function handleNotasChange(v: string) {
    setNotasLocal(v);
    if (notasTimer.current) clearTimeout(notasTimer.current);
    notasTimer.current = setTimeout(() => onSaveNotes(s.id, v), 1200);
  }

  function handleMotivoChange(v: string) {
    setMotivoRechazo(v);
    if (motivoTimer.current) clearTimeout(motivoTimer.current);
    motivoTimer.current = setTimeout(() => onStatusChange(s.id, "rechazado", { motivoRechazo: v }), 1200);
  }

  async function changeStatus(v: string) {
    if (motivoTimer.current) clearTimeout(motivoTimer.current);
    setSaving(true);
    setStatus(v);
    if (v !== "rechazado") setMotivoRechazo("");
    await onStatusChange(s.id, v, v === "rechazado" ? { motivoRechazo } : undefined);
    // Recargar historial
    fetch(`/api/submissions/history?id=${s.id}`)
      .then((r) => r.json())
      .then((d: HistoryEntry[]) => setHistory(d))
      .catch(() => {});
    if (v === "aprobado" || v === "rechazado") setJustChanged(v);
    setSaving(false);
  }

  const waUrl   = `https://wa.me/52${s.celular}`;
  const mapsUrl = s.lat && s.lng ? `https://maps.google.com/?q=${s.lat},${s.lng}` : null;

  const photos = [
    { path: s.fotoCasaUrl,         label: "Foto de casa" },
    { path: s.fotoINEFrenteUrl,    label: "INE frente" },
    { path: s.fotoINEAtrasUrl,     label: "INE reverso" },
    { path: s.fotoPredioNorteUrl,  label: "Predio Norte" },
    { path: s.fotoPredioSurUrl,    label: "Predio Sur" },
    { path: s.fotoPredioEsteUrl,   label: "Predio Este" },
    { path: s.fotoPredioOesteUrl,  label: "Predio Oeste" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={`Solicitud de ${s.nombreCompleto}`}
        className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col modal-scroll">

        {/* Header */}
        <div className="text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm"
          style={{ background: "linear-gradient(135deg,#370916 0%,#6e112c 75%,#8b1438 100%)" }}>
          <button onClick={onClose} aria-label="Cerrar"
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
          {(() => { const av = avatarCls(s.nombreCompleto); return (
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 select-none border-2 border-white/30 ${av.bg} ${av.text}`}>
              {initials(s.nombreCompleto)}
            </div>
          ); })()}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-none truncate">{s.nombreCompleto}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <p className="text-white/50 text-[11px] font-mono">{folio(s.id)}</p>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(folio(s.id)).catch(() => {});
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="text-white/40 hover:text-white/80 transition-colors shrink-0"
                title="Copiar folio">
                {copied ? <Check className="w-3 h-3 text-emerald-300" strokeWidth={2.5} /> : <Copy className="w-3 h-3" strokeWidth={2} />}
              </button>
              <span className="text-white/30 text-[10px]">·</span>
              <span className="text-white/50 text-[11px]">{s.comunidad}</span>
              <span className="text-white/30 text-[10px]">·</span>
              <span className="text-white/50 text-[11px]">{s.superficie} m²</span>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${statusCls(s.status)}`}>
            {statusLabel(s.status)}
          </span>
          {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />}
        </div>

        <div className="p-5 space-y-6 flex-1">

          {/* Estado */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Estado del trámite</p>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((o) => {
                const Icon = o.value === "pendiente" ? Clock : o.value === "revision" ? RefreshCw : o.value === "aprobado" ? Check : X;
                const active = status === o.value;
                return (
                  <button key={o.value} onClick={() => changeStatus(o.value)}
                    aria-pressed={active}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                      active ? `${o.cls} border-current shadow-sm` : "bg-white text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600"
                    }`}>
                    <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={active ? 2.5 : 2} />
                    {o.label}
                  </button>
                );
              })}
            </div>
            {status === "rechazado" && (
              <div className="mt-3">
                <label className="text-[10px] font-bold text-red-400 uppercase tracking-widest block mb-1.5">
                  Motivo del rechazo
                </label>
                <textarea
                  value={motivoRechazo}
                  onChange={(e) => handleMotivoChange(e.target.value)}
                  placeholder="Describe el motivo del rechazo para informar al ciudadano…"
                  rows={2}
                  className="w-full text-sm border border-red-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-300 bg-red-50/50 resize-none"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">Se guarda automáticamente · Visible para el ciudadano</p>
              </div>
            )}
            {justChanged && (
              <div className="mt-3 rounded-2xl overflow-hidden shadow-sm"
                style={{ background: "linear-gradient(135deg,#064e3b 0%,#065f46 100%)" }}>
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white">
                      {justChanged === "aprobado" ? "¡Solicitud aprobada!" : "Solicitud rechazada"}
                    </p>
                    <p className="text-[11px] text-emerald-200 mt-0.5">Notifica al ciudadano por WhatsApp</p>
                  </div>
                  <a
                    href={`https://wa.me/52${s.celular}?text=${encodeURIComponent(
                      justChanged === "aprobado"
                        ? `Estimado/a ${s.nombreCompleto.split(" ")[0]}, su solicitud de regularización de tierras (folio ${folio(s.id)}) fue APROBADA. Favor de acudir a la Contraloría Municipal con su folio para recoger su documentación. — Contraloría Municipal de Ixmiquilpan`
                        : `Estimado/a ${s.nombreCompleto.split(" ")[0]}, su solicitud de regularización de tierras (folio ${folio(s.id)}) no pudo ser aprobada en esta etapa${motivoRechazo ? `: ${motivoRechazo}` : ""}. Favor de acudir a la ventanilla municipal para más información. — Contraloría Municipal de Ixmiquilpan`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setJustChanged(null)}
                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 bg-white hover:bg-emerald-50 px-3 py-2 rounded-xl transition-colors shrink-0 shadow-sm"
                  >
                    <MessageCircle className="w-3.5 h-3.5" strokeWidth={2.5} /> Enviar
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Fotos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fotografías</p>
              <span className="text-[10px] text-gray-300">{photos.filter(p => p.path).length}/{photos.length} subidas</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {photos.map(({ path, label }) => {
                const src = photoSrc(path);
                return (
                  <div key={label}>
                    {src ? (
                      <button onClick={() => setLightbox(src)} className="block w-full group">
                        <div className="relative h-28 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 shadow-sm">
                          <Image src={src} alt={label} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-end pb-2">
                            <ZoomIn className="w-4 h-4 text-white" strokeWidth={2} />
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-500 font-medium text-center mt-1 truncate px-1">{label}</p>
                      </button>
                    ) : (
                      <div>
                        <div className="h-28 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center bg-gray-50/60 gap-1">
                          <div className="w-7 h-7 rounded-xl bg-gray-100 flex items-center justify-center">
                            <ZoomIn className="w-3.5 h-3.5 text-gray-300" strokeWidth={2} />
                          </div>
                          <p className="text-[9px] text-gray-300 font-medium">Sin foto</p>
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium text-center mt-1 truncate px-1">{label}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Datos del predio */}
          <InfoSection title="Datos del polígono">
            <InfoRow label="Comunidad"  value={s.comunidad} />
            <InfoRow label="Predio"     value={s.predio} />
            <InfoRow label="Polígono"   value={s.lote} mono />
            <InfoRow label="Superficie" value={`${s.superficie} m²`} />
            <div className="flex items-center justify-between py-2.5 border-b border-gray-100/80 last:border-0 gap-3">
              <span className="text-xs text-gray-400 font-medium shrink-0">Tipo</span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.tipoTierra === "riego" ? "bg-blue-50 text-blue-700" : "bg-sky-50 text-sky-700"}`}>
                {s.tipoTierra === "riego" ? "Riego" : "Temporal"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5 border-b border-gray-100/80 last:border-0 gap-3">
              <span className="text-xs text-gray-400 font-medium shrink-0">Habla ñhañhu</span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.hablaDialecto === "si" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                {s.hablaDialecto === "si" ? "Sí" : "No"}
              </span>
            </div>
          </InfoSection>

          {/* Datos personales */}
          <InfoSection title="Datos personales">
            <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
              <span className="text-xs text-gray-400 font-medium shrink-0">CURP</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-700 font-mono break-all text-right">{s.curp}</span>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(s.curp).catch(() => {});
                    setCopiedCurp(true);
                    setTimeout(() => setCopiedCurp(false), 2000);
                  }}
                  className="text-gray-300 hover:text-guinda-600 transition-colors shrink-0"
                  aria-label="Copiar CURP" title="Copiar CURP">
                  {copiedCurp ? <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2.5} /> : <Copy className="w-3.5 h-3.5" strokeWidth={2} />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
              <span className="text-xs text-gray-400 font-medium">Celular</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">{s.celular}</span>
                <a href={waUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition-colors">
                  <MessageCircle className="w-3 h-3" strokeWidth={2} /> WhatsApp
                </a>
              </div>
            </div>
          </InfoSection>

          {/* Ubicación */}
          <InfoSection title="Ubicación">
            <InfoRow label="Dirección" value={s.ubicacion} />
            {mapsUrl && (
              <div className="pt-2 pb-1">
                <a href={mapsUrl} target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2.5 rounded-xl transition-colors w-full">
                  <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} /> Ver en Google Maps
                </a>
              </div>
            )}
          </InfoSection>

          {/* Notas del funcionario */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Notas internas</p>
              <span className="text-[10px] text-gray-300 font-medium">Solo admin</span>
            </div>
            <textarea
              value={notasLocal}
              onChange={(e) => handleNotasChange(e.target.value)}
              placeholder="Notas internas sobre esta solicitud…"
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-guinda-200 focus:border-guinda-300 bg-gray-50/80 resize-none transition-all"
            />
            <p className="text-[10px] text-gray-300 mt-0.5">Se guarda automáticamente</p>
          </div>

          {/* Historial de estados — timeline */}
          {history.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Historial de estados</p>
              <div className="relative">
                <div className="absolute left-[11px] top-3 bottom-3 w-px bg-gray-100" />
                <ol role="list" className="space-y-0">
                  {history.map((h, idx) => {
                    const opt = STATUS_OPTIONS.find((o) => o.value === h.status);
                    const dotCls = ({ pendiente: "bg-gray-300 border-gray-200", revision: "bg-yellow-400 border-yellow-200", aprobado: "bg-emerald-400 border-emerald-200", rechazado: "bg-red-400 border-red-200" } as Record<string,string>)[h.status] ?? "bg-gray-300 border-gray-200";
                    return (
                      <li key={h.id} role="listitem" className={`flex items-start gap-3 ${idx < history.length - 1 ? "pb-4" : ""}`}>
                        <div className={`w-5 h-5 rounded-full shrink-0 mt-0.5 border-2 bg-white flex items-center justify-center z-10 ${dotCls}`}>
                          <div className={`w-2 h-2 rounded-full ${dotCls.split(" ")[0]}`} />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${opt?.cls ?? "bg-gray-100 text-gray-600"}`}>
                              {opt?.label ?? h.status}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(h.created_at).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          {h.motivo && (
                            <p className="text-xs text-gray-500 leading-relaxed bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5 mt-1">{h.motivo}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 py-1">
            <div className="h-px flex-1 bg-gray-100" />
            <p className="text-[10px] text-gray-300 shrink-0">
              {new Date(s.timestamp).toLocaleString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
            <div className="h-px flex-1 bg-gray-100" />
          </div>
        </div>

        {/* Lightbox */}
        {lightbox && (
          <div className="fixed inset-0 z-[70] bg-black/92 flex flex-col items-center justify-center p-4 gap-3" onClick={() => setLightbox(null)}>
            <button onClick={() => setLightbox(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
              <X className="w-5 h-5 text-white" strokeWidth={2} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox} alt="Fotografía" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
            <p className="text-white/40 text-xs">Toca fuera de la imagen o presiona ESC para cerrar</p>
          </div>
        )}

        {/* Acciones */}
        <div className="p-4 border-t border-gray-100 shrink-0 bg-gray-50/60">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <Link href={`/consulta/${folio(s.id)}`} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-1.5 text-guinda-700 hover:text-guinda-900 bg-white hover:bg-guinda-50 border border-gray-200 hover:border-guinda-200 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-sm">
              <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} /> Consulta pública
            </Link>
            <button onClick={() => printSubmission(s)}
              className="flex items-center justify-center gap-1.5 text-guinda-700 hover:text-guinda-900 bg-white hover:bg-guinda-50 border border-gray-200 hover:border-guinda-200 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-sm">
              <Printer className="w-3.5 h-3.5" strokeWidth={2} /> Imprimir PDF
            </button>
          </div>
          {isArchivedView ? (
            <button onClick={() => onRestore(s.id)}
              className="w-full flex items-center justify-center gap-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 py-2.5 rounded-xl text-sm font-semibold transition-all">
              <ArchiveRestore className="w-4 h-4" strokeWidth={2} /> Restaurar registro
            </button>
          ) : (
            <button onClick={() => onDelete(s.id)}
              className="w-full flex items-center justify-center gap-2 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 py-2.5 rounded-xl text-sm font-semibold transition-all">
              <Archive className="w-4 h-4" strokeWidth={2} /> Archivar registro
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{title}</p>
      <div className="bg-gray-50/80 border border-gray-100 rounded-2xl px-4 divide-y divide-gray-100/80">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between py-2.5 gap-3 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-400 font-medium shrink-0">{label}</span>
      <span className={`text-sm text-gray-700 text-right ${mono ? "font-mono text-xs break-all" : ""}`}>{value}</span>
    </div>
  );
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();
}
const AVATAR_PALETTES = [
  { bg: "bg-guinda-100", text: "text-guinda-700" },
  { bg: "bg-blue-100",   text: "text-blue-700"   },
  { bg: "bg-emerald-100",text: "text-emerald-700" },
  { bg: "bg-amber-100",  text: "text-amber-700"  },
  { bg: "bg-violet-100", text: "text-violet-700" },
] as const;
function avatarCls(name: string) {
  return AVATAR_PALETTES[(name.charCodeAt(0) ?? 0) % AVATAR_PALETTES.length];
}

function getPageNumbers(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, null, total];
  if (current >= total - 3) return [1, null, total - 4, total - 3, total - 2, total - 1, total];
  return [1, null, current - 1, current, current + 1, null, total];
}

/* ──────────────────── Admin principal ──────────────────── */
export default function AdminPage() {
  useEffect(() => { document.title = "Panel Administrativo · Capula 2026"; }, []);
  const [authed,          setAuthed]          = useState(false);
  const [checkingAuth,    setCheckingAuth]    = useState(true);
  const [email,           setEmail]           = useState("");
  const [pw,              setPw]              = useState("");
  const [loginLoading,    setLoginLoading]    = useState(false);
  const [loginError,      setLoginError]      = useState(false);
  const [loginBlocked,    setLoginBlocked]    = useState(false);
  const [loginRemaining,  setLoginRemaining]  = useState<number | null>(null);
  const [sessionExpired,  setSessionExpired]  = useState(false);
  const [submissions,     setSubmissions]     = useState<Submission[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [fetchError,      setFetchError]      = useState<string | null>(null);
  const [search,          setSearch]          = useState(() => typeof window !== "undefined" ? (localStorage.getItem("adm-search") ?? "")  : "");
  const [filterComunidad, setFilterComunidad] = useState(() => typeof window !== "undefined" ? (localStorage.getItem("adm-comunidad") ?? "") : "");
  const [filterStatus,    setFilterStatus]    = useState(() => typeof window !== "undefined" ? (localStorage.getItem("adm-status") ?? "")    : "");
  const [page,            setPage]            = useState(1);
  const [selected,        setSelected]        = useState<Submission | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeTab,       setActiveTab]       = useState<"mapa" | "graficas" | "lotes" | "tabla">("tabla");
  const [mountedTabs,     setMountedTabs]     = useState(new Set<string>(["tabla"]));
  const [toast,           setToast]           = useState<{ msg: string; ok: boolean } | null>(null);
  const [lastUpdated,     setLastUpdated]     = useState<Date | null>(null);
  const [sortKey,         setSortKey]         = useState<keyof Submission>("timestamp");
  const [sortDir,         setSortDir]         = useState<"asc" | "desc">("desc");
  const [filterPeriod,    setFilterPeriod]    = useState(() => typeof window !== "undefined" ? (localStorage.getItem("adm-period") ?? "") : "");
  const [selectedIds,  setSelectedIds]  = useState(new Set<string>());
  const [bulkStatus,   setBulkStatus]   = useState("");
  const [bulkSaving,   setBulkSaving]   = useState(false);
  const toastTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetching     = useRef(false);
  const [tableData,    setTableData]    = useState<Submission[]>([]);
  const [tableTotal,   setTableTotal]   = useState(0);
  const isFetchingPage = useRef(false);
  const tableParamsRef = useRef({ page: 1, search: "", filterComunidad: "", filterStatus: "", filterPeriod: "", sortKey: "timestamp" as keyof Submission, sortDir: "desc" as "asc" | "desc", showArchived: false });
  const tableRef       = useRef<HTMLDivElement>(null);
  const skipPageScroll = useRef(true);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [draftSearch,  setDraftSearch]  = useState(() => typeof window !== "undefined" ? (localStorage.getItem("adm-search") ?? "") : "");
  const searchTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showArchived,  setShowArchived] = useState(false);

  function handleSearch(v: string) {
    setDraftSearch(v);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearch(v);
      setPage(1);
      skipPageScroll.current = true;
    }, 350);
  }

  function clearFilters() {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setDraftSearch("");
    setSearch("");
    setFilterComunidad("");
    setFilterStatus("");
    setFilterPeriod("");
    setPage(1);
    skipPageScroll.current = true;
    ["adm-search", "adm-comunidad", "adm-status", "adm-period"].forEach((k) => localStorage.removeItem(k));
  }

  function toggleSort(key: keyof Submission) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  }

  function showToast(msg: string, ok = true) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, ok });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  function changeTab(tab: "mapa" | "graficas" | "lotes" | "tabla") {
    setMountedTabs(prev => new Set([...prev, tab]));
    setActiveTab(tab);
    if (tab === "graficas") setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
  }

  const fetchData = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch("/api/submissions", { signal: controller.signal });
      if (res.status === 401) {
        fetch("/api/auth", { method: "DELETE" });
        sessionStorage.removeItem("admin-ok");
        setAuthed(false);
        setSubmissions([]);
        setSessionExpired(true);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: string } | null;
        setFetchError(body?.error ?? `Error ${res.status} al cargar registros. Intenta de nuevo.`);
        return;
      }
      setFetchError(null);
      const data = await res.json().catch(() => null) as Submission[] | null;
      if (data) { setSubmissions(data); setLastUpdated(new Date()); }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setFetchError("La solicitud tardó demasiado. Verifica tu conexión e intenta de nuevo.");
      } else {
        setFetchError("Error de conexión. Verifica tu internet e intenta de nuevo.");
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      isFetching.current = false;
    }
  }, []);

  const fetchPage = useCallback(async (
    pg: number,
    s: string, cc: string, cs: string, cp: string,
    sk: keyof Submission, sd: "asc" | "desc",
    archived = false,
  ) => {
    if (isFetchingPage.current) return;
    isFetchingPage.current = true;
    try {
      const params = new URLSearchParams({ page: String(pg), limit: String(PAGE_SIZE), sortKey: sk as string, sortDir: sd });
      if (s)        params.set("search",    s);
      if (cc)       params.set("comunidad", cc);
      if (cs)       params.set("status",    cs);
      if (cp)       params.set("period",    cp);
      if (archived) params.set("archived",  "true");
      const res = await fetch(`/api/submissions?${params}`);
      if (!res.ok) return;
      const body = await res.json().catch(() => null) as { data: Submission[]; total: number } | null;
      if (!body) return;
      setTableData(body.data);
      setTableTotal(body.total);
    } catch { /* network */ }
    finally { isFetchingPage.current = false; }
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem("admin-ok") === "1") {
      setAuthed(true);
      setCheckingAuth(false);
      fetchData();
      return () => { isFetching.current = false; };
    }
    // sessionStorage cleared (nueva pestaña / reinicio) pero la cookie puede seguir válida
    fetch("/api/submissions")
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json() as Submission[];
          sessionStorage.setItem("admin-ok", "1");
          setSubmissions(data);
          setLastUpdated(new Date());
          setAuthed(true);
        }
        // 401 → mostrar pantalla de login (no cambiar authed)
      })
      .catch(() => {}) // error de red → mostrar login
      .finally(() => setCheckingAuth(false));
  }, [fetchData]);

  // Mantiene una referencia actualizada de los parámetros de tabla
  useEffect(() => {
    tableParamsRef.current = { page, search, filterComunidad, filterStatus, filterPeriod, sortKey, sortDir, showArchived };
  }, [page, search, filterComunidad, filterStatus, filterPeriod, sortKey, sortDir, showArchived]);

  // Persiste filtros en localStorage para sobrevivir recargas
  useEffect(() => {
    localStorage.setItem("adm-search",    search);
    localStorage.setItem("adm-comunidad", filterComunidad);
    localStorage.setItem("adm-status",    filterStatus);
    localStorage.setItem("adm-period",    filterPeriod);
  }, [search, filterComunidad, filterStatus, filterPeriod]);

  // Re-fetch de tabla cuando cambian filtros, orden o página
  useEffect(() => {
    if (!authed) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPage(page, search, filterComunidad, filterStatus, filterPeriod, sortKey, sortDir, showArchived);
  }, [authed, page, search, filterComunidad, filterStatus, filterPeriod, sortKey, sortDir, showArchived, fetchPage]);

  // Polling periódico — más robusto que SSE en conexiones inestables
  useEffect(() => {
    if (!authed) return;

    function poll() {
      fetchData();
      const { page: pg, search: s, filterComunidad: cc, filterStatus: cs, filterPeriod: cp, sortKey: sk, sortDir: sd, showArchived: sa } = tableParamsRef.current;
      fetchPage(pg, s, cc, cs, cp, sk, sd, sa);
    }

    const interval = setInterval(poll, 30_000);
    const onVisible = () => { if (!document.hidden) poll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [authed, fetchData, fetchPage]);

  useEffect(() => {
    if (skipPageScroll.current) { skipPageScroll.current = false; return; }
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const tag = (e.target as HTMLElement).tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      e.preventDefault();
      setMountedTabs(prev => new Set([...prev, "tabla"]));
      setActiveTab("tabla");
      searchInputRef.current?.focus();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  async function login() {
    if (loginLoading || loginBlocked) return;
    setLoginLoading(true);
    setLoginError(false);
    setLoginBlocked(false);
    setLoginRemaining(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pw }),
      });
      if (res.ok) {
        sessionStorage.setItem("admin-ok", "1");
        setAuthed(true);
        fetchData();
      } else if (res.status === 429) {
        setLoginBlocked(true);
        setPw("");
      } else {
        const body = await res.json().catch(() => null) as { remaining?: number } | null;
        setLoginError(true);
        setLoginRemaining(body?.remaining ?? null);
        setPw("");
      }
    } catch {
      setLoginError(true);
    } finally {
      setLoginLoading(false);
    }
  }

  function logout() {
    fetch("/api/auth", { method: "DELETE" });
    sessionStorage.removeItem("admin-ok");
    setAuthed(false);
    setSubmissions([]);
  }

  async function deleteRow(id: string) {
    const res = await fetch("/api/submissions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) { showToast("No se pudo archivar. Intente de nuevo.", false); return; }
    showToast("Registro archivado.");
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
    setTableData((prev) => prev.filter((s) => s.id !== id));
    setTableTotal((prev) => Math.max(0, prev - 1));
    if (selected?.id === id) setSelected(null);
  }

  async function restoreRow(id: string) {
    const res = await fetch("/api/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, restore: true }),
    });
    if (!res.ok) { showToast("No se pudo restaurar. Intente de nuevo.", false); return; }
    showToast("Registro restaurado.");
    setTableData((prev) => prev.filter((s) => s.id !== id));
    setTableTotal((prev) => Math.max(0, prev - 1));
    if (selected?.id === id) setSelected(null);
  }

  async function updateStatus(id: string, status: string, extras?: { motivoRechazo?: string }) {
    const body: Record<string, unknown> = { id, status };
    if (extras?.motivoRechazo !== undefined) body.motivoRechazo = extras.motivoRechazo;
    const res = await fetch("/api/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) { showToast("No se pudo actualizar el estado.", false); return; }
    const patch = { status, ...(extras?.motivoRechazo !== undefined ? { motivoRechazo: extras.motivoRechazo } : {}) };
    setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s));
    setTableData((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s));
    setSelected((prev) => prev?.id === id ? { ...prev, ...patch } : prev);
    showToast(`Estado actualizado: ${STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status}`);
  }

  async function saveNotes(id: string, notas: string) {
    const res = await fetch("/api/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, notas }),
    });
    if (!res.ok) { showToast("No se pudo guardar la nota.", false); return; }
    setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, notas } : s));
    setSelected((prev) => prev?.id === id ? { ...prev, notas } : prev);
  }

  async function bulkUpdateStatus(status: string) {
    if (!status || selectedIds.size === 0) return;
    setBulkSaving(true);
    const ids = [...selectedIds];
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch("/api/submissions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status }),
        })
      )
    );
    const ok = results.filter((r) => r.status === "fulfilled" && (r.value as Response).ok).length;
    const fail = ids.length - ok;
    if (ok > 0) {
      setSubmissions((prev) => prev.map((s) => ids.includes(s.id) ? { ...s, status } : s));
      setTableData((prev) => prev.map((s) => ids.includes(s.id) ? { ...s, status } : s));
    }
    setSelectedIds(new Set());
    setBulkStatus("");
    setBulkSaving(false);
    if (fail > 0) showToast(`${ok} actualizados, ${fail} fallaron.`, false);
    else showToast(`${ok} registros actualizados a "${STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status}".`);
  }

  function exportCSV() {
    const headers = ["Folio", "Nombre", "Comunidad", "Celular", "CURP", "Predio", "Polígono",
      "Tipo", "Superficie (m²)", "Dialecto ñhañhu", "Estado", "Ubicación", "Fecha"];
    const rows = filtered.map((s) => [
      folio(s.id), s.nombreCompleto, s.comunidad, s.celular, s.curp, s.predio, s.lote,
      s.tipoTierra, s.superficie, s.hablaDialecto, statusLabel(s.status), s.ubicacion,
      new Date(s.timestamp).toLocaleDateString("es-MX"),
    ]);
    const sanitize = (v: string | number | undefined) => {
      const s = String(v ?? "").replace(/"/g, '""');
      return /^[=+\-@|]/.test(s) ? `'${s}` : s;
    };
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${sanitize(v)}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registros-capula-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportXLSX() {
    const XLSX = await import("xlsx");
    const headers = ["Folio", "Nombre", "Comunidad", "Celular", "CURP", "Predio", "Polígono",
      "Tipo", "Superficie (m²)", "Dialecto ñhañhu", "Estado", "Motivo rechazo", "Notas", "Ubicación", "Fecha"];
    const rows = filtered.map((s) => [
      folio(s.id), s.nombreCompleto, s.comunidad, s.celular, s.curp, s.predio ?? "", s.lote ?? "",
      s.tipoTierra, s.superficie, s.hablaDialecto, statusLabel(s.status),
      s.motivoRechazo ?? "", s.notas ?? "", s.ubicacion,
      new Date(s.timestamp).toLocaleDateString("es-MX"),
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Solicitudes");
    XLSX.writeFile(wb, `registros-capula-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  /* ── Filter ── */
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const filtered = useMemo(() => {
    const _now = new Date();
    return [...submissions]
      .filter((s) => {
        if (filterComunidad && s.comunidad !== filterComunidad) return false;
        if (filterStatus && s.status !== filterStatus) return false;
        if (filterPeriod) {
          const ts = new Date(s.timestamp);
          if (filterPeriod === "hoy" && ts.toDateString() !== _now.toDateString()) return false;
          if (filterPeriod === "semana") { const w = new Date(_now); w.setDate(_now.getDate() - 7); if (ts < w) return false; }
          if (filterPeriod === "mes" && (ts.getMonth() !== _now.getMonth() || ts.getFullYear() !== _now.getFullYear())) return false;
        }
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          s.nombreCompleto.toLowerCase().includes(q) ||
          s.comunidad.toLowerCase().includes(q) ||
          s.curp.toLowerCase().includes(q) ||
          s.celular.toLowerCase().includes(q) ||
          folio(s.id).toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const va = String(a[sortKey] ?? "");
        const vb = String(b[sortKey] ?? "");
        const cmp = va.localeCompare(vb, "es", { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [submissions, filterComunidad, filterStatus, filterPeriod, search, sortKey, sortDir]);

  /* ── Stats (usando filtered para reflejar filtros activos) ── */
  const conItemsCount = LOTES.filter((l) => l.loteNum && submissions.some((s) => s.lote === l.loteNum)).length;
  const total    = filtered.length;
  const withGps  = filtered.filter((s) => s.lat && s.lng);
  const riego    = filtered.filter((s) => s.tipoTierra === "riego").length;
  const temporal = filtered.filter((s) => s.tipoTierra === "temporal").length;
  const dialecto = filtered.filter((s) => s.hablaDialecto === "si").length;
  const totalSupRaw = filtered.reduce((a, s) => a + parseFloat(s.superficie || "0"), 0);
  const totalSup = totalSupRaw.toFixed(1);
  const avgSup   = total ? (totalSupRaw / total).toFixed(2) : "0";

  const byComunidad = COMUNIDADES.map((c) => ({
    name: c === "San Pedro Capula" ? "S.P. Capula" : c === "La Huerta de Capula" ? "La Huerta" : c,
    comunidad: c,
    solicitudes: submissions.filter((s) => s.comunidad === c).length,
  })).filter((d) => d.solicitudes > 0);

  const byLote = LOTES.filter((l) => l.loteNum).map((l) => ({
    name: l.loteNum,
    solicitudes: submissions.filter((s) => s.lote === l.loteNum).length,
    fill: l.fillColor,
  }));

  const pieTierra   = [{ name: "Riego", value: riego }, { name: "Temporal", value: temporal }];
  const pieDialecto = [{ name: "Habla", value: dialecto }, { name: "No habla", value: total - dialecto }];

  const byDay = useMemo(() => {
    const now = new Date();
    const map = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      map.set(d.toISOString().slice(0, 10), 0);
    }
    submissions.forEach((s) => {
      const key = s.timestamp.slice(0, 10);
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
    });
    return [...map.entries()].map(([iso, solicitudes]) => ({
      date: new Date(iso + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
      solicitudes,
    }));
  }, [submissions]);

  const totalPages = Math.max(1, Math.ceil(tableTotal / PAGE_SIZE));

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-guinda-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-guinda-600 animate-spin" strokeWidth={1.5} />
      </main>
    );
  }
  if (!authed) return <LoginScreen email={email} setEmail={setEmail} pw={pw} setPw={setPw} onLogin={login} loading={loginLoading} error={loginError} expired={sessionExpired} remaining={loginRemaining} blocked={loginBlocked} />;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg,#fdf1f4 0%,#f8f7f8 40%,#f1f5f9 100%)" }}>

      {/* Header */}
      <header className="text-white px-4 py-3.5 flex items-center gap-2.5 shadow-lg sticky top-0 z-30"
        style={{ background: "linear-gradient(135deg,#370916 0%,#6e112c 70%,#8b1438 100%)" }}>
        <Link href="/" aria-label="Ir al inicio"
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0">
          <ChevronLeft className="w-5 h-5" strokeWidth={2} />
        </Link>
        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center overflow-hidden shrink-0">
          <Image src="/logo.svg" alt="RegulaTierra" width={26} height={26} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-sm leading-none tracking-tight">Panel Administrativo</h1>
          <p className="text-white/50 text-[11px] mt-0.5 hidden sm:block">Regularización · Capula 2026</p>
        </div>
        {lastUpdated && (
          <div className="hidden md:flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-white/70 text-[11px] font-medium">
              {lastUpdated.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        )}
        <div className="w-px h-6 bg-white/15 mx-0.5 shrink-0" />
        <button
          onClick={() => {
            fetchData();
            const { page: pg, search: s, filterComunidad: cc, filterStatus: cs, filterPeriod: cp, sortKey: sk, sortDir: sd, showArchived: sa } = tableParamsRef.current;
            fetchPage(pg, s, cc, cs, cp, sk, sd, sa);
          }}
          title="Actualizar" aria-label="Actualizar registros"
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} strokeWidth={2} />
        </button>
        <button onClick={exportCSV} title="Exportar CSV" aria-label="Exportar a CSV"
          className="hidden sm:flex w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 items-center justify-center transition-colors">
          <Download className="w-4 h-4" strokeWidth={2} />
        </button>
        <button onClick={exportXLSX} title="Exportar Excel (.xlsx)" aria-label="Exportar a Excel"
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-emerald-300 hover:text-white">
          <FileText className="w-4 h-4" strokeWidth={2} />
        </button>
        <button onClick={() => printCommunitySummary(submissions)} title="Imprimir resumen por comunidad" aria-label="Imprimir resumen por comunidad"
          className="hidden sm:flex w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 items-center justify-center transition-colors text-blue-200 hover:text-white">
          <Printer className="w-4 h-4" strokeWidth={2} />
        </button>
        <div className="w-px h-6 bg-white/15 mx-0.5 shrink-0" />
        <button onClick={logout} title="Salir" aria-label="Cerrar sesión"
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-red-500/30 flex items-center justify-center transition-colors">
          <LogOut className="w-4 h-4" strokeWidth={2} />
        </button>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-5 space-y-5 admin-content">

        {/* Bienvenida */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-black text-gray-800 text-base leading-none">
                {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }).replace(/^\w/, c => c.toUpperCase())}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Contraloría Municipal · Ixmiquilpan</p>
            </div>
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400 shrink-0 md:hidden">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {lastUpdated.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
          </div>
          {total > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-gray-50">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-xs text-gray-500">
                  <span className="font-bold text-gray-700">{submissions.filter(s => s.status === "aprobado").length}</span> aprobados
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
                <span className="text-xs text-gray-500">
                  <span className="font-bold text-gray-700">{submissions.filter(s => (s.status ?? "pendiente") === "pendiente").length}</span> pendientes
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-guinda-400 shrink-0" />
                <span className="text-xs text-gray-500">
                  <span className="font-bold text-gray-700">{totalSup} m²</span> registradas
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Error de carga */}
        {fetchError && (
          <div role="alert" className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-center gap-3">
            <X className="w-5 h-5 text-red-500 shrink-0" strokeWidth={2} />
            <p className="text-sm text-red-700 font-medium flex-1">{fetchError}</p>
            <button onClick={fetchData}
              className="text-xs font-semibold text-red-600 hover:text-red-800 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors shrink-0">
              Reintentar
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Total solicitudes" value={total}
            icon={<Users className="w-5 h-5" strokeWidth={1.5} />} />
          <StatCard label="Con GPS" value={withGps.length}
            sub={`${total ? Math.round(withGps.length / total * 100) : 0}% del total`}
            icon={<MapPin className="w-5 h-5" strokeWidth={1.5} />} color="blue" />
          <StatCard label="Riego" value={riego}
            sub={`${total ? Math.round(riego / total * 100) : 0}% del total`}
            icon={<Droplets className="w-5 h-5" strokeWidth={1.5} />} color="blue" />
          <StatCard label="Temporal" value={temporal}
            sub={`${total ? Math.round(temporal / total * 100) : 0}% del total`}
            icon={<CloudRain className="w-5 h-5" strokeWidth={1.5} />} color="emerald" />
          <StatCard label="Superficie total" value={`${totalSup} m²`}
            sub={`Promedio ${avgSup} m²`}
            icon={<Layers className="w-5 h-5" strokeWidth={1.5} />} color="emerald" />
        </div>

        {/* Estadísticas por estado */}
        {total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STATUS_OPTIONS.map((o) => {
              const count = submissions.filter((s) => (s.status ?? "pendiente") === o.value).length;
              const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
              const Icon  = o.value === "pendiente" ? Clock : o.value === "revision" ? RefreshCw : o.value === "aprobado" ? Check : X;
              const active = filterStatus === o.value;
              return (
                <button key={o.value}
                  onClick={() => { setFilterStatus(active ? "" : o.value); changeTab("tabla"); setPage(1); skipPageScroll.current = true; }}
                  title={active ? `Quitar filtro: ${o.label}` : `Filtrar por: ${o.label}`}
                  aria-pressed={active}
                  aria-label={active ? `Quitar filtro: ${o.label}` : `Filtrar por: ${o.label}`}
                  className={`rounded-2xl px-4 pt-3.5 pb-3 border border-black/5 text-left transition-all hover:shadow-sm active:scale-[.98] ${o.cls} ${active ? "ring-2 ring-offset-1 ring-current shadow-md" : ""}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="w-4 h-4 opacity-50" strokeWidth={2} />
                    <span className="text-[11px] font-bold opacity-50 tabular-nums">{pct}%</span>
                  </div>
                  <p className="text-3xl font-black leading-none tabular-nums">{count}</p>
                  <p className="text-xs font-semibold opacity-60 mt-1">{o.label}</p>
                  <div className="mt-2.5 h-1 rounded-full bg-black/10 overflow-hidden">
                    <div className="h-full rounded-full bg-current opacity-40 transition-all duration-700"
                      style={{ width: `${pct}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Tabs */}
        {(() => {
          const tabBadges: Partial<Record<string, number>> = {
            mapa:   withGps.length  > 0 ? withGps.length  : undefined,
            tabla:  tableTotal      > 0 ? tableTotal       : undefined,
            lotes:  conItemsCount   > 0 ? conItemsCount    : undefined,
          };
          return (
            <div className="flex gap-1 bg-gray-100/80 rounded-2xl p-1" role="tablist" aria-label="Vistas del panel">
              {([
                { id: "mapa",    label: "Mapa",      Icon: MapPin    },
                { id: "lotes",   label: "Por lote",  Icon: Layers    },
                { id: "graficas",label: "Gráficas",  Icon: BarChart2 },
                { id: "tabla",   label: "Registros", Icon: FileText  },
              ] as const).map(({ id, label, Icon }) => {
                const active = activeTab === id;
                const badge  = tabBadges[id];
                return (
                  <button key={id} onClick={() => changeTab(id)}
                    role="tab" aria-selected={active} aria-label={label}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      active
                        ? "bg-white text-guinda-800 shadow-sm border border-gray-100"
                        : "text-gray-500 hover:text-gray-700 hover:bg-white/60"
                    }`}>
                    <Icon className="w-3.5 h-3.5" strokeWidth={active ? 2.5 : 2} />
                    <span className="hidden sm:inline">{label}</span>
                    <span className="sm:hidden">{label.split(" ")[0]}</span>
                    {badge !== undefined && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none tabular-nums ${active ? "bg-guinda-100 text-guinda-700" : "bg-gray-200 text-gray-500"}`}>
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })()}

        {/* MAPA */}
        {mountedTabs.has("mapa") && (
          <div className={activeTab !== "mapa" ? "hidden" : ""}>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-800">Mapa de solicitudes</h2>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                  {submissions.length} solicitudes · {submissions.filter(s => s.lat && s.lng).length} con GPS
                </span>
              </div>
              <AdminMap
                submissions={submissions as { id: string; nombreCompleto: string; comunidad: string; ubicacion: string; lat: number | null; lng: number | null; tipoTierra: string; superficie: string; predio: string; lote: string; status?: string }[]}
                onSelectSubmission={(id) => {
                  const sub = submissions.find((s) => s.id === id);
                  if (sub) setSelected(sub);
                }}
              />
              {submissions.length === 0 && (
                <div className="mt-3 flex items-center gap-2.5 bg-gray-50 rounded-xl px-4 py-3">
                  <MapPin className="w-4 h-4 text-gray-300 shrink-0" strokeWidth={2} />
                  <p className="text-xs text-gray-400">Los marcadores aparecen cuando hay solicitudes con GPS o polígono asignado</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* POR LOTE */}
        {mountedTabs.has("lotes") && (
          <div className={activeTab !== "lotes" ? "hidden" : ""}>
            <LotesView submissions={submissions} onSelect={(s) => setSelected(s)} />
          </div>
        )}

        {/* GRÁFICAS */}
        {mountedTabs.has("graficas") && (
          <div className={activeTab !== "graficas" ? "hidden" : ""}>
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="font-bold text-gray-800 text-sm">Registros por día</h2>
                    <p className="text-[11px] text-gray-400 mt-0.5">Últimos 30 días</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-guinda-50 flex items-center justify-center">
                    <BarChart2 className="w-4 h-4 text-guinda-600" strokeWidth={2} />
                  </div>
                </div>
                {byDay.some((d) => d.solicitudes > 0) ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={byDay} barSize={10}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#6b7280" }} axisLine={false} tickLine={false} interval={4} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #f3f4f6", fontSize: 12 }} cursor={{ fill: "#fdf1f4" }} />
                      <Bar dataKey="solicitudes" fill={G} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-gray-400 text-sm text-center py-10">Sin datos aún</p>}
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="font-bold text-gray-800 text-sm">Por comunidad</h2>
                    <p className="text-[11px] text-gray-400 mt-0.5">Toca una barra para filtrar</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => printCommunitySummary(submissions)}
                      title="Imprimir resumen por comunidad"
                      aria-label="Imprimir resumen por comunidad"
                      className="flex items-center gap-1.5 text-xs font-semibold text-guinda-700 hover:text-guinda-900 bg-guinda-50 hover:bg-guinda-100 border border-guinda-200 px-3 py-2 rounded-xl transition-all">
                      <Printer className="w-3.5 h-3.5" strokeWidth={2} />
                      <span className="hidden sm:inline">Imprimir resumen</span>
                    </button>
                    <div className="w-8 h-8 rounded-xl bg-guinda-50 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-guinda-600" strokeWidth={2} />
                    </div>
                  </div>
                </div>
                {byComunidad.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={byComunidad}
                      barSize={36}
                      style={{ cursor: "pointer" }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      onClick={(chartData: any) => {
                        const payload = chartData?.activePayload?.[0]?.payload as { comunidad?: string } | undefined;
                        if (!payload?.comunidad) return;
                        setFilterComunidad(filterComunidad === payload.comunidad ? "" : payload.comunidad);
                        changeTab("tabla");
                        setPage(1);
                        skipPageScroll.current = true;
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #f3f4f6", fontSize: 12 }} cursor={{ fill: "#fdf1f4" }} />
                      <Bar dataKey="solicitudes" radius={[6, 6, 0, 0]}>
                        {byComunidad.map((entry, idx) => (
                          <Cell key={idx} fill={filterComunidad === entry.comunidad ? G2 : G} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-gray-400 text-sm text-center py-10">Sin datos aún</p>}
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="font-bold text-gray-800 text-sm">Por lote</h2>
                    <p className="text-[11px] text-gray-400 mt-0.5">Distribución por parcela</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-guinda-50 flex items-center justify-center">
                    <Layers className="w-4 h-4 text-guinda-600" strokeWidth={2} />
                  </div>
                </div>
                {byLote.some((d) => d.solicitudes > 0) ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={byLote} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #f3f4f6", fontSize: 12 }} cursor={{ fill: "#fdf1f4" }} />
                      <Bar dataKey="solicitudes" radius={[6, 6, 0, 0]}>
                        {byLote.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-gray-400 text-sm text-center py-10">Sin datos aún</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: "Tipo de tierra", data: pieTierra, colors: [G, G3], show: riego + temporal > 0 },
                  { title: "Habla ñhañhu",   data: pieDialecto, colors: [G, G2], show: total > 0 },
                ].map(({ title, data, colors, show }) => (
                  <div key={title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h2 className="font-bold text-gray-800 mb-4">{title}</h2>
                    {show ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                            {colors.map((c) => <Cell key={c} fill={c} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                          <Legend iconType="circle" iconSize={10}
                            formatter={(v) => <span style={{ fontSize: 12, color: "#374151" }}>{v}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <p className="text-gray-400 text-sm text-center py-12">Sin datos aún</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TABLA */}
        {mountedTabs.has("tabla") && (
          <div className={activeTab !== "tabla" ? "hidden" : ""}>
            <div ref={tableRef} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

              {/* Filtros */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 px-4 py-3.5 border-b border-gray-100 bg-gray-50/60">
                <div className="relative sm:flex-1 sm:min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth={2} />
                  <input ref={searchInputRef} type="text" placeholder="Nombre, CURP, celular o folio…"
                    value={draftSearch}
                    onChange={(e) => handleSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape") { handleSearch(""); e.currentTarget.blur(); } }}
                    aria-label="Buscar registros"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-guinda-500 bg-gray-50"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto sm:contents pb-0.5 sm:pb-0">
                <div className="relative shrink-0">
                  <select value={filterComunidad}
                    onChange={(e) => { setFilterComunidad(e.target.value); setPage(1); }}
                    aria-label="Filtrar por comunidad"
                    className="pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 appearance-none text-gray-700 focus:outline-none focus:ring-2 focus:ring-guinda-500">
                    <option value="">Todas las comunidades</option>
                    {COMUNIDADES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" strokeWidth={2} />
                </div>
                <div className="relative shrink-0">
                  <select value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                    aria-label="Filtrar por estado"
                    className="pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 appearance-none text-gray-700 focus:outline-none focus:ring-2 focus:ring-guinda-500">
                    <option value="">Todos los estados</option>
                    {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" strokeWidth={2} />
                </div>
                <div className="relative shrink-0">
                  <select value={filterPeriod}
                    onChange={(e) => { setFilterPeriod(e.target.value); setPage(1); }}
                    aria-label="Filtrar por período"
                    className="pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 appearance-none text-gray-700 focus:outline-none focus:ring-2 focus:ring-guinda-500">
                    <option value="">Todas las fechas</option>
                    <option value="hoy">Hoy</option>
                    <option value="semana">Última semana</option>
                    <option value="mes">Este mes</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" strokeWidth={2} />
                </div>
                {(draftSearch || filterComunidad || filterStatus || filterPeriod) && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 text-xs font-semibold text-guinda-600 hover:text-guinda-800 bg-guinda-50 hover:bg-guinda-100 border border-guinda-200 hover:border-guinda-300 px-3 py-2.5 rounded-xl transition-all shrink-0">
                    <X className="w-3.5 h-3.5" strokeWidth={2} /> Limpiar
                  </button>
                )}
                <button
                  onClick={() => { setShowArchived((v) => !v); setPage(1); setSelectedIds(new Set()); skipPageScroll.current = true; }}
                  aria-pressed={showArchived}
                  aria-label={showArchived ? "Ver registros activos" : "Ver registros archivados"}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-xl border transition-all shrink-0 ${showArchived ? "bg-amber-100 text-amber-700 border-amber-300" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                  <Archive className="w-3.5 h-3.5" strokeWidth={2} />
                  {showArchived ? "Ver activos" : "Archivados"}
                </button>
                <span className="text-xs text-gray-400 shrink-0 flex items-center">
                  {tableTotal} registro{tableTotal !== 1 ? "s" : ""}
                </span>
                </div>
              </div>

              {loading && tableData.length === 0 ? (
                <div className="p-5 space-y-2.5">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="h-11 bg-gray-100 rounded-xl animate-pulse" style={{ opacity: 1 - i * 0.1 }} />
                  ))}
                </div>
              ) : tableData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center mb-4">
                    <FileText className="w-7 h-7 opacity-40" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-semibold text-gray-400">
                    {search || filterComunidad || filterStatus || filterPeriod ? "Sin resultados" : "Aún no hay registros"}
                  </p>
                  <p className="text-xs text-gray-300 mt-1">
                    {search || filterComunidad || filterStatus || filterPeriod ? "Prueba con otros filtros" : "Las solicitudes aparecerán aquí"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" aria-label="Solicitudes">
                    <thead>
                      <tr className="border-b-2 border-gray-100 bg-gray-50">
                        <th className="px-3 py-3.5 w-8" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label="Seleccionar todos los registros"
                            className="w-4 h-4 rounded accent-guinda-700 cursor-pointer"
                            checked={selectedIds.size > 0 && tableData.every((s) => selectedIds.has(s.id))}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedIds(new Set(tableData.map((s) => s.id)));
                              else setSelectedIds(new Set());
                            }}
                          />
                        </th>
                        <th className="text-left text-[11px] font-bold text-gray-400 px-3 py-3.5 whitespace-nowrap uppercase tracking-wider">ID</th>
                        {([
                          ["Nombre",    "nombreCompleto", ""],
                          ["Celular",   "celular",        "hidden md:table-cell"],
                          ["Comunidad", "comunidad",      "hidden md:table-cell"],
                          ["Polígono",  "lote",           "hidden sm:table-cell"],
                          ["Tipo",      "tipoTierra",     "hidden md:table-cell"],
                          ["Sup.",      "superficie",     "hidden sm:table-cell"],
                          ["Estado",    "status",         ""],
                          ["Fecha",     "timestamp",      "hidden sm:table-cell"],
                        ] as [string, keyof Submission, string][]).map(([label, key, hideCls]) => (
                          <th key={key} onClick={() => toggleSort(key)}
                            aria-sort={sortKey === key ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                            className={`text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3.5 whitespace-nowrap cursor-pointer hover:text-guinda-700 select-none transition-colors ${hideCls}`}>
                            <span className="inline-flex items-center gap-1">
                              {label}
                              {sortKey === key
                                ? sortDir === "asc"
                                  ? <ArrowUp className="w-3 h-3 text-guinda-500" strokeWidth={2.5} />
                                  : <ArrowDown className="w-3 h-3 text-guinda-500" strokeWidth={2.5} />
                                : <ArrowDown className="w-3 h-3 opacity-15" strokeWidth={2} />}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((s, i) => {
                        const isToday = new Date(s.timestamp).toDateString() === new Date().toDateString();
                        const leftBorder = ({ pendiente: "border-l-gray-200", revision: "border-l-yellow-400", aprobado: "border-l-emerald-400", rechazado: "border-l-red-400" } as Record<string, string>)[s.status ?? "pendiente"] ?? "border-l-gray-200";
                        const av = avatarCls(s.nombreCompleto);
                        return (
                        <tr key={s.id} onClick={() => setSelected(s)}
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(s); } }}
                          aria-label={`Ver solicitud de ${s.nombreCompleto}`}
                          className={`border-b border-gray-50 border-l-2 ${leftBorder} hover:bg-guinda-50/50 transition-colors cursor-pointer ${i % 2 === 0 ? "" : "bg-gray-50/60"} ${selectedIds.has(s.id) ? "bg-guinda-50 ring-1 ring-inset ring-guinda-200" : ""}`}>
                          <td className="px-3 py-3.5 w-8" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              aria-label={`Seleccionar ${s.nombreCompleto}`}
                              className="w-4 h-4 rounded accent-guinda-700 cursor-pointer"
                              checked={selectedIds.has(s.id)}
                              onChange={(e) => {
                                setSelectedIds((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(s.id); else next.delete(s.id);
                                  return next;
                                });
                              }}
                            />
                          </td>
                          <td className="px-3 py-3.5">
                            <span className="text-[10px] font-mono font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-lg tracking-wider">
                              {folio(s.id).replace("CAP-2026-", "")}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 select-none ${av.bg} ${av.text}`}>
                                {initials(s.nombreCompleto)}
                              </div>
                              <span className="font-semibold text-gray-800 text-sm">{s.nombreCompleto}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-xs font-mono text-gray-400 whitespace-nowrap hidden md:table-cell">
                            {s.celular.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap hidden md:table-cell">{s.comunidad}</td>
                          <td className="px-4 py-3.5 text-xs font-mono text-gray-400 whitespace-nowrap hidden sm:table-cell">{s.lote || "—"}</td>
                          <td className="px-4 py-3.5 hidden md:table-cell">
                            <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${s.tipoTierra === "riego" ? "bg-blue-50 text-blue-600" : "bg-sky-50 text-sky-600"}`}>
                              {s.tipoTierra === "riego" ? "Riego" : "Temporal"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-gray-600 tabular-nums hidden sm:table-cell">{s.superficie} m²</td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${statusCls(s.status)}`}>
                              {statusLabel(s.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs hidden sm:table-cell">
                            <span className="flex items-center gap-1.5">
                              {isToday && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Registrado hoy" />}
                              <span className={isToday ? "text-emerald-600 font-medium" : "text-gray-400"}>
                                {new Date(s.timestamp).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" })}
                              </span>
                            </span>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/40">
                  <span className="text-xs text-gray-400">
                    Página {page} de {totalPages}
                  </span>
                  <nav aria-label="Paginación" className="flex items-center gap-1">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                      aria-label="Página anterior"
                      className="w-8 h-8 rounded-lg text-gray-500 hover:text-guinda-700 hover:bg-white border border-transparent hover:border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center">
                      <ChevronLeft className="w-4 h-4" strokeWidth={2} />
                    </button>
                    {getPageNumbers(page, totalPages).map((p, i) =>
                      p === null ? (
                        <span key={`e${i}`} className="text-xs text-gray-300 w-6 text-center select-none">…</span>
                      ) : (
                        <button key={p} onClick={() => setPage(p)}
                          aria-label={`Página ${p}`}
                          aria-current={p === page ? "page" : undefined}
                          className={`w-8 h-8 text-xs font-semibold rounded-lg transition-all ${
                            p === page
                              ? "bg-guinda-700 text-white shadow-sm"
                              : "text-gray-500 hover:text-guinda-700 hover:bg-white hover:border-gray-200 border border-transparent"
                          }`}>
                          {p}
                        </button>
                      )
                    )}
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      aria-label="Página siguiente"
                      className="w-8 h-8 rounded-lg text-gray-500 hover:text-guinda-700 hover:bg-white border border-transparent hover:border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center">
                      <ChevronRight className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </nav>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de detalle */}
      {selected && (
        <DetailModal
          s={selected}
          onClose={() => setSelected(null)}
          onStatusChange={updateStatus}
          onSaveNotes={saveNotes}
          onDelete={(id) => setDeleteConfirmId(id)}
          isArchivedView={showArchived}
          onRestore={restoreRow}
        />
      )}

      {/* Barra de acción masiva */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[90] flex items-center gap-2 sm:gap-2.5 text-white px-4 py-2.5 rounded-2xl shadow-2xl animate-slide-up border border-white/10"
          style={{ background: "linear-gradient(135deg,#370916 0%,#6e112c 100%)" }}>
          <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-xl shrink-0">
            <Check className="w-3.5 h-3.5 text-white/70" strokeWidth={2.5} />
            <span className="text-sm font-bold tabular-nums">{selectedIds.size}</span>
            <span className="text-xs text-white/60">selec.</span>
          </div>
          <div className="relative">
            <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}
              aria-label="Cambiar estado de los registros seleccionados"
              className="bg-white/10 border border-white/20 rounded-xl pl-3 pr-7 py-2 text-xs font-semibold appearance-none focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer">
              <option value="">Cambiar estado…</option>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/50" strokeWidth={2} />
          </div>
          <button onClick={() => bulkUpdateStatus(bulkStatus)} disabled={!bulkStatus || bulkSaving}
            className="bg-white text-guinda-800 hover:bg-guinda-50 disabled:opacity-40 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shrink-0">
            {bulkSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} /> : "Aplicar"}
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            aria-label="Cancelar selección" title="Cancelar selección"
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0">
            <X className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {deleteConfirmId && (
        <DeleteConfirmModal
          name={
            submissions.find((s) => s.id === deleteConfirmId)?.nombreCompleto ??
            tableData.find((s) => s.id === deleteConfirmId)?.nombreCompleto ?? ""
          }
          onConfirm={async () => { await deleteRow(deleteConfirmId); setDeleteConfirmId(null); }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}

      <div aria-live="polite" aria-atomic="true">
        {toast && (
          <div className={`fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[100] flex items-center justify-center gap-2 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold text-white pointer-events-none animate-slide-up ${toast.ok ? "bg-emerald-600" : "bg-red-600"}`}>
            {toast.ok
              ? <Check className="w-4 h-4 shrink-0" strokeWidth={2.5} />
              : <X className="w-4 h-4 shrink-0" strokeWidth={2.5} />}
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
}
