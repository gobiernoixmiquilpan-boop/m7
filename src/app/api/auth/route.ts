import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json() as { password: string };
  const valid = password === (process.env.ADMIN_PASS ?? "capula2026");
  if (!valid) return NextResponse.json({ ok: false }, { status: 401 });
  const token = Buffer.from(process.env.ADMIN_PASS ?? "capula2026").toString("base64");
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_token", token, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("admin_token");
  return res;
}
