// Requiere: Supabase Dashboard → Database → Replication → activar tabla "submissions"
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withAdminAuth(req, async () => {
    const encoder = new TextEncoder();
    let cleanup: (() => void) | null = null;

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(": connected\n\n"));

        const channel = supabase
          .channel(`admin-stream-${Date.now()}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "submissions" }, () => {
            try {
              controller.enqueue(encoder.encode("data: refresh\n\n"));
            } catch { /* stream closed */ }
          })
          .subscribe();

        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
          } catch {
            clearInterval(heartbeat);
          }
        }, 25_000);

        cleanup = () => {
          clearInterval(heartbeat);
          void supabase.removeChannel(channel);
          try { controller.close(); } catch { /* already closed */ }
        };

        req.signal.addEventListener("abort", () => cleanup?.());
      },
      cancel() { cleanup?.(); },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    }) as unknown as NextResponse;
  });
}
