"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Info, Home as HomeIcon, CreditCard, MapPin,
  Droplets, CloudRain, Camera, Upload, AlertCircle, Check,
  ChevronDown, CheckCircle, ImageIcon, Loader2, ShieldCheck,
  ChevronLeft, ExternalLink, Wifi, Search, FileText, Trash2,
  X, Copy,
} from "lucide-react";

interface FormData {
  fotoCasa: File | null;
  ubicacion: string;
  lat: number | null;
  lng: number | null;
  comunidad: string;
  nombreCompleto: string;
  fotoINEFrente: File | null;
  fotoINEAtras: File | null;
  celular: string;
  curp: string;
  predio: string;
  lote: string;
  tipoTierra: "riego" | "temporal" | "";
  superficie: string;
  hablaDialecto: "si" | "no" | "";
}

const COMUNIDADES = ["Capula", "El Alberto", "El Deca", "El Nith", "La Estancia", "Otra"];
const DRAFT_KEY   = "capula-draft";
const PENDING_KEY = "capula-pending-queue";
const TOTAL_STEPS = 7;

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

type DraftFields = Omit<FormData, "fotoCasa" | "fotoINEFrente" | "fotoINEAtras">;
type QueueItem   = { tempId: string; id: string; draft: DraftFields };

const STEP_TITLES = [
  "Foto de la casa",
  "Ubicación y comunidad",
  "Nombre del solicitante",
  "Identificación oficial",
  "Datos de contacto",
  "Datos del predio",
  "Dialecto ñhañhu",
];

const emptyForm: FormData = {
  fotoCasa: null, ubicacion: "", lat: null, lng: null, comunidad: "",
  nombreCompleto: "", fotoINEFrente: null, fotoINEAtras: null,
  celular: "", curp: "", predio: "", lote: "", tipoTierra: "", superficie: "", hablaDialecto: "",
};

function validateStep(step: number, f: FormData): Partial<Record<keyof FormData, string>> {
  const e: Partial<Record<keyof FormData, string>> = {};
  if (step === 1 && !f.fotoCasa) e.fotoCasa = "Requerido";
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
    if (!f.predio.trim())    e.predio    = "Requerido";
    if (!f.lote.trim())      e.lote      = "Requerido";
    if (!f.tipoTierra)       e.tipoTierra = "Seleccione una opción";
    const sup = parseFloat(f.superficie);
    if (!f.superficie.trim() || isNaN(sup) || sup <= 0) e.superficie = "Debe ser mayor a 0";
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
  const [form,        setForm]        = useState<FormData>(() => {
    if (typeof window === "undefined") return emptyForm;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return { ...emptyForm, ...(JSON.parse(saved) as DraftFields) };
    } catch { /* noop */ }
    return emptyForm;
  });
  const [previews,    setPreviews]    = useState({ fotoCasa: null as string | null, fotoINEFrente: null as string | null, fotoINEAtras: null as string | null });
  const [submitted,          setSubmitted]          = useState(false);
  const [submittedId,        setSubmittedId]        = useState("");
  const [submittedOffline,   setSubmittedOffline]   = useState(false);
  const [submittedOfflineId, setSubmittedOfflineId] = useState("");
  const [canInstall,         setCanInstall]         = useState(false);
  const [hasDraft,           setHasDraft]           = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null") as DraftFields | null;
      return !!(d && (d.nombreCompleto || d.comunidad || d.ubicacion));
    } catch { return false; }
  });
  const installPrompt = useRef<{ prompt: () => Promise<void> } | null>(null);
  const [pendingCount,     setPendingCount]     = useState(() => {
    if (typeof window === "undefined") return 0;
    try {
      const q = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]") as unknown[];
      return Array.isArray(q) ? q.length : 0;
    } catch { return 0; }
  });
  const [loading,      setLoading]      = useState(false);
  const [compressing,  setCompressing]  = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [submitError,  setSubmitError]  = useState<string | null>(null);
  const [errors,      setErrors]      = useState<Partial<Record<keyof FormData, string>>>({});
  const [geoLoading,  setGeoLoading]  = useState(false);
  const [geoSeconds,  setGeoSeconds]  = useState(0);
  const [geoError,    setGeoError]    = useState<string | null>(null);
  const geoTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showSaved,   setShowSaved]   = useState(false);
  const [offline,     setOffline]     = useState(false);

  const skipFirstSave = useRef(true);
  const saveTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepDir       = useRef<"forward" | "back">("forward");
  const retryTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Draft save ── */
  useEffect(() => {
    if (skipFirstSave.current) { skipFirstSave.current = false; return; }
    const { fotoCasa, fotoINEFrente: a, fotoINEAtras: b, ...draft } = form;
    void fotoCasa; void a; void b;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        setShowSaved(true);
        saveTimer.current = setTimeout(() => setShowSaved(false), 2000);
      }, 0);
    } catch { /* noop */ }
  }, [form]);

  /* ── Connection monitoring & retry ── */
  useEffect(() => {
    const handleOnline = () => {
      setOffline(false);
      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(() => drainQueue(), 500);
    };
    const handleOffline = () => setOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Drain queue on mount if already online ── */
  useEffect(() => {
    if (navigator.onLine) drainQueue();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Advertencia al cerrar con datos sin enviar ── */
  useEffect(() => {
    if (step === 0 || submitted) return;
    const hasData = !!(form.nombreCompleto || form.comunidad || form.ubicacion || form.fotoCasa);
    if (!hasData) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [step, submitted, form.nombreCompleto, form.comunidad, form.ubicacion, form.fotoCasa]);

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

  async function handleFile(field: "fotoCasa" | "fotoINEFrente" | "fotoINEAtras", file: File | null) {
    if (!file || compressing) return;
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
    try {
      const fd = new FormData();
      (Object.entries({
        nombreCompleto: form.nombreCompleto, comunidad: form.comunidad,
        ubicacion: form.ubicacion, celular: form.celular, curp: form.curp,
        predio: form.predio, lote: form.lote, tipoTierra: form.tipoTierra,
        superficie: form.superficie, hablaDialecto: form.hablaDialecto,
      }) as [string, string][]).forEach(([k, v]) => fd.append(k, v));
      if (form.lat != null) fd.append("lat", String(form.lat));
      if (form.lng != null) fd.append("lng", String(form.lng));
      if (form.fotoCasa)      fd.append("fotoCasa",      form.fotoCasa);
      if (form.fotoINEFrente) fd.append("fotoINEFrente", form.fotoINEFrente);
      if (form.fotoINEAtras)  fd.append("fotoINEAtras",  form.fotoINEAtras);

      let res: Response;
      try {
        res = await fetch("/api/submissions", { method: "POST", body: fd });
      } catch {
        // Error de red real (sin conexión): guardar en cola persistente
        const offlineId = crypto.randomUUID();
        const tempId = `q${Date.now()}`;
        const { fotoCasa, fotoINEFrente: a, fotoINEAtras: b, ...draft } = form;
        try {
          if (fotoCasa) await savePhoto(`${tempId}_fotoCasa`, fotoCasa);
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
        // Error del servidor (4xx/5xx): mostrar mensaje real al usuario
        const body = await res.json().catch(() => null) as { error?: string } | null;
        setSubmitError(body?.error ?? `Error del servidor (${res.status}). Intenta de nuevo.`);
        return;
      }

      const data = await res.json() as { id: string };
      localStorage.removeItem(DRAFT_KEY);
      await deletePhoto("fotoCasa");
      await deletePhoto("fotoINEFrente");
      await deletePhoto("fotoINEAtras");
      setSubmittedId(data.id);
      setSubmitted(true);
      void drainQueue(); // envía en segundo plano cualquier otra solicitud en cola
    } finally {
      setLoading(false);
    }
  }

  async function drainQueue() {
    let queue: QueueItem[] = [];
    try { queue = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]"); } catch { return; }
    if (queue.length === 0) return;

    const remaining: QueueItem[] = [];
    for (const item of queue) {
      try {
        const fd = new FormData();
        Object.entries(item.draft).forEach(([k, v]) => {
          if (v !== null && v !== undefined) fd.append(k, String(v));
        });
        if (item.id) fd.append("id", item.id);
        const fotoCasa      = await getPhoto(`${item.tempId}_fotoCasa`);
        const fotoINEFrente = await getPhoto(`${item.tempId}_fotoINEFrente`);
        const fotoINEAtras  = await getPhoto(`${item.tempId}_fotoINEAtras`);
        if (fotoCasa)      fd.append("fotoCasa",      fotoCasa);
        if (fotoINEFrente) fd.append("fotoINEFrente", fotoINEFrente);
        if (fotoINEAtras)  fd.append("fotoINEAtras",  fotoINEAtras);

        const res = await fetch("/api/submissions", { method: "POST", body: fd });
        if (!res.ok) throw new Error();

        await deletePhoto(`${item.tempId}_fotoCasa`);
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
  }

  function discardDraft() {
    localStorage.removeItem(DRAFT_KEY);
    setForm(emptyForm);
    setHasDraft(false);
  }

  function reset() {
    setSubmitted(false); setSubmittedId(""); setSubmittedOffline(false); setSubmittedOfflineId(""); setStep(1);
    setForm(emptyForm);
    setPreviews((p) => {
      if (p.fotoCasa)      URL.revokeObjectURL(p.fotoCasa);
      if (p.fotoINEFrente) URL.revokeObjectURL(p.fotoINEFrente);
      if (p.fotoINEAtras)  URL.revokeObjectURL(p.fotoINEAtras);
      return { fotoCasa: null, fotoINEFrente: null, fotoINEAtras: null };
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
      { timeout: 25000, enableHighAccuracy: false }
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
            <div className="mt-4 bg-guinda-800 rounded-2xl px-6 py-4">
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
          <div className="mt-4 bg-guinda-800 rounded-2xl px-6 py-4">
            <p className="text-guinda-300 text-[10px] font-bold uppercase tracking-widest mb-1">Folio de registro</p>
            <p className="text-white text-2xl font-bold font-mono tracking-wider">{folioNum}</p>
            <p className="text-guinda-300 text-[10px] mt-1">Guarda este número como comprobante</p>
          </div>
          <p className="text-gray-500 text-sm mt-4 leading-relaxed">
            Nos comunicaremos al número <strong>{form.celular}</strong>.
          </p>
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
        <div className="bg-guinda-800 rounded-b-[2.5rem] shadow-lg px-5 pt-12 pb-10">
          <div className="max-w-sm mx-auto flex flex-col items-center text-center">
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

          <button onClick={() => { stepDir.current = "forward"; setStep(1); }}
            className="w-full flex items-center gap-4 bg-guinda-700 hover:bg-guinda-800 active:scale-[.98] rounded-2xl px-5 py-5 shadow-md transition-all slide-up-2">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
              <Upload className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-base font-bold text-white">Nueva solicitud</p>
              <p className="text-xs text-guinda-200 mt-0.5">Registra tu terreno por primera vez</p>
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
      <header className="bg-guinda-800 rounded-b-[2rem] shadow-lg">
        <div className="max-w-2xl mx-auto px-5 pt-6 pb-5">
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
            Paso {step} de {TOTAL_STEPS}
          </p>
          <h1 className="text-xl font-bold text-white mb-4">{STEP_TITLES[step - 1]}</h1>

          <div className="flex gap-1">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
              const done = i < step - 1;
              const current = i === step - 1;
              return (
                <button key={i} type="button"
                  onClick={() => { if (done) { setErrors({}); stepDir.current = "back"; setStep(i + 1); window.scrollTo({ top: 0, behavior: "smooth" }); } }}
                  title={done ? `Volver al paso ${i + 1}` : undefined}
                  className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                    current ? "bg-white" : done ? "bg-white/70 hover:bg-white cursor-pointer" : "bg-white/20 cursor-default"
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
            <input id="foto-casa-cam" type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile("fotoCasa", e.target.files[0])} />
            <input id="foto-casa-gal" type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile("fotoCasa", e.target.files[0])} />
            {previews.fotoCasa ? (
              <div className="relative rounded-2xl overflow-hidden h-64">
                <Image src={previews.fotoCasa} alt="Foto de la casa" fill className="object-cover" unoptimized />
                <div className="absolute inset-0 bg-gradient-to-t from-guinda-900/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3 flex gap-2">
                  <label htmlFor="foto-casa-cam"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white text-xs font-semibold py-2.5 rounded-xl border border-white/30 cursor-pointer select-none">
                    <Camera className="w-3.5 h-3.5" strokeWidth={2} /> Retomar
                  </label>
                  <label htmlFor="foto-casa-gal"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white text-xs font-semibold py-2.5 rounded-xl border border-white/30 cursor-pointer select-none">
                    <ImageIcon className="w-3.5 h-3.5" strokeWidth={2} /> Cambiar
                  </label>
                </div>
              </div>
            ) : (
              <div className={`rounded-2xl border-2 border-dashed p-8 flex flex-col items-center ${errors.fotoCasa ? "border-red-300 bg-red-50/40" : "border-gray-200 bg-gray-50/60"}`}>
                <div className="w-16 h-16 bg-guinda-100 rounded-2xl flex items-center justify-center mb-3">
                  <HomeIcon className="w-8 h-8 text-guinda-600" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Foto exterior de la casa</p>
                <p className="text-xs text-gray-400 mb-6 text-center">Asegúrate de que se vea la fachada completa</p>
                <div className="flex gap-3 w-full">
                  <label htmlFor="foto-casa-cam"
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-guinda-700 hover:bg-guinda-800 text-white text-sm font-semibold py-3.5 rounded-xl transition-all active:scale-[.97] cursor-pointer select-none">
                    <Camera className="w-4 h-4" strokeWidth={2} /> Tomar foto
                  </label>
                  <label htmlFor="foto-casa-gal"
                    className="flex-1 inline-flex items-center justify-center gap-2 border-2 border-guinda-200 hover:border-guinda-400 text-guinda-700 text-sm font-semibold py-3.5 rounded-xl transition-all active:scale-[.97] cursor-pointer select-none">
                    <Upload className="w-4 h-4" strokeWidth={2} /> Galería
                  </label>
                </div>
              </div>
            )}
            {errors.fotoCasa && <FieldError msg={errors.fotoCasa} />}
          </>
        )}

        {/* PASO 2 · Ubicación y comunidad */}
        {step === 2 && (
          <>
            <Card title="Ubicación del predio" hasError={!!errors.ubicacion}>
              <TextInput placeholder="Ej: Calle Hidalgo s/n, Capula" value={form.ubicacion}
                onChange={(v) => setForm((p) => ({ ...p, ubicacion: v, lat: null, lng: null }))}
                error={errors.ubicacion} />
              <button type="button" onClick={useGeo} disabled={geoLoading}
                className="mt-3 inline-flex items-center justify-center gap-2 text-sm text-guinda-700 hover:text-guinda-900 font-medium bg-guinda-50 hover:bg-guinda-100 border border-guinda-200 px-3.5 py-2.5 rounded-xl transition-all w-full disabled:opacity-60">
                {geoLoading
                  ? <Loader2 className="w-4 h-4 animate-spin shrink-0" strokeWidth={2} />
                  : <MapPin className="w-4 h-4 shrink-0" strokeWidth={2} />}
                {geoLoading
                  ? <span>Buscando señal… <span className="font-mono">{geoSeconds}s</span>{geoSeconds >= 8 ? " — puede tardar en interiores" : ""}</span>
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
          <Card title="Nombre completo" hasError={!!errors.nombreCompleto}>
            <p className="text-xs text-gray-400 mb-3">Escríbelo tal como aparece en tu INE.</p>
            <TextInput placeholder="Apellido Paterno Materno Nombre(s)" value={form.nombreCompleto}
              onChange={(v) => setForm((p) => ({ ...p, nombreCompleto: v }))} error={errors.nombreCompleto} />
          </Card>
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
                onChange={(v) => setForm((p) => ({ ...p, curp: v.toUpperCase().slice(0, 18) }))}
                error={errors.curp} />
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
            <div className="grid grid-cols-2 gap-3.5">
              <Card title="Predio" hasError={!!errors.predio}>
                <TextInput placeholder="Núm. de predio" value={form.predio}
                  onChange={(v) => setForm((p) => ({ ...p, predio: v }))} error={errors.predio} />
              </Card>
              <Card title="Lote" hasError={!!errors.lote}>
                <TextInput placeholder="Núm. de lote" value={form.lote}
                  onChange={(v) => setForm((p) => ({ ...p, lote: v }))} error={errors.lote} />
              </Card>
            </div>
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
            <Card title="Superficie del predio" hasError={!!errors.superficie}>
              <TextInput placeholder="Ej: 2.5" value={form.superficie} inputMode="decimal"
                onChange={(v) => setForm((p) => ({ ...p, superficie: v.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1") }))}
                error={errors.superficie} suffix="ha" />
            </Card>
          </>
        )}

        {/* PASO 7 · Dialecto */}
        {step === 7 && (
          <>
            <p className="text-sm text-gray-500 px-1">
              Esta información ayuda al municipio a brindar mejor atención a la comunidad.
            </p>
            <Card title="¿Habla el dialecto ñhañhu?" hasError={!!errors.hablaDialecto}>
              <RadioGroup
                options={[{ value: "si", label: "Sí" }, { value: "no", label: "No" }]}
                value={form.hablaDialecto}
                onChange={(v) => setForm((p) => ({ ...p, hablaDialecto: v as "si" | "no" }))}
                error={errors.hablaDialecto} />
            </Card>
          </>
        )}
      </div>

      {/* ── Barra de navegación fija ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-4 pt-4 z-20"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        {step === TOTAL_STEPS && submitError && (
          <div className="max-w-2xl mx-auto mb-3">
            <p className="text-red-600 text-xs text-center bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={2} /> {submitError}
            </p>
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
            <button type="button" onClick={submit} disabled={loading || compressing}
              className="flex-1 bg-guinda-700 hover:bg-guinda-800 disabled:opacity-70 active:scale-[.98] text-white font-bold py-3.5 rounded-2xl text-sm shadow-sm transition-all flex items-center justify-center gap-2">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} /> Enviando…</>
                : "Enviar solicitud"}
            </button>
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
    <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
      <AlertCircle className="w-3 h-3 shrink-0" strokeWidth={2} /> {msg}
    </p>
  );
}

function TextInput({ placeholder, value, onChange, error, inputMode, suffix }: {
  placeholder: string; value: string; onChange: (v: string) => void;
  error?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]; suffix?: string;
}) {
  return (
    <>
      <div className="relative">
        <input type="text" inputMode={inputMode} placeholder={placeholder} value={value}
          onChange={(e) => onChange(e.target.value)}
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
      <div className="flex gap-3">
        {options.map((o) => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
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
            <div className="absolute inset-0 bg-guinda-900/60 flex flex-col justify-end p-2 gap-1.5">
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
