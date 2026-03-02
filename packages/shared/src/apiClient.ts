import {
  generateRequestSchema,
  generateResponseSchema,
  getItineraryResponseSchema,
  listItinerariesResponseSchema,
} from './api';
import type { Itinerary, ItinerarySummary, TripPreferences } from './types';

export type PlannerApiClientOptions = {
  baseUrl?: string; // e.g. "" (same-origin) or "https://andamanbazaar.in/planner"
  fetcher?: typeof fetch;
  getAccessToken?: () => Promise<string | null> | string | null;
};

export function createPlannerApiClient(opts: PlannerApiClientOptions = {}) {
  const baseUrl = (opts.baseUrl ?? '').replace(/\/+$/, '');
  const fetcher = opts.fetcher ?? fetch;

  async function authHeaders(): Promise<Record<string, string>> {
    if (!opts.getAccessToken) return {};
    const token = await opts.getAccessToken();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  return {
    async generate(preferences: TripPreferences): Promise<Itinerary> {
      const body = generateRequestSchema.parse({ preferences });
      const res = await fetcher(`${baseUrl}/api/planner/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await authHeaders()),
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
      return generateResponseSchema.parse(json).itinerary;
    },

    async listItineraries(): Promise<ItinerarySummary[]> {
      const res = await fetcher(`${baseUrl}/api/planner/itineraries`, {
        method: 'GET',
        headers: await authHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
      return listItinerariesResponseSchema.parse(json).itineraries;
    },

    async getItinerary(id: string): Promise<Itinerary> {
      const res = await fetcher(`${baseUrl}/api/planner/itineraries/${encodeURIComponent(id)}`, {
        method: 'GET',
        headers: await authHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
      return getItineraryResponseSchema.parse(json).itinerary;
    },
  };
}

