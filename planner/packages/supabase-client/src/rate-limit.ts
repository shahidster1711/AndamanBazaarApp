import type { TypedSupabaseClient } from "./client.js";
import { RATE_LIMIT_PER_HOUR } from "@andaman-planner/shared";

export async function checkRateLimit(
  client: TypedSupabaseClient,
  userId: string,
  action: string = "generate",
  maxPerHour: number = RATE_LIMIT_PER_HOUR
): Promise<{ allowed: boolean; remaining: number; resetAt: string }> {
  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();

  const { count, error } = await client
    .from("rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", action)
    .gte("created_at", oneHourAgo);

  if (error) throw new Error(`Rate limit check failed: ${error.message}`);

  const used = count ?? 0;
  const remaining = Math.max(0, maxPerHour - used);
  const resetAt = new Date(Date.now() + 3_600_000).toISOString();

  return { allowed: used < maxPerHour, remaining, resetAt };
}

export async function recordRateLimitHit(
  client: TypedSupabaseClient,
  userId: string,
  action: string = "generate"
): Promise<void> {
  const { error } = await client
    .from("rate_limits")
    .insert({ user_id: userId, action });

  if (error) throw new Error(`Failed to record rate limit: ${error.message}`);
}
