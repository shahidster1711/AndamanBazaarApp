import type { PlannerSupabaseClient } from "../client.js";
import type {
  Itinerary,
  ItinerarySummary,
  TripPreferences,
  ItineraryDay,
} from "@andaman-planner/shared";

interface CreateItineraryInput {
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

function rowToItinerary(row: Record<string, unknown>): Itinerary {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    preferences: row.preferences as TripPreferences,
    days: row.days as ItineraryDay[],
    islandsCovered: (row.islands_covered as string[]) ?? [],
    estimatedBudgetRange: (row.estimated_budget_range as string) ?? "",
    modelVersion: row.model_version as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToSummary(row: Record<string, unknown>): ItinerarySummary {
  return {
    id: row.id as string,
    name: row.name as string,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    islandsCovered: (row.islands_covered as string[]) ?? [],
    estimatedBudgetRange: (row.estimated_budget_range as string) ?? "",
    createdAt: row.created_at as string,
  };
}

export function createItineraryRepo(client: PlannerSupabaseClient) {
  return {
    async create(input: CreateItineraryInput): Promise<Itinerary> {
      const { data, error } = await client
        .from("itineraries")
        .insert({
          user_id: input.userId,
          name: input.name,
          start_date: input.startDate,
          end_date: input.endDate,
          preferences: input.preferences as unknown as Record<string, unknown>,
          days: input.days as unknown as Record<string, unknown>[],
          islands_covered: input.islandsCovered,
          estimated_budget_range: input.estimatedBudgetRange,
          model_version: input.modelVersion,
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to create itinerary: ${error.message}`);
      return rowToItinerary(data as Record<string, unknown>);
    },

    async listByUser(userId: string): Promise<ItinerarySummary[]> {
      const { data, error } = await client
        .from("itineraries")
        .select("id, name, start_date, end_date, islands_covered, estimated_budget_range, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(`Failed to list itineraries: ${error.message}`);
      return ((data ?? []) as Record<string, unknown>[]).map(rowToSummary);
    },

    async getById(id: string): Promise<Itinerary | null> {
      const { data, error } = await client
        .from("itineraries")
        .select()
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw new Error(`Failed to get itinerary: ${error.message}`);
      }
      return rowToItinerary(data as Record<string, unknown>);
    },

    async deleteById(id: string): Promise<void> {
      const { error } = await client.from("itineraries").delete().eq("id", id);
      if (error) throw new Error(`Failed to delete itinerary: ${error.message}`);
    },
  };
}

export type ItineraryRepo = ReturnType<typeof createItineraryRepo>;
