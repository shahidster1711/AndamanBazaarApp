/**
 * profileRepo — typed Supabase queries for planner.profiles.
 */

import type { PlannerSupabaseClient } from "../client"
import type { ProfileRow, ProfileInsert } from "../types/database.types"
import type { PlannerProfile } from "@andaman-planner/shared"

// ----------------------------------------------------------------
// Row ↔ domain mapper
// ----------------------------------------------------------------

function rowToProfile(row: ProfileRow): PlannerProfile {
  return {
    id: row.id,
    homeCity: row.home_city,
    typicalBudgetRange: row.typical_budget_range,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ----------------------------------------------------------------
// Repo functions
// ----------------------------------------------------------------

/** Fetches the planner profile for the authenticated user. Returns null if not yet created. */
export async function getProfile(
  client: PlannerSupabaseClient
): Promise<PlannerProfile | null> {
  const { data, error } = await client
    .schema("planner")
    .from("profiles")
    .select("*")
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw new Error(`getProfile: ${error.message}`)
  }
  return data ? rowToProfile(data as unknown as ProfileRow) : null
}

/**
 * Creates or updates the planner profile for the authenticated user.
 * Uses upsert so this is safe to call as a "login hook".
 */
export async function upsertProfile(
  client: PlannerSupabaseClient,
  insert: Omit<ProfileInsert, "created_at" | "updated_at">
): Promise<PlannerProfile> {
  const { data, error } = await client
    .schema("planner")
    .from("profiles")
    .upsert(insert as unknown as ProfileInsert, { onConflict: "id" })
    .select("*")
    .single()

  if (error) throw new Error(`upsertProfile: ${error.message}`)
  if (!data) throw new Error("upsertProfile: no data returned")
  return rowToProfile(data as unknown as ProfileRow)
}
