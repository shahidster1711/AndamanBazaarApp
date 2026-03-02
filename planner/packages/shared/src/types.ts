/**
 * Shared domain types for Andaman Planner Pro.
 * This file is framework-agnostic — safe to import from Next.js, Vite, or Node.
 */

// ----------------------------------------------------------------
// Identity
// ----------------------------------------------------------------

export interface UserIdentity {
  /** UUID from Supabase auth.users.id */
  userId: string
  email: string | null
}

// ----------------------------------------------------------------
// Trip Preferences (user input)
// ----------------------------------------------------------------

export type BudgetLevel = "budget" | "midrange" | "premium"
export type TravelPace = "relaxed" | "balanced" | "packed"

export interface TripPreferences {
  startDate: string        // ISO 8601 date "YYYY-MM-DD"
  endDate: string          // ISO 8601 date "YYYY-MM-DD"
  travelersCount: number
  budgetLevel: BudgetLevel
  pace: TravelPace
  interests: string[]
  preferredIslands: string[]
  notes: string | null
}

// ----------------------------------------------------------------
// Itinerary Day (AI output unit)
// ----------------------------------------------------------------

export interface Activity {
  time: string             // e.g. "09:00"
  title: string
  description: string
  location: string
  durationMinutes: number
  estimatedCost: number    // INR
  category: string         // "sightseeing" | "water_sport" | "food" | "travel" | "accommodation" | "leisure"
  tips: string[]
}

export interface ItineraryDay {
  dayNumber: number
  date: string             // ISO 8601 "YYYY-MM-DD"
  island: string
  theme: string
  activities: Activity[]
  accommodation: string
  mealRecommendations: string[]
  transportNotes: string
  estimatedDailyCost: number  // INR
}

// ----------------------------------------------------------------
// Itinerary (full entity stored in DB)
// ----------------------------------------------------------------

export interface Itinerary {
  id: string               // uuid
  userId: string           // uuid — references auth.users.id
  name: string
  startDate: string        // ISO 8601
  endDate: string          // ISO 8601
  preferences: TripPreferences  // snapshot of input
  days: ItineraryDay[]
  islandsCovered: string[]
  estimatedBudgetRange: string | null   // e.g. "₹25,000 – ₹35,000 per person"
  modelVersion: string     // e.g. "gemini-1.5-pro-001"
  createdAt: string
  updatedAt: string
}

/** Lightweight summary for list views */
export interface ItinerarySummary {
  id: string
  name: string
  startDate: string
  endDate: string
  islandsCovered: string[]
  estimatedBudgetRange: string | null
  createdAt: string
}

// ----------------------------------------------------------------
// Planner Profile
// ----------------------------------------------------------------

export interface PlannerProfile {
  id: string               // equals auth.users.id
  homeCity: string | null
  typicalBudgetRange: string | null
  createdAt: string
  updatedAt: string
}

// ----------------------------------------------------------------
// API response envelope
// ----------------------------------------------------------------

export interface ApiSuccessResponse<T> {
  apiVersion: "v1"
  data: T
}

export interface ApiErrorResponse {
  apiVersion: "v1"
  error: {
    code: string
    message: string
  }
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

// ----------------------------------------------------------------
// Rate limit status
// ----------------------------------------------------------------

export interface RateLimitStatus {
  allowed: boolean
  remaining: number
  resetAt: string          // ISO 8601
}
