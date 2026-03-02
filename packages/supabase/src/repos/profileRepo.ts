import type { TypedSupabaseClient } from '../client';

export type PlannerProfile = {
  id: string;
  homeCity: string | null;
  typicalBudgetRange: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapRow(row: any): PlannerProfile {
  return {
    id: row.id,
    homeCity: row.home_city,
    typicalBudgetRange: row.typical_budget_range,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getMyProfile(client: TypedSupabaseClient): Promise<PlannerProfile | null> {
  const { data, error } = await client.schema('planner').from('profiles').select('*').maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function upsertMyProfile(
  client: TypedSupabaseClient,
  input: { homeCity?: string | null; typicalBudgetRange?: string | null }
): Promise<PlannerProfile> {
  const { data: userData, error: userErr } = await client.auth.getUser();
  if (userErr) throw userErr;
  const userId = userData.user?.id;
  if (!userId) throw new Error('Unauthenticated');

  const { data, error } = await client
    .schema('planner')
    .from('profiles')
    .upsert(
      {
        id: userId,
        home_city: input.homeCity ?? null,
        typical_budget_range: input.typicalBudgetRange ?? null,
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single();

  if (error) throw error;
  return mapRow(data);
}

