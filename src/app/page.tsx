"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { detectLote } from "@/lib/pointInPolygon";
import { LOTES, type Lote } from "@/lib/lots";

interface PoligonoEntry {
  loteNum: string;
  predioNum: string;
  lotes: string[];
}

const LotesMapDynamic = dynamic(() => import("@/components/LotesMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[280px] bg-gray-100 rounded-xl animate-pulse flex items-center justify-center text-xs text-gray-400">
      Cargando mapa…
    </div>
  ),
});
import {
  Info, Home as HomeIcon, CreditCard, MapPin,
  Droplets, CloudRain, Camera, Upload, AlertCircle, Check,
  ChevronDown, CheckCircle, ImageIcon, Loader2, ShieldCheck,
  ChevronLeft, ExternalLink, Wifi, Search, FileText, Trash2,
  X, Copy, MessageCircle, QrCode,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface FormData {
  fotoCasa: File | null;
  fotoCasaDerecha: File | null;
  fotoCasaAtras: File | null;
  fotoCasaIzquierda: File | null;
  ubicacion: string;
  lat: number | null;
  lng: number | null;
  comunidad: string;
  nombreCompleto: string;
  fotoINEFrente: File | null;
  fotoINEAtras: File | null;
  celular: string;
  curp: string;
  poligonos: PoligonoEntry[];
  tipoTierra: "riego" | "temporal" | "";
  superficie: string;
  hablaDialecto: "si" | "no" | "";
}

const COMUNIDADES = ["San Pedro Capula", "Capula Centro", "La Huerta de Capula"];
const DRAFT_KEY   = "capula-draft";
const PENDING_KEY = "capula-pending-queue";
const TOTAL_STEPS = 8;

const getDB = async () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open("capula-forms", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("photos");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

const savePhoto = async (key: string, file: File) => {
  try {
    const db = await getDB();
    const tx = db.transaction("photos", "readwrite");
    tx.objectStore("photos").put(file, key);
    await new Promise((r, e) => { tx.oncomplete = r; tx.onerror = e; });
  } catch { /* noop */ }
};

const getPhoto = async (key: string): Promise<File | null> => {
  try {
    const db = await getDB();
    const tx = db.transaction("photos", "readonly");
    return await new Promise((r) => {
      const req = tx.objectStore("photos").get(key);
      req.onsuccess = () => r(req.result ?? null);
    });
  } catch { return null; }
};

const deletePhoto = async (key: string) => {
  try {
    const db = await getDB();
    const tx = db.transaction("photos", "readwrite");
    tx.objectStore("photos").delete(key);
  } catch { /* noop */ }
};

type DraftFields = Omit<FormData, "fotoCasa" | "fotoCasaDerecha" | "fotoCasaAtras" | "fotoCasaIzquierda" | "fotoINEFrente" | "fotoINEAtras">;
type QueueItem   = { tempId: string; id: string; draft: DraftFields };

const STEP_TITLES = [
  "Foto de la casa",
  "Ubicación y comunidad",
  "Nombre del solicitante",
  "Identificación oficial",
  "Datos de contacto",
  "Datos del polígono",
  "Dialecto ñhañhu",
  "Revisión y confirmación",
];

const emptyForm: FormData = {
  fotoCasa: null, fotoCasaDerecha: null, fotoCasaAtras: null, fotoCasaIzquierda: null,
  ubicacion: "", lat: null, lng: null, comunidad: "",
  nombreCompleto: "", fotoINEFrente: null, fotoINEAtras: null,
  celular: "", curp: "", poligonos: [], tipoTierra: "", superficie: "", hablaDialecto: "",
};

function validateStep(step: number, f: FormData): Partial<Record<keyof FormData, string>> {
  const e: Partial<Record<keyof FormData, string>> = {};
  if (step === 1) {
    if (!f.fotoCasa)         e.fotoCasa         = "Requerido";
    if (!f.fotoCasaDerecha)  e.fotoCasaDerecha  = "Requerido";
    if (!f.fotoCasaAtras)    e.fotoCasaAtras    = "Requerido";
    if (!f.fotoCasaIzquierda) e.fotoCasaIzquierda = "Requerido";
  }
  if (step === 2) {
    if (!f.ubicacion.trim()) e.ubicacion = "Requerido";
    if (!f.comunidad)        e.comunidad  = "Requerido";
  }
  if (step === 3 && !f.nombreCompleto.trim()) e.nombreCompleto = "Requerido";
  if (step === 4) {
    if (!f.fotoINEFrente) e.fotoINEFrente = "Requerido";
    if (!f.fotoINEAtras)  e.fotoINEAtras  = "Requerido";
  }
  if (step === 5) {
    if (!/^\d{10}$/.test(f.celular))                              e.celular = "Debe tener 10 dígitos";
    if (!/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(f.curp)) e.curp    = "CURP inválida";
  }
  if (step === 6) {
    if (f.poligonos.length === 0 || f.poligonos.some((p) => !p.loteNum.trim()))
      e.poligonos = "Selecciona al menos un polígono en el mapa";
    if (!f.tipoTierra)            e.tipoTierra = "Seleccione una opción";
    const sup = parseFloat(f.superficie);
    if (!f.superficie.trim() || isNaN(sup) || sup < 1 || sup > 99999)
      e.superficie = "Debe ser entre 1 y 99,999 m²";
  }
  if (step === 7 && !f.hablaDialecto) e.hablaDialecto = "Seleccione una opción";
  return e;
}

async function compressImage(file: File, maxWidth = 1280, quality = 0.75): Promise<File> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    const fallback = setTimeout(() => { URL.revokeObjectURL(url); resolve(file); }, 8000);
    const done = (result: File) => { clearTimeout(fallback); resolve(result); };
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round(height * (maxWidth / width));
        width = maxWidth;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => done(blob ? new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }) : file),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); done(file); };
    img.src = url;
  });
}

/* ═══════════════════════════════════════════════════════ */

export default function Home() {
  const [step,        setStep]        = useState(0);
  const [form,        setForm]        = useState<FormData>(emptyForm);
  const [previews,    setPreviews]    = useState({ fotoCasa: null as string | null, fotoCasaDerecha: null as string | null, fotoCasaAtras: null as string | null, fotoCasaIzquierda: null as string | null, fotoINEFrente: null as string | null, fotoINEAtras: null as string | null });
  const [submitted,          setSubmitted]          = useState(false);
  const [submittedId,        setSubmittedId]        = useState("");
  const [submittedOffline,   setSubmittedOffline]   = useState(false);
  const [submittedOfflineId, setSubmittedOfflineId] = useState("");
  const [canInstall,         setCanInstall]         = useState(false);
  const [hasDraft,           setHasDraft]           = useState(false);
  const installPrompt = useRef<{ prompt: () => Promise<void> } | null>(null);
  const [pendingCount,     setPendingCount]     = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [compressing,  setCompressing]  = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [submitError,  setSubmitError]  = useState<string | null>(null);
  const [submitFolio,  setSubmitFolio]  = useState<string | null>(null);
  const [errors,      setErrors]      = useState<Partial<Record<keyof FormData, string>>>({});
  const [geoLoading,    setGeoLoading]    = useState(false);
  const [geoSeconds,    setGeoSeconds]    = useState(0);
  const [geoError,      setGeoError]      = useState<string | null>(null);
  const [detectedLote,  setDetectedLote]  = useState<Lote | null>(null);
  const geoTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showSaved,   setShowSaved]   = useState(false);
  const [offline,     setOffline]     = useState(false);
  const [consented,   setConsented]   = useState(false);
  const [loteNumInputs,   setLoteNumInputs]   = useState<Record<string, string>>({});
  const [loteNumErrs,     setLoteNumErrs]     = useState<Record<string, string | null>>({});

  const skipFirstSave = useRef(true);
  const saveTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepDir       = useRef<"forward" | "back">("forward");
  const retryTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraining    = useRef(false);

  /* ── Load from localStorage after mount (evita hydration mismatch) ── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as DraftFields;
        skipFirstSave.current = true;
        setForm((f) => ({ ...f, ...parsed }));
        if (parsed.nombreCompleto || parsed.comunidad || parsed.ubicacion) setHasDraft(true);
      }
    } catch { /* noop */ }
    try {
      const q = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]") as unknown[];
      if (Array.isArray(q)) setPendingCount(q.length);
    } catch { /* noop */ }
  }, []);

  /* ── Draft save ── */
  useEffect(() => {
    if (skipFirstSave.current) { skipFirstSave.current = false; return; }
    const { fotoCasa, fotoCasaDerecha: cds, fotoCasaAtras: cas, fotoCasaIzquierda: cis, fotoINEFrente: a, fotoINEAtras: b, ...draft } = form;
    void fotoCasa; void cds; void cas; void cis; void a; void b;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        setShowSaved(true);
        saveTimer.current = setTimeout(() => setShowSaved(false), 2000);
      }, 0);
    } catch { /* noop */ }
  }, [form]);

  async function drainQueue() {
    if (isDraining.current) return;
    isDraining.current = true;
    let queue: QueueItem[] = [];
    try { queue = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]"); } catch { isDraining.current = false; return; }
    if (queue.length === 0) { isDraining.current = false; return; }

    const remaining: QueueItem[] = [];
    for (const item of queue) {
      try {
        const fd = new FormData();
        Object.entries(item.draft).forEach(([k, v]) => {
          if (v !== null && v !== undefined)
            fd.append(k, typeof v === "object" ? JSON.stringify(v) : String(v));
        });
        // Campos de compatibilidad derivados del primer polígono (requeridos por el API)
        const firstPg = item.draft.poligonos?.[0];
        if (firstPg) {
          fd.append("predio", firstPg.predioNum);
          fd.append("lote",   firstPg.loteNum);
        }
        if (item.id) fd.append("id", item.id);
        const fotoCasa          = await getPhoto(`${item.tempId}_fotoCasa`);
        const fotoCasaDerecha   = await getPhoto(`${item.tempId}_fotoCasaDerecha`);
        const fotoCasaAtras     = await getPhoto(`${item.tempId}_fotoCasaAtras`);
        const fotoCasaIzquierda = await getPhoto(`${item.tempId}_fotoCasaIzquierda`);
        const fotoINEFrente = await getPhoto(`${item.tempId}_fotoINEFrente`);
        const fotoINEAtras  = await getPhoto(`${item.tempId}_fotoINEAtras`);
        if (fotoCasa)          fd.append("fotoCasa",          fotoCasa);
        if (fotoCasaDerecha)   fd.append("fotoCasaDerecha",   fotoCasaDerecha);
        if (fotoCasaAtras)     fd.append("fotoCasaAtras",     fotoCasaAtras);
        if (fotoCasaIzquierda) fd.append("fotoCasaIzquierda", fotoCasaIzquierda);
        if (fotoINEFrente) fd.append("fotoINEFrente", fotoINEFrente);
        if (fotoINEAtras)  fd.append("fotoINEAtras",  fotoINEAtras);

        const res = await fetch("/api/submissions", { method: "POST", body: fd });

        // 4xx = terminal error (bad data, CURP duplicate, etc.) — drop item from queue
        if (res.status >= 400 && res.status < 500) {
          await deletePhoto(`${item.tempId}_fotoCasa`);
          await deletePhoto(`${item.tempId}_fotoCasaDerecha`);
          await deletePhoto(`${item.tempId}_fotoCasaAtras`);
          await deletePhoto(`${item.tempId}_fotoCasaIzquierda`);
          await deletePhoto(`${item.tempId}_fotoINEFrente`);
          await deletePhoto(`${item.tempId}_fotoINEAtras`);
          continue;
        }
        if (!res.ok) throw new Error("server_error");

        await deletePhoto(`${item.tempId}_fotoCasa`);
        await deletePhoto(`${item.tempId}_fotoCasaDerecha`);
        await deletePhoto(`${item.tempId}_fotoCasaAtras`);
        await deletePhoto(`${item.tempId}_fotoCasaIzquierda`);
        await deletePhoto(`${item.tempId}_fotoINEFrente`);
        await deletePhoto(`${item.tempId}_fotoINEAtras`);
      } catch {
        remaining.push(item);
      }
    }

    if (remaining.length === 0) {
      localStorage.removeItem(PENDING_KEY);
    } else {
      localStorage.setItem(PENDING_KEY, JSON.stringify(remaining));
    }
    setPendingCount(remaining.length);
    isDraining.current = false;
  }

  /* ── Connection monitoring & retry ── */
  useEffect(() => {
    const handleOnline = () => {
      setOffline(false);
      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(() => drainQueue(), 500);
    };
    const handleOffline = () => setOffline(true);

    setOffline(!navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  /* ── Drain queue on mount if already online ── */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (navigator.onLine) drainQueue();
  }, []);

  /* ── Advertencia al cerrar con datos sin enviar ── */
  useEffect(() => {
    if (step === 0 || submitted) return;
    const hasData = !!(form.nombreCompleto || form.comunidad || form.ubicacion || form.fotoCasa);
    if (!hasData) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [step, submitted, form.nombreCompleto, form.comunidad, form.ubicacion, form.fotoCasa]);

  /* ── Geo timer cleanup ── */
  useEffect(() => {
    return () => { if (geoTimer.current) clearInterval(geoTimer.current); };
  }, []);

  /* ── PWA install prompt ── */
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      installPrompt.current = e as unknown as { prompt: () => Promise<void> };
      setCanInstall(true);
    };
    const installed = () => { setCanInstall(false); installPrompt.current = null; };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  async function handleFile(field: "fotoCasa" | "fotoCasaDerecha" | "fotoCasaAtras" | "fotoCasaIzquierda" | "fotoINEFrente" | "fotoINEAtras", file: File | null) {
    if (!file || compressing) return;
    if (file.size > 10 * 1024 * 1024) {
      setErrors((p) => ({ ...p, [field]: "La imagen no puede superar 10 MB" }));
      return;
    }
    setCompressing(true);
    const compressed = await compressImage(file);
    setCompressing(false);
    setForm((p) => ({ ...p, [field]: compressed }));
    savePhoto(field, compressed);
    setPreviews((p) => {
      if (p[field]) URL.revokeObjectURL(p[field]!);
      return { ...p, [field]: URL.createObjectURL(compressed) };
    });
    setErrors((p) => ({ ...p, [field]: undefined }));
  }

  function scrollToFirstError() {
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(".border-red-200, .border-red-300");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }

  function nextStep() {
    const e = validateStep(step, form);
    if (Object.keys(e).length > 0) { setErrors(e); scrollToFirstError(); return; }
    setErrors({});
    stepDir.current = "forward";
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function prevStep() {
    setErrors({});
    stepDir.current = "back";
    setStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addLoteNum(poligonoLoteNum: string, value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const pg = form.poligonos.find((x) => x.loteNum === poligonoLoteNum);
    if (!pg) return;
    if (pg.lotes.map((l) => l.toUpperCase()).includes(trimmed.toUpperCase())) {
      setLoteNumErrs((e) => ({ ...e, [poligonoLoteNum]: `El lote "${trimmed}" ya fue agregado a este polígono` }));
      return;
    }
    setLoteNumErrs((e) => ({ ...e, [poligonoLoteNum]: null }));
    setLoteNumInputs((e) => ({ ...e, [poligonoLoteNum]: "" }));
    setForm((p) => ({
      ...p,
      poligonos: p.poligonos.map((x) =>
        x.loteNum === poligonoLoteNum ? { ...x, lotes: [...x.lotes, trimmed] } : x
      ),
    }));
  }

  async function submit() {
    // Re-validate all steps (user could have gone back and cleared a field)
    for (let s = 1; s <= TOTAL_STEPS; s++) {
      const e = validateStep(s, form);
      if (Object.keys(e).length > 0) {
        setErrors(e);
        stepDir.current = "back";
        setStep(s);
        scrollToFirstError();
        return;
      }
    }
    setErrors({});
    setLoading(true);
    setSubmitError(null);
    setSubmitFolio(null);
    try {
      const fd = new FormData();
      (Object.entries({
        nombreCompleto: form.nombreCompleto, comunidad: form.comunidad,
        ubicacion: form.ubicacion, celular: form.celular, curp: form.curp,
        predio: form.poligonos[0]?.predioNum ?? "",
        lote:   form.poligonos[0]?.loteNum   ?? "",
        tipoTierra: form.tipoTierra,
        superficie: form.superficie, hablaDialecto: form.hablaDialecto,
      }) as [string, string][]).forEach(([k, v]) => fd.append(k, v));
      fd.append("poligonos", JSON.stringify(form.poligonos));
      if (form.lat != null) fd.append("lat", String(form.lat));
      if (form.lng != null) fd.append("lng", String(form.lng));
      if (form.fotoCasa)         fd.append("fotoCasa",         form.fotoCasa);
      if (form.fotoCasaDerecha)  fd.append("fotoCasaDerecha",  form.fotoCasaDerecha);
      if (form.fotoCasaAtras)    fd.append("fotoCasaAtras",    form.fotoCasaAtras);
      if (form.fotoCasaIzquierda) fd.append("fotoCasaIzquierda", form.fotoCasaIzquierda);
      if (form.fotoINEFrente) fd.append("fotoINEFrente", form.fotoINEFrente);
      if (form.fotoINEAtras)  fd.append("fotoINEAtras",  form.fotoINEAtras);

      let res: Response;
      try {
        res = await fetch("/api/submissions", { method: "POST", body: fd });
      } catch {
        // Error de red real (sin conexión): guardar en cola persistente
        const offlineId = crypto.randomUUID();
        const tempId = `q${Date.now()}`;
        const { fotoCasa, fotoCasaDerecha: cd, fotoCasaAtras: ca, fotoCasaIzquierda: ci, fotoINEFrente: a, fotoINEAtras: b, ...draft } = form;
        try {
          if (fotoCasa) await savePhoto(`${tempId}_fotoCasa`, fotoCasa);
          if (cd) await savePhoto(`${tempId}_fotoCasaDerecha`,   cd);
          if (ca) await savePhoto(`${tempId}_fotoCasaAtras`,     ca);
          if (ci) await savePhoto(`${tempId}_fotoCasaIzquierda`, ci);
          if (a)        await savePhoto(`${tempId}_fotoINEFrente`, a);
          if (b)        await savePhoto(`${tempId}_fotoINEAtras`, b);
          const queue: QueueItem[] = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]");
          queue.push({ tempId, id: offlineId, draft });
          localStorage.setItem(PENDING_KEY, JSON.stringify(queue));
          setPendingCount(queue.length);
        } catch { /* noop */ }
        localStorage.removeItem(DRAFT_KEY);
        setSubmittedOfflineId(offlineId);
        setSubmittedOffline(true);
        setSubmitted(true);
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: string; folio?: string } | null;
        setSubmitError(body?.error ?? `Error del servidor (${res.status}). Intenta de nuevo.`);
        if (res.status === 409 && body?.folio) setSubmitFolio(body.folio);
        return;
      }

      const data = await res.json() as { id: string };
      localStorage.removeItem(DRAFT_KEY);
      await deletePhoto("fotoCasa");
      await deletePhoto("fotoCasaDerecha");
      await deletePhoto("fotoCasaAtras");
      await deletePhoto("fotoCasaIzquierda");
      await deletePhoto("fotoINEFrente");
      await deletePhoto("fotoINEAtras");
      setSubmittedId(data.id);
      setSubmitted(true);
      void drainQueue();
    } finally {
      setLoading(false);
    }
  }

  function discardDraft() {
    localStorage.removeItem(DRAFT_KEY);
    setForm(emptyForm);
    setHasDraft(false);
  }

  function reset() {
    setSubmitted(false); setSubmittedId(""); setSubmittedOffline(false); setSubmittedOfflineId(""); setStep(0);
    setForm(emptyForm);
    setDetectedLote(null);
    setPreviews((p) => {
      if (p.fotoCasa)          URL.revokeObjectURL(p.fotoCasa);
      if (p.fotoCasaDerecha)   URL.revokeObjectURL(p.fotoCasaDerecha);
      if (p.fotoCasaAtras)     URL.revokeObjectURL(p.fotoCasaAtras);
      if (p.fotoCasaIzquierda) URL.revokeObjectURL(p.fotoCasaIzquierda);
      if (p.fotoINEFrente)     URL.revokeObjectURL(p.fotoINEFrente);
      if (p.fotoINEAtras)      URL.revokeObjectURL(p.fotoINEAtras);
      return { fotoCasa: null, fotoCasaDerecha: null, fotoCasaAtras: null, fotoCasaIzquierda: null, fotoINEFrente: null, fotoINEAtras: null };
    });
    setErrors({});
    localStorage.removeItem(DRAFT_KEY);
  }

  function useGeo() {
    if (!navigator.geolocation) {
      setGeoError("Tu navegador no soporta geolocalización.");
      return;
    }
    setGeoSeconds(0);
    setGeoLoading(true);
    setGeoError(null);
    if (geoTimer.current) clearInterval(geoTimer.current);
    geoTimer.current = setInterval(() => setGeoSeconds((s) => s + 1), 1000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (geoTimer.current) clearInterval(geoTimer.current);
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setForm((p) => ({ ...p, ubicacion: `${lat}, ${lng}`, lat, lng }));
        setErrors((p) => ({ ...p, ubicacion: undefined }));
        setDetectedLote(detectLote(lat, lng));
        setGeoLoading(false);
      },
      (err) => {
        if (geoTimer.current) clearInterval(geoTimer.current);
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("Permiso denegado. Activa la ubicación en tu navegador.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGeoError("No se pudo obtener la ubicación. Escríbela manualmente.");
        } else {
          setGeoError("Tiempo de espera agotado. Escríbela manualmente.");
        }
      },
      { timeout: 35000, enableHighAccuracy: true }
    );
  }

  /* ══ Pantalla de éxito — sin conexión ══ */
  if (submitted && submittedOffline) {
    const offlineFolio = submittedOfflineId
      ? `CAP-2026-${submittedOfflineId.slice(-6).toUpperCase()}`
      : null;
    return (
      <main className="min-h-screen bg-guinda-50 flex items-center justify-center p-5">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center animate-success">
          <div className="flex items-center justify-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-guinda-100 flex items-center justify-center overflow-hidden shrink-0">
              <Image src="/logo.svg" alt="RegulaTierra" width={22} height={22} />
            </div>
            <span className="text-[11px] text-guinda-600 font-bold uppercase tracking-widest">RegulaTierra</span>
          </div>
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Wifi className="w-10 h-10 text-yellow-500" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Solicitud guardada</h2>
          <p className="text-gray-600 text-sm mt-2 leading-relaxed">
            Sin conexión — se enviará <strong>automáticamente</strong> al recuperar señal.
          </p>
          {offlineFolio && (
            <div className="mt-4 rounded-2xl px-6 py-4" style={{ background: "linear-gradient(135deg,#370916 0%,#6e112c 100%)" }}>
              <p className="text-guinda-300 text-[10px] font-bold uppercase tracking-widest mb-1">Folio provisional</p>
              <p className="text-white text-2xl font-bold font-mono tracking-wider">{offlineFolio}</p>
              <p className="text-guinda-300 text-[10px] mt-1">Guarda este número para consultar tu estado</p>
            </div>
          )}
          {offlineFolio && (
            <button
              onClick={async () => {
                try { await navigator.clipboard.writeText(offlineFolio); } catch { /* noop */ }
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
              }}
              className="mt-3 w-full flex items-center justify-center gap-2 border-2 border-guinda-200 hover:border-guinda-400 text-guinda-700 text-sm font-semibold py-3 rounded-2xl transition-all">
              {copied ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <Copy className="w-4 h-4" strokeWidth={2} />}
              {copied ? "¡Copiado!" : "Copiar número de folio"}
            </button>
          )}
          {offlineFolio && (
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Mi folio provisional de regularización Capula 2026: ${offlineFolio} (pendiente de envío cuando haya conexión)`)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 w-full flex items-center justify-center gap-2 border-2 border-emerald-200 hover:border-emerald-400 text-emerald-700 text-sm font-semibold py-3 rounded-2xl transition-all">
              <MessageCircle className="w-4 h-4" strokeWidth={2} /> Guardar folio por WhatsApp
            </a>
          )}
          <div className="mt-3 flex items-start gap-2 bg-guinda-50 border border-guinda-100 rounded-xl px-4 py-3">
            <ShieldCheck className="w-4 h-4 text-guinda-600 shrink-0 mt-px" strokeWidth={2} />
            <p className="text-xs text-guinda-700 font-medium text-left">
              Toma una captura de pantalla como comprobante.
            </p>
          </div>
          <button onClick={reset}
            className="mt-5 w-full bg-guinda-700 hover:bg-guinda-800 active:scale-[.98] text-white px-6 py-3.5 rounded-2xl font-semibold transition-all">
            Registrar otra persona
          </button>
        </div>
      </main>
    );
  }

  /* ══ Pantalla de éxito — con conexión ══ */
  if (submitted) {
    const folioNum = `CAP-2026-${submittedId.slice(-6).toUpperCase()}`;
    return (
      <main className="min-h-screen bg-guinda-50 flex items-center justify-center p-5">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center animate-success">
          <div className="flex items-center justify-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-guinda-100 flex items-center justify-center overflow-hidden shrink-0">
              <Image src="/logo.svg" alt="RegulaTierra" width={22} height={22} />
            </div>
            <span className="text-[11px] text-guinda-600 font-bold uppercase tracking-widest">RegulaTierra</span>
          </div>
          <div className="w-20 h-20 bg-guinda-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-guinda-700" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold text-guinda-800 mb-1">¡Solicitud enviada!</h2>
          <p className="text-gray-600 text-sm mt-2">
            Gracias, <strong className="text-guinda-700">{form.nombreCompleto}</strong>.
          </p>
          <div className="mt-4 rounded-2xl px-6 py-4" style={{ background: "linear-gradient(135deg,#370916 0%,#6e112c 100%)" }}>
            <p className="text-guinda-300 text-[10px] font-bold uppercase tracking-widest mb-1">Folio de registro</p>
            <p className="text-white text-2xl font-bold font-mono tracking-wider">{folioNum}</p>
            <p className="text-guinda-300 text-[10px] mt-1">Guarda este número como comprobante</p>
          </div>
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-guinda-100">
              <QRCodeSVG
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/consulta/${folioNum}`}
                size={140}
                fgColor="#6b1022"
                level="M"
              />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-gray-400">
              <QrCode className="w-3.5 h-3.5" strokeWidth={2} />
              Escanea para consultar tu solicitud
            </p>
          </div>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed">
            Nos comunicaremos al número <strong>{form.celular}</strong>.
          </p>

          {/* Timeline ¿Qué pasa ahora? */}
          <div className="mt-4 bg-gray-50 border border-gray-100 rounded-2xl p-4 text-left">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">¿Qué pasa ahora?</p>
            {([
              { n: "1", title: "Revisión", desc: "El municipio revisa tu documentación." },
              { n: "2", title: "Validación", desc: "Se verifica la información en campo." },
              { n: "3", title: "Resultado", desc: "Recibirás respuesta por este número." },
            ] as const).map((s, i, arr) => (
              <div key={s.n} className="flex gap-3">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-6 h-6 rounded-full bg-guinda-100 text-guinda-700 flex items-center justify-center text-[11px] font-bold">{s.n}</div>
                  {i < arr.length - 1 && <div className="w-px flex-1 bg-gray-200 my-1" />}
                </div>
                <div className={i < arr.length - 1 ? "pb-3" : ""}>
                  <p className="text-xs font-semibold text-gray-700">{s.title}</p>
                  <p className="text-xs text-gray-400">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={async () => {
              try { await navigator.clipboard.writeText(folioNum); } catch { /* noop */ }
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            }}
            className="mt-3 w-full flex items-center justify-center gap-2 border-2 border-guinda-200 hover:border-guinda-400 text-guinda-700 text-sm font-semibold py-3 rounded-2xl transition-all">
            {copied ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <Copy className="w-4 h-4" strokeWidth={2} />}
            {copied ? "¡Copiado!" : "Copiar número de folio"}
          </button>
          <Link href={`/consulta/${folioNum}`}
            className="mt-3 w-full flex items-center justify-center gap-2 border-2 border-guinda-200 hover:border-guinda-400 text-guinda-700 text-sm font-semibold py-3 rounded-2xl transition-all">
            <Search className="w-4 h-4" strokeWidth={2} /> Ver estado de mi solicitud
          </Link>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Mi folio de regularización de tierras Capula 2026: ${folioNum}\nConsulta el estado en: ${typeof window !== "undefined" ? window.location.origin : ""}/consulta/${folioNum}`)}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 w-full flex items-center justify-center gap-2 border-2 border-emerald-200 hover:border-emerald-400 text-emerald-700 text-sm font-semibold py-3 rounded-2xl transition-all">
            <MessageCircle className="w-4 h-4" strokeWidth={2} /> Compartir por WhatsApp
          </a>
          <button onClick={reset}
            className="mt-5 w-full bg-guinda-700 hover:bg-guinda-800 active:scale-[.98] text-white px-6 py-3.5 rounded-2xl font-semibold transition-all">
            Nueva solicitud
          </button>
        </div>
      </main>
    );
  }

  /* ══ Pantalla de inicio ══ */
  if (step === 0) {
    return (
      <main className="min-h-screen bg-[#f8f7f8] flex flex-col">
        <div className="rounded-b-[2.5rem] shadow-xl px-5 pt-12 pb-10 relative overflow-hidden"
          style={{ background: "linear-gradient(145deg,#370916 0%,#6e112c 55%,#8b1438 100%)" }}>
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle,rgba(255,255,255,0.07) 0%,transparent 70%)" }} />
          <div className="max-w-sm mx-auto flex flex-col items-center text-center relative">
            <div className="w-20 h-20 rounded-3xl bg-white/15 flex items-center justify-center mb-5 overflow-hidden">
              <Image src="/logo.svg" alt="RegulaTierra" width={52} height={52} priority />
            </div>
            <p className="text-guinda-200 text-[11px] font-semibold uppercase tracking-widest mb-1">
              Contraloría Municipal · Ixmiquilpan
            </p>
            <h1 className="text-2xl font-bold text-white mb-1">RegulaTierra</h1>
            <p className="text-guinda-300 text-sm">Regularización de Tierras · Capula 2026</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center px-5 pt-8 pb-10 w-full max-w-sm mx-auto space-y-4">
          {hasDraft && (
            <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-amber-600 shrink-0" strokeWidth={2} />
                <p className="text-sm font-semibold text-amber-800">Tienes un borrador guardado</p>
              </div>
              <p className="text-xs text-amber-700 mb-3">
                {form.nombreCompleto ? `Registro de ${form.nombreCompleto.split(" ")[0]}` : "Registro en progreso"} — continúa donde lo dejaste.
              </p>
              <div className="flex gap-2">
                <button onClick={() => { setHasDraft(false); setStep(1); }}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2 rounded-xl transition-all">
                  Continuar
                </button>
                <button onClick={discardDraft}
                  className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-amber-200 text-amber-600 hover:bg-amber-100 transition-all">
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>
          )}
          {pendingCount > 0 && !offline && (
            <div className="w-full flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={2.5} />
              <p className="text-xs text-emerald-800 font-medium">
                Enviando {pendingCount} solicitud{pendingCount > 1 ? "es" : ""} guardada{pendingCount > 1 ? "s" : ""}…
              </p>
            </div>
          )}
          {offline && (
            <div className="w-full flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3">
              <Wifi className="w-4 h-4 text-yellow-600 shrink-0" strokeWidth={2} />
              <p className="text-xs text-yellow-800 font-medium">Sin conexión</p>
            </div>
          )}

          {/* Requisitos antes de empezar */}
          <div className="w-full slide-up-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2.5 text-center">Qué necesitas</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { icon: <CreditCard className="w-4 h-4" strokeWidth={1.5} />, text: "INE vigente" },
                { icon: <FileText className="w-4 h-4" strokeWidth={1.5} />,   text: "CURP" },
                { icon: <Camera className="w-4 h-4" strokeWidth={1.5} />,    text: "Fotos de tu casa" },
                { icon: <MapPin className="w-4 h-4" strokeWidth={1.5} />,    text: "Activar GPS" },
              ] as const).map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-xl px-3 py-2.5">
                  <div className="w-7 h-7 rounded-lg bg-guinda-100 flex items-center justify-center text-guinda-600 shrink-0">{item.icon}</div>
                  <p className="text-xs text-gray-600 font-medium">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => { stepDir.current = "forward"; setStep(1); }}
            className="w-full flex items-center gap-4 bg-guinda-700 hover:bg-guinda-800 active:scale-[.98] rounded-2xl px-5 py-5 shadow-md transition-all slide-up-2">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
              <Upload className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-base font-bold text-white">Nueva solicitud</p>
              <p className="text-xs text-guinda-200 mt-0.5">Registra tu terreno · aprox. 5 minutos</p>
            </div>
            <ChevronDown className="w-5 h-5 text-guinda-300 -rotate-90 shrink-0" strokeWidth={2} />
          </button>

          <Link href="/consulta"
            className="w-full flex items-center gap-4 bg-white border-2 border-guinda-200 hover:border-guinda-400 hover:bg-guinda-50 active:scale-[.98] rounded-2xl px-5 py-5 shadow-sm transition-all slide-up-3">
            <div className="w-12 h-12 rounded-2xl bg-guinda-100 flex items-center justify-center shrink-0">
              <Search className="w-6 h-6 text-guinda-700" strokeWidth={1.5} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-base font-bold text-guinda-800">Consultar mi solicitud</p>
              <p className="text-xs text-gray-400 mt-0.5">Revisa el estado con tu número de folio</p>
            </div>
            <ChevronDown className="w-5 h-5 text-gray-300 -rotate-90 shrink-0" strokeWidth={2} />
          </Link>

          {canInstall && (
            <button
              onClick={async () => {
                if (!installPrompt.current) return;
                await installPrompt.current.prompt();
                setCanInstall(false);
              }}
              className="w-full flex items-center justify-center gap-2 border-2 border-guinda-200 text-guinda-700 font-semibold py-3 rounded-2xl text-sm hover:border-guinda-400 hover:bg-guinda-50 transition-all">
              <ExternalLink className="w-4 h-4" strokeWidth={2} /> Instalar app en este dispositivo
            </button>
          )}

          <p className="text-[10px] text-gray-400 text-center pt-2">
            Información confidencial · Uso exclusivo del municipio
          </p>
        </div>
      </main>
    );
  }

  /* ══ Wizard ══ */
  return (
    <div className="min-h-screen bg-[#f8f7f8] pb-44">

      {/* ── Header ── */}
      <header className="rounded-b-[2rem] shadow-xl relative overflow-hidden"
        style={{ background: "linear-gradient(145deg,#370916 0%,#6e112c 55%,#8b1438 100%)" }}>
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle,rgba(255,255,255,0.06) 0%,transparent 70%)" }} />
        <div className="max-w-2xl mx-auto px-5 pt-6 pb-5 relative">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => { stepDir.current = "back"; setStep(0); }}
              className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0 transition-colors"
              title="Volver al inicio" aria-label="Volver al inicio">
              <X className="w-5 h-5 text-white" strokeWidth={2} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-guinda-200 text-[11px] font-semibold uppercase tracking-widest leading-none">
                Contraloría Municipal · Ixmiquilpan
              </p>
              <p className="text-guinda-300 text-xs mt-0.5">Regularización de Tierras · Capula 2026</p>
            </div>
            {compressing && (
              <span className="text-[10px] text-guinda-300 font-medium flex items-center gap-1 shrink-0">
                <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2.5} /> Procesando…
              </span>
            )}
            {!compressing && showSaved && (
              <span className="text-[10px] text-guinda-300 font-medium flex items-center gap-1 shrink-0 animate-pulse">
                <Check className="w-3 h-3" strokeWidth={2.5} /> Guardado
              </span>
            )}
            {offline && (
              <Wifi className="w-4 h-4 text-yellow-300 shrink-0 animate-pulse" strokeWidth={2.5} />
            )}
          </div>

          <p className="text-[11px] text-guinda-400 font-semibold uppercase tracking-widest mb-0.5">
            Paso {step} de {TOTAL_STEPS} · {Math.round((step / TOTAL_STEPS) * 100)}% completado
          </p>
          <h1 className="text-xl font-bold text-white mb-4">{STEP_TITLES[step - 1]}</h1>

          <div className="flex gap-1" role="list" aria-label="Progreso del formulario">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
              const done = i < step - 1;
              const current = i === step - 1;
              return (
                <button key={i} type="button" role="listitem"
                  onClick={() => { if (done) { setErrors({}); stepDir.current = "back"; setStep(i + 1); window.scrollTo({ top: 0, behavior: "smooth" }); } }}
                  aria-label={`Paso ${i + 1}: ${STEP_TITLES[i]}${current ? " (actual)" : done ? " (completado)" : ""}`}
                  aria-current={current ? "step" : undefined}
                  title={done ? `Volver al paso ${i + 1}: ${STEP_TITLES[i]}` : STEP_TITLES[i]}
                  className={`flex-1 rounded-full transition-all duration-500 ${
                    current ? "h-2.5 bg-white step-active-glow" : done ? "h-1.5 bg-white/70 hover:bg-white cursor-pointer" : "h-1.5 bg-white/20 cursor-default"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </header>

      {/* ── Banner cola pendiente ── */}
      {pendingCount > 0 && !offline && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={2.5} />
          <p className="text-xs text-emerald-800 font-medium">
            Enviando {pendingCount} solicitud{pendingCount > 1 ? "es" : ""} guardada{pendingCount > 1 ? "s" : ""}…
          </p>
        </div>
      )}

      {/* ── Banner offline ── */}
      {offline && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2.5 flex items-center gap-2">
          <Wifi className="w-4 h-4 text-yellow-600 shrink-0" strokeWidth={2} />
          <p className="text-xs text-yellow-800 font-medium">
            Sin conexión — tus datos están guardados y se enviarán cuando recuperes señal.
          </p>
        </div>
      )}

      {/* ── Contenido del paso ── */}
      {/* eslint-disable-next-line react-hooks/refs */}
      <div key={step} className={`max-w-2xl mx-auto px-4 pt-5 space-y-4 ${stepDir.current === "back" ? "step-animate-back" : "step-animate"}`}>

        {/* PASO 1 · Foto de la casa */}
        {step === 1 && (
          <>
            <div className="flex items-start gap-2.5 bg-guinda-50 border border-guinda-100 rounded-2xl px-4 py-3">
              <Info className="w-4 h-4 text-guinda-500 mt-px shrink-0" strokeWidth={2} />
              <p className="text-xs text-guinda-800 leading-relaxed">
                Todos los campos son obligatorios. La información es confidencial y de uso exclusivo del municipio.
              </p>
            </div>
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3.5">
              <Camera className="w-4 h-4 text-blue-500 shrink-0 mt-px" strokeWidth={2} />
              <div className="text-xs text-blue-800 leading-relaxed">
                <p className="font-semibold mb-1">Fotos de la casa</p>
                <p>Toma una foto por cada lado de la vivienda. Buena iluminación, sin filtros.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                { field: "fotoCasa"          as const, label: "Frente"    },
                { field: "fotoCasaDerecha"   as const, label: "Derecha"   },
                { field: "fotoCasaAtras"     as const, label: "Atrás"     },
                { field: "fotoCasaIzquierda" as const, label: "Izquierda" },
              ]).map(({ field, label }) => (
                <div key={field}>
                  <p className="text-[10px] font-bold text-guinda-600 uppercase tracking-widest mb-2">{label}</p>
                  <PhotoUpload
                    label={`Foto ${label}`}
                    icon={<HomeIcon className="w-5 h-5 text-guinda-600" strokeWidth={1.5} />}
                    preview={previews[field]}
                    inputId={`foto-casa-${field}`}
                    onChange={(f) => handleFile(field, f)}
                    error={errors[field]}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {/* PASO 2 · Ubicación y comunidad */}
        {step === 2 && (
          <>
            <Card title="Ubicación del predio" hasError={!!errors.ubicacion}>
              <TextInput placeholder="Ej: Calle Hidalgo s/n, frente a la iglesia" value={form.ubicacion}
                onChange={(v) => { setForm((p) => ({ ...p, ubicacion: v, lat: null, lng: null })); setDetectedLote(null); }}
                error={errors.ubicacion} />
              <button type="button" onClick={useGeo} disabled={geoLoading}
                className="mt-3 inline-flex items-center justify-center gap-2 text-sm text-guinda-700 hover:text-guinda-900 font-medium bg-guinda-50 hover:bg-guinda-100 border border-guinda-200 px-3.5 py-2.5 rounded-xl transition-all w-full disabled:opacity-60">
                {geoLoading
                  ? <Loader2 className="w-4 h-4 animate-spin shrink-0" strokeWidth={2} />
                  : <MapPin className="w-4 h-4 shrink-0" strokeWidth={2} />}
                {geoLoading
                  ? <span>Activando GPS… <span className="font-mono">{geoSeconds}s</span>{geoSeconds >= 12 ? " — puede tardar en interiores" : ""}</span>
                  : form.lat ? "Ubicación obtenida ✓" : "Usar mi ubicación actual"}
              </button>
              {geoError && <FieldError msg={geoError} />}
            </Card>
            <Card title="Comunidad" hasError={!!errors.comunidad}>
              <SelectInput options={COMUNIDADES.map((c) => ({ value: c, label: c }))}
                value={form.comunidad} onChange={(v) => setForm((p) => ({ ...p, comunidad: v }))}
                placeholder="Seleccione la comunidad" error={errors.comunidad} />
            </Card>
          </>
        )}

        {/* PASO 3 · Nombre */}
        {step === 3 && (
          <>
            <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
              <CreditCard className="w-4 h-4 text-blue-500 shrink-0 mt-px" strokeWidth={2} />
              <div className="text-xs text-blue-800 leading-relaxed">
                <p className="font-semibold mb-0.5">Usa exactamente el nombre de tu INE</p>
                <p className="text-blue-600">Formato: <span className="font-mono font-bold">APELLIDO1 APELLIDO2 NOMBRE(S)</span></p>
              </div>
            </div>
            <Card title="Nombre completo" hasError={!!errors.nombreCompleto}>
              <TextInput placeholder="Ej: GARCÍA LÓPEZ MARÍA" value={form.nombreCompleto}
                onChange={(v) => setForm((p) => ({ ...p, nombreCompleto: v.toUpperCase().replace(/ {2,}/g, " ") }))} error={errors.nombreCompleto}
                autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
            </Card>
          </>
        )}

        {/* PASO 4 · INE */}
        {step === 4 && (
          <Card title="Identificación oficial (INE)" hasError={!!errors.fotoINEFrente || !!errors.fotoINEAtras}>
            <p className="text-xs text-gray-400 mb-4">Fotografía ambos lados de tu identificación.</p>
            <div className="grid grid-cols-2 gap-3">
              {(["fotoINEFrente", "fotoINEAtras"] as const).map((field, i) => (
                <div key={field}>
                  <p className="text-[10px] font-bold text-guinda-600 uppercase tracking-widest mb-2">
                    {i === 0 ? "Frente" : "Reverso"}
                  </p>
                  <PhotoUpload
                    label={i === 0 ? "Foto frente" : "Foto reverso"}
                    icon={<CreditCard className="w-5 h-5 text-guinda-600" strokeWidth={1.5} />}
                    preview={previews[field]}
                    inputId={i === 0 ? "foto-ine-frente" : "foto-ine-atras"}
                    onChange={(f) => handleFile(field, f)}
                    error={errors[field]} />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* PASO 5 · Celular + CURP */}
        {step === 5 && (
          <>
            <Card title="Número de celular" hasError={!!errors.celular}>
              <TextInput placeholder="10 dígitos sin espacios" value={form.celular} inputMode="numeric"
                autoComplete="tel"
                onChange={(v) => setForm((p) => ({ ...p, celular: v.replace(/\D/g, "").slice(0, 10) }))}
                error={errors.celular} />
              {form.celular.length === 10 && !errors.celular && (
                <p className="text-xs text-guinda-600 mt-1.5 font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" strokeWidth={2.5} /> Número válido
                </p>
              )}
            </Card>
            <Card title="CURP" hasError={!!errors.curp}>
              <TextInput placeholder="Ej: GOML900101HDFMRR09" value={form.curp}
                onChange={(v) => setForm((p) => ({ ...p, curp: v.replace(/\s/g, "").toUpperCase().slice(0, 18) }))}
                error={errors.curp} autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
              <div className="mt-2.5 flex items-center gap-2">
                <div className="flex-1 flex gap-0.5">
                  {Array.from({ length: 18 }).map((_, i) => (
                    <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${i < form.curp.length ? "bg-guinda-600" : "bg-gray-200"}`} />
                  ))}
                </div>
                <span className={`text-xs font-semibold tabular-nums shrink-0 ${form.curp.length === 18 ? "text-guinda-600" : "text-gray-400"}`}>
                  {form.curp.length}/18
                </span>
              </div>
              {/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(form.curp) && !errors.curp && (
                <p className="text-xs text-guinda-600 mt-1.5 font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" strokeWidth={2.5} /> CURP válida
                </p>
              )}
              <a href="https://www.gob.mx/curp/" target="_blank" rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-guinda-600 hover:text-guinda-800 font-medium">
                <ExternalLink className="w-3 h-3" strokeWidth={2} />
                ¿No recuerdas tu CURP? Consúltala aquí
              </a>
            </Card>
          </>
        )}

        {/* PASO 6 · Datos del predio */}
        {step === 6 && (
          <>
            {/* Banner GPS auto-detect */}
            {detectedLote && !form.poligonos.find((p) => p.loteNum === detectedLote.loteNum) && (
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0" strokeWidth={2} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-blue-800">Tu GPS detectó un polígono</p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Predio {detectedLote.predioNum} · Polígono {detectedLote.loteNum}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setForm((p) => ({
                      ...p,
                      poligonos: [...p.poligonos, { loteNum: detectedLote.loteNum, predioNum: detectedLote.predioNum, lotes: [] }],
                    }));
                    setErrors((p) => ({ ...p, poligonos: undefined }));
                  }}
                  className="text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-xl transition-all shrink-0"
                >
                  Usar
                </button>
              </div>
            )}

            {/* Mapa de lotes */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/70">
                <p className="text-sm font-semibold text-gray-700">Selecciona tu polígono en el mapa</p>
                <p className="text-xs text-gray-400 mt-0.5">Toca el polígono de color — puedes seleccionar más de uno</p>
              </div>
              <div className="p-2">
                <LotesMapDynamic
                  lat={form.lat}
                  lng={form.lng}
                  selectedLotes={form.poligonos.map((p) => p.loteNum)}
                  onSelectLote={(loteNum, predioNum) => {
                    if (!loteNum) return;
                    setForm((p) => {
                      if (p.poligonos.find((x) => x.loteNum === loteNum)) {
                        return { ...p, poligonos: p.poligonos.filter((x) => x.loteNum !== loteNum) };
                      }
                      return { ...p, poligonos: [...p.poligonos, { loteNum, predioNum, lotes: [] }] };
                    });
                    setErrors((p) => ({ ...p, poligonos: undefined }));
                  }}
                  height={320}
                />
              </div>
            </div>

            {/* Polígonos seleccionados con sus lotes */}
            {form.poligonos.length > 0 ? (
              <div className="space-y-3">
                {form.poligonos.map((pg) => {
                  const loteObj = LOTES.find((l) => l.loteNum === pg.loteNum);
                  const inputVal = loteNumInputs[pg.loteNum] ?? "";
                  const inputErr = loteNumErrs[pg.loteNum] ?? null;
                  return (
                    <div key={pg.loteNum} className="rounded-2xl border-2 border-guinda-300 bg-guinda-50/60 p-4">
                      {/* Cabecera del polígono */}
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-white text-xs"
                          style={{ background: loteObj?.color ?? "#6e112c" }}
                        >
                          {pg.loteNum.split("-").pop()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-guinda-500 uppercase tracking-widest">Polígono seleccionado</p>
                          <p className="text-base font-bold text-gray-800 leading-tight">{pg.loteNum}</p>
                          <p className="text-xs text-gray-400">Predio {pg.predioNum}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setForm((p) => ({ ...p, poligonos: p.poligonos.filter((x) => x.loteNum !== pg.loteNum) }));
                            setLoteNumInputs((p) => { const n = { ...p }; delete n[pg.loteNum]; return n; });
                            setLoteNumErrs((p) => { const n = { ...p }; delete n[pg.loteNum]; return n; });
                          }}
                          className="p-1.5 rounded-xl text-guinda-400 hover:text-guinda-700 hover:bg-guinda-100 transition-all shrink-0"
                          title="Quitar polígono"
                          aria-label="Quitar polígono"
                        >
                          <X className="w-4 h-4" strokeWidth={2} />
                        </button>
                      </div>

                      {/* Lotes dentro del polígono */}
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2">Lotes en este polígono</p>
                        {pg.lotes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {pg.lotes.map((loteN) => (
                              <span
                                key={loteN}
                                className="inline-flex items-center gap-1 bg-guinda-100 text-guinda-800 text-xs font-bold px-2.5 py-1 rounded-full"
                              >
                                {loteN}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setForm((p) => ({
                                      ...p,
                                      poligonos: p.poligonos.map((x) =>
                                        x.loteNum === pg.loteNum
                                          ? { ...x, lotes: x.lotes.filter((n) => n !== loteN) }
                                          : x
                                      ),
                                    }))
                                  }
                                  className="text-guinda-400 hover:text-guinda-800 ml-0.5"
                                  aria-label={`Quitar lote ${loteN}`}
                                >
                                  <X className="w-3 h-3" strokeWidth={2.5} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={inputVal}
                            onChange={(e) => {
                              setLoteNumInputs((p) => ({ ...p, [pg.loteNum]: e.target.value }));
                              setLoteNumErrs((p) => ({ ...p, [pg.loteNum]: null }));
                            }}
                            onKeyDown={(e) => { if (e.key === "Enter") addLoteNum(pg.loteNum, inputVal); }}
                            placeholder="Núm. de lote (ej. 1, 2A…)"
                            className={`flex-1 min-w-0 text-xs px-3 py-1.5 rounded-lg border font-medium outline-none transition-colors ${
                              inputErr
                                ? "border-red-400 bg-red-50 text-red-700 placeholder:text-red-300"
                                : "border-gray-200 bg-white text-gray-800 placeholder:text-gray-400 focus:border-guinda-400"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => addLoteNum(pg.loteNum, inputVal)}
                            className="shrink-0 px-3 py-1.5 rounded-lg bg-guinda-700 hover:bg-guinda-800 text-white text-xs font-bold transition-colors"
                          >
                            +
                          </button>
                        </div>
                        {inputErr && (
                          <p className="text-[11px] text-red-500 font-medium mt-1">{inputErr}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`rounded-2xl border-2 border-dashed p-5 flex flex-col items-center gap-2 text-center ${errors.poligonos ? "border-red-300 bg-red-50/40" : "border-gray-200 bg-gray-50"}`}>
                <MapPin className={`w-7 h-7 ${errors.poligonos ? "text-red-300" : "text-gray-300"}`} strokeWidth={1.5} />
                <p className={`text-sm font-medium ${errors.poligonos ? "text-red-500" : "text-gray-400"}`}>
                  {errors.poligonos ?? "Toca tu polígono en el mapa para seleccionarlo"}
                </p>
              </div>
            )}

            <Card title="Tipo de tierra" hasError={!!errors.tipoTierra}>
              <RadioGroup
                options={[
                  { value: "riego",    label: "Riego",    icon: <Droplets className="w-4 h-4" strokeWidth={1.5} /> },
                  { value: "temporal", label: "Temporal", icon: <CloudRain className="w-4 h-4" strokeWidth={1.5} /> },
                ]}
                value={form.tipoTierra}
                onChange={(v) => setForm((p) => ({ ...p, tipoTierra: v as "riego" | "temporal" }))}
                error={errors.tipoTierra} />
            </Card>
            <Card title="Superficie del polígono" hasError={!!errors.superficie}>
              <TextInput placeholder="Ej: 2500" value={form.superficie} inputMode="decimal"
                onChange={(v) => setForm((p) => ({ ...p, superficie: v.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1") }))}
                error={errors.superficie} suffix="m²" />
              <p className="text-xs text-gray-400 mt-1.5">Escribe la superficie en metros cuadrados (m²)</p>
            </Card>
          </>
        )}

        {/* PASO 7 · Dialecto */}
        {step === 7 && (
          <>
            <div className="flex items-start gap-3 bg-violet-50 border border-violet-100 rounded-2xl px-4 py-3.5">
              <MessageCircle className="w-4 h-4 text-violet-500 shrink-0 mt-px" strokeWidth={2} />
              <div className="text-xs text-violet-800 leading-relaxed">
                <p className="font-semibold mb-0.5">Lengua indígena ñhañhu</p>
                <p>Esta información permite al municipio brindar atención en tu lengua materna a quienes lo necesiten.</p>
              </div>
            </div>
            <Card title="¿Habla usted el dialecto ñhañhu?" hasError={!!errors.hablaDialecto}>
              <RadioGroup
                options={[{ value: "si", label: "Sí, lo hablo" }, { value: "no", label: "No lo hablo" }]}
                value={form.hablaDialecto}
                onChange={(v) => setForm((p) => ({ ...p, hablaDialecto: v as "si" | "no" }))}
                error={errors.hablaDialecto} />
            </Card>
          </>
        )}

        {/* PASO 8 · Revisión y confirmación */}
        {step === 8 && (
          <>
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
              <Info className="w-4 h-4 text-amber-600 mt-px shrink-0" strokeWidth={2} />
              <p className="text-xs text-amber-800 leading-relaxed">
                Revisa cuidadosamente tus datos antes de enviar. Una vez enviada no podrás modificar tu solicitud.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between border-l-4 border-l-guinda-700">
                <p className="text-sm font-semibold text-gray-700">Datos personales</p>
                <button type="button"
                  onClick={() => { setErrors({}); stepDir.current = "back"; setStep(5); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="text-xs text-guinda-600 hover:text-guinda-800 font-semibold">
                  Editar →
                </button>
              </div>
              <div className="px-5 divide-y divide-gray-100">
                <ReviewRow label="Nombre" value={form.nombreCompleto} />
                <ReviewRow label="CURP" value={form.curp} mono />
                <ReviewRow label="Celular" value={form.celular.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")} />
                <ReviewRow label="Comunidad" value={form.comunidad} />
                <ReviewRow label="Habla ñhañhu" value={form.hablaDialecto === "si" ? "Sí" : "No"} />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between border-l-4 border-l-blue-500">
                <p className="text-sm font-semibold text-gray-700">Datos del polígono</p>
                <button type="button"
                  onClick={() => { setErrors({}); stepDir.current = "back"; setStep(6); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="text-xs text-guinda-600 hover:text-guinda-800 font-semibold">
                  Editar →
                </button>
              </div>
              <div className="px-5 divide-y divide-gray-100">
                {form.poligonos.map((pg, i) => (
                  <div key={pg.loteNum} className="py-3">
                    <p className="text-[10px] font-bold text-guinda-500 uppercase tracking-widest mb-1">
                      Polígono {i + 1}
                    </p>
                    <p className="text-sm font-semibold text-gray-800">{pg.loteNum} · Predio {pg.predioNum}</p>
                    {pg.lotes.length > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">Lotes: {pg.lotes.join(", ")}</p>
                    )}
                  </div>
                ))}
                <ReviewRow label="Tipo" value={form.tipoTierra === "riego" ? "Riego" : "Temporal"} />
                <ReviewRow label="Superficie" value={`${form.superficie} m²`} />
                <ReviewRow label="Ubicación" value={form.ubicacion} />
                {form.lat != null && form.lng != null && (
                  <ReviewRow label="GPS" value={`${form.lat}, ${form.lng}`} mono />
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between border-l-4 border-l-amber-500">
                <p className="text-sm font-semibold text-gray-700">Fotografías</p>
                <button type="button"
                  onClick={() => { setErrors({}); stepDir.current = "back"; setStep(1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="text-xs text-guinda-600 hover:text-guinda-800 font-semibold">
                  Editar →
                </button>
              </div>
              <div className="px-5 py-4">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {(["fotoCasa", "fotoCasaDerecha", "fotoCasaAtras", "fotoCasaIzquierda", "fotoINEFrente", "fotoINEAtras"] as const).map((key, i) => {
                    const label = ["Casa frente", "Casa derecha", "Casa atrás", "Casa izquierda", "INE frente", "INE reverso"][i];
                    return (
                      <div key={key} className="flex flex-col items-center gap-1.5">
                        <p className="text-[10px] text-gray-400 font-medium text-center">{label}</p>
                        {previews[key] ? (
                          <div className="relative w-full h-20 rounded-xl overflow-hidden border border-gray-100">
                            <Image src={previews[key]!} alt={label} fill className="object-cover" unoptimized />
                          </div>
                        ) : (
                          <div className="w-full h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50">
                            <p className="text-[10px] text-gray-300">Sin foto</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <label htmlFor="consent-check"
              className={`flex items-start gap-3 rounded-2xl border-2 px-4 py-4 cursor-pointer transition-all ${
                consented
                  ? "border-guinda-400 bg-guinda-50 shadow-sm"
                  : "border-gray-200 bg-gray-50/60 hover:border-guinda-200"
              }`}>
              <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                consented ? "bg-guinda-700 border-guinda-700" : "border-gray-300 bg-white"
              }`}>
                {consented && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </div>
              <input
                type="checkbox"
                id="consent-check"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
                className="sr-only"
              />
              <span className="text-xs text-gray-700 leading-relaxed">
                Confirmo que los datos proporcionados son <strong className="text-gray-800">correctos y verídicos</strong>. Entiendo que proporcionar información falsa puede resultar en el rechazo de mi solicitud.
              </span>
            </label>
          </>
        )}
      </div>

      {/* ── Barra de navegación fija ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-4 pt-4 z-20"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        {step === TOTAL_STEPS && submitError && (
          <div role="alert" className="max-w-2xl mx-auto mb-3">
            <p className="text-red-600 text-xs text-center bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={2} /> {submitError}
            </p>
            {submitFolio && (
              <div className="mt-1.5 text-center">
                <Link href={`/consulta/${submitFolio}`}
                  className="text-xs text-guinda-700 underline font-semibold">
                  Consultar folio {submitFolio} →
                </Link>
              </div>
            )}
          </div>
        )}
        <div className="max-w-2xl mx-auto flex gap-3">
          {step > 1 ? (
            <button type="button" onClick={prevStep}
              className="flex items-center gap-1.5 px-5 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-600 hover:border-guinda-300 hover:text-guinda-700 font-semibold text-sm transition-all shrink-0">
              <ChevronLeft className="w-4 h-4" strokeWidth={2} /> Anterior
            </button>
          ) : <div />}

          {step < TOTAL_STEPS ? (
            <button type="button" onClick={nextStep} disabled={compressing}
              className="flex-1 bg-guinda-700 hover:bg-guinda-800 disabled:opacity-60 active:scale-[.98] text-white font-bold py-3.5 rounded-2xl text-sm shadow-sm transition-all flex items-center justify-center gap-2">
              {compressing ? <><Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} /> Procesando foto…</> : "Siguiente →"}
            </button>
          ) : (
            <div className="flex-1 flex flex-col gap-1.5">
              <button type="button" onClick={submit} disabled={loading || compressing || !consented}
                className="w-full bg-guinda-700 hover:bg-guinda-800 disabled:opacity-50 active:scale-[.98] text-white font-bold py-3.5 rounded-2xl text-sm shadow-sm transition-all flex items-center justify-center gap-2">
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} /> Enviando…</>
                  : "Enviar solicitud"}
              </button>
              {!consented && (
                <p className="text-[10px] text-gray-400 text-center">Confirma los datos para habilitar el envío</p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-center gap-3 mt-2">
          <p className="text-[10px] text-gray-400">Contraloría Municipal de Ixmiquilpan</p>
          <span className="text-gray-300 text-[10px]">·</span>
          <Link href="/consulta" className="text-xs text-guinda-600 font-semibold hover:text-guinda-800 underline underline-offset-2">
            Consultar folio
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Componentes ──────────────────────────────── */

function Card({ title, children, hasError }: { title: string; children: React.ReactNode; hasError?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${hasError ? "border-red-200" : "border-gray-100"}`}>
      <div className={`flex items-center gap-3 px-5 py-3.5 border-b ${hasError ? "border-red-100 bg-red-50/40" : "border-gray-100 bg-gray-50/70"}`}>
        <p className="text-sm font-semibold text-gray-700 flex-1">{title}</p>
        <span className="text-guinda-400 font-bold text-base leading-none">*</span>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <p role="alert" className="text-red-500 text-xs mt-2 flex items-center gap-1">
      <AlertCircle className="w-3 h-3 shrink-0" strokeWidth={2} /> {msg}
    </p>
  );
}

function TextInput({ placeholder, value, onChange, error, inputMode, suffix, autoCapitalize, autoCorrect, spellCheck, autoComplete }: {
  placeholder: string; value: string; onChange: (v: string) => void;
  error?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]; suffix?: string;
  autoCapitalize?: string; autoCorrect?: string; spellCheck?: boolean; autoComplete?: string;
}) {
  return (
    <>
      <div className="relative">
        <input type="text" inputMode={inputMode} placeholder={placeholder} value={value}
          onChange={(e) => onChange(e.target.value)}
          autoCapitalize={autoCapitalize} autoCorrect={autoCorrect} spellCheck={spellCheck} autoComplete={autoComplete}
          className={`w-full border rounded-xl px-4 py-3 text-gray-800 text-base focus:outline-none focus:ring-2 focus:ring-guinda-500 focus:border-transparent transition-all placeholder:text-gray-400 ${suffix ? "pr-12" : ""} ${error ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50/50 focus:bg-white"}`}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-guinda-500">
            {suffix}
          </span>
        )}
      </div>
      {error && <FieldError msg={error} />}
    </>
  );
}

function SelectInput({ options, value, onChange, placeholder, error }: {
  options: { value: string; label: string }[]; value: string; onChange: (v: string) => void;
  placeholder: string; error?: string;
}) {
  return (
    <>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)}
          className={`w-full border rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-guinda-500 focus:border-transparent transition-all appearance-none pr-10 ${error ? "border-red-300 bg-red-50 text-gray-800" : "border-gray-200 bg-gray-50/50 focus:bg-white text-gray-800"} ${!value ? "text-gray-400" : ""}`}>
          <option value="" disabled>{placeholder}</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          <ChevronDown className="w-4 h-4 text-gray-400" strokeWidth={2} />
        </div>
      </div>
      {error && <FieldError msg={error} />}
    </>
  );
}

function RadioGroup({ options, value, onChange, error }: {
  options: { value: string; label: string; icon?: React.ReactNode }[];
  value: string; onChange: (v: string) => void; error?: string;
}) {
  return (
    <>
      <div className="flex gap-3" role="group">
        {options.map((o) => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 text-sm font-semibold transition-all ${
              value === o.value
                ? "border-guinda-700 bg-guinda-700 text-white shadow-sm"
                : "border-gray-200 bg-gray-50 text-gray-500 hover:border-guinda-300 hover:bg-guinda-50 hover:text-guinda-700"
            }`}>
            {o.icon}{o.label}
          </button>
        ))}
      </div>
      {error && <FieldError msg={error} />}
    </>
  );
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between py-2.5 gap-3">
      <span className="text-xs text-gray-400 font-medium shrink-0">{label}</span>
      <span className={`text-sm text-gray-700 text-right break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}

function PhotoUpload({ label, icon, preview, inputId, onChange, error }: {
  label: string; icon: React.ReactNode; preview: string | null;
  inputId: string; onChange: (f: File) => void; error?: string;
}) {
  const camId = `${inputId}-cam`;
  const galId = `${inputId}-gal`;
  const handle = (e: React.ChangeEvent<HTMLInputElement>) =>
    e.target.files?.[0] && onChange(e.target.files[0]);

  return (
    <>
      <input id={camId} type="file" accept="image/*" capture="environment" className="hidden" onChange={handle} />
      <input id={galId} type="file" accept="image/*"                       className="hidden" onChange={handle} />

      <div className={`border-2 border-dashed rounded-2xl overflow-hidden h-40 flex flex-col ${
        error ? "border-red-300 bg-red-50/60" : preview ? "border-guinda-300" : "border-gray-200 bg-gray-50/60"
      }`}>
        {preview ? (
          <div className="relative flex-1">
            <Image src={preview} alt={label} fill className="object-cover" unoptimized />
            {/* Badge ✓ */}
            <div className="absolute top-2 right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-md z-10">
              <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-guinda-950/80 to-transparent flex flex-col justify-end p-2 gap-1.5">
              <div className="flex gap-1.5">
                <label htmlFor={camId}
                  className="flex-1 flex items-center justify-center gap-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-[10px] font-semibold py-1.5 rounded-lg cursor-pointer select-none border border-white/30">
                  <Camera className="w-3 h-3" strokeWidth={2} /> Cámara
                </label>
                <label htmlFor={galId}
                  className="flex-1 flex items-center justify-center gap-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-[10px] font-semibold py-1.5 rounded-lg cursor-pointer select-none border border-white/30">
                  <ImageIcon className="w-3 h-3" strokeWidth={2} /> Galería
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-between flex-1 py-3 px-2">
            <div className="flex flex-col items-center gap-1.5 flex-1 justify-center">
              <div className="w-9 h-9 rounded-xl bg-guinda-100 flex items-center justify-center">{icon}</div>
              <p className="text-[11px] text-gray-500 font-medium text-center leading-tight">{label}</p>
            </div>
            <div className="flex gap-1.5 w-full mt-2">
              <label htmlFor={camId}
                className="flex-1 flex items-center justify-center gap-1 bg-guinda-700 hover:bg-guinda-800 active:scale-[.97] text-white text-[10px] font-semibold py-2 rounded-xl cursor-pointer select-none transition-all">
                <Camera className="w-3 h-3" strokeWidth={2} /> Cámara
              </label>
              <label htmlFor={galId}
                className="flex-1 flex items-center justify-center gap-1 border-2 border-guinda-200 hover:border-guinda-400 text-guinda-700 text-[10px] font-semibold py-2 rounded-xl cursor-pointer select-none transition-all">
                <ImageIcon className="w-3 h-3" strokeWidth={2} /> Galería
              </label>
            </div>
          </div>
        )}
      </div>
      {error && <FieldError msg={error} />}
    </>
  );
}
