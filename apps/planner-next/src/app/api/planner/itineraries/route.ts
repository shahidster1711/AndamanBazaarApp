import { NextResponse } from 'next/server';
import { listItinerariesResponseSchema } from '@andamanbazaar/planner-shared';
import { listItinerarySummaries } from '@andamanbazaar/planner-supabase';
import { getSupabaseAuthedClient } from '../_lib/supabase';
import { jsonError } from '../_lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { supabase, accessToken, configError } = getSupabaseAuthedClient(req);
  if (configError) return jsonError(500, 'misconfigured', configError);

  const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken ?? undefined);
  if (userErr) return jsonError(401, 'unauthorized', 'Invalid session');
  if (!userData.user) return jsonError(401, 'unauthorized', 'Not signed in');

  const itineraries = await listItinerarySummaries(supabase);
  const payload = { apiVersion: 'v1' as const, itineraries };
  listItinerariesResponseSchema.parse(payload);
  return NextResponse.json(payload);
}

