import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle, Clock, XCircle, Search, ChevronLeft, Info, History } from "lucide-react";
import ShareFolioButton from "@/components/ShareFolioButton";
import PrintComprobanteButton from "@/components/PrintComprobanteButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ folio: string }>;
}): Promise<Metadata> {
  const { folio } = await params;
  const clean = folio.toUpperCase();
  return {
    title: `${clean} · Consultar solicitud`,
    description: `Consulta el estado de la solicitud ${clean} de regularización de tierras — Capula 2026.`,
  };
}

const STATUS_MAP = {
  pendiente: {
    label: "Pendiente de revisión",
    description: "Tu solicitud fue recibida correctamente y está en fila de espera. Recibirás atención en orden de llegada.",
    Icon: Clock,
    cardBg: "bg-gray-50",
    cardBorder: "border-gray-200",
    badge: "bg-gray-100 text-gray-600",
    iconBg: "bg-gray-100",
    iconColor: "text-gray-500",
  },
  revision: {
    label: "En revisión",
    description: "Un funcionario municipal está analizando tu expediente. No es necesario que acudas a la oficina por el momento.",
    Icon: Clock,
    cardBg: "bg-yellow-50",
    cardBorder: "border-yellow-200",
    badge: "bg-yellow-100 text-yellow-700",
    iconBg: "bg-yellow-100",
    iconColor: "text-yellow-600",
  },
  aprobado: {
    label: "Aprobado",
    description: "¡Tu solicitud fue aprobada! Acude a la Contraloría Municipal con tu folio para recoger tu documentación oficial.",
    Icon: CheckCircle,
    cardBg: "bg-emerald-50",
    cardBorder: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  rechazado: {
    label: "No aprobada",
    description: "Tu solicitud no pudo ser aprobada en esta etapa. Acude a la ventanilla municipal con tu folio para conocer los motivos y opciones.",
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

  const match = folio.match(/^CAP-2026-([0-9A-F]{6})$/);
  if (!match) notFound();

  const suffix = match[1].toLowerCase();

  const { data, error } = await supabase
    .from("submissions")
    .select("id, status, comunidad, timestamp, nombreCompleto, motivoRechazo")
    .ilike("id", `%${suffix}`)
    .limit(1)
    .maybeSingle();

  if (error || !data) notFound();

  const { data: historial } = await supabase
    .from("status_history")
    .select("id, status, motivo, created_at")
    .eq("submission_id", data.id)
    .order("created_at", { ascending: true });

  const statusKey = (data.status ?? "pendiente") as keyof typeof STATUS_MAP;
  const s = STATUS_MAP[statusKey] ?? STATUS_MAP.pendiente;
  const { Icon } = s;

  const primerNombre = (data.nombreCompleto as string).split(" ")[0];
  const fecha = new Date(data.timestamp as string).toLocaleDateString("es-MX", {
    day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <main className="min-h-screen bg-guinda-50 flex flex-col print:bg-white print:min-h-0">
      <header className="rounded-b-[2rem] shadow-xl print:hidden" style={{ background: "linear-gradient(145deg,#370916 0%,#6e112c 55%,#8b1438 100%)" }}>
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

      <div className="flex-1 flex flex-col items-center px-4 pt-6 pb-10 print:hidden">
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
            {statusKey === "rechazado" && (data.motivoRechazo as string | null) && (
              <div className="mt-4 bg-red-100 border border-red-200 rounded-xl px-4 py-3 text-left">
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-1">Motivo</p>
                <p className="text-sm text-red-700 leading-relaxed">{data.motivoRechazo as string}</p>
              </div>
            )}
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

          {/* Historial de estados */}
          {historial && historial.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/70 flex items-center gap-2">
                <History className="w-4 h-4 text-gray-400" strokeWidth={2} />
                <p className="text-sm font-semibold text-gray-700">Historial del trámite</p>
              </div>
              <div className="px-5 py-4">
                <ol className="relative border-l-2 border-gray-100 space-y-5 ml-2">
                  {historial.map((h, i) => {
                    const isLast = i === historial.length - 1;
                    const labelMap: Record<string, { label: string; dot: string }> = {
                      pendiente: { label: "Solicitud recibida",  dot: "bg-gray-400"    },
                      revision:  { label: "En revisión",         dot: "bg-yellow-400"  },
                      aprobado:  { label: "Aprobado",            dot: "bg-emerald-500" },
                      rechazado: { label: "No aprobada",         dot: "bg-red-500"     },
                    };
                    const entry = labelMap[h.status as string] ?? { label: h.status as string, dot: "bg-gray-400" };
                    const fechaH = new Date(h.created_at as string).toLocaleDateString("es-MX", {
                      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                    });
                    return (
                      <li key={h.id as number} className="ml-4">
                        <span className={`absolute -left-[9px] w-4 h-4 rounded-full border-2 border-white ${entry.dot} ${isLast ? "ring-2 ring-offset-1 ring-gray-200" : ""}`} />
                        <p className={`text-sm font-semibold ${isLast ? "text-gray-800" : "text-gray-500"}`}>{entry.label}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{fechaH}</p>
                        {h.motivo && (
                          <p className="text-xs text-red-600 mt-1 leading-relaxed">{h.motivo as string}</p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          )}

          {/* Nota */}
          <div className="flex items-start gap-2.5 bg-guinda-50 border border-guinda-100 rounded-2xl px-4 py-3">
            <Info className="w-4 h-4 text-guinda-500 shrink-0 mt-px" strokeWidth={2} />
            <p className="text-xs text-guinda-700 leading-relaxed">
              Para más información acude a la Contraloría Municipal de Ixmiquilpan con tu folio impreso.
            </p>
          </div>

          {/* Acciones */}
          <div className="space-y-3 pt-1 print:hidden">
            <Link href="/consulta"
              className="flex items-center justify-center gap-2 bg-guinda-700 hover:bg-guinda-800 active:scale-[.98] text-white font-bold py-3.5 rounded-2xl text-sm shadow-sm transition-all w-full">
              <Search className="w-4 h-4" strokeWidth={2} /> Consultar otro folio
            </Link>
            <ShareFolioButton folio={folio} />
            <PrintComprobanteButton
              folio={folio}
              nombre={data.nombreCompleto as string}
              comunidad={data.comunidad as string}
              fecha={fecha}
              estado={statusKey}
              estadoLabel={s.label}
              motivoRechazo={(data.motivoRechazo as string | null) ?? null}
            />
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
