import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

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

  // Cliente nuevo por request — evita que peticiones concurrentes
  // corrompan el estado interno de auth del singleton compartido.
  const client = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  if (token) {
    const { data: { user }, error } = await client.auth.getUser(token);
    if (error) console.error("[withAdminAuth] getUser:", error.message);
    if (!error && user) return handler();
  }

  if (refreshToken) {
    const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken });
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
