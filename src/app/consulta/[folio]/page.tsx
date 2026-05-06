import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle, Clock, AlertCircle, XCircle, Search, ChevronLeft, Info } from "lucide-react";

const STATUS_MAP = {
  pendiente: {
    label: "Pendiente",
    description: "Tu solicitud fue recibida y está en espera de revisión.",
    Icon: Clock,
    cardBg: "bg-gray-50",
    cardBorder: "border-gray-200",
    badge: "bg-gray-100 text-gray-600",
    iconBg: "bg-gray-100",
    iconColor: "text-gray-500",
  },
  revision: {
    label: "En revisión",
    description: "Un funcionario municipal está revisando tu solicitud.",
    Icon: Clock,
    cardBg: "bg-yellow-50",
    cardBorder: "border-yellow-200",
    badge: "bg-yellow-100 text-yellow-700",
    iconBg: "bg-yellow-100",
    iconColor: "text-yellow-600",
  },
  aprobado: {
    label: "Aprobado",
    description: "¡Tu solicitud fue aprobada! Pronto recibirás más información.",
    Icon: CheckCircle,
    cardBg: "bg-emerald-50",
    cardBorder: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  rechazado: {
    label: "Rechazado",
    description: "Tu solicitud no pudo ser aprobada. Acude a la ventanilla municipal para más información.",
    Icon: XCircle,
    cardBg: "bg-red-50",
    cardBorder: "border-red-200",
    badge: "bg-red-100 text-red-700",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
  },
} as const;

export default async function ConsultaFolioPage({
  params,
}: {
  params: Promise<{ folio: string }>;
}) {
  const { folio: folioRaw } = await params;
  const folio = folioRaw.toUpperCase();

  const match = folio.match(/^CAP-2026-([0-9A-F]{4})$/);
  if (!match) notFound();

  const suffix = match[1].toLowerCase();

  const { data, error } = await supabase
    .from("submissions")
    .select("id, status, comunidad, timestamp, nombreCompleto")
    .ilike("id", `%${suffix}`)
    .limit(1)
    .maybeSingle();

  if (error || !data) notFound();

  const statusKey = (data.status ?? "pendiente") as keyof typeof STATUS_MAP;
  const s = STATUS_MAP[statusKey] ?? STATUS_MAP.pendiente;
  const { Icon } = s;

  const primerNombre = (data.nombreCompleto as string).split(" ")[0];
  const fecha = new Date(data.timestamp as string).toLocaleDateString("es-MX", {
    day: "2-digit", month: "long", year: "numeric",
  });

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
          <div className="flex items-center gap-2">
            <p className="text-guinda-300 text-xs font-medium">Folio:</p>
            <p className="text-white text-sm font-bold font-mono tracking-wider">{folio}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center px-4 pt-6 pb-10">
        <div className="w-full max-w-sm space-y-4">

          {/* Estado principal */}
          <div className={`${s.cardBg} border ${s.cardBorder} rounded-2xl p-6 text-center`}>
            <div className={`w-16 h-16 ${s.iconBg} rounded-full flex items-center justify-center mx-auto mb-3`}>
              <Icon className={`w-8 h-8 ${s.iconColor}`} strokeWidth={1.5} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Estado del trámite</p>
            <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold mb-3 ${s.badge}`}>
              {s.label}
            </span>
            <p className="text-sm text-gray-600 leading-relaxed">{s.description}</p>
          </div>

          {/* Datos de la solicitud */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/70">
              <p className="text-sm font-semibold text-gray-700">Datos de la solicitud</p>
            </div>
            <div className="px-5 divide-y divide-gray-100">
              {[
                { label: "Folio",             value: folio,          mono: true  },
                { label: "Solicitante",       value: `${primerNombre}…`           },
                { label: "Comunidad",         value: data.comunidad as string     },
                { label: "Fecha de registro", value: fecha                        },
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex items-start justify-between py-3 gap-4">
                  <span className="text-xs text-gray-400 font-medium shrink-0">{label}</span>
                  <span className={`text-sm text-gray-700 text-right ${mono ? "font-mono text-xs tracking-wider" : ""}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Nota */}
          <div className="flex items-start gap-2.5 bg-guinda-50 border border-guinda-100 rounded-2xl px-4 py-3">
            <Info className="w-4 h-4 text-guinda-500 shrink-0 mt-px" strokeWidth={2} />
            <p className="text-xs text-guinda-700 leading-relaxed">
              Para más información acude a la Contraloría Municipal de Ixmiquilpan con tu folio impreso.
            </p>
          </div>

          {/* Acciones */}
          <div className="space-y-3 pt-1">
            <Link href="/consulta"
              className="flex items-center justify-center gap-2 bg-guinda-700 hover:bg-guinda-800 active:scale-[.98] text-white font-bold py-3.5 rounded-2xl text-sm shadow-sm transition-all w-full">
              <Search className="w-4 h-4" strokeWidth={2} /> Consultar otro folio
            </Link>
            <div className="text-center">
              <Link href="/"
                className="inline-flex items-center gap-1 text-xs text-guinda-600 hover:text-guinda-800 font-medium">
                <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} /> Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
