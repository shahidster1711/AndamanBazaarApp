import React from 'react';
import type { Itinerary } from '@andamanbazaar/planner-shared';

export type ItineraryViewProps = {
  itinerary: Itinerary;
};

export function ItineraryView({ itinerary }: ItineraryViewProps) {
  return (
    <div className="w-full max-w-3xl space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">{itinerary.name}</h2>
          <div className="text-sm font-semibold text-slate-600">
            {itinerary.startDate} → {itinerary.endDate} · {itinerary.islandsCovered.join(' · ')} · {itinerary.estimatedBudgetRange}
          </div>
          <div className="text-xs text-slate-500">Model: {itinerary.modelVersion}</div>
        </div>
      </div>

      {itinerary.days.map((day) => (
        <div key={day.date} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">{day.date}</div>
              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                {day.title} <span className="text-slate-500">· {day.island}</span>
              </h3>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-700">{day.summary}</p>

          <div className="mt-5 space-y-3">
            {day.activities.map((a, idx) => (
              <div key={idx} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-black text-slate-900">
                    {a.time} · {a.title}
                  </div>
                  <div className="text-xs font-semibold text-slate-600">{a.location}</div>
                </div>
                <p className="mt-2 text-sm text-slate-700">{a.description}</p>
                {(a.durationMinutes != null || a.costEstimateInr != null || a.bookingNotes) && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                    {a.durationMinutes != null ? <span>~{a.durationMinutes} min</span> : null}
                    {a.costEstimateInr != null ? <span>₹{a.costEstimateInr}</span> : null}
                    {a.bookingNotes ? <span>{a.bookingNotes}</span> : null}
                  </div>
                )}
              </div>
            ))}
          </div>

          {day.notes ? <div className="mt-4 text-xs font-semibold text-slate-500">Notes: {day.notes}</div> : null}
        </div>
      ))}
    </div>
  );
}

