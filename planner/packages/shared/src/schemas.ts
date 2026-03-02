/**
 * Zod schemas for runtime validation.
 * Mirrors the TypeScript types in types.ts — single source of truth
 * for validation across API routes, client forms, and AI output repair.
 */

import { z } from "zod"

// ----------------------------------------------------------------
// Primitives
// ----------------------------------------------------------------

export const BudgetLevelSchema = z.enum(["budget", "midrange", "premium"])
export const TravelPaceSchema = z.enum(["relaxed", "balanced", "packed"])

// ISO date string validator (YYYY-MM-DD)
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a date in YYYY-MM-DD format")

// ----------------------------------------------------------------
// TripPreferences
// ----------------------------------------------------------------

export const TripPreferencesSchema = z.object({
  startDate: isoDate,
  endDate: isoDate,
  travelersCount: z.number().int().min(1).max(20),
  budgetLevel: BudgetLevelSchema,
  pace: TravelPaceSchema,
  interests: z.array(z.string().min(1)).min(1).max(20),
  preferredIslands: z.array(z.string().min(1)).max(10),
  notes: z.string().max(500).nullable(),
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  { message: "endDate must be on or after startDate", path: ["endDate"] }
).refine(
  (data) => {
    const start = new Date(data.startDate)
    const end = new Date(data.endDate)
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    return diffDays <= 30
  },
  { message: "Trip duration cannot exceed 30 days", path: ["endDate"] }
)

// ----------------------------------------------------------------
// Activity (AI output)
// ----------------------------------------------------------------

export const ActivitySchema = z.object({
  time: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM"),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  location: z.string().min(1).max(200),
  durationMinutes: z.number().int().min(5).max(480),
  estimatedCost: z.number().min(0),
  category: z.enum(["sightseeing", "water_sport", "food", "travel", "accommodation", "leisure"]),
  tips: z.array(z.string().max(300)).max(5),
})

// ----------------------------------------------------------------
// ItineraryDay (AI output)
// ----------------------------------------------------------------

export const ItineraryDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  date: isoDate,
  island: z.string().min(1).max(100),
  theme: z.string().min(1).max(200),
  activities: z.array(ActivitySchema).min(2).max(10),
  accommodation: z.string().min(1).max(200),
  mealRecommendations: z.array(z.string().max(200)).max(5),
  transportNotes: z.string().max(500),
  estimatedDailyCost: z.number().min(0),
})

// ----------------------------------------------------------------
// Full Itinerary (DB entity — includes generated + stored fields)
// ----------------------------------------------------------------

export const ItinerarySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(200),
  startDate: isoDate,
  endDate: isoDate,
  preferences: TripPreferencesSchema,
  days: z.array(ItineraryDaySchema).min(1),
  islandsCovered: z.array(z.string()).min(1),
  estimatedBudgetRange: z.string().nullable(),
  modelVersion: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/** Schema for AI output only (before id/userId/createdAt are assigned) */
export const AiItineraryOutputSchema = z.object({
  name: z.string().min(1).max(200),
  days: z.array(ItineraryDaySchema).min(1),
  islandsCovered: z.array(z.string().min(1)).min(1),
  estimatedBudgetRange: z.string().nullable(),
})

// ----------------------------------------------------------------
// ItinerarySummary
// ----------------------------------------------------------------

export const ItinerarySummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  startDate: isoDate,
  endDate: isoDate,
  islandsCovered: z.array(z.string()),
  estimatedBudgetRange: z.string().nullable(),
  createdAt: z.string(),
})

// ----------------------------------------------------------------
// API request / response schemas
// ----------------------------------------------------------------

export const GenerateRequestSchema = z.object({
  preferences: TripPreferencesSchema,
})

export const GenerateResponseSchema = z.object({
  apiVersion: z.literal("v1"),
  itinerary: ItinerarySchema,
})

export const ListItinerariesResponseSchema = z.object({
  apiVersion: z.literal("v1"),
  itineraries: z.array(ItinerarySummarySchema),
})

export const GetItineraryResponseSchema = z.object({
  apiVersion: z.literal("v1"),
  itinerary: ItinerarySchema,
})

export const ApiErrorResponseSchema = z.object({
  apiVersion: z.literal("v1"),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

// ----------------------------------------------------------------
// Exported inferred types (use these instead of manually typed)
// ----------------------------------------------------------------

export type TripPreferencesInput = z.infer<typeof TripPreferencesSchema>
export type ItineraryDayInput = z.infer<typeof ItineraryDaySchema>
export type AiItineraryOutput = z.infer<typeof AiItineraryOutputSchema>
