"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Admin] error boundary caught:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-5">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-orange-500" strokeWidth={1.5} />
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">Error en el panel</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Ocurrió un error inesperado. Los datos no se perdieron — recarga para continuar.
        </p>
        <button
          onClick={reset}
          className="w-full bg-guinda-700 hover:bg-guinda-800 text-white font-semibold py-3 rounded-2xl text-sm transition-all flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" strokeWidth={2} /> Reintentar
        </button>
      </div>
    </main>
  );
}
