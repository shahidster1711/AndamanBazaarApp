import { z } from "zod";

export const budgetLevelSchema = z.enum(["budget", "midrange", "premium"]);
export const tripPaceSchema = z.enum(["relaxed", "balanced", "packed"]);

export const tripPreferencesSchema = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    travelersCount: z.number().int().min(1).max(20),
    budgetLevel: budgetLevelSchema,
    pace: tripPaceSchema,
    interests: z.array(z.string()).min(1, "Select at least one interest"),
    preferredIslands: z.array(z.string()),
    notes: z.string().nullable(),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

export const itineraryActivitySchema = z.object({
  time: z.string(),
  title: z.string(),
  description: z.string(),
  location: z.string(),
  duration: z.string(),
  cost: z.string().nullable(),
  tips: z.string().nullable(),
});

export const itineraryDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  date: z.string(),
  title: z.string(),
  island: z.string(),
  activities: z.array(itineraryActivitySchema).min(1),
  meals: z.object({
    breakfast: z.string().nullable(),
    lunch: z.string().nullable(),
    dinner: z.string().nullable(),
  }),
  transportNotes: z.string().nullable(),
  accommodationNotes: z.string().nullable(),
});

export const itineraryDaysSchema = z.array(itineraryDaySchema).min(1);

export const generateRequestSchema = z.object({
  preferences: tripPreferencesSchema,
});

export const generateResponseSchema = z.object({
  apiVersion: z.literal("v1"),
  itinerary: z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    name: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    preferences: tripPreferencesSchema.innerType(),
    days: itineraryDaysSchema,
    islandsCovered: z.array(z.string()),
    estimatedBudgetRange: z.string(),
    modelVersion: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
});

export const itinerarySummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  islandsCovered: z.array(z.string()),
  estimatedBudgetRange: z.string(),
  createdAt: z.string(),
});

export const listItinerariesResponseSchema = z.object({
  apiVersion: z.literal("v1"),
  itineraries: z.array(itinerarySummarySchema),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type GenerateResponse = z.infer<typeof generateResponseSchema>;
export type ListItinerariesResponse = z.infer<typeof listItinerariesResponseSchema>;
