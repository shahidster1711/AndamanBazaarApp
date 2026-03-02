import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected ISO date YYYY-MM-DD");

export const budgetLevelSchema = z.enum(["budget", "midrange", "premium"]);
export const paceSchema = z.enum(["relaxed", "balanced", "packed"]);

export const tripPreferencesSchema = z.object({
  startDate: isoDate,
  endDate: isoDate,
  travelersCount: z.number().int().min(1).max(20),
  budgetLevel: budgetLevelSchema,
  pace: paceSchema,
  interests: z.array(z.string().min(1)).min(1).max(15),
  preferredIslands: z.array(z.string().min(1)).max(10),
  notes: z.string().max(1000).nullable(),
}).refine(
  (d) => new Date(d.endDate) >= new Date(d.startDate),
  { message: "endDate must be on or after startDate", path: ["endDate"] }
);

export const itineraryActivitySchema = z.object({
  time: z.string(),
  title: z.string(),
  description: z.string(),
  location: z.string(),
  duration: z.string(),
  estimatedCost: z.string().nullable(),
  category: z.string(),
  tips: z.string().nullable(),
});

export const itineraryDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  date: isoDate,
  island: z.string(),
  theme: z.string(),
  activities: z.array(itineraryActivitySchema).min(1),
  meals: z.object({
    breakfast: z.string().nullable(),
    lunch: z.string().nullable(),
    dinner: z.string().nullable(),
  }),
  accommodation: z.string().nullable(),
  travelNotes: z.string().nullable(),
});

export const itinerarySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1),
  startDate: isoDate,
  endDate: isoDate,
  preferences: tripPreferencesSchema,
  days: z.array(itineraryDaySchema).min(1),
  islandsCovered: z.array(z.string()),
  estimatedBudgetRange: z.string(),
  modelVersion: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const itinerarySummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  startDate: isoDate,
  endDate: isoDate,
  islandsCovered: z.array(z.string()),
  estimatedBudgetRange: z.string(),
  createdAt: z.string(),
});

export const generateRequestSchema = z.object({
  preferences: tripPreferencesSchema,
});

/** Schema for validating the raw AI-generated itinerary (before DB IDs are assigned) */
export const aiItineraryOutputSchema = z.object({
  name: z.string().min(1),
  days: z.array(itineraryDaySchema).min(1),
  islandsCovered: z.array(z.string()).min(1),
  estimatedBudgetRange: z.string().min(1),
});

export type AiItineraryOutput = z.infer<typeof aiItineraryOutputSchema>;
