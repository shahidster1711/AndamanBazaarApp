/**
 * GET /api/planner/itineraries/:id
 *
 * Returns a full Itinerary by id.
 * RLS ensures the user can only fetch their own itinerary.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createPlannerServerClient, getItinerary } from "@andaman-planner/supabase"
import type { Database } from "@andaman-planner/supabase"

async function getAuthenticatedClient(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: { getAll() { return cookieStore.getAll() } },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (user) return supabase

  const authHeader = req.headers.get("Authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7)
    const tokenClient = createPlannerServerClient(token)
    const { data: { user: tokenUser } } = await tokenClient.auth.getUser()
    if (tokenUser) return tokenClient
  }

  return null
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json(
      { apiVersion: "v1", error: { code: "INVALID_ID", message: "Invalid itinerary id." } },
      { status: 400 }
    )
  }

  const client = await getAuthenticatedClient(req)
  if (!client) {
    return NextResponse.json(
      { apiVersion: "v1", error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
      { status: 401 }
    )
  }

  try {
    const itinerary = await getItinerary(client as Parameters<typeof getItinerary>[0], id)
    if (!itinerary) {
      return NextResponse.json(
        { apiVersion: "v1", error: { code: "NOT_FOUND", message: "Itinerary not found." } },
        { status: 404 }
      )
    }
    return NextResponse.json({ apiVersion: "v1", itinerary })
  } catch (err) {
    console.error(`[planner/itineraries/${id}] fetch failed:`, err)
    return NextResponse.json(
      { apiVersion: "v1", error: { code: "DB_ERROR", message: "Failed to fetch itinerary." } },
      { status: 500 }
    )
  }
}
