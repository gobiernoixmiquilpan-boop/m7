import { NextRequest } from "next/server";

export function isAdminAuth(req: NextRequest): boolean {
  const token = req.cookies.get("admin_token")?.value;
  const expected = Buffer.from(process.env.ADMIN_PASS ?? "capula2026").toString("base64");
  return token === expected;
}
