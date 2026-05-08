import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function POST(req: NextRequest) {
  const { email, password } = await req.json() as { email: string; password: string };
  if (!email || !password) return NextResponse.json({ ok: false }, { status: 400 });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    console.error("[POST /api/auth] login error:", error?.message ?? "no session");
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_token", data.session.access_token, {
    ...COOKIE_BASE, maxAge: 60 * 60 * 8,
  });
  res.cookies.set("admin_refresh", data.session.refresh_token, {
    ...COOKIE_BASE, maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("admin_token");
  res.cookies.delete("admin_refresh");
  return res;
}
