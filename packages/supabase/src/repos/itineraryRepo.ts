import { z } from 'zod';
import {
  deriveIslandsCovered,
  estimateBudgetRange,
  itineraryDaySchema,
  tripPreferencesSchema,
  uniqStringsPreserveOrder,
} from '@andamanbazaar/planner-shared';
import type { Itinerary, ItinerarySummary, TripPreferences } from '@andamanbazaar/planner-shared';
import type { TypedSupabaseClient } from '../client';

const dbItineraryDaysSchema = z.array(itineraryDaySchema);
const dbPreferencesSchema = tripPreferencesSchema;

function mapRowToItinerary(row: any): Itinerary {
  const preferences = dbPreferencesSchema.parse(row.preferences);
  const days = dbItineraryDaysSchema.parse(row.days);
  const islandsCovered = row.islands_covered ?? deriveIslandsCovered(days, preferences.preferredIslands);
  const estimatedBudgetRange = row.estimated_budget_range ?? estimateBudgetRange(preferences);

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    preferences,
    days,
    islandsCovered,
    estimatedBudgetRange,
    modelVersion: row.model_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToSummary(row: any): ItinerarySummary {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    islandsCovered: uniqStringsPreserveOrder(row.islands_covered ?? []).length
      ? uniqStringsPreserveOrder(row.islands_covered ?? [])
      : ['Andaman'],
    estimatedBudgetRange: row.estimated_budget_range ?? 'TBD',
    updatedAt: row.updated_at,
  };
}

export async function listItinerarySummaries(client: TypedSupabaseClient): Promise<ItinerarySummary[]> {
  const { data, error } = await client
    .schema('planner')
    .from('itineraries')
    .select('id,name,start_date,end_date,islands_covered,estimated_budget_range,updated_at')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapRowToSummary);
}

export async function getItineraryById(client: TypedSupabaseClient, id: string): Promise<Itinerary | null> {
  const { data, error } = await client.schema('planner').from('itineraries').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapRowToItinerary(data);
}

export async function createItinerary(client: TypedSupabaseClient, input: {
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  preferences: TripPreferences;
  days: unknown;
  estimatedBudgetRange: string;
  islandsCovered: string[];
  modelVersion: string;
}): Promise<Itinerary> {
  const { data, error } = await client
    .schema('planner')
    .from('itineraries')
    .insert({
      user_id: input.userId,
      name: input.name,
      start_date: input.startDate,
      end_date: input.endDate,
      preferences: input.preferences as any,
      days: input.days as any,
      estimated_budget_range: input.estimatedBudgetRange,
      islands_covered: input.islandsCovered,
      model_version: input.modelVersion,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapRowToItinerary(data);
}

