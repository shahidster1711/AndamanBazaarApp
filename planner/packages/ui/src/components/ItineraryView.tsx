/**
 * ItineraryView — full itinerary display component.
 * No Next.js imports; works in any React 18 app.
 */

import React, { useState } from "react"
import type { Itinerary, ItineraryDay, Activity } from "@andaman-planner/shared"
import { formatDisplayDate, formatINR, totalEstimatedCost } from "@andaman-planner/shared"

// ----------------------------------------------------------------
// Activity badge colors by category
// ----------------------------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  sightseeing:   "bg-blue-100 text-blue-700",
  water_sport:   "bg-cyan-100 text-cyan-700",
  food:          "bg-orange-100 text-orange-700",
  travel:        "bg-purple-100 text-purple-700",
  accommodation: "bg-green-100 text-green-700",
  leisure:       "bg-pink-100 text-pink-700",
}

const CATEGORY_ICONS: Record<string, string> = {
  sightseeing:   "🏛️",
  water_sport:   "🤿",
  food:          "🍽️",
  travel:        "🚢",
  accommodation: "🏨",
  leisure:       "🌴",
}

// ----------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------

function ActivityItem({ activity }: { activity: Activity }) {
  const [expanded, setExpanded] = useState(false)
  const colorClass = CATEGORY_COLORS[activity.category] ?? "bg-gray-100 text-gray-700"
  const icon = CATEGORY_ICONS[activity.category] ?? "📍"

  return (
    <div className="border border-gray-100 rounded-xl p-4 hover:border-teal-200 transition-colors">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-14 text-center">
          <span className="text-lg">{icon}</span>
          <p className="text-xs text-gray-400 font-medium mt-0.5">{activity.time}</p>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-gray-900 text-sm">{activity.title}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorClass}`}>
              {activity.category.replace("_", " ")}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">📍 {activity.location}</p>
          {expanded && (
            <>
              <p className="text-sm text-gray-700 mt-2">{activity.description}</p>
              {activity.tips.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {activity.tips.map((tip, i) => (
                    <li key={i} className="text-xs text-teal-700 flex items-start gap-1">
                      <span className="shrink-0">💡</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          <div className="flex items-center gap-4 mt-2">
            <span className="text-xs text-gray-400">⏱ {activity.durationMinutes} min</span>
            <span className="text-xs text-sandy-700 font-medium">
              {formatINR(activity.estimatedCost)}
            </span>
            <button
              type="button"
              onClick={() => setExpanded((p) => !p)}
              className="text-xs text-teal-600 hover:text-teal-800 font-medium"
            >
              {expanded ? "Less ▲" : "More ▼"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DayCard({ day, isOpen, onToggle }: { day: ItineraryDay; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      {/* Day header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-teal-50 to-white hover:from-teal-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
            {day.dayNumber}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">
              {formatDisplayDate(day.date)} · {day.island}
            </p>
            <p className="text-xs text-teal-700 mt-0.5">{day.theme}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-semibold text-sandy-700">
            {formatINR(day.estimatedDailyCost)}
          </span>
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Day body */}
      {isOpen && (
        <div className="px-5 py-4 space-y-3 bg-white">
          {/* Activities */}
          <div className="space-y-3">
            {day.activities.map((activity, i) => (
              <ActivityItem key={i} activity={activity} />
            ))}
          </div>

          {/* Accommodation + Meals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {day.accommodation && (
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-green-700 mb-1">🏨 Accommodation</p>
                <p className="text-sm text-gray-700">{day.accommodation}</p>
              </div>
            )}
            {day.mealRecommendations.length > 0 && (
              <div className="bg-orange-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-orange-700 mb-1">🍽️ Meal Tips</p>
                <ul className="text-sm text-gray-700 space-y-1">
                  {day.mealRecommendations.map((meal, i) => (
                    <li key={i}>• {meal}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Transport notes */}
          {day.transportNotes && (
            <div className="bg-purple-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-purple-700 mb-1">🚢 Transport</p>
              <p className="text-sm text-gray-700">{day.transportNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------
// Main component
// ----------------------------------------------------------------

export interface ItineraryViewProps {
  itinerary: Itinerary
  /** Called when user clicks "Plan Another Trip". */
  onReset?: () => void
  className?: string
}

export function ItineraryView({ itinerary, onReset, className = "" }: ItineraryViewProps) {
  const [openDays, setOpenDays] = useState<Set<number>>(new Set([1]))

  const toggleDay = (dayNumber: number) => {
    setOpenDays((prev) => {
      const next = new Set(prev)
      if (next.has(dayNumber)) next.delete(dayNumber)
      else next.add(dayNumber)
      return next
    })
  }

  const expandAll = () => setOpenDays(new Set(itinerary.days.map((d) => d.dayNumber)))
  const collapseAll = () => setOpenDays(new Set())
  const total = totalEstimatedCost(itinerary.days)

  return (
    <div className={`max-w-3xl mx-auto space-y-6 ${className}`}>
      {/* Header card */}
      <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold leading-tight">{itinerary.name}</h1>
        <p className="mt-2 text-teal-100 text-sm">
          {formatDisplayDate(itinerary.startDate)} → {formatDisplayDate(itinerary.endDate)} ·{" "}
          {itinerary.days.length} day{itinerary.days.length > 1 ? "s" : ""}
        </p>

        {/* Islands */}
        <div className="mt-4 flex flex-wrap gap-2">
          {itinerary.islandsCovered.map((island) => (
            <span
              key={island}
              className="bg-white/20 text-white text-xs font-medium px-3 py-1 rounded-full"
            >
              {island}
            </span>
          ))}
        </div>

        {/* Budget */}
        {itinerary.estimatedBudgetRange && (
          <div className="mt-4 bg-white/10 rounded-xl px-4 py-3">
            <p className="text-xs text-teal-200 font-medium uppercase tracking-wide">
              Estimated Budget
            </p>
            <p className="text-white font-semibold mt-0.5">
              {itinerary.estimatedBudgetRange}
            </p>
            <p className="text-teal-200 text-xs mt-1">
              Total activities cost: {formatINR(total)}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="text-sm text-teal-600 hover:text-teal-800 font-medium px-3 py-1.5 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Collapse All
          </button>
        </div>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="text-sm bg-coral-500 hover:bg-coral-600 text-white font-medium px-4 py-1.5 rounded-lg transition-colors"
          >
            Plan Another Trip ✨
          </button>
        )}
      </div>

      {/* Day cards */}
      <div className="space-y-3">
        {itinerary.days.map((day) => (
          <DayCard
            key={day.dayNumber}
            day={day}
            isOpen={openDays.has(day.dayNumber)}
            onToggle={() => toggleDay(day.dayNumber)}
          />
        ))}
      </div>

      {/* Model badge */}
      <p className="text-center text-xs text-gray-300">
        Generated by {itinerary.modelVersion}
      </p>
    </div>
  )
}
