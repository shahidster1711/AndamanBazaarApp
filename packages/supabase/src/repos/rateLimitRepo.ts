import type { TypedSupabaseClient } from '../client';

export async function countGenerationsLastHour(client: TypedSupabaseClient, userId: string): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await client
    .schema('planner')
    .from('generation_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);

  if (error) throw error;
  return count ?? 0;
}

export async function recordGenerationEvent(client: TypedSupabaseClient, userId: string): Promise<void> {
  const { error } = await client.schema('planner').from('generation_events').insert({ user_id: userId });
  if (error) throw error;
}

