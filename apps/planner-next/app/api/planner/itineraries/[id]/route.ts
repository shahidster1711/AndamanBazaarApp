import { plannerGetResponseSchema, uuidSchema } from "@planner/shared/schemas";
import { itineraryRepo } from "@planner/supabase";
import { NextResponse, type NextRequest } from "next/server";
import { plannerApiError, requireAuthenticatedPlannerRequest } from "../../../../../lib/auth";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuthenticatedPlannerRequest(request);
  if (auth instanceof NextResponse) {
    return auth;
  }

  const parsedId = uuidSchema.safeParse(params.id);
  if (!parsedId.success) {
    return plannerApiError(400, "invalid_itinerary_id", "Itinerary id must be a UUID.");
  }

  try {
    const itinerary = await itineraryRepo.getById(auth.supabase, auth.user.userId, parsedId.data);
    if (!itinerary) {
      return plannerApiError(404, "itinerary_not_found", "Itinerary not found.");
    }

    const responseBody = plannerGetResponseSchema.parse({
      apiVersion: "v1",
      itinerary,
    });

    return NextResponse.json(responseBody, { status: 200 });
  } catch (error) {
    return plannerApiError(
      500,
      "planner_get_failed",
      "Failed to fetch itinerary.",
      error instanceof Error ? error.message : "unknown_error",
    );
  }
}
