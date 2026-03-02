import type { TypedSupabaseClient } from "./client.js";
import type { PlannerProfile } from "@andaman-planner/shared";

function rowToProfile(row: Record<string, unknown>): PlannerProfile {
  return {
    id: row.id as string,
    homeCity: row.home_city as string | null,
    typicalBudgetRange: row.typical_budget_range as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function createProfileRepo(client: TypedSupabaseClient) {
  return {
    async getOrCreate(userId: string): Promise<PlannerProfile> {
      const { data: existing } = await client
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (existing) return rowToProfile(existing as Record<string, unknown>);

      const { data, error } = await client
        .from("profiles")
        .insert({ id: userId })
        .select()
        .single();

      if (error) throw new Error(`Failed to create profile: ${error.message}`);
      return rowToProfile(data as Record<string, unknown>);
    },

    async update(
      userId: string,
      fields: { homeCity?: string | null; typicalBudgetRange?: string | null }
    ): Promise<PlannerProfile> {
      const { data, error } = await client
        .from("profiles")
        .update({
          home_city: fields.homeCity,
          typical_budget_range: fields.typicalBudgetRange,
        })
        .eq("id", userId)
        .select()
        .single();

      if (error) throw new Error(`Failed to update profile: ${error.message}`);
      return rowToProfile(data as Record<string, unknown>);
    },
  };
}
