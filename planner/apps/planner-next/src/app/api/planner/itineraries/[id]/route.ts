import { NextResponse } from "next/server";
import { createItineraryRepo } from "@andaman-planner/supabase-client";
import { getUserFromRequest, createServerPlannerClient, jsonError } from "@/lib/supabase-server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return jsonError("UNAUTHORIZED", "Valid authentication is required.", 401);
    }

    const client = createServerPlannerClient(user.accessToken);
    const repo = createItineraryRepo(client);
    const itinerary = await repo.getById(params.id);

    if (!itinerary) {
      return jsonError("NOT_FOUND", "Itinerary not found.", 404);
    }

    return NextResponse.json({ apiVersion: "v1", itinerary });
  } catch (err) {
    console.error("[planner/itineraries/:id] Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonError("INTERNAL_ERROR", message, 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return jsonError("UNAUTHORIZED", "Valid authentication is required.", 401);
    }

    const client = createServerPlannerClient(user.accessToken);
    const repo = createItineraryRepo(client);
    await repo.deleteById(params.id);

    return NextResponse.json({ apiVersion: "v1", deleted: true });
  } catch (err) {
    console.error("[planner/itineraries/:id DELETE] Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonError("INTERNAL_ERROR", message, 500);
  }
}
