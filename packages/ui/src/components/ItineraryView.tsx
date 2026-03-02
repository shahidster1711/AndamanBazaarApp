import React from "react";
import type { Itinerary } from "../../../shared/src/types";

export interface ItineraryViewProps {
  itinerary: Itinerary;
}

export const ItineraryView: React.FC<ItineraryViewProps> = ({ itinerary }) => (
  <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
    <header>
      <h2 className="text-2xl font-semibold text-slate-900">{itinerary.name}</h2>
      <p className="mt-1 text-sm text-slate-600">
        {itinerary.startDate} to {itinerary.endDate} • {itinerary.estimatedBudgetRange}
      </p>
      <p className="mt-1 text-sm text-slate-600">Islands covered: {itinerary.islandsCovered.join(", ")}</p>
    </header>

    <div className="space-y-3">
      {itinerary.days.map((day) => (
        <article key={`${day.date}-${day.dayNumber}`} className="rounded-lg border border-slate-200 p-4">
          <h3 className="text-base font-semibold text-slate-900">
            Day {day.dayNumber} • {day.date} • {day.island}
          </h3>
          <p className="mt-1 text-sm text-slate-700">{day.summary}</p>
          <p className="mt-2 text-sm text-slate-700">Stay: {day.stayRecommendation}</p>
          {day.transfers.length > 0 ? (
            <p className="mt-1 text-sm text-slate-600">Transfers: {day.transfers.join(" | ")}</p>
          ) : null}
          <ul className="mt-3 space-y-2">
            {day.activities.map((activity, index) => (
              <li key={`${activity.title}-${index}`} className="rounded-md bg-slate-50 p-2">
                <p className="text-sm font-medium text-slate-900">
                  {activity.startTime} - {activity.endTime}: {activity.title}
                </p>
                <p className="text-sm text-slate-700">{activity.description}</p>
                <p className="text-xs text-slate-600">
                  {activity.island}
                  {activity.estimatedCostInr !== null
                    ? ` • Est. INR ${activity.estimatedCostInr.toLocaleString("en-IN")}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  </section>
);
