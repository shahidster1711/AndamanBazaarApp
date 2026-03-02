import React, { useCallback } from 'react';
import { PlannerModule } from '@andamanbazaar/planner-ui';
import {
  defaultTripName,
  deriveIslandsCovered,
  estimateBudgetRange,
  itinerarySchema,
  uniqStringsPreserveOrder,
} from '@andamanbazaar/planner-shared';
import type { Itinerary, TripPreferences } from '@andamanbazaar/planner-shared';

function buildMockItinerary(preferences: TripPreferences): Itinerary {
  const start = new Date(preferences.startDate + 'T00:00:00Z');
  const end = new Date(preferences.endDate + 'T00:00:00Z');
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysCount = Math.max(1, Math.round((end.getTime() - start.getTime()) / msPerDay) + 1);

  const preferred = uniqStringsPreserveOrder(preferences.preferredIslands);
  const islands = preferred.length ? preferred : ['Port Blair', 'Havelock (Swaraj Dweep)', 'Neil (Shaheed Dweep)'];

  const days = Array.from({ length: daysCount }).map((_, i) => {
    const date = new Date(start.getTime() + i * msPerDay).toISOString().slice(0, 10);
    const island = islands[Math.min(i, islands.length - 1)] ?? 'Port Blair';
    const activities = preferences.pace === 'relaxed' ? 2 : 3;
    const activityList = Array.from({ length: activities }).map((__, idx) => ({
      time: idx === 0 ? '09:00' : idx === 1 ? '13:30' : '17:30',
      title: idx === 0 ? 'Breakfast + local briefing' : idx === 1 ? 'Main activity' : 'Sunset time',
      description: 'Mock itinerary activity used only in the demo harness.',
      location: island,
      island,
      durationMinutes: idx === 1 ? 150 : 60,
      costEstimateInr: null,
      bookingNotes: null,
    }));
    return {
      date,
      island,
      title: `Day ${i + 1} in ${island}`,
      summary: 'Mock day plan used only in the demo harness.',
      activities: activityList,
      notes: preferences.notes,
    };
  });

  const islandsCovered = deriveIslandsCovered(days, preferences.preferredIslands);
  const estimatedBudgetRange = estimateBudgetRange(preferences);
  const name = defaultTripName(preferences, islandsCovered, preferences.pace);
  const now = new Date().toISOString();

  const itinerary: Itinerary = {
    id: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    name,
    startDate: preferences.startDate,
    endDate: preferences.endDate,
    preferences,
    days,
    islandsCovered,
    estimatedBudgetRange,
    modelVersion: 'demo_harness',
    createdAt: now,
    updatedAt: now,
  };

  return itinerarySchema.parse(itinerary);
}

export function App() {
  const generate = useCallback(async (preferences: TripPreferences) => buildMockItinerary(preferences), []);

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-5 py-10">
      <div className="mb-8">
        <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">Planner Vite Harness</div>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Andaman Planner Pro</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-600">
          This harness proves that `@andamanbazaar/planner-ui` embeds cleanly into a Vite + Tailwind app.
        </p>
      </div>

      <PlannerModule generate={generate} />
    </div>
  );
}

