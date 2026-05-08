import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdminAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!await isAdminAuth(req)) return new NextResponse(null, { status: 401 });
  const p = req.nextUrl.searchParams.get("p");
  if (!p) return new NextResponse(null, { status: 400 });
  const { data, error } = await supabase.storage.from("solicitudes").createSignedUrl(p, 3600);
  if (error || !data) return new NextResponse(null, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}