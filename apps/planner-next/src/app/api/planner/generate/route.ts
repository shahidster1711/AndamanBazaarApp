import { NextResponse } from 'next/server';
import { generateRequestSchema, generateResponseSchema } from '@andamanbazaar/planner-shared';
import { createItinerary, recordGenerationEvent, countGenerationsLastHour } from '@andamanbazaar/planner-supabase';
import { defaultTripName, deriveIslandsCovered, estimateBudgetRange } from '@andamanbazaar/planner-shared';
import { getSupabaseAuthedClient } from '../_lib/supabase';
import { jsonError } from '../_lib/http';
import { generateItineraryDraft } from '../_lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { supabase, accessToken, configError } = getSupabaseAuthedClient(req);
  if (configError) return jsonError(500, 'misconfigured', configError);

  const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken ?? undefined);
  if (userErr) return jsonError(401, 'unauthorized', 'Invalid session');
  const user = userData.user;
  if (!user) return jsonError(401, 'unauthorized', 'Not signed in');

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, 'bad_request', 'Invalid JSON body');
  }

  const parsed = generateRequestSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, 'bad_request', parsed.error.issues[0]?.message ?? 'Invalid request');

  const preferences = parsed.data.preferences;

  const used = await countGenerationsLastHour(supabase, user.id);
  if (used >= 5) return jsonError(429, 'rate_limited', 'Rate limit exceeded (5 generations/hour)');

  const draft = await generateItineraryDraft({ preferences });
  const islandsCovered = deriveIslandsCovered(draft.days, preferences.preferredIslands);
  const estimatedBudgetRange = estimateBudgetRange(preferences);
  const name = draft.name || defaultTripName(preferences, islandsCovered, preferences.pace);

  await recordGenerationEvent(supabase, user.id);

  const itinerary = await createItinerary(supabase, {
    userId: user.id,
    name,
    startDate: preferences.startDate,
    endDate: preferences.endDate,
    preferences,
    days: draft.days,
    estimatedBudgetRange,
    islandsCovered,
    modelVersion: draft.modelVersion,
  });

  const payload = { apiVersion: 'v1' as const, itinerary };
  generateResponseSchema.parse(payload);
  return NextResponse.json(payload);
}

