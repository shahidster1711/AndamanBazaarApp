import { z } from "zod";
import type { Database } from "../database.types";

type ProfileRow = Database["planner"]["Tables"]["profiles"]["Row"];
type ProfileInsert = Database["planner"]["Tables"]["profiles"]["Insert"];
type PlannerRepoClient = {
  schema: (schema: "planner") => {
    from: (table: string) => any;
  };
};

const profileSchema = z.object({
  id: z.string().uuid(),
  homeCity: z.string().nullable(),
  typicalBudgetRange: z.string().nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type PlannerProfile = z.infer<typeof profileSchema>;

const profileColumns = ["id", "home_city", "typical_budget_range", "created_at", "updated_at"].join(",");

const mapRowToProfile = (row: ProfileRow): PlannerProfile =>
  profileSchema.parse({
    id: row.id,
    homeCity: row.home_city,
    typicalBudgetRange: row.typical_budget_range,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });

export interface UpsertProfileInput {
  id: string;
  homeCity?: string | null;
  typicalBudgetRange?: string | null;
}

export const profileRepo = {
  async upsert(client: PlannerRepoClient, payload: UpsertProfileInput): Promise<PlannerProfile> {
    const upsertPayload: ProfileInsert = {
      id: payload.id,
      home_city: payload.homeCity ?? null,
      typical_budget_range: payload.typicalBudgetRange ?? null,
    };

    const { data, error } = await client
      .schema("planner")
      .from("profiles")
      .upsert(upsertPayload, { onConflict: "id" })
      .select(profileColumns)
      .single();

    if (error) {
      throw new Error(`Failed to upsert profile: ${error.message}`);
    }

    return mapRowToProfile(data as ProfileRow);
  },

  async getById(client: PlannerRepoClient, id: string): Promise<PlannerProfile | null> {
    const { data, error } = await client
      .schema("planner")
      .from("profiles")
      .select(profileColumns)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch profile: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return mapRowToProfile(data as ProfileRow);
  },
};
