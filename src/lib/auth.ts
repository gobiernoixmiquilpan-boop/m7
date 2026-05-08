import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function withAdminAuth(
  req: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const token        = req.cookies.get("admin_token")?.value;
  const refreshToken = req.cookies.get("admin_refresh")?.value;

  // Validar token actual
  if (token) {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) console.error("[withAdminAuth] getUser:", error.message);
    if (!error && user) return handler();
  }

  // Token expirado — intentar renovar con refresh_token
  if (refreshToken) {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (!error && data.session) {
      console.log("[withAdminAuth] sesión renovada automáticamente");
      const res = await handler();
      res.cookies.set("admin_token", data.session.access_token, {
        ...COOKIE_BASE, maxAge: 60 * 60 * 8,
      });
      if (data.session.refresh_token) {
        res.cookies.set("admin_refresh", data.session.refresh_token, {
          ...COOKIE_BASE, maxAge: 60 * 60 * 24 * 7,
        });
      }
      return res;
    }
    console.error("[withAdminAuth] refresh falló:", error?.message);
  }

  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}
