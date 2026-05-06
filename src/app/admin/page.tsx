"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Users, MapPin, Droplets, CloudRain, LogOut, Download,
  Search, ChevronLeft, ChevronRight, ChevronDown, RefreshCw,
  FileText, MessageCircle, ExternalLink, X, Trash2, Loader2,
} from "lucide-react";

const AdminMap = dynamic(() => import("@/components/AdminMap"), { ssr: false });

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
}

const COMUNIDADES = ["Capula", "El Alberto", "El Deca", "El Nith", "La Estancia", "Otra"];
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
  return `CAP-2026-${id.slice(-4)}`;
}

/* ──────────────────── Delete confirm modal ──────────────────── */
function DeleteConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-xs w-full text-center">
        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-7 h-7 text-red-600" strokeWidth={1.5} />
        </div>
        <h3 className="font-bold text-gray-800 text-base mb-1">¿Eliminar registro?</h3>
        <p className="text-sm text-gray-500 mb-5">Esta acción no se puede deshacer.</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:border-gray-300 transition-all">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-all">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────── Login ──────────────────── */
function LoginScreen({ pw, setPw, onLogin, loading }: {
  pw: string; setPw: (v: string) => void; onLogin: () => void; loading: boolean;
}) {
  return (
    <main className="min-h-screen bg-guinda-50 flex items-center justify-center p-5">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-xs w-full text-center">
        <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center mx-auto mb-5 bg-guinda-100">
          <Image src="/logo.svg" alt="RegulaTierra" width={40} height={40} />
        </div>
        <h1 className="text-xl font-bold text-guinda-800 mb-1">Panel Administrativo</h1>
        <p className="text-gray-400 text-sm mb-6">Regularización de Tierras · Capula 2026</p>
        <input
          type="password" placeholder="Contraseña" value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onLogin()}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-guinda-500 bg-gray-50"
        />
        <button onClick={onLogin} disabled={loading}
          className="w-full bg-guinda-700 hover:bg-guinda-800 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />}
          {loading ? "Ingresando…" : "Ingresar"}
        </button>
      </div>
    </main>
  );
}

/* ──────────────────── Stat card ──────────────────── */
function StatCard({ label, value, sub, icon, color = "guinda" }: {
  label: string; value: number | string; sub?: string; icon: React.ReactNode; color?: string;
}) {
  const bg   = color === "blue" ? "bg-blue-100"    : color === "emerald" ? "bg-emerald-100"    : "bg-guinda-100";
  const text = color === "blue" ? "text-blue-700"  : color === "emerald" ? "text-emerald-700"  : "text-guinda-700";
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl ${bg} ${text} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ──────────────────── Detail modal ──────────────────── */
function DetailModal({ s, onClose, onStatusChange, onDelete }: {
  s: Submission;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [status, setStatus]   = useState(s.status ?? "pendiente");
  const [saving, setSaving]   = useState(false);

  async function changeStatus(v: string) {
    setSaving(true);
    setStatus(v);
    await onStatusChange(s.id, v);
    setSaving(false);
  }

  const waUrl   = `https://wa.me/52${s.celular}`;
  const mapsUrl = s.lat && s.lng ? `https://maps.google.com/?q=${s.lat},${s.lng}` : null;

  const photos = [
    { path: s.fotoCasaUrl,      label: "Foto de casa" },
    { path: s.fotoINEFrenteUrl, label: "INE frente" },
    { path: s.fotoINEAtrasUrl,  label: "INE reverso" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">

        {/* Header */}
        <div className="bg-guinda-800 text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-none truncate">{s.nombreCompleto}</p>
            <p className="text-guinda-300 text-xs mt-0.5 font-mono">{folio(s.id)}</p>
          </div>
          {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />}
        </div>

        <div className="p-5 space-y-6 flex-1">

          {/* Estado */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Estado del trámite</p>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map((o) => (
                <button key={o.value} onClick={() => changeStatus(o.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                    status === o.value ? `${o.cls} border-current` : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                  }`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fotos */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Fotografías</p>
            <div className="grid grid-cols-3 gap-2">
              {photos.map(({ path, label }) => {
                const src = photoSrc(path);
                return (
                  <div key={label} className="space-y-1">
                    <p className="text-[10px] text-gray-400 font-medium text-center truncate">{label}</p>
                    {src ? (
                      <a href={src} target="_blank" rel="noreferrer" className="block">
                        <div className="relative h-24 rounded-xl overflow-hidden border border-gray-100 hover:opacity-90 transition-opacity bg-gray-50">
                          <Image src={src} alt={label} fill className="object-cover" unoptimized />
                        </div>
                      </a>
                    ) : (
                      <div className="h-24 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50">
                        <p className="text-[10px] text-gray-300 text-center px-1">Sin foto</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Datos del predio */}
          <InfoSection title="Datos del predio">
            <InfoRow label="Comunidad"    value={s.comunidad} />
            <InfoRow label="Predio"       value={s.predio} />
            <InfoRow label="Lote"         value={s.lote} />
            <InfoRow label="Tipo"         value={s.tipoTierra === "riego" ? "Riego" : "Temporal"} />
            <InfoRow label="Superficie"   value={`${s.superficie} ha`} />
            <InfoRow label="Habla ñhañhu" value={s.hablaDialecto === "si" ? "Sí" : "No"} />
          </InfoSection>

          {/* Datos personales */}
          <InfoSection title="Datos personales">
            <InfoRow label="CURP" value={s.curp} mono />
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

          <p className="text-xs text-gray-400 text-center">
            Registrado el {new Date(s.timestamp).toLocaleString("es-MX", {
              day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>

        {/* Eliminar */}
        <div className="p-5 border-t border-gray-100 shrink-0">
          <button onClick={() => onDelete(s.id)}
            className="w-full flex items-center justify-center gap-2 text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 hover:border-red-300 py-2.5 rounded-xl text-sm font-semibold transition-all">
            <Trash2 className="w-4 h-4" strokeWidth={2} /> Eliminar registro
          </button>
        </div>

      </div>
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{title}</p>
      <div className="bg-gray-50 rounded-2xl px-4 divide-y divide-gray-100">{children}</div>
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

/* ──────────────────── Admin principal ──────────────────── */
export default function AdminPage() {
  const [authed,          setAuthed]          = useState(() => typeof window !== "undefined" && sessionStorage.getItem("admin-ok") === "1");
  const [pw,              setPw]              = useState("");
  const [loginLoading,    setLoginLoading]    = useState(false);
  const [submissions,     setSubmissions]     = useState<Submission[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [search,          setSearch]          = useState("");
  const [filterComunidad, setFilterComunidad] = useState("");
  const [filterStatus,    setFilterStatus]    = useState("");
  const [page,            setPage]            = useState(1);
  const [selected,        setSelected]        = useState<Submission | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeTab,       setActiveTab]       = useState<"mapa" | "graficas" | "tabla">("tabla");
  const [mountedTabs, setMountedTabs] = useState(new Set<string>(["tabla"]));

  function changeTab(tab: "mapa" | "graficas" | "tabla") {
    setMountedTabs(prev => new Set([...prev, tab]));
    setActiveTab(tab);
    if (tab === "graficas") setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/submissions");
      if (res.status === 401) {
        fetch("/api/auth", { method: "DELETE" });
        sessionStorage.removeItem("admin-ok");
        setAuthed(false);
        setSubmissions([]);
        return;
      }
      setSubmissions(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem("admin-ok") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchData();
    }
  }, [fetchData]);

  async function login() {
    if (loginLoading) return;
    setLoginLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        sessionStorage.setItem("admin-ok", "1");
        setAuthed(true);
        fetchData();
      } else {
        alert("Contraseña incorrecta");
      }
    } catch {
      alert("Error de conexión. Verifique su red.");
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
    if (!res.ok) { alert("No se pudo eliminar. Intente de nuevo."); return; }
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch("/api/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) { alert("No se pudo actualizar el estado. Intente de nuevo."); return; }
    setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, status } : s));
    setSelected((prev) => prev?.id === id ? { ...prev, status } : prev);
  }

  function exportCSV() {
    const headers = ["Folio", "Nombre", "Comunidad", "Celular", "CURP", "Predio", "Lote",
      "Tipo", "Superficie (ha)", "Dialecto ñhañhu", "Estado", "Ubicación", "Fecha"];
    const rows = submissions.map((s) => [
      folio(s.id), s.nombreCompleto, s.comunidad, s.celular, s.curp, s.predio, s.lote,
      s.tipoTierra, s.superficie, s.hablaDialecto, statusLabel(s.status), s.ubicacion,
      new Date(s.timestamp).toLocaleDateString("es-MX"),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v ?? ""}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registros-capula-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!authed) return <LoginScreen pw={pw} setPw={setPw} onLogin={login} loading={loginLoading} />;

  /* ── Stats ── */
  const total    = submissions.length;
  const withGps  = submissions.filter((s) => s.lat && s.lng);
  const riego    = submissions.filter((s) => s.tipoTierra === "riego").length;
  const temporal = submissions.filter((s) => s.tipoTierra === "temporal").length;
  const dialecto = submissions.filter((s) => s.hablaDialecto === "si").length;
  const avgSup   = total
    ? (submissions.reduce((a, s) => a + parseFloat(s.superficie || "0"), 0) / total).toFixed(2)
    : "0";

  const byComunidad = COMUNIDADES.map((c) => ({
    name: c === "La Estancia" ? "Estancia" : c,
    solicitudes: submissions.filter((s) => s.comunidad === c).length,
  })).filter((d) => d.solicitudes > 0);

  const pieTierra   = [{ name: "Riego", value: riego }, { name: "Temporal", value: temporal }];
  const pieDialecto = [{ name: "Habla", value: dialecto }, { name: "No habla", value: total - dialecto }];

  /* ── Filter + paginate ── */
  const filtered = [...submissions]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .filter((s) => {
      if (filterComunidad && s.comunidad !== filterComunidad) return false;
      if (filterStatus && s.status !== filterStatus) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        s.nombreCompleto.toLowerCase().includes(q) ||
        s.comunidad.toLowerCase().includes(q) ||
        s.curp.toLowerCase().includes(q) ||
        folio(s.id).toLowerCase().includes(q)
      );
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-guinda-800 text-white px-5 py-4 flex items-center gap-3">
        <Link href="/"
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0">
          <ChevronLeft className="w-5 h-5" strokeWidth={2} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base leading-none">Panel Administrativo</h1>
          <p className="text-guinda-300 text-xs mt-0.5">Regularización de Tierras · Capula 2026</p>
        </div>
        <button onClick={fetchData} title="Actualizar" aria-label="Actualizar registros"
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} strokeWidth={2} />
        </button>
        <button onClick={exportCSV} title="Exportar CSV" aria-label="Exportar a CSV"
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
          <Download className="w-4 h-4" strokeWidth={2} />
        </button>
        <button onClick={logout} title="Salir" aria-label="Cerrar sesión"
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
          <LogOut className="w-4 h-4" strokeWidth={2} />
        </button>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-5 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total solicitudes" value={total}
            icon={<Users className="w-5 h-5" strokeWidth={1.5} />} />
          <StatCard label="Con GPS" value={withGps.length}
            sub={`${total ? Math.round(withGps.length / total * 100) : 0}% del total`}
            icon={<MapPin className="w-5 h-5" strokeWidth={1.5} />} color="blue" />
          <StatCard label="Tierra de riego" value={riego}
            icon={<Droplets className="w-5 h-5" strokeWidth={1.5} />} />
          <StatCard label="Sup. promedio" value={`${avgSup} ha`}
            icon={<CloudRain className="w-5 h-5" strokeWidth={1.5} />} color="emerald" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5">
          {(["mapa", "graficas", "tabla"] as const).map((tab) => (
            <button key={tab} onClick={() => changeTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab ? "bg-guinda-700 text-white shadow-sm" : "text-gray-500 hover:text-guinda-700 hover:bg-guinda-50"
              }`}>
              {tab === "mapa" ? "Mapa" : tab === "graficas" ? "Gráficas" : "Registros"}
            </button>
          ))}
        </div>

        {/* MAPA */}
        {mountedTabs.has("mapa") && (
          <div className={activeTab !== "mapa" ? "hidden" : ""}>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-800">Mapa de solicitudes</h2>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                  {withGps.length} con GPS
                </span>
              </div>
              {withGps.length > 0 ? (
                <AdminMap submissions={withGps as { id: string; nombreCompleto: string; comunidad: string; ubicacion: string; lat: number; lng: number; tipoTierra: string; superficie: string; predio: string; lote: string }[]} />
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                  <MapPin className="w-10 h-10 mb-2 opacity-30" strokeWidth={1} />
                  <p className="text-sm">Sin solicitudes con coordenadas GPS</p>
                  <p className="text-xs mt-1 text-center px-8">Los registros aparecerán cuando los ciudadanos usen &ldquo;Ubicación actual&rdquo;</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GRÁFICAS */}
        {mountedTabs.has("graficas") && (
          <div className={activeTab !== "graficas" ? "hidden" : ""}>
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-bold text-gray-800 mb-4">Solicitudes por comunidad</h2>
                {byComunidad.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={byComunidad} barSize={36}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #f3f4f6", fontSize: 12 }} cursor={{ fill: "#fdf1f4" }} />
                      <Bar dataKey="solicitudes" fill={G} radius={[6, 6, 0, 0]} />
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
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

              {/* Filtros */}
              <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth={2} />
                  <input type="text" placeholder="Buscar por nombre, comunidad o CURP…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-guinda-500 bg-gray-50"
                  />
                </div>
                <div className="relative">
                  <select value={filterComunidad}
                    onChange={(e) => { setFilterComunidad(e.target.value); setPage(1); }}
                    className="pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 appearance-none text-gray-700 focus:outline-none focus:ring-2 focus:ring-guinda-500">
                    <option value="">Todas las comunidades</option>
                    {COMUNIDADES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" strokeWidth={2} />
                </div>
                <div className="relative">
                  <select value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                    className="pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 appearance-none text-gray-700 focus:outline-none focus:ring-2 focus:ring-guinda-500">
                    <option value="">Todos los estados</option>
                    {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" strokeWidth={2} />
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
                </span>
              </div>

              {paginated.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <FileText className="w-10 h-10 mb-2 opacity-30" strokeWidth={1} />
                  <p className="text-sm">{search || filterComunidad ? "Sin resultados" : "Aún no hay registros"}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/80">
                        {["Folio", "Nombre", "Comunidad", "Tipo", "Sup.", "Estado", "Fecha"].map((h) => (
                          <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((s, i) => (
                        <tr key={s.id} onClick={() => setSelected(s)}
                          className={`border-b border-gray-50 hover:bg-guinda-50/40 transition-colors cursor-pointer ${i % 2 === 0 ? "" : "bg-gray-50/40"}`}>
                          <td className="px-4 py-3 text-xs font-mono text-gray-400">{folio(s.id)}</td>
                          <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{s.nombreCompleto}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{s.comunidad}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${s.tipoTierra === "riego" ? "bg-blue-50 text-blue-700" : "bg-sky-50 text-sky-700"}`}>
                              {s.tipoTierra === "riego" ? "Riego" : "Temporal"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{s.superficie} ha</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${statusCls(s.status)}`}>
                              {statusLabel(s.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                            {new Date(s.timestamp).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-guinda-700 disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronLeft className="w-4 h-4" strokeWidth={2} /> Anterior
                  </button>
                  <span className="text-xs text-gray-400">Página {page} de {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-guinda-700 disabled:opacity-30 disabled:cursor-not-allowed">
                    Siguiente <ChevronRight className="w-4 h-4" strokeWidth={2} />
                  </button>
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
          onDelete={(id) => setDeleteConfirmId(id)}
        />
      )}

      {/* Modal de confirmación de eliminación */}
      {deleteConfirmId && (
        <DeleteConfirmModal
          onConfirm={async () => { await deleteRow(deleteConfirmId); setDeleteConfirmId(null); }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
}
