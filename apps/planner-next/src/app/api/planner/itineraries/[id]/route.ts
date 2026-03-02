import { NextResponse } from 'next/server';
import { getItineraryResponseSchema } from '@andamanbazaar/planner-shared';
import { getItineraryById } from '@andamanbazaar/planner-supabase';
import { getSupabaseAuthedClient } from '../../_lib/supabase';
import { jsonError } from '../../_lib/http';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, ctx: { params: { id: string } }) {
  const { supabase, accessToken, configError } = getSupabaseAuthedClient(_);
  if (configError) return jsonError(500, 'misconfigured', configError);

  const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken ?? undefined);
  if (userErr) return jsonError(401, 'unauthorized', 'Invalid session');
  if (!userData.user) return jsonError(401, 'unauthorized', 'Not signed in');

  const itinerary = await getItineraryById(supabase, ctx.params.id);
  if (!itinerary) return jsonError(404, 'not_found', 'Itinerary not found');

  const payload = { apiVersion: 'v1' as const, itinerary };
  getItineraryResponseSchema.parse(payload);
  return NextResponse.json(payload);
}

