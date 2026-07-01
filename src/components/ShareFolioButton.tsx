"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

export default function ShareFolioButton({ folio }: { folio: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/consulta/${folio}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `Solicitud ${folio}`,
          text: "Consulta el estado de tu solicitud de regularización de tierras",
          url,
        });
        return;
      } catch {
        /* user cancelled or not supported */
      }
    }
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <button
      onClick={share}
      className={`flex items-center justify-center gap-2 font-bold py-3.5 rounded-2xl text-sm transition-all w-full active:scale-[.97] border-2 ${
        copied
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : "border-guinda-200 hover:border-guinda-300 text-guinda-700 hover:bg-guinda-50/60"
      }`}>
      {copied
        ? <><Check className="w-4 h-4" strokeWidth={2.5} /> ¡Enlace copiado!</>
        : <><Share2 className="w-4 h-4" strokeWidth={2} /> Compartir estado</>}
    </button>
  );
}
