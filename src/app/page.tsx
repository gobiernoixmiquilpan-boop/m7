"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Info, Home as HomeIcon, CreditCard, MapPin,
  Droplets, CloudRain, Camera, Upload, AlertCircle, Check,
  ChevronDown, CheckCircle, ImageIcon, Loader2, ShieldCheck,
  ChevronLeft, ExternalLink, Wifi,
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
const PENDING_KEY = "capula-pending";
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
    if (!/^\d{10}$/.test(f.celular)) e.celular = "Debe tener 10 dígitos";
    if (f.curp.length !== 18)        e.curp    = "La CURP debe tener 18 caracteres";
  }
  if (step === 6) {
    if (!f.predio.trim())    e.predio    = "Requerido";
    if (!f.lote.trim())      e.lote      = "Requerido";
    if (!f.tipoTierra)       e.tipoTierra = "Seleccione una opción";
    if (!f.superficie.trim()) e.superficie = "Requerido";
  }
  if (step === 7 && !f.hablaDialecto) e.hablaDialecto = "Seleccione una opción";
  return e;
}

/* ═══════════════════════════════════════════════════════ */

export default function Home() {
  const [step,        setStep]        = useState(1);
  const [form,        setForm]        = useState<FormData>(() => {
    if (typeof window === "undefined") return emptyForm;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return { ...emptyForm, ...(JSON.parse(saved) as DraftFields) };
    } catch { /* noop */ }
    return emptyForm;
  });
  const [previews,    setPreviews]    = useState({ fotoCasa: null as string | null, fotoINEFrente: null as string | null, fotoINEAtras: null as string | null });
  const [submitted,   setSubmitted]   = useState(false);
  const [submittedId, setSubmittedId] = useState("");
  const [loading,     setLoading]     = useState(false);
  const [errors,      setErrors]      = useState<Partial<Record<keyof FormData, string>>>({});
  const [geoLoading,  setGeoLoading]  = useState(false);
  const [geoError,    setGeoError]    = useState<string | null>(null);
  const [showSaved,   setShowSaved]   = useState(false);
  const [offline,     setOffline]     = useState(false);

  const skipFirstSave = useRef(true);
  const saveTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      retryTimer.current = setTimeout(() => {
        const pending = sessionStorage.getItem(PENDING_KEY);
        if (pending) retryPendingSubmission();
      }, 500);
    };
    const handleOffline = () => setOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  function handleFile(field: "fotoCasa" | "fotoINEFrente" | "fotoINEAtras", file: File | null) {
    if (!file) return;
    setForm((p) => ({ ...p, [field]: file }));
    savePhoto(field, file);
    setPreviews((p) => {
      if (p[field]) URL.revokeObjectURL(p[field]!);
      return { ...p, [field]: URL.createObjectURL(file) };
    });
    setErrors((p) => ({ ...p, [field]: undefined }));
  }

  function nextStep() {
    const e = validateStep(step, form);
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function prevStep() {
    setErrors({});
    setStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    const e = validateStep(step, form);
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setLoading(true);
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

      const res = await fetch("/api/submissions", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      const data = await res.json() as { id: string };
      localStorage.removeItem(DRAFT_KEY);
      sessionStorage.removeItem(PENDING_KEY);
      setSubmittedId(data.id);
      setSubmitted(true);
    } catch {
      try {
        const { fotoCasa, fotoINEFrente: a, fotoINEAtras: b, ...draft } = form;
        sessionStorage.setItem(PENDING_KEY, JSON.stringify({ draft, fotoCasa: fotoCasa?.name, fotoINEFrente: a?.name, fotoINEAtras: b?.name }));
      } catch { /* noop */ }
      alert("No se pudo enviar. Se reintentará cuando recuperes conexión.");
    } finally {
      setLoading(false);
    }
  }

  async function retryPendingSubmission() {
    const pending = sessionStorage.getItem(PENDING_KEY);
    if (!pending) return;

    setLoading(true);
    try {
      const data = JSON.parse(pending);
      const fd = new FormData();
      Object.entries(data.draft).forEach(([k, v]) => {
        if (v !== null && v !== undefined) fd.append(k, String(v));
      });

      const fotoCasa = await getPhoto("fotoCasa");
      const fotoINEFrente = await getPhoto("fotoINEFrente");
      const fotoINEAtras = await getPhoto("fotoINEAtras");
      if (fotoCasa) fd.append("fotoCasa", fotoCasa);
      if (fotoINEFrente) fd.append("fotoINEFrente", fotoINEFrente);
      if (fotoINEAtras) fd.append("fotoINEAtras", fotoINEAtras);

      const res = await fetch("/api/submissions", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      const result = await res.json() as { id: string };
      localStorage.removeItem(DRAFT_KEY);
      sessionStorage.removeItem(PENDING_KEY);
      await deletePhoto("fotoCasa");
      await deletePhoto("fotoINEFrente");
      await deletePhoto("fotoINEAtras");
      setSubmittedId(result.id);
      setSubmitted(true);
    } catch {
      // Seguirá reintentando cuando vuelva conexión
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setSubmitted(false); setSubmittedId(""); setStep(1);
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
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setForm((p) => ({ ...p, ubicacion: `${lat}, ${lng}`, lat, lng }));
        setErrors((p) => ({ ...p, ubicacion: undefined }));
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("Permiso denegado. Activa la ubicación en tu navegador.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGeoError("No se pudo obtener la ubicación. Escríbela manualmente.");
        } else {
          setGeoError("Tiempo de espera agotado. Escríbela manualmente.");
        }
      },
      { timeout: 10000 }
    );
  }

  /* ══ Pantalla de éxito ══ */
  if (submitted) {
    const folioNum = `CAP-2026-${submittedId.slice(-4)}`;
    return (
      <main className="min-h-screen bg-guinda-50 flex items-center justify-center p-5">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
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
          <div className="mt-3 flex items-center gap-2 bg-guinda-50 border border-guinda-100 rounded-xl px-4 py-3">
            <ShieldCheck className="w-4 h-4 text-guinda-600 shrink-0" strokeWidth={2} />
            <p className="text-xs text-guinda-700 font-medium text-left">
              Toma una captura de pantalla de este comprobante.
            </p>
          </div>
          <button onClick={reset}
            className="mt-5 w-full bg-guinda-700 hover:bg-guinda-800 active:scale-[.98] text-white px-6 py-3.5 rounded-2xl font-semibold transition-all">
            Nueva solicitud
          </button>
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
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 overflow-hidden">
              <Image src="/logo.svg" alt="RegulaTierra logo" width={32} height={32} priority />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-guinda-200 text-[11px] font-semibold uppercase tracking-widest leading-none">
                Contraloría Municipal · Ixmiquilpan
              </p>
              <p className="text-guinda-300 text-xs mt-0.5">Regularización de Tierras · Capula 2026</p>
            </div>
            {showSaved && (
              <span className="text-[10px] text-guinda-300 font-medium flex items-center gap-1 shrink-0 animate-pulse">
                <Check className="w-3 h-3" strokeWidth={2.5} /> Guardado
              </span>
            )}
            {offline && (
              <span className="text-[10px] text-yellow-300 font-medium flex items-center gap-1 shrink-0 animate-pulse">
                <Wifi className="w-3 h-3" strokeWidth={2.5} /> Sin conexión
              </span>
            )}
          </div>

          <p className="text-[11px] text-guinda-400 font-semibold uppercase tracking-widest mb-0.5">
            Paso {step} de {TOTAL_STEPS}
          </p>
          <h1 className="text-xl font-bold text-white mb-4">{STEP_TITLES[step - 1]}</h1>

          <div className="flex gap-1">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i}
                className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${i < step ? "bg-white" : "bg-white/20"}`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* ── Contenido del paso ── */}
      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">

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
                  ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                  : <MapPin className="w-4 h-4" strokeWidth={2} />}
                {geoLoading ? "Obteniendo ubicación…" : form.lat ? "Ubicación obtenida ✓" : "Usar mi ubicación actual"}
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
        <div className="max-w-2xl mx-auto flex gap-3">
          {step > 1 ? (
            <button type="button" onClick={prevStep}
              className="flex items-center gap-1.5 px-5 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-600 hover:border-guinda-300 hover:text-guinda-700 font-semibold text-sm transition-all shrink-0">
              <ChevronLeft className="w-4 h-4" strokeWidth={2} /> Anterior
            </button>
          ) : <div />}

          {step < TOTAL_STEPS ? (
            <button type="button" onClick={nextStep}
              className="flex-1 bg-guinda-700 hover:bg-guinda-800 active:scale-[.98] text-white font-bold py-3.5 rounded-2xl text-sm shadow-sm transition-all">
              Siguiente →
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={loading}
              className="flex-1 bg-guinda-700 hover:bg-guinda-800 disabled:opacity-70 active:scale-[.98] text-white font-bold py-3.5 rounded-2xl text-sm shadow-sm transition-all flex items-center justify-center gap-2">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} /> Enviando…</>
                : "Enviar solicitud"}
            </button>
          )}
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-2">
          Contraloría Municipal de Ixmiquilpan · Información oficial
        </p>
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
  return (
    <>
      <input id={inputId} type="file" accept="image/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])} />
      <label htmlFor={inputId}
        className={`cursor-pointer border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center overflow-hidden transition-all hover:border-guinda-400 h-36 select-none ${error ? "border-red-300 bg-red-50/60" : preview ? "border-guinda-300 bg-guinda-50/40" : "border-gray-200 bg-gray-50/60 hover:bg-guinda-50"}`}>
        {preview ? (
          <div className="relative w-full h-full">
            <Image src={preview} alt={label} fill className="object-cover" unoptimized />
            <div className="absolute inset-0 bg-guinda-900/50 flex items-end justify-center pb-3">
              <span className="inline-flex items-center gap-1.5 text-white text-xs font-semibold bg-guinda-800/80 px-3 py-1.5 rounded-full">
                <Camera className="w-3.5 h-3.5" strokeWidth={2} /> Cambiar
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 px-3">
            <div className="w-10 h-10 rounded-xl bg-guinda-100 flex items-center justify-center">{icon}</div>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className="text-[10px] text-gray-400">Toca para agregar</p>
          </div>
        )}
      </label>
      {error && <FieldError msg={error} />}
    </>
  );
}
