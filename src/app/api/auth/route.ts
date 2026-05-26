import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createToken } from "@/lib/auth";
import { createHash, timingSafeEqual } from "crypto";

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.FORCE_HTTPS === "1",
  path: "/",
};

const MAX_ATTEMPTS = 5;
const WINDOW_MS    = 15 * 60 * 1000;

const attempts = new Map<string, { count: number; resetAt: number }>();

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function isBlocked(ip: string): boolean {
  const entry = attempts.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) { attempts.delete(ip); return false; }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(ip: string) {
  const now   = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

function clearFailures(ip: string) {
  attempts.delete(ip);
}

// Verifica la contraseña contra ADMIN_PASSWORD_HASH (SHA-256 hex de 64 chars).
// Para generar el hash:
//   Linux/macOS: echo -n "tu-contraseña" | sha256sum
//   PowerShell:  (Get-FileHash -InputStream ([IO.MemoryStream]::new([Text.Encoding]::UTF8.GetBytes("tu-contraseña"))) -Algorithm SHA256).Hash.ToLower()
function verifyPasswordHash(password: string): boolean {
  const stored = (process.env.ADMIN_PASSWORD_HASH ?? "").toLowerCase().trim();
  if (!stored || stored.length !== 64) return false;
  const computed = createHash("sha256").update(password).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(stored, "hex"));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  if (isBlocked(ip)) {
    return NextResponse.json(
      { ok: false, blocked: true, error: "Demasiados intentos. Intenta en 15 minutos." },
      { status: 429 }
    );
  }

  const { email, password } = await req.json() as { email: string; password: string };
  if (!email || !password) return NextResponse.json({ ok: false }, { status: 400 });

  const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").toLowerCase().trim();
  if (!ADMIN_EMAIL || email.toLowerCase().trim() !== ADMIN_EMAIL) {
    recordFailure(ip);
    const entry = attempts.get(ip);
    const remaining = MAX_ATTEMPTS - (entry?.count ?? 0);
    return NextResponse.json({ ok: false, remaining: Math.max(0, remaining) }, { status: 401 });
  }

  // Verificación directa con hash SHA-256 (sin Supabase Auth)
  if (process.env.ADMIN_PASSWORD_HASH) {
    const ok = verifyPasswordHash(password);
    if (!ok) {
      recordFailure(ip);
      const entry = attempts.get(ip);
      const remaining = MAX_ATTEMPTS - (entry?.count ?? 0);
      console.error(`[auth] fallo (hash) ip=${ip} remaining=${remaining}`);
      return NextResponse.json({ ok: false, remaining: Math.max(0, remaining) }, { status: 401 });
    }
    clearFailures(ip);
    const token = createToken(email.trim());
    const res = NextResponse.json({ ok: true });
    res.cookies.set("admin_token", token, { ...COOKIE_BASE, maxAge: 60 * 60 * 8 });
    return res;
  }

  // Fallback: Supabase Auth (requiere usuario en Supabase Auth Dashboard)
  const authClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { error } = await authClient.auth.signInWithPassword({ email: email.trim(), password });

  if (error) {
    recordFailure(ip);
    const entry = attempts.get(ip);
    const remaining = MAX_ATTEMPTS - (entry?.count ?? 0);
    console.error(`[auth] fallo ip=${ip} error="${error.message}" remaining=${remaining}`);
    return NextResponse.json({ ok: false, remaining: Math.max(0, remaining) }, { status: 401 });
  }

  clearFailures(ip);
  const token = createToken(email.trim());
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_token", token, { ...COOKIE_BASE, maxAge: 60 * 60 * 8 });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("admin_token");
  return res;
}
