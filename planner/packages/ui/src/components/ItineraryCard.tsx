import React from "react";
import type { ItinerarySummary } from "@andaman-planner/shared";
import { formatDateRange } from "@andaman-planner/shared";
import { cn } from "../lib/cn.js";

export interface ItineraryCardProps {
  itinerary: ItinerarySummary;
  onClick?: (id: string) => void;
  className?: string;
}

export function ItineraryCard({ itinerary, onClick, className }: ItineraryCardProps) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(itinerary.id)}
      className={cn(
        "w-full text-left rounded-xl border border-gray-100 bg-white p-5 shadow-sm",
        "transition-all hover:shadow-md hover:border-teal-200",
        "focus:outline-none focus:ring-2 focus:ring-teal-500/20",
        className
      )}
    >
      <h3 className="text-base font-heading font-bold text-gray-900 truncate">
        {itinerary.name}
      </h3>
      <p className="mt-1 text-xs text-gray-500">
        {formatDateRange(itinerary.startDate, itinerary.endDate)}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {itinerary.islandsCovered.map((island) => (
          <span
            key={island}
            className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700"
          >
            {island}
          </span>
        ))}
      </div>
      {itinerary.estimatedBudgetRange && (
        <p className="mt-2 text-xs font-medium text-gray-600">
          {itinerary.estimatedBudgetRange}
        </p>
      )}
    </button>
  );
}
