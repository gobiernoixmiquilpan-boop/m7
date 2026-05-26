import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  return withAdminAuth(req, async () => {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const { data, error } = await supabase
      .from("status_history")
      .select("id, status, motivo, created_at")
      .eq("submission_id", id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  });
}
