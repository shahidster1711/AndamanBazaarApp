/**
 * rateLimitRepo — Supabase-backed rate limiter (no Redis needed).
 *
 * Strategy: insert a row per action, then COUNT rows in the last
 * WINDOW_HOURS to check if the user is over the limit.
 *
 * Uses the service-role client (bypasses RLS) because the user
 * cannot write rate_limits rows directly.
 */

import type { PlannerSupabaseClient } from "../client"
import type { RateLimitStatus } from "@andaman-planner/shared"

const WINDOW_HOURS = 1
const MAX_PER_WINDOW = 5    // 5 generations per hour per user

/** Checks whether the user may perform the action. Registers the attempt if allowed. */
export async function checkAndConsumeRateLimit(
  serviceClient: PlannerSupabaseClient,
  userId: string,
  action = "generate"
): Promise<RateLimitStatus> {
  const windowStart = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000).toISOString()

  const { count, error: countError } = await serviceClient
    .schema("planner")
    .from("rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", action)
    .gte("created_at", windowStart)

  if (countError) throw new Error(`rateLimitRepo.count: ${countError.message}`)

  const used = count ?? 0
  const remaining = Math.max(0, MAX_PER_WINDOW - used)
  const resetAt = new Date(Date.now() + WINDOW_HOURS * 60 * 60 * 1000).toISOString()

  if (used >= MAX_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetAt }
  }

  // Record this attempt
  const { error: insertError } = await serviceClient
    .schema("planner")
    .from("rate_limits")
    .insert({ user_id: userId, action } as unknown as import("../types/database.types").RateLimitInsert)

  if (insertError) throw new Error(`rateLimitRepo.insert: ${insertError.message}`)

  return { allowed: true, remaining: remaining - 1, resetAt }
}

/** Returns current rate-limit status without consuming a slot. */
export async function getRateLimitStatus(
  serviceClient: PlannerSupabaseClient,
  userId: string,
  action = "generate"
): Promise<RateLimitStatus> {
  const windowStart = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000).toISOString()

  const { count, error } = await serviceClient
    .schema("planner")
    .from("rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", action)
    .gte("created_at", windowStart)

  if (error) throw new Error(`rateLimitRepo.status: ${error.message}`)

  const used = count ?? 0
  return {
    allowed: used < MAX_PER_WINDOW,
    remaining: Math.max(0, MAX_PER_WINDOW - used),
    resetAt: new Date(Date.now() + WINDOW_HOURS * 60 * 60 * 1000).toISOString(),
  }
}
