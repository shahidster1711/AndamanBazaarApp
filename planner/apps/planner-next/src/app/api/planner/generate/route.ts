import { NextResponse } from "next/server";
import { generateRequestSchema } from "@andaman-planner/shared";
import { createItineraryRepo, createRateLimiter } from "@andaman-planner/supabase-client";
import { getUserFromRequest, createServerPlannerClient, jsonError } from "@/lib/supabase-server";
import { generateItinerary } from "@/lib/ai-generate";

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return jsonError("UNAUTHORIZED", "Valid authentication is required.", 401);
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return jsonError("BAD_REQUEST", "Request body must be valid JSON.", 400);
    }

    const validation = generateRequestSchema.safeParse(body);
    if (!validation.success) {
      return jsonError(
        "VALIDATION_ERROR",
        validation.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
        422
      );
    }

    const client = createServerPlannerClient(user.accessToken);

    const rateLimiter = createRateLimiter(client);
    const { allowed, remaining } = await rateLimiter.check(user.userId);
    if (!allowed) {
      return jsonError(
        "RATE_LIMITED",
        "You have exceeded the generation limit. Please try again later.",
        429
      );
    }

    const result = await generateItinerary(validation.data.preferences);

    const repo = createItineraryRepo(client);
    const itinerary = await repo.create({
      userId: user.userId,
      name: result.name,
      startDate: validation.data.preferences.startDate,
      endDate: validation.data.preferences.endDate,
      preferences: validation.data.preferences,
      days: result.days,
      islandsCovered: result.islandsCovered,
      estimatedBudgetRange: result.estimatedBudgetRange,
      modelVersion: result.modelVersion,
    });

    await rateLimiter.record(user.userId);

    return NextResponse.json(
      { apiVersion: "v1", itinerary },
      {
        status: 201,
        headers: { "X-RateLimit-Remaining": String(remaining - 1) },
      }
    );
  } catch (err) {
    console.error("[planner/generate] Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonError("INTERNAL_ERROR", message, 500);
  }
}
