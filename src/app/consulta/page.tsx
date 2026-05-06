"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, ChevronLeft, AlertCircle } from "lucide-react";

function normalize(v: string) {
  return v.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 14);
}

export default function ConsultaPage() {
  const [folio, setFolio] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = folio.trim().toUpperCase();
    if (!/^CAP-2026-[0-9A-F]{4}$/.test(clean)) {
      setError("Formato inválido. Ejemplo: CAP-2026-4A2B");
      return;
    }
    router.push(`/consulta/${clean}`);
  }

  return (
    <main className="min-h-screen bg-guinda-50 flex flex-col">
      <header className="bg-guinda-800 rounded-b-[2rem] shadow-lg">
        <div className="max-w-sm mx-auto px-5 pt-6 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 overflow-hidden">
              <Image src="/logo.svg" alt="RegulaTierra" width={28} height={28} priority />
            </div>
            <div>
              <p className="text-guinda-200 text-[11px] font-semibold uppercase tracking-widest leading-none">
                Contraloría Municipal · Ixmiquilpan
              </p>
              <p className="text-guinda-300 text-xs mt-0.5">Regularización de Tierras · Capula 2026</p>
            </div>
          </div>
          <h1 className="text-xl font-bold text-white">Consultar mi solicitud</h1>
          <p className="text-guinda-300 text-sm mt-1">Ingresa el folio de tu comprobante</p>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center px-4 pt-8 pb-10">
        <div className="w-full max-w-sm space-y-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">
                Número de folio
              </label>
              <input
                type="text"
                inputMode="text"
                placeholder="CAP-2026-XXXX"
                value={folio}
                onChange={(e) => { setFolio(normalize(e.target.value)); setError(""); }}
                className={`w-full border rounded-xl px-4 py-3 text-base font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-guinda-500 focus:border-transparent transition-all placeholder:text-gray-300 placeholder:font-sans placeholder:tracking-normal ${
                  error ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50 focus:bg-white"
                }`}
                autoComplete="off"
                spellCheck={false}
              />
              {error && (
                <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" strokeWidth={2} /> {error}
                </p>
              )}
            </div>
            <button type="submit"
              className="w-full bg-guinda-700 hover:bg-guinda-800 active:scale-[.98] text-white font-bold py-3.5 rounded-2xl text-sm shadow-sm transition-all flex items-center justify-center gap-2">
              <Search className="w-4 h-4" strokeWidth={2} /> Consultar estado
            </button>
          </form>

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
