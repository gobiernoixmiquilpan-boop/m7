import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Regularización de Tierras · Capula",
    short_name: "Capula 2026",
    description:
      "Solicitud de regularización de tierras — Contraloría Municipal de Ixmiquilpan",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#6e112c",
    theme_color: "#6e112c",
    categories: ["government"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
