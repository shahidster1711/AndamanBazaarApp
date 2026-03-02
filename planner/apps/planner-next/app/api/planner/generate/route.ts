/**
 * POST /api/planner/generate
 *
 * Generates an AI itinerary from TripPreferences.
 * Requires a valid Supabase session (cookie or Authorization header).
 *
 * Flow:
 * 1. Authenticate user via Supabase JWT.
 * 2. Validate request body with Zod.
 * 3. Check rate limit (5/hour/user) using service-role client.
 * 4. Call Gemini AI to generate itinerary JSON.
 * 5. Persist to planner.itineraries.
 * 6. Return typed JSON response.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { GenerateRequestSchema } from "@andaman-planner/shared"
import { createPlannerServerClient, createItinerary } from "@andaman-planner/supabase"
import { checkAndConsumeRateLimit } from "@andaman-planner/supabase"
import { generateItinerary } from "../../../../src/ai/generator"
import type { Database } from "@andaman-planner/supabase"

// ----------------------------------------------------------------
// Auth helper: get user from cookie-based session (Next.js App Router)
// ----------------------------------------------------------------

async function getAuthenticatedUser(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Try cookie-based session (SSR pattern)
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
    },
  })
  const { data: { user }, error } = await supabase.auth.getUser()
  if (user && !error) return user

  // Fallback: Bearer token from Authorization header
  const authHeader = req.headers.get("Authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7)
    const tokenClient = createPlannerServerClient(token)
    const { data: { user: tokenUser } } = await tokenClient.auth.getUser()
    if (tokenUser) return tokenUser
  }

  return null
}

// ----------------------------------------------------------------
// Route handler
// ----------------------------------------------------------------

export async function POST(req: NextRequest) {
  // 1. Auth
  const user = await getAuthenticatedUser(req)
  if (!user) {
    return NextResponse.json(
      { apiVersion: "v1", error: { code: "UNAUTHENTICATED", message: "You must be signed in to generate an itinerary." } },
      { status: 401 }
    )
  }

  // 2. Validate request body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { apiVersion: "v1", error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } },
      { status: 400 }
    )
  }

  const parsed = GenerateRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        apiVersion: "v1",
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
        },
      },
      { status: 422 }
    )
  }

  const { preferences } = parsed.data

  // 3. Rate limiting (service role — bypasses RLS for write)
  const serviceClient = createPlannerServerClient(undefined, true)
  let rateStatus
  try {
    rateStatus = await checkAndConsumeRateLimit(serviceClient, user.id, "generate")
  } catch (err) {
    console.error("[planner/generate] Rate limit check failed:", err)
    // Fail open on rate limit error (don't block the user due to our infra issues)
    rateStatus = { allowed: true, remaining: 4, resetAt: new Date().toISOString() }
  }

  if (!rateStatus.allowed) {
    return NextResponse.json(
      {
        apiVersion: "v1",
        error: {
          code: "RATE_LIMITED",
          message: `You can generate up to 5 itineraries per hour. Try again after ${new Date(rateStatus.resetAt).toLocaleTimeString("en-IN")}.`,
        },
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": String(rateStatus.remaining),
          "X-RateLimit-Reset": rateStatus.resetAt,
        },
      }
    )
  }

  // 4. AI generation
  let aiOutput
  let modelVersion: string
  try {
    const result = await generateItinerary(preferences)
    aiOutput = result.output
    modelVersion = result.modelVersion
  } catch (err) {
    console.error("[planner/generate] AI generation failed:", err)
    return NextResponse.json(
      {
        apiVersion: "v1",
        error: {
          code: "AI_GENERATION_FAILED",
          message: "The AI failed to generate a valid itinerary. Please try again.",
        },
      },
      { status: 500 }
    )
  }

  // 5. Persist to Supabase
  // Use the user's session client so RLS user_id check passes
  const userClient = createPlannerServerClient(undefined, true)   // service role for insert
  let savedItinerary
  try {
    savedItinerary = await createItinerary(userClient, {
      user_id: user.id,
      name: aiOutput.name,
      start_date: preferences.startDate,
      end_date: preferences.endDate,
      preferences: preferences as unknown as import("@andaman-planner/supabase").Json,
      days: aiOutput.days as unknown as import("@andaman-planner/supabase").Json,
      islands_covered: aiOutput.islandsCovered,
      estimated_budget_range: aiOutput.estimatedBudgetRange,
      model_version: modelVersion,
    })
  } catch (err) {
    console.error("[planner/generate] DB persist failed:", err)
    return NextResponse.json(
      {
        apiVersion: "v1",
        error: {
          code: "DB_ERROR",
          message: "Failed to save the itinerary. Please try again.",
        },
      },
      { status: 500 }
    )
  }

  // 6. Return
  return NextResponse.json(
    { apiVersion: "v1", itinerary: savedItinerary },
    {
      status: 201,
      headers: {
        "X-RateLimit-Remaining": String(rateStatus.remaining),
        "X-RateLimit-Reset": rateStatus.resetAt,
      },
    }
  )
}
