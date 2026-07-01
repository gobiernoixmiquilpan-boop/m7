"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, ChevronLeft, AlertCircle, Clock, X } from "lucide-react";

const HISTORY_KEY = "capula-folio-history";

function normalize(v: string): string {
  const upper = v.toUpperCase().replace(/[^A-Z0-9-]/g, "");
  // If user types only hex digits (≥2 chars, no "C" prefix), auto-prepend "CAP-2026-"
  if (!upper.startsWith("C") && /^[A-F0-9]{6}$/.test(upper)) {
    return `CAP-2026-${upper}`;
  }
  return upper.slice(0, 15);
}

function saveHistory(folio: string) {
  try {
    const h: string[] = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    const updated = [folio, ...h.filter((f) => f !== folio)].slice(0, 5);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch { /* noop */ }
}

export default function ConsultaPage() {
  const [folio,   setFolio]   = useState("");
  const [error,   setError]   = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"));
    } catch { /* noop */ }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = folio.trim().toUpperCase();
    if (!/^CAP-2026-[0-9A-F]{6}$/.test(clean)) {
      setError("Formato inválido. Ejemplo: CAP-2026-4A2B1C");
      return;
    }
    saveHistory(clean);
    router.push(`/consulta/${clean}`);
  }

  function removeHistory(f: string) {
    try {
      const updated = history.filter((h) => h !== f);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      setHistory(updated);
    } catch { /* noop */ }
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg,#fdf1f4 0%,#f8f4f8 50%,#f4f4ff 100%)" }}>
      <header className="rounded-b-[2rem] shadow-2xl" style={{ background: "linear-gradient(145deg,#2a0710 0%,#6e112c 50%,#9b1840 85%,#7a1535 100%)" }}>
        <div className="max-w-sm mx-auto px-5 pt-6 pb-6 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle,rgba(255,255,255,0.07) 0%,transparent 70%)" }} />
          <div className="flex items-center gap-3 mb-4 relative">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center shrink-0 overflow-hidden">
              <Image src="/logo.svg" alt="RegulaTierra" width={28} height={28} priority />
            </div>
            <div>
              <p className="text-guinda-200 text-[11px] font-semibold uppercase tracking-widest leading-none">
                Contraloría Municipal · Ixmiquilpan
              </p>
              <p className="text-guinda-300 text-xs mt-0.5">Regularización de Tierras · Capula 2026</p>
            </div>
          </div>
          <h1 className="text-xl font-black text-white tracking-tight relative">Consultar mi solicitud</h1>
          <p className="text-guinda-300 text-sm mt-1 relative">Ingresa el folio de tu comprobante</p>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center px-4 pt-8 pb-10">
        <div className="w-full max-w-sm space-y-4">
          <form onSubmit={handleSubmit} noValidate className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div>
              <label htmlFor="folio-input" className="text-sm font-semibold text-gray-700 block mb-2">
                Número de folio
              </label>
              <input
                id="folio-input"
                type="text"
                inputMode="text"
                placeholder="CAP-2026-4A2B1C"
                value={folio}
                onChange={(e) => { setFolio(normalize(e.target.value)); setError(""); }}
                className={`w-full border rounded-xl px-4 py-3 text-base font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-guinda-500 focus:border-transparent transition-all placeholder:text-gray-300 placeholder:font-sans placeholder:tracking-normal ${
                  error ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50 focus:bg-white"
                }`}
                autoComplete="off"
                spellCheck={false}
                aria-describedby={error ? "folio-error" : undefined}
              />
              {error && (
                <p id="folio-error" role="alert" className="text-red-500 text-xs mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" strokeWidth={2} /> {error}
                </p>
              )}
            </div>
            <button type="submit"
              className="w-full active:scale-[.97] text-white font-bold py-3.5 rounded-2xl text-sm transition-all flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg,#8b1438 0%,#6e112c 60%,#530d21 100%)", boxShadow: "0 4px 14px rgba(110,17,44,0.35)" }}>
              <Search className="w-4 h-4" strokeWidth={2} /> Consultar estado
            </button>
          </form>

          {history.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-gray-400" strokeWidth={2} />
                <p className="text-xs font-semibold text-gray-500">Consultados recientemente</p>
              </div>
              <div className="divide-y divide-gray-100">
                {history.map((f) => (
                  <div key={f} className="flex items-center gap-2 px-4 py-0.5">
                    <button
                      onClick={() => { saveHistory(f); router.push(`/consulta/${f}`); }}
                      aria-label={`Consultar folio ${f}`}
                      className="flex-1 text-left py-3 text-sm font-mono font-semibold text-guinda-700 hover:text-guinda-900 tracking-wider transition-colors">
                      {f}
                    </button>
                    <button onClick={() => removeHistory(f)}
                      aria-label={`Eliminar ${f} del historial`}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-all">
                      <X className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-xs text-gray-400 px-4 leading-relaxed">
            El folio aparece en la pantalla de confirmación al finalizar tu solicitud.
          </p>

          <div className="text-center">
            <Link href="/"
              className="inline-flex items-center gap-1 text-xs text-guinda-600 hover:text-guinda-800 font-medium">
              <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} /> Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
