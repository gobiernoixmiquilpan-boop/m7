import { createHmac, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "./supabase";

const SECRET = process.env.AUTH_SALT ?? "capula2026";
const TTL_MS = 365 * 24 * 60 * 60 * 1000; // 1 año

interface TokenPayload { email: string; jti: string; exp: number }

function parsePayload(token: string): TokenPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const sig     = token.slice(dot + 1);
  const expected = createHmac("sha256", SECRET).update(payload).digest("base64url");
  if (sig !== expected) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as TokenPayload;
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

export function createToken(email: string): string {
  const jti = randomUUID();
  const payload = Buffer.from(JSON.stringify({ email, jti, exp: Date.now() + TTL_MS })).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyToken(token: string): boolean {
  return parsePayload(token) !== null;
}

export function extractTokenData(token: string): TokenPayload | null {
  return parsePayload(token);
}

export async function revokeToken(jti: string, exp: number): Promise<void> {
  try {
    // Limpieza lazy de sesiones expiradas
    void supabase.from("revoked_sessions").delete().lt("expires_at", new Date().toISOString());
    await supabase.from("revoked_sessions").insert({ jti, expires_at: new Date(exp).toISOString() });
  } catch { /* noop */ }
}

async function isRevoked(jti: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("revoked_sessions")
      .select("jti")
      .eq("jti", jti)
      .maybeSingle();
    return data !== null;
  } catch {
    return false; // fail open si la DB no responde
  }
}

export async function withAdminAuth(
  req: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const token = req.cookies.get("admin_token")?.value;
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const data = parsePayload(token);
  if (!data) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (await isRevoked(data.jti)) return NextResponse.json({ error: "Sesión revocada" }, { status: 401 });
  return handler();
}
