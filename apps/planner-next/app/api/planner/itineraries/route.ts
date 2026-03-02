import { plannerListResponseSchema } from "@planner/shared/schemas";
import { itineraryRepo } from "@planner/supabase";
import { NextResponse, type NextRequest } from "next/server";
import { plannerApiError, requireAuthenticatedPlannerRequest } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedPlannerRequest(request);
  if (auth instanceof NextResponse) {
    return auth;
  }

  const rawLimit = request.nextUrl.searchParams.get("limit");
  const parsedLimit = rawLimit ? Number(rawLimit) : 20;
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 20;

  try {
    const itineraries = await itineraryRepo.listByUser(auth.supabase, auth.user.userId, limit);
    const responseBody = plannerListResponseSchema.parse({
      apiVersion: "v1",
      itineraries,
    });
    return NextResponse.json(responseBody, { status: 200 });
  } catch (error) {
    return plannerApiError(
      500,
      "planner_list_failed",
      "Failed to fetch itineraries.",
      error instanceof Error ? error.message : "unknown_error",
    );
  }
}
