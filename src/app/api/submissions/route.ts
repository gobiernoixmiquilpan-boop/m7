import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/auth";
import { checkAndIncrement } from "@/lib/rateLimit";

const COMUNIDADES_VALIDAS = ["San Pedro Capula", "Capula Centro", "La Huerta de Capula"];

function validatePost(fd: FormData): string | null {
  const nombreCompleto = (fd.get("nombreCompleto") as string | null)?.trim() ?? "";
  const comunidad      = (fd.get("comunidad")      as string | null) ?? "";
  const ubicacion      = (fd.get("ubicacion")      as string | null)?.trim() ?? "";
  const celular        = (fd.get("celular")        as string | null) ?? "";
  const curp           = (fd.get("curp")           as string | null)?.trim() ?? "";
  const predio         = (fd.get("predio")         as string | null)?.trim() ?? "";
  const lote           = (fd.get("lote")           as string | null)?.trim() ?? "";
  const tipoTierra     = (fd.get("tipoTierra")     as string | null) ?? "";
  const superficie     = (fd.get("superficie")     as string | null) ?? "";
  const hablaDialecto  = (fd.get("hablaDialecto")  as string | null) ?? "";

  if (!nombreCompleto)                                     return "nombreCompleto requerido";
  if (!COMUNIDADES_VALIDAS.includes(comunidad))            return "comunidad inválida";
  if (!ubicacion)                                          return "ubicacion requerida";
  if (!/^\d{10}$/.test(celular))                          return "celular inválido (10 dígitos)";
  if (!/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(curp)) return "CURP inválida";
  if (!predio)                                             return "predio requerido";
  if (!lote)                                               return "lote requerido";
  if (!["riego", "temporal"].includes(tipoTierra))         return "tipoTierra inválido";
  const supVal = parseFloat(superficie);
  if (!superficie || isNaN(supVal) || supVal < 1 || supVal > 99999) return "superficie inválida (debe ser entre 1 y 99,999 m²)";
  if (!["si", "no"].includes(hablaDialecto))               return "hablaDialecto inválido";
  return null;
}

const VALID_SORT_KEYS = ["timestamp", "nombreCompleto", "comunidad", "status", "superficie", "tipoTierra"] as const;
type SortKey = typeof VALID_SORT_KEYS[number];

const POST_LIMIT  = 3;
const POST_WINDOW = 60 * 60 * 1000;

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-vercel-forwarded-for") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, async () => {
    const p          = req.nextUrl.searchParams;
    const pageParam  = p.get("page");
    const limit      = Math.min(100, Math.max(1, parseInt(p.get("limit") ?? "20") || 20));
    const search     = (p.get("search")?.trim() ?? "").slice(0, 200);
    const comunidad  = p.get("comunidad") ?? "";
    const status     = p.get("status") ?? "";
    const period     = p.get("period") ?? "";
    const rawSort    = p.get("sortKey") ?? "timestamp";
    const sortKey: SortKey = (VALID_SORT_KEYS as readonly string[]).includes(rawSort)
      ? rawSort as SortKey
      : "timestamp";
    const ascending  = p.get("sortDir") === "asc";

    const showArchived = p.get("archived") === "true";
    let query = supabase.from("submissions").select("*", { count: "exact" });
    if (!showArchived) query = query.is("archived_at", null);

    if (search) {
      const safe = search.replace(/[%_]/g, "\\$&");
      query = query.or(
        `"nombreCompleto".ilike.%${safe}%,comunidad.ilike.%${safe}%,curp.ilike.%${safe}%,id.ilike.%${safe}%,celular.ilike.%${safe}%`
      );
    }
    if (comunidad) query = query.eq("comunidad", comunidad);
    if (status)    query = query.eq("status", status);
    if (period) {
      const now   = new Date();
      if (period === "hoy") {
        const s = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const e = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
        query = query.gte("timestamp", s).lt("timestamp", e);
      } else if (period === "semana") {
        query = query.gte("timestamp", new Date(now.getTime() - 7 * 86_400_000).toISOString());
      } else if (period === "mes") {
        const s = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const e = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
        query = query.gte("timestamp", s).lt("timestamp", e);
      }
    }

    query = query.order(sortKey, { ascending });

    if (pageParam !== null) {
      const page = Math.max(1, parseInt(pageParam) || 1);
      query = query.range((page - 1) * limit, page * limit - 1);
    }

    const { data, error, count } = await query;
    if (error) {
      console.error("[GET /api/submissions] ERROR:", error.code, error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (pageParam !== null) {
      return NextResponse.json({ data: data ?? [], total: count ?? 0 });
    }
    console.log(`[GET /api/submissions] OK — ${data?.length ?? 0} registros`);
    return NextResponse.json(data ?? []);
  });
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  if (!(await checkAndIncrement(`post:${ip}`, POST_LIMIT, POST_WINDOW))) {
    return NextResponse.json(
      { error: "Demasiados envíos. Intenta de nuevo en una hora." },
      { status: 429 }
    );
  }

  const fd = await req.formData();

  const validationError = validatePost(fd);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  // Verificar CURP duplicada
  const curpValue = (fd.get("curp") as string | null)?.trim() ?? "";
  const { data: existingCurp } = await supabase
    .from("submissions")
    .select("id")
    .eq("curp", curpValue)
    .maybeSingle();
  if (existingCurp) {
    const existingFolio = `CAP-2026-${existingCurp.id.slice(-6).toUpperCase()}`;
    return NextResponse.json(
      { error: `Esta CURP ya fue registrada. Folio existente: ${existingFolio}`, folio: existingFolio },
      { status: 409 }
    );
  }

  const latRaw   = fd.get("lat") as string | null;
  const lngRaw   = fd.get("lng") as string | null;
  const clientId = fd.get("id")  as string | null;
  const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const id = (clientId && UUID_RE.test(clientId)) ? clientId : crypto.randomUUID();

  const entry: Record<string, unknown> = {
    id,
    timestamp: new Date().toISOString(),
    nombreCompleto: fd.get("nombreCompleto"),
    comunidad: fd.get("comunidad"),
    ubicacion: fd.get("ubicacion"),
    lat: latRaw ? parseFloat(latRaw) : null,
    lng: lngRaw ? parseFloat(lngRaw) : null,
    celular: fd.get("celular"),
    curp: fd.get("curp"),
    predio: fd.get("predio"),
    lote: fd.get("lote"),
    tipoTierra: fd.get("tipoTierra"),
    superficie: fd.get("superficie"),
    hablaDialecto: fd.get("hablaDialecto"),
    status: "pendiente",
  };

  // Validar archivos antes de subir
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  for (const field of ["fotoCasa", "fotoCasaDerecha", "fotoCasaAtras", "fotoCasaIzquierda", "fotoINEFrente", "fotoINEAtras"]) {
    const file = fd.get(field) as File | null;
    if (!file || file.size === 0) continue;
    if (!file.type.startsWith("image/"))
      return NextResponse.json({ error: `La foto "${field}" no es una imagen válida` }, { status: 400 });
    if (file.size > MAX_FILE_SIZE)
      return NextResponse.json({ error: `La foto "${field}" supera el límite de 10 MB` }, { status: 400 });
  }

  // Subir fotos a Storage (privado)
  const uploadResults = await Promise.allSettled(
    ["fotoCasa", "fotoCasaDerecha", "fotoCasaAtras", "fotoCasaIzquierda", "fotoINEFrente", "fotoINEAtras"].map(async (field) => {
      const file = fd.get(field) as File | null;
      if (!file || file.size === 0) return;
      const ext = file.name.split(".").pop() ?? "jpg";
      const storagePath = `${id}/${field}.${ext}`;
      const { error } = await supabase.storage
        .from("solicitudes")
        .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
          contentType: file.type,
          upsert: true,
        });
      if (error) throw new Error(`${field}: ${error.message}`);
      entry[`${field}Url`] = storagePath;
    })
  );

  const failedUploads = uploadResults
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => (r.reason as Error).message);
  if (failedUploads.length > 0) {
    console.error("[POST /api/submissions] storage upload errors:", failedUploads.join("; "));
    return NextResponse.json(
      { error: "No se pudieron subir las fotografías. Intenta de nuevo." },
      { status: 500 }
    );
  }

  const { error } = await supabase.from("submissions").upsert(entry, { onConflict: "id", ignoreDuplicates: true });
  if (error) {
    console.error("[POST /api/submissions] insert:", error.code, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Registrar en historial
  await supabase.from("status_history").insert({ submission_id: id, status: "pendiente" });

  return NextResponse.json({ ok: true, id });
}

const VALID_STATUSES = ["pendiente", "revision", "aprobado", "rechazado"] as const;

export async function PATCH(req: NextRequest) {
  return withAdminAuth(req, async () => {
    let body: { id?: string; status?: string; motivoRechazo?: string; notas?: string; restore?: boolean };
    try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
    const { id, status, motivoRechazo, notas, restore } = body;
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    if (restore === true) {
      const { error } = await supabase.from("submissions").update({ archived_at: null }).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number]))
        return NextResponse.json({ error: "status inválido" }, { status: 400 });
      updateData.status = status;
      if (status === "rechazado" && motivoRechazo !== undefined) {
        updateData.motivoRechazo = motivoRechazo;
      }
      if (status !== "rechazado") {
        updateData.motivoRechazo = null;
      }
      // Registrar cambio en historial
      await supabase.from("status_history").insert({
        submission_id: id,
        status,
        motivo: status === "rechazado" ? (motivoRechazo ?? null) : null,
      });
    }

    if (notas !== undefined) updateData.notas = notas;

    const { error } = await supabase.from("submissions").update(updateData).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(req: NextRequest) {
  return withAdminAuth(req, async () => {
    let body: { id?: string };
    try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
    const { id } = body;
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const { error } = await supabase
      .from("submissions")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  });
}
