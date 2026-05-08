import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/auth";

const COMUNIDADES_VALIDAS = ["Capula", "El Alberto", "El Deca", "El Nith", "La Estancia", "Otra"];

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
  if (!superficie || isNaN(parseFloat(superficie)) || parseFloat(superficie) <= 0) return "superficie inválida";
  if (!["si", "no"].includes(hablaDialecto))               return "hablaDialecto inválido";
  return null;
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, async () => {
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .order("timestamp", { ascending: false });
    if (error) {
      console.error("[GET /api/submissions] ERROR:", error.code, error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.log(`[GET /api/submissions] OK — ${data?.length ?? 0} registros`);
    return NextResponse.json(data ?? []);
  });
}

export async function POST(req: NextRequest) {
  const fd = await req.formData();

  const validationError = validatePost(fd);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

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
  for (const field of ["fotoCasa", "fotoINEFrente", "fotoINEAtras"]) {
    const file = fd.get(field) as File | null;
    if (!file || file.size === 0) continue;
    if (!file.type.startsWith("image/"))
      return NextResponse.json({ error: `La foto "${field}" no es una imagen válida` }, { status: 400 });
    if (file.size > MAX_FILE_SIZE)
      return NextResponse.json({ error: `La foto "${field}" supera el límite de 10 MB` }, { status: 400 });
  }

  // Guardar fotos en Storage (privado) — el path se guarda en la columna *Url
  await Promise.all(
    ["fotoCasa", "fotoINEFrente", "fotoINEAtras"].map(async (field) => {
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
      if (error) console.error(`[POST /api/submissions] storage upload ${field}:`, error.message);
      else entry[`${field}Url`] = storagePath;
    })
  );

  const { error } = await supabase.from("submissions").upsert(entry, { onConflict: "id", ignoreDuplicates: true });
  if (error) {
    console.error("[POST /api/submissions] insert:", error.code, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id });
}

export async function PATCH(req: NextRequest) {
  return withAdminAuth(req, async () => {
    const { id, status } = await req.json() as { id: string; status: string };
    const { error } = await supabase.from("submissions").update({ status }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(req: NextRequest) {
  return withAdminAuth(req, async () => {
    const { id } = await req.json() as { id: string };
    const { data: files } = await supabase.storage.from("solicitudes").list(id);
    if (files && files.length > 0) {
      await supabase.storage.from("solicitudes").remove(files.map((f) => `${id}/${f.name}`));
    }
    const { error } = await supabase.from("submissions").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  });
}
