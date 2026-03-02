import { z } from "zod";
import {
  itineraryDaySchema,
  itinerarySchema,
  itinerarySummarySchema,
  tripPreferencesSchema,
} from "../../../shared/src/schemas";
import type {
  Itinerary,
  ItineraryDay,
  ItinerarySummary,
  TripPreferences,
} from "../../../shared/src/types";
import type { Database, Json } from "../database.types";

const itineraryColumns = [
  "id",
  "user_id",
  "name",
  "start_date",
  "end_date",
  "preferences",
  "days",
  "islands_covered",
  "estimated_budget_range",
  "model_version",
  "created_at",
  "updated_at",
].join(",");

type ItineraryRow = Database["planner"]["Tables"]["itineraries"]["Row"];
type ItineraryInsert = Database["planner"]["Tables"]["itineraries"]["Insert"];
type PlannerRepoClient = {
  schema: (schema: "planner") => {
    from: (table: string) => any;
  };
};

const mapRowToItinerary = (row: ItineraryRow): Itinerary => {
  const preferences = tripPreferencesSchema.parse(row.preferences);
  const days = z.array(itineraryDaySchema).parse(row.days);

  return itinerarySchema.parse({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    preferences,
    days,
    islandsCovered: row.islands_covered ?? [],
    estimatedBudgetRange: row.estimated_budget_range ?? "Not specified",
    modelVersion: row.model_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
};

const mapRowToSummary = (row: ItineraryRow): ItinerarySummary =>
  itinerarySummarySchema.parse({
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    islandsCovered: row.islands_covered ?? [],
    estimatedBudgetRange: row.estimated_budget_range ?? "Not specified",
    modelVersion: row.model_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });

export interface CreateItineraryInput {
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  preferences: TripPreferences;
  days: ItineraryDay[];
  islandsCovered: string[];
  estimatedBudgetRange: string;
  modelVersion: string;
}

export const itineraryRepo = {
  async create(client: PlannerRepoClient, payload: CreateItineraryInput): Promise<Itinerary> {
    const insertPayload: ItineraryInsert = {
      user_id: payload.userId,
      name: payload.name,
      start_date: payload.startDate,
      end_date: payload.endDate,
      preferences: payload.preferences as unknown as Json,
      days: payload.days as unknown as Json,
      islands_covered: payload.islandsCovered,
      estimated_budget_range: payload.estimatedBudgetRange,
      model_version: payload.modelVersion,
    };

    const { data, error } = await client
      .schema("planner")
      .from("itineraries")
      .insert(insertPayload)
      .select(itineraryColumns)
      .single();

    if (error) {
      throw new Error(`Failed to create itinerary: ${error.message}`);
    }

    return mapRowToItinerary(data as ItineraryRow);
  },

  async listByUser(client: PlannerRepoClient, userId: string, limit = 20): Promise<ItinerarySummary[]> {
    const { data, error } = await client
      .schema("planner")
      .from("itineraries")
      .select(itineraryColumns)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to list itineraries: ${error.message}`);
    }

    return ((data as ItineraryRow[] | null) ?? []).map(mapRowToSummary);
  },

  async getById(client: PlannerRepoClient, userId: string, itineraryId: string): Promise<Itinerary | null> {
    const { data, error } = await client
      .schema("planner")
      .from("itineraries")
      .select(itineraryColumns)
      .eq("user_id", userId)
      .eq("id", itineraryId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch itinerary: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return mapRowToItinerary(data as ItineraryRow);
  },

  async countGeneratedSince(
    client: PlannerRepoClient,
    userId: string,
    sinceIso: string,
  ): Promise<number> {
    const { count, error } = await client
      .schema("planner")
      .from("itineraries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", sinceIso);

    if (error) {
      throw new Error(`Failed to count itinerary generations: ${error.message}`);
    }

    return count ?? 0;
  },
};
