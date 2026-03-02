import { NextResponse } from "next/server";
import { createItineraryRepo } from "@andaman-planner/supabase-client";
import { getUserFromRequest, createServerPlannerClient, jsonError } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return jsonError("UNAUTHORIZED", "Valid authentication is required.", 401);
    }

    const client = createServerPlannerClient(user.accessToken);
    const repo = createItineraryRepo(client);
    const itineraries = await repo.listByUser(user.userId);

    return NextResponse.json({ apiVersion: "v1", itineraries });
  } catch (err) {
    console.error("[planner/itineraries] Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonError("INTERNAL_ERROR", message, 500);
  }
}
