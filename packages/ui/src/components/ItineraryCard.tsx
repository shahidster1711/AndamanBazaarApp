import React from "react";
import type { ItinerarySummary } from "../../../shared/src/types";

export interface ItineraryCardProps {
  itinerary: ItinerarySummary;
  onOpen?: (itineraryId: string) => void;
}

export const ItineraryCard: React.FC<ItineraryCardProps> = ({ itinerary, onOpen }) => (
  <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <h3 className="text-lg font-semibold text-slate-900">{itinerary.name}</h3>
    <p className="mt-1 text-sm text-slate-600">
      {itinerary.startDate} to {itinerary.endDate}
    </p>
    <p className="mt-2 text-sm text-slate-700">Islands: {itinerary.islandsCovered.join(", ") || "TBD"}</p>
    <p className="mt-1 text-sm text-slate-700">Budget: {itinerary.estimatedBudgetRange}</p>
    {onOpen ? (
      <button
        type="button"
        className="mt-3 rounded-md border border-sky-600 px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-50"
        onClick={() => onOpen(itinerary.id)}
      >
        Open
      </button>
    ) : null}
  </article>
);
