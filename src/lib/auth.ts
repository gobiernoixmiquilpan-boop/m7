import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

export async function isAdminAuth(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get("admin_token")?.value;
  if (!token) return false;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  return !error && !!user;
}
