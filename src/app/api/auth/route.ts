import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "crypto";
import { createToken } from "@/lib/auth";

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/* ── Rate limiting: max 5 intentos fallidos por IP en 15 minutos ── */
const MAX_ATTEMPTS = 5;
const WINDOW_MS    = 15 * 60 * 1000; // 15 min

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
  const now  = Date.now();
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

function safeEquals(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) {
      timingSafeEqual(ba, ba); // consume time to prevent timing leaks
      return false;
    }
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

function hashPassword(password: string): string {
  return createHash("sha256").update(password + (process.env.AUTH_SALT ?? "capula2026")).digest("hex");
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  if (isBlocked(ip)) {
    console.warn(`[POST /api/auth] IP bloqueada: ${ip}`);
    return NextResponse.json(
      { ok: false, blocked: true, error: "Demasiados intentos. Intenta en 15 minutos." },
      { status: 429 }
    );
  }

  const { email, password } = await req.json() as { email: string; password: string };
  if (!email || !password) return NextResponse.json({ ok: false }, { status: 400 });

  const ADMIN_EMAIL    = process.env.ADMIN_EMAIL ?? "";
  const ADMIN_PW_HASH  = process.env.ADMIN_PASSWORD_HASH ?? "";

  const emailMatch = safeEquals(email.toLowerCase().trim(), ADMIN_EMAIL.toLowerCase().trim());
  const pwHash     = hashPassword(password);
  const pwMatch    = ADMIN_PW_HASH ? safeEquals(pwHash, ADMIN_PW_HASH) : false;

  if (!emailMatch || !pwMatch) {
    recordFailure(ip);
    const entry = attempts.get(ip);
    const remaining = MAX_ATTEMPTS - (entry?.count ?? 0);
    console.error(`[POST /api/auth] fallo login ip=${ip} intentos_restantes=${remaining}`);
    return NextResponse.json(
      { ok: false, remaining: Math.max(0, remaining) },
      { status: 401 }
    );
  }

  clearFailures(ip);
  const token = createToken(email);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_token", token, {
    ...COOKIE_BASE, maxAge: 60 * 60 * 8,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("admin_token");
  return res;
}
