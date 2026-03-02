import { plannerGenerateRequestSchema, plannerGenerateResponseSchema } from "@planner/shared/schemas";
import { itineraryRepo } from "@planner/supabase";
import { NextResponse, type NextRequest } from "next/server";
import { generateItineraryWithAi } from "../../../../lib/ai";
import { plannerApiError, requireAuthenticatedPlannerRequest } from "../../../../lib/auth";
import { checkGenerationRateLimit } from "../../../../lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedPlannerRequest(request);
  if (auth instanceof NextResponse) {
    return auth;
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return plannerApiError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsedBody = plannerGenerateRequestSchema.safeParse(payload);
  if (!parsedBody.success) {
    return plannerApiError(400, "invalid_request", "Invalid planner generate payload.", parsedBody.error.flatten());
  }

  try {
    const rateLimit = await checkGenerationRateLimit(auth.supabase, auth.user.userId);
    if (!rateLimit.allowed) {
      return plannerApiError(
        429,
        "rate_limit_exceeded",
        `Generation limit reached. Max ${rateLimit.maxPerHour} per hour.`,
        { retryAfterSeconds: rateLimit.retryAfterSeconds, usedInWindow: rateLimit.usedInWindow },
      );
    }

    const generated = await generateItineraryWithAi(parsedBody.data.preferences, auth.user);

    const itinerary = await itineraryRepo.create(auth.supabase, {
      userId: auth.user.userId,
      name: generated.name,
      startDate: parsedBody.data.preferences.startDate,
      endDate: parsedBody.data.preferences.endDate,
      preferences: parsedBody.data.preferences,
      days: generated.days,
      islandsCovered: generated.islandsCovered,
      estimatedBudgetRange: generated.estimatedBudgetRange,
      modelVersion: generated.modelVersion,
    });

    const responseBody = plannerGenerateResponseSchema.parse({
      apiVersion: "v1",
      itinerary,
    });

    return NextResponse.json(responseBody, { status: 201 });
  } catch (error) {
    return plannerApiError(
      500,
      "planner_generation_failed",
      "Failed to generate itinerary.",
      error instanceof Error ? error.message : "unknown_error",
    );
  }
}
