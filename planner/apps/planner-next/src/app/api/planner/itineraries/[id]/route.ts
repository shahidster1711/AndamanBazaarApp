import { NextResponse } from "next/server";
import { API_VERSION } from "@andaman-planner/shared";
import { createItineraryRepo } from "@andaman-planner/supabase-client";
import { getAuthUser, createServerClient } from "@/lib/supabase-server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const itinerary = await repo.getById(params.id);

    if (!itinerary) {
      return NextResponse.json(
        { apiVersion: API_VERSION, error: { code: "NOT_FOUND", message: "Itinerary not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ apiVersion: API_VERSION, itinerary });
  } catch (err) {
    console.error("[GET /api/planner/itineraries/:id]", err);
    return NextResponse.json(
      {
        apiVersion: API_VERSION,
        error: { code: "INTERNAL_ERROR", message: err instanceof Error ? err.message : "Unknown error" },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    await repo.deleteById(params.id);

    return NextResponse.json({ apiVersion: API_VERSION, deleted: true });
  } catch (err) {
    console.error("[DELETE /api/planner/itineraries/:id]", err);
    return NextResponse.json(
      {
        apiVersion: API_VERSION,
        error: { code: "INTERNAL_ERROR", message: err instanceof Error ? err.message : "Unknown error" },
      },
      { status: 500 }
    );
  }
}
