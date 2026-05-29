import Image from "next/image";
import Link from "next/link";
import { Search, ChevronLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-guinda-50 flex items-center justify-center p-5">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-xl bg-guinda-100 flex items-center justify-center overflow-hidden shrink-0">
            <Image src="/logo.svg" alt="RegulaTierra" width={22} height={22} />
          </div>
          <span className="text-[11px] text-guinda-600 font-bold uppercase tracking-widest">
            RegulaTierra
          </span>
        </div>

        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: "linear-gradient(135deg,#370916 0%,#6e112c 100%)" }}>
          <span className="text-3xl font-black text-white/70">404</span>
        </div>

        <h2 className="text-xl font-bold text-gray-800 mb-2">Página no encontrada</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          El folio que buscas no existe o la dirección es incorrecta.
          Verifica el número e intenta de nuevo.
        </p>

        <div className="space-y-3">
          <Link href="/consulta"
            className="flex items-center justify-center gap-2 bg-guinda-700 hover:bg-guinda-800 active:scale-[.98] text-white font-bold py-3 rounded-2xl text-sm shadow-sm transition-all w-full">
            <Search className="w-4 h-4" strokeWidth={2} /> Buscar otro folio
          </Link>
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
