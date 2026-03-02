import type { PlannerSupabaseClient } from "../client.js";
import { RATE_LIMIT } from "@andaman-planner/shared";

export function createRateLimiter(client: PlannerSupabaseClient) {
  return {
    async check(userId: string): Promise<{ allowed: boolean; remaining: number }> {
      const windowStart = new Date(
        Date.now() - RATE_LIMIT.windowMs
      ).toISOString();

      const { count, error } = await client
        .from("generation_log")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", windowStart);

      if (error) throw new Error(`Rate limit check failed: ${error.message}`);

      const used = count ?? 0;
      return {
        allowed: used < RATE_LIMIT.maxGenerationsPerHour,
        remaining: Math.max(0, RATE_LIMIT.maxGenerationsPerHour - used),
      };
    },

    async record(userId: string): Promise<void> {
      const { error } = await client
        .from("generation_log")
        .insert({ user_id: userId });

      if (error) throw new Error(`Failed to record generation: ${error.message}`);
    },
  };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;
