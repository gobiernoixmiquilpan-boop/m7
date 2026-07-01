import Image from "next/image";
import Link from "next/link";
import { Search, ChevronLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-5" style={{ background: "linear-gradient(160deg,#fdf1f4 0%,#f8f4f8 50%,#f4f4ff 100%)" }}>
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border border-guinda-100/50">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-xl bg-guinda-100 flex items-center justify-center overflow-hidden shrink-0">
            <Image src="/logo.svg" alt="RegulaTierra" width={22} height={22} />
          </div>
          <span className="text-[11px] text-guinda-600 font-bold uppercase tracking-widest">
            RegulaTierra
          </span>
        </div>

        <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg"
          style={{ background: "linear-gradient(135deg,#8b1438 0%,#6e112c 55%,#370916 100%)" }}>
          <span className="text-4xl font-black text-white/80 tracking-tighter">404</span>
        </div>

        <h2 className="text-xl font-black text-gray-800 mb-2 tracking-tight">Página no encontrada</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          El folio que buscas no existe o la dirección es incorrecta.
          Verifica el número e intenta de nuevo.
        </p>

        <div className="space-y-3">
          <Link href="/consulta"
            className="flex items-center justify-center gap-2 active:scale-[.97] text-white font-bold py-3.5 rounded-2xl text-sm transition-all w-full"
            style={{ background: "linear-gradient(135deg,#8b1438 0%,#6e112c 60%,#530d21 100%)", boxShadow: "0 4px 14px rgba(110,17,44,0.35)" }}>
            <Search className="w-4 h-4" strokeWidth={2} /> Buscar otro folio
          </Link>
          <div className="text-center">
            <Link href="/"
              className="inline-flex items-center gap-1 text-xs text-guinda-600 hover:text-guinda-800 font-medium transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} /> Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
