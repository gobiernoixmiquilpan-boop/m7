"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface State { hasError: boolean }

export default class FormErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen bg-guinda-50 flex items-center justify-center p-5">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-orange-500" strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Algo salió mal</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Ocurrió un error inesperado. Tus datos guardados no se perdieron —
            al recargar la página podrás continuar desde donde estabas.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-guinda-700 hover:bg-guinda-800 text-white font-semibold py-3 rounded-2xl text-sm transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={2} /> Reintentar
          </button>
        </div>
      </main>
    );
  }
}
