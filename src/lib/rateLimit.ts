import { supabase } from "./supabase";

type Entry = { count: number; reset_at: string };

function cleanExpired(): void {
  void supabase.from("rate_limits").delete().lt("reset_at", new Date().toISOString());
}

async function getEntry(key: string): Promise<Entry | null> {
  try {
    const { data } = await supabase
      .from("rate_limits")
      .select("count, reset_at")
      .eq("key", key)
      .maybeSingle();
    if (!data) return null;
    if (new Date(data.reset_at as string) <= new Date()) return null;
    return data as Entry;
  } catch {
    return null;
  }
}

/** True if the key has reached or exceeded max failures (does NOT increment). */
export async function isBlocked(key: string, max: number): Promise<boolean> {
  cleanExpired();
  const entry = await getEntry(key);
  return entry !== null && entry.count >= max;
}

/** Record one failure. Returns the new count. */
export async function recordFailure(key: string, windowMs: number): Promise<number> {
  try {
    const entry = await getEntry(key);
    if (!entry) {
      await supabase.from("rate_limits").upsert(
        { key, count: 1, reset_at: new Date(Date.now() + windowMs).toISOString() },
        { onConflict: "key" }
      );
      return 1;
    }
    const newCount = entry.count + 1;
    await supabase.from("rate_limits").update({ count: newCount }).eq("key", key);
    return newCount;
  } catch {
    return 0;
  }
}

/**
 * Check-and-increment: if under limit, increment and return true; otherwise return false.
 * Fails open (returns true) if the DB is unavailable.
 */
export async function checkAndIncrement(
  key: string,
  max: number,
  windowMs: number
): Promise<boolean> {
  cleanExpired();
  try {
    const entry = await getEntry(key);
    if (!entry) {
      await supabase.from("rate_limits").upsert(
        { key, count: 1, reset_at: new Date(Date.now() + windowMs).toISOString() },
        { onConflict: "key" }
      );
      return true;
    }
    if (entry.count >= max) return false;
    await supabase.from("rate_limits").update({ count: entry.count + 1 }).eq("key", key);
    return true;
  } catch {
    return true;
  }
}

/** Clear the rate limit entry (e.g., after a successful auth). */
export async function clearRateLimit(key: string): Promise<void> {
  try {
    await supabase.from("rate_limits").delete().eq("key", key);
  } catch { /* noop */ }
}
