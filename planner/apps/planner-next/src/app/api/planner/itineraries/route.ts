import { NextResponse } from "next/server";
import { API_VERSION } from "@andaman-planner/shared";
import { createItineraryRepo } from "@andaman-planner/supabase-client";
import { getAuthUser, createServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
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
    const repo = createItineraryRepo(client);
    const itineraries = await repo.listByUser(user.id);

    return NextResponse.json({ apiVersion: API_VERSION, itineraries });
  } catch (err) {
    console.error("[GET /api/planner/itineraries]", err);
    return NextResponse.json(
      {
        apiVersion: API_VERSION,
        error: { code: "INTERNAL_ERROR", message: err instanceof Error ? err.message : "Unknown error" },
      },
      { status: 500 }
    );
  }
}
