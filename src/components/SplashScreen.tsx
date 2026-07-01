"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 1900);
    const t2 = setTimeout(onDone, 2350);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-all duration-500 ease-in ${
        fading ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
      style={{ background: "linear-gradient(145deg,#2a0710 0%,#6e112c 45%,#9b1840 80%,#7a1535 100%)" }}
    >
      {/* Orbs decorativos */}
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle,rgba(255,255,255,0.08) 0%,transparent 65%)" }} />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle,rgba(255,80,80,0.06) 0%,transparent 70%)" }} />
      <div className="absolute top-1/3 right-1/4 w-40 h-40 rounded-full pointer-events-none float-slow"
        style={{ background: "radial-gradient(circle,rgba(255,255,255,0.035) 0%,transparent 70%)" }} />

      {/* Logo con anillo de pulso */}
      <div className="relative mb-7">
        <div className="splash-ring absolute inset-0 rounded-3xl pointer-events-none" />
        <div className="splash-logo w-24 h-24 rounded-3xl bg-white/20 border border-white/30 flex items-center justify-center overflow-hidden shadow-2xl">
          <Image src="/logo.svg" alt="RegulaTierra" width={60} height={60} priority />
        </div>
      </div>

      {/* Textos en cascada */}
      <p className="splash-text-1 text-guinda-200 text-[11px] font-bold uppercase tracking-widest mb-2">
        Contraloría Municipal · Ixmiquilpan
      </p>
      <h1 className="splash-text-2 text-[2.6rem] font-black text-white tracking-tight leading-none mb-2">
        RegulaTierra
      </h1>
      <p className="splash-text-3 text-guinda-300 text-sm font-medium">
        Regularización de Tierras · Capula 2026
      </p>

      {/* Barra de progreso */}
      <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-28 h-[3px] rounded-full bg-white/10 overflow-hidden">
        <div className="splash-bar h-full rounded-full"
          style={{ background: "linear-gradient(90deg,rgba(245,179,199,0.6) 0%,rgba(255,255,255,0.7) 100%)" }} />
      </div>
    </div>
  );
}
