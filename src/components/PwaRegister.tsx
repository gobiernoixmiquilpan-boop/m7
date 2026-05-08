"use client";
import { useEffect, useState } from "react";

export default function PwaRegister() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(console.error);

    if (!navigator.serviceWorker.controller) return;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      setUpdateReady(true);
    });
  }, []);

  if (!updateReady) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[200] max-w-sm mx-auto bg-guinda-800 text-white rounded-2xl px-4 py-3.5 shadow-xl flex items-center gap-3">
      <p className="text-sm font-medium flex-1">Nueva versión disponible</p>
      <button
        onClick={() => window.location.reload()}
        className="text-xs font-bold bg-white text-guinda-800 px-3 py-1.5 rounded-xl hover:bg-guinda-50 transition-colors shrink-0">
        Actualizar
      </button>
    </div>
  );
}
