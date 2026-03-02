import React from "react";
import type { Itinerary, ItineraryDay } from "@andaman-planner/shared";
import { formatDateRange, budgetLabel, paceLabel } from "@andaman-planner/shared";
import { cn } from "../lib/cn.js";

export interface ItineraryViewProps {
  itinerary: Itinerary;
  className?: string;
}

function DayCard({ day }: { day: ItineraryDay }) {
  return (
    <div className="rounded-xl border border-teal-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-heading font-bold text-teal-800">
          Day {day.dayNumber}: {day.title}
        </h3>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
          {day.island}
        </span>
      </div>

      <p className="mb-4 text-xs text-gray-500">{day.date}</p>

      <div className="space-y-3">
        {day.activities.map((act, i) => (
          <div key={i} className="flex gap-3 rounded-lg bg-gray-50 p-3">
            <div className="flex-shrink-0 text-xs font-semibold text-teal-600 w-14">
              {act.time}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{act.title}</p>
              <p className="text-xs text-gray-600 mt-0.5">{act.description}</p>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                <span>{act.location}</span>
                <span>·</span>
                <span>{act.duration}</span>
                {act.cost && (
                  <>
                    <span>·</span>
                    <span className="text-teal-600">{act.cost}</span>
                  </>
                )}
              </div>
              {act.tips && (
                <p className="mt-1 text-xs italic text-amber-700">Tip: {act.tips}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Meals */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        {day.meals.breakfast && (
          <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
            🍳 {day.meals.breakfast}
          </span>
        )}
        {day.meals.lunch && (
          <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
            🍱 {day.meals.lunch}
          </span>
        )}
        {day.meals.dinner && (
          <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
            🍽️ {day.meals.dinner}
          </span>
        )}
      </div>

      {day.transportNotes && (
        <p className="mt-3 text-xs text-gray-500">
          🚢 <span className="font-medium">Transport:</span> {day.transportNotes}
        </p>
      )}
      {day.accommodationNotes && (
        <p className="mt-1 text-xs text-gray-500">
          🏨 <span className="font-medium">Stay:</span> {day.accommodationNotes}
        </p>
      )}
    </div>
  );
}

export function ItineraryView({ itinerary, className }: ItineraryViewProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-heading font-bold">{itinerary.name}</h1>
        <p className="mt-1 text-teal-100">
          {formatDateRange(itinerary.startDate, itinerary.endDate)}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
            {itinerary.days.length} Days
          </span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
            {budgetLabel(itinerary.preferences.budgetLevel)}
          </span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
            {paceLabel(itinerary.preferences.pace)}
          </span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
            {itinerary.estimatedBudgetRange}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {itinerary.islandsCovered.map((island) => (
            <span
              key={island}
              className="rounded-full bg-white/10 px-2 py-0.5 text-xs"
            >
              {island}
            </span>
          ))}
        </div>
      </div>

      {/* Days */}
      {itinerary.days.map((day) => (
        <DayCard key={day.dayNumber} day={day} />
      ))}
    </div>
  );
}
