import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/auth";

const PHOTO_PATH_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/(fotoCasa|fotoCasaDerecha|fotoCasaAtras|fotoCasaIzquierda|fotoINEFrente|fotoINEAtras|fotoPredioNorte|fotoPredioSur|fotoPredioEste|fotoPredioOeste)\.[a-z]{3,4}$/i;

export async function GET(req: NextRequest) {
  return withAdminAuth(req, async () => {
    const p = req.nextUrl.searchParams.get("p");
    if (!p || !PHOTO_PATH_RE.test(p)) return new NextResponse(null, { status: 400 });
    const { data, error } = await supabase.storage.from("solicitudes").createSignedUrl(p, 300);
    if (error || !data) return new NextResponse(null, { status: 404 });
    return NextResponse.redirect(data.signedUrl);
  });
}
 