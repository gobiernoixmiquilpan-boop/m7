import { NextRequest, NextResponse } from "next/server";
import { createToken } from "@/lib/auth";
import { createHash, timingSafeEqual } from "crypto";
import { isBlocked, recordFailure, clearRateLimit } from "@/lib/rateLimit";

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.FORCE_HTTPS === "1",
  path: "/",
};

const MAX_ATTEMPTS = 5;
const WINDOW_MS    = 15 * 60 * 1000;

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-vercel-forwarded-for") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

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

  if (await isBlocked(`auth:${ip}`, MAX_ATTEMPTS)) {
    return NextResponse.json(
      { ok: false, blocked: true, error: "Demasiados intentos. Intenta en 15 minutos." },
      { status: 429 }
    );
  }

  const { email, password } = await req.json() as { email: string; password: string };
  if (!email || !password) return NextResponse.json({ ok: false }, { status: 400 });

  const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").toLowerCase().trim();
  if (!ADMIN_EMAIL || email.toLowerCase().trim() !== ADMIN_EMAIL) {
    const count = await recordFailure(`auth:${ip}`, WINDOW_MS);
    const remaining = Math.max(0, MAX_ATTEMPTS - count);
    return NextResponse.json({ ok: false, remaining }, { status: 401 });
  }

  const ok = verifyPasswordHash(password);
  if (!ok) {
    const count = await recordFailure(`auth:${ip}`, WINDOW_MS);
    const remaining = Math.max(0, MAX_ATTEMPTS - count);
    console.error(`[auth] fallo ip=${ip} remaining=${remaining}`);
    return NextResponse.json({ ok: false, remaining }, { status: 401 });
  }

  await clearRateLimit(`auth:${ip}`);
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
