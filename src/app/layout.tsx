import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import FormErrorBoundary from "@/components/FormErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Regularización de Tierras · Capula",
  description:
    "Solicitud de regularización de tierras — Contraloría Municipal de Ixmiquilpan",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Capula 2026",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#6e112c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <style dangerouslySetInnerHTML={{ __html: `#app-splash{position:fixed;inset:0;z-index:9999;background:linear-gradient(145deg,#2a0710 0%,#6e112c 45%,#9b1840 80%,#7a1535 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;}` }} />
      <body className="min-h-full flex flex-col">
        {/* Splash puro CSS — aparece al instante, sin esperar JS */}
        <div id="app-splash" aria-hidden="true">
          {/* Orbs */}
          <div style={{ position:"absolute", top:-80, right:-80, width:320, height:320, borderRadius:"50%", background:"radial-gradient(circle,rgba(255,255,255,0.08) 0%,transparent 65%)", pointerEvents:"none" }} />
          <div style={{ position:"absolute", bottom:-64, left:-64, width:256, height:256, borderRadius:"50%", background:"radial-gradient(circle,rgba(255,80,80,0.06) 0%,transparent 70%)", pointerEvents:"none" }} />
          {/* Logo */}
          <div style={{ position:"relative", marginBottom:28 }}>
            <div className="splash-ring" style={{ position:"absolute", inset:0, borderRadius:24, pointerEvents:"none" }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="splash-logo" style={{ width:96, height:96, borderRadius:24, background:"rgba(255,255,255,0.2)", border:"1px solid rgba(255,255,255,0.3)", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", boxShadow:"0 25px 50px rgba(0,0,0,0.4)", position:"relative" }}>
              <img src="/logo.svg" alt="" width={60} height={60} />
            </div>
          </div>
          {/* Textos */}
          <p className="splash-text-1" style={{ color:"#f5b3c7", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8, fontFamily:"system-ui,sans-serif" }}>
            Contraloría Municipal · Ixmiquilpan
          </p>
          <h1 className="splash-text-2" style={{ color:"#fff", fontSize:"2.6rem", fontWeight:900, letterSpacing:"-0.02em", lineHeight:1, marginBottom:8, fontFamily:"system-ui,sans-serif" }}>
            RegulaTierra
          </h1>
          <p className="splash-text-3" style={{ color:"#ec7da2", fontSize:14, fontWeight:500, fontFamily:"system-ui,sans-serif" }}>
            Regularización de Tierras · Capula 2026
          </p>
          {/* Barra de progreso */}
          <div style={{ position:"absolute", bottom:56, left:"50%", transform:"translateX(-50%)", width:112, height:3, borderRadius:99, background:"rgba(255,255,255,0.1)", overflow:"hidden" }}>
            <div className="splash-bar" style={{ height:"100%", background:"linear-gradient(90deg,rgba(245,179,199,0.6) 0%,rgba(255,255,255,0.7) 100%)", borderRadius:99 }} />
          </div>
        </div>

        <PwaRegister />
        <FormErrorBoundary>
          {children}
        </FormErrorBoundary>
      </body>
    </html>
  );
}
