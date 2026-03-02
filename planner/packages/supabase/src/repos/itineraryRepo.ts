/**
 * itineraryRepo — typed Supabase queries for planner.itineraries.
 *
 * All methods accept a PlannerSupabaseClient so they work identically
 * in Next.js server routes (server client) and browser hooks (browser client).
 *
 * RLS ensures every query is automatically scoped to the authenticated user.
 */

import type { PlannerSupabaseClient } from "../client"
import type { ItineraryRow, ItineraryInsert } from "../types/database.types"
import type { Itinerary, ItinerarySummary } from "@andaman-planner/shared"

// ----------------------------------------------------------------
// Row ↔ domain mappers
// ----------------------------------------------------------------

function rowToItinerary(row: ItineraryRow): Itinerary {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    preferences: row.preferences as unknown as Itinerary["preferences"],
    days: row.days as unknown as Itinerary["days"],
    islandsCovered: row.islands_covered,
    estimatedBudgetRange: row.estimated_budget_range,
    modelVersion: row.model_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

type SummaryRowShape = Pick<
  ItineraryRow,
  "id" | "name" | "start_date" | "end_date" | "islands_covered" | "estimated_budget_range" | "created_at"
>

function rowToSummary(row: SummaryRowShape): ItinerarySummary {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    islandsCovered: row.islands_covered,
    estimatedBudgetRange: row.estimated_budget_range,
    createdAt: row.created_at,
  }
}

// ----------------------------------------------------------------
// Repo functions
// ----------------------------------------------------------------

/** Lists all itinerary summaries for the authenticated user, newest first. */
export async function listItineraries(
  client: PlannerSupabaseClient
): Promise<ItinerarySummary[]> {
  const { data, error } = await client
    .schema("planner")
    .from("itineraries")
    .select("id, name, start_date, end_date, islands_covered, estimated_budget_range, created_at")
    .order("created_at", { ascending: false })

  if (error) throw new Error(`listItineraries: ${error.message}`)
  return ((data ?? []) as unknown as SummaryRowShape[]).map(rowToSummary)
}

/** Fetches a single full itinerary by id. Returns null if not found. */
export async function getItinerary(
  client: PlannerSupabaseClient,
  id: string
): Promise<Itinerary | null> {
  const { data, error } = await client
    .schema("planner")
    .from("itineraries")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null   // not found
    throw new Error(`getItinerary: ${error.message}`)
  }
  return data ? rowToItinerary(data as unknown as ItineraryRow) : null
}

/** Inserts a new itinerary and returns the full inserted row. */
export async function createItinerary(
  client: PlannerSupabaseClient,
  insert: Omit<ItineraryInsert, "id" | "created_at" | "updated_at">
): Promise<Itinerary> {
  const { data, error } = await client
    .schema("planner")
    .from("itineraries")
    .insert(insert as unknown as ItineraryInsert)
    .select("*")
    .single()

  if (error) throw new Error(`createItinerary: ${error.message}`)
  if (!data) throw new Error("createItinerary: no data returned")
  return rowToItinerary(data as unknown as ItineraryRow)
}

/** Updates mutable fields of an itinerary. Returns updated row. */
export async function updateItinerary(
  client: PlannerSupabaseClient,
  id: string,
  updates: Partial<Pick<ItineraryRow, "name" | "days" | "estimated_budget_range" | "islands_covered">>
): Promise<Itinerary> {
  const { data, error } = await client
    .schema("planner")
    .from("itineraries")
    .update(updates as unknown as Partial<ItineraryRow>)
    .eq("id", id)
    .select("*")
    .single()

  if (error) throw new Error(`updateItinerary: ${error.message}`)
  if (!data) throw new Error("updateItinerary: no data returned")
  return rowToItinerary(data as unknown as ItineraryRow)
}

/** Deletes an itinerary by id. */
export async function deleteItinerary(
  client: PlannerSupabaseClient,
  id: string
): Promise<void> {
  const { error } = await client
    .schema("planner")
    .from("itineraries")
    .delete()
    .eq("id", id)

  if (error) throw new Error(`deleteItinerary: ${error.message}`)
}
