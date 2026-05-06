import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Consultar solicitud · Capula 2026",
  description:
    "Consulta el estado de tu solicitud de regularización de tierras con tu número de folio.",
};

export default function ConsultaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
