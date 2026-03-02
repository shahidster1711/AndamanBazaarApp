import { NextResponse } from "next/server";
import { generateRequestSchema, API_VERSION } from "@andaman-planner/shared";
import { createItineraryRepo } from "@andaman-planner/supabase-client";
import { checkRateLimit, recordRateLimitHit } from "@andaman-planner/supabase-client";
import { getAuthUser, createServerClient } from "@/lib/supabase-server";
import { generateItinerary } from "@/lib/ai-generate";
import { getEnv } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { apiVersion: API_VERSION, error: { code: "UNAUTHENTICATED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const authHeader = request.headers.get("authorization");
    const client = createServerClient(authHeader);

    const env = getEnv();
    const { allowed, remaining, resetAt } = await checkRateLimit(
      client,
      user.id,
      "generate",
      env.rateLimitPerHour
    );
    if (!allowed) {
      return NextResponse.json(
        {
          apiVersion: API_VERSION,
          error: {
            code: "RATE_LIMITED",
            message: `Rate limit exceeded. ${remaining} generations remaining. Resets at ${resetAt}`,
          },
        },
        { status: 429, headers: { "Retry-After": "3600" } }
      );
    }

    const body = await request.json();
    const parsed = generateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          apiVersion: API_VERSION,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
          },
        },
        { status: 400 }
      );
    }

    const { output, modelVersion } = await generateItinerary(parsed.data.preferences);

    const repo = createItineraryRepo(client);
    const itinerary = await repo.create({
      userId: user.id,
      name: output.name,
      startDate: parsed.data.preferences.startDate,
      endDate: parsed.data.preferences.endDate,
      preferences: parsed.data.preferences,
      days: output.days,
      islandsCovered: output.islandsCovered,
      estimatedBudgetRange: output.estimatedBudgetRange,
      modelVersion,
    });

    await recordRateLimitHit(client, user.id, "generate");

    return NextResponse.json(
      { apiVersion: API_VERSION, itinerary },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/planner/generate]", err);
    return NextResponse.json(
      {
        apiVersion: API_VERSION,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Unknown error",
        },
      },
      { status: 500 }
    );
  }
}
