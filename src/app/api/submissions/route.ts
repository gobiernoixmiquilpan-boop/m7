import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdminAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!isAdminAuth(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .order("timestamp", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const fd = await req.formData();
  const latRaw = fd.get("lat") as string | null;
  const lngRaw = fd.get("lng") as string | null;
  const id = Date.now().toString();

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
          upsert: false,
        });
      if (!error) entry[`${field}Url`] = storagePath;
    })
  );

  const { error } = await supabase.from("submissions").insert(entry);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id });
}

export async function PATCH(req: NextRequest) {
  if (!isAdminAuth(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, status } = await req.json() as { id: string; status: string };
  const { error } = await supabase.from("submissions").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!isAdminAuth(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await req.json() as { id: string };
  const { data: files } = await supabase.storage.from("solicitudes").list(id);
  if (files && files.length > 0) {
    await supabase.storage.from("solicitudes").remove(files.map((f) => `${id}/${f.name}`));
  }
  const { error } = await supabase.from("submissions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
