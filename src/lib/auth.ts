import { NextRequest, NextResponse } from "next/server";

// In-memory session store — token → expiry timestamp (ms)
const sessions = new Map<string, number>();

export function registerToken(token: string, ttlMs = 8 * 60 * 60 * 1000) {
  sessions.set(token, Date.now() + ttlMs);
  for (const [t, exp] of sessions) {
    if (Date.now() > exp) sessions.delete(t);
  }
}

export async function withAdminAuth(
  req: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const token = req.cookies.get("admin_token")?.value;

  if (token) {
    const expiry = sessions.get(token);
    if (expiry && Date.now() < expiry) return handler();
  }

  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}
