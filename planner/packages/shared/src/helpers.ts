/**
 * Utility helpers — date arithmetic, budget formatting, island data.
 * Framework-agnostic; safe to import anywhere.
 */

import type { BudgetLevel, TravelPace, ItineraryDay } from "./types"

// ----------------------------------------------------------------
// Date helpers
// ----------------------------------------------------------------

/** Returns number of nights between two ISO date strings. */
export function tripNights(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
}

/** Returns number of full days (nights + 1). */
export function tripDays(startDate: string, endDate: string): number {
  return tripNights(startDate, endDate) + 1
}

/** Formats "2025-01-15" → "Jan 15, 2025" */
export function formatDisplayDate(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

/** Generates an array of ISO date strings from start to end (inclusive). */
export function dateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const current = new Date(startDate + "T00:00:00")
  const end = new Date(endDate + "T00:00:00")
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10))
    current.setDate(current.getDate() + 1)
  }
  return dates
}

// ----------------------------------------------------------------
// Budget helpers
// ----------------------------------------------------------------

const BUDGET_LABELS: Record<BudgetLevel, string> = {
  budget: "Budget (₹500–₹1,500/day)",
  midrange: "Mid-range (₹1,500–₹4,000/day)",
  premium: "Premium (₹4,000+/day)",
}

export function budgetLevelLabel(level: BudgetLevel): string {
  return BUDGET_LABELS[level]
}

/** Estimates per-person budget range string based on level and days. */
export function estimateBudgetRange(
  level: BudgetLevel,
  days: number,
  travelersCount: number
): string {
  const ranges: Record<BudgetLevel, [number, number]> = {
    budget:   [500, 1500],
    midrange: [1500, 4000],
    premium:  [4000, 10000],
  }
  const [low, high] = ranges[level]
  const totalLow = low * days
  const totalHigh = high * days
  return `₹${totalLow.toLocaleString("en-IN")} – ₹${totalHigh.toLocaleString("en-IN")} per person (${travelersCount} traveler${travelersCount > 1 ? "s" : ""})`
}

// ----------------------------------------------------------------
// Pace helpers
// ----------------------------------------------------------------

const PACE_LABELS: Record<TravelPace, string> = {
  relaxed: "Relaxed (fewer stops, more leisure)",
  balanced: "Balanced (mix of activities and rest)",
  packed: "Packed (maximum experiences)",
}

export function paceLevelLabel(pace: TravelPace): string {
  return PACE_LABELS[pace]
}

/** Recommended activities per day based on pace. */
export function activitiesPerDay(pace: TravelPace): { min: number; max: number } {
  const table: Record<TravelPace, { min: number; max: number }> = {
    relaxed:  { min: 2, max: 4 },
    balanced: { min: 3, max: 6 },
    packed:   { min: 5, max: 8 },
  }
  return table[pace]
}

// ----------------------------------------------------------------
// Andaman island data
// ----------------------------------------------------------------

export const ANDAMAN_ISLANDS = [
  "Port Blair",
  "Havelock Island (Swaraj Dweep)",
  "Neil Island (Shaheed Dweep)",
  "Baratang Island",
  "Diglipur",
  "Little Andaman",
  "Long Island",
  "Ross Island",
  "North Bay Island",
  "Jolly Buoy Island",
  "Red Skin Island",
  "Cinque Island",
  "Viper Island",
] as const

export type AndamanIsland = typeof ANDAMAN_ISLANDS[number]

/** Popular interest categories for the planner form. */
export const INTEREST_OPTIONS = [
  "Scuba Diving",
  "Snorkelling",
  "Sea Walking",
  "Glass Bottom Boat",
  "Kayaking",
  "Jet Skiing",
  "Island Hopping",
  "Beach Relaxation",
  "Photography",
  "Trekking / Nature Walks",
  "Tribal Culture & History",
  "Local Food & Markets",
  "Cellular Jail & History",
  "Bioluminescence Night",
  "Sunset / Sunrise Viewing",
  "Mangrove Creek Tour",
  "Mud Volcano (Baratang)",
  "Limestone Caves (Baratang)",
] as const

// ----------------------------------------------------------------
// Itinerary helpers
// ----------------------------------------------------------------

/** Derives unique islands from itinerary days. */
export function extractIslands(days: ItineraryDay[]): string[] {
  return [...new Set(days.map((d) => d.island))]
}

/** Sums total estimated cost across all days. */
export function totalEstimatedCost(days: ItineraryDay[]): number {
  return days.reduce((sum, d) => sum + d.estimatedDailyCost, 0)
}

/** Formats INR amount with locale formatting. */
export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`
}
