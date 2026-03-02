/**
 * ItineraryCard — compact summary card for list views.
 * No Next.js imports; works in any React 18 app.
 */

import React from "react"
import type { ItinerarySummary } from "@andaman-planner/shared"
import { formatDisplayDate } from "@andaman-planner/shared"

export interface ItineraryCardProps {
  itinerary: ItinerarySummary
  /** Called when the user clicks the card. */
  onClick?: (id: string) => void
  /** Optional "delete" action button. */
  onDelete?: (id: string) => void
  className?: string
}

export function ItineraryCard({
  itinerary,
  onClick,
  onDelete,
  className = "",
}: ItineraryCardProps) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={() => onClick?.(itinerary.id)}
      onKeyDown={(e) => e.key === "Enter" && onClick?.(itinerary.id)}
      className={`group bg-white rounded-2xl shadow-sm border border-gray-100 p-5 transition-all hover:shadow-md hover:border-teal-200 ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      {/* Name + delete */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 text-base leading-snug line-clamp-2 group-hover:text-teal-700 transition-colors">
          {itinerary.name}
        </h3>
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(itinerary.id)
            }}
            title="Delete itinerary"
            className="shrink-0 text-gray-300 hover:text-red-400 transition-colors p-1 -mr-1"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Dates */}
      <p className="text-sm text-gray-500 mt-2">
        {formatDisplayDate(itinerary.startDate)} → {formatDisplayDate(itinerary.endDate)}
      </p>

      {/* Islands */}
      {itinerary.islandsCovered.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {itinerary.islandsCovered.map((island) => (
            <span
              key={island}
              className="inline-block bg-teal-50 text-teal-700 text-xs font-medium px-2 py-0.5 rounded-full"
            >
              {island}
            </span>
          ))}
        </div>
      )}

      {/* Budget */}
      {itinerary.estimatedBudgetRange && (
        <p className="text-xs text-sandy-700 mt-3 font-medium">
          💰 {itinerary.estimatedBudgetRange}
        </p>
      )}

      {/* Created at */}
      <p className="text-xs text-gray-300 mt-3">
        Created {new Date(itinerary.createdAt).toLocaleDateString("en-IN")}
      </p>
    </div>
  )
}
