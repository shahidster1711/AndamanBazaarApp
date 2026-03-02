import React, { useCallback, useState } from 'react';
import type { Itinerary, TripPreferences } from '@andamanbazaar/planner-shared';
import { PlannerForm } from './PlannerForm';
import { ItineraryView } from './ItineraryView';

export type PlannerModuleProps = {
  generate: (preferences: TripPreferences) => Promise<Itinerary>;
  initial?: Partial<TripPreferences>;
};

export function PlannerModule({ generate, initial }: PlannerModuleProps) {
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onGenerate = useCallback(
    async (preferences: TripPreferences) => {
      setError(null);
      setLoading(true);
      try {
        const it = await generate(preferences);
        setItinerary(it);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to generate itinerary');
      } finally {
        setLoading(false);
      }
    },
    [generate]
  );

  return (
    <div className="flex w-full flex-col items-center gap-6">
      {error ? (
        <div className="w-full max-w-3xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <PlannerForm initial={initial} onGenerate={onGenerate} disabled={loading} />
      {itinerary ? <ItineraryView itinerary={itinerary} /> : null}
    </div>
  );
}

