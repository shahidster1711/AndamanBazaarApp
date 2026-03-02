import React from 'react';
import type { ItinerarySummary } from '@andamanbazaar/planner-shared';

export type ItineraryCardProps = {
  itinerary: ItinerarySummary;
  onOpen?: (id: string) => void;
};

export function ItineraryCard({ itinerary, onOpen }: ItineraryCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.(itinerary.id)}
      className="w-full rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-sky-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-black tracking-tight text-slate-900">{itinerary.name}</div>
          <div className="mt-1 text-sm font-semibold text-slate-600">
            {itinerary.startDate} → {itinerary.endDate}
          </div>
        </div>
        <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{itinerary.estimatedBudgetRange}</div>
      </div>

      <div className="mt-3 text-xs font-semibold text-slate-600">{itinerary.islandsCovered.join(' · ')}</div>
      <div className="mt-2 text-[11px] font-semibold text-slate-400">Updated: {new Date(itinerary.updatedAt).toLocaleString()}</div>
    </button>
  );
}

