/**
 * GET /api/planner/itineraries
 *
 * Returns a list of ItinerarySummary objects for the authenticated user.
 * RLS ensures users only see their own itineraries.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createPlannerServerClient, listItineraries } from "@andaman-planner/supabase"
import type { Database } from "@andaman-planner/supabase"

async function getAuthenticatedUser(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: { getAll() { return cookieStore.getAll() } },
  })
  const { data: { user }, error } = await supabase.auth.getUser()
  if (user && !error) return { user, client: supabase }

  const authHeader = req.headers.get("Authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7)
    const tokenClient = createPlannerServerClient(token)
    const { data: { user: tokenUser } } = await tokenClient.auth.getUser()
    if (tokenUser) return { user: tokenUser, client: tokenClient }
  }

  return null
}

export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedUser(req)
  if (!auth) {
    return NextResponse.json(
      { apiVersion: "v1", error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
      { status: 401 }
    )
  }

  try {
    // Use the user's authenticated client so RLS applies correctly
    const itineraries = await listItineraries(auth.client as Parameters<typeof listItineraries>[0])
    return NextResponse.json({ apiVersion: "v1", itineraries })
  } catch (err) {
    console.error("[planner/itineraries] list failed:", err)
    return NextResponse.json(
      { apiVersion: "v1", error: { code: "DB_ERROR", message: "Failed to fetch itineraries." } },
      { status: 500 }
    )
  }
}
