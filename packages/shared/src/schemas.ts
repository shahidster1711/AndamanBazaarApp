import { z } from "zod";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const hhmmRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export const uuidSchema = z.string().regex(uuidRegex, "Expected UUID");
export const isoDateSchema = z.string().regex(isoDateRegex, "Expected YYYY-MM-DD date string");
export const hhmmTimeSchema = z.string().regex(hhmmRegex, "Expected HH:mm time string");

export const budgetLevelSchema = z.enum(["budget", "midrange", "premium"]);
export const tripPaceSchema = z.enum(["relaxed", "balanced", "packed"]);

export const userIdentitySchema = z.object({
  userId: uuidSchema,
  email: z.string().email().nullable(),
});

export const tripPreferencesSchema = z
  .object({
    startDate: isoDateSchema,
    endDate: isoDateSchema,
    travelersCount: z.number().int().min(1).max(20),
    budgetLevel: budgetLevelSchema,
    pace: tripPaceSchema,
    interests: z.array(z.string().trim().min(1)).max(20),
    preferredIslands: z.array(z.string().trim().min(1)).max(20),
    notes: z.string().trim().max(4000).nullable(),
  })
  .refine(
    (value) => new Date(`${value.endDate}T00:00:00Z`) >= new Date(`${value.startDate}T00:00:00Z`),
    {
      path: ["endDate"],
      message: "endDate must be same or after startDate",
    },
  );

export const itineraryActivitySchema = z.object({
  title: z.string().trim().min(1).max(160),
  island: z.string().trim().min(1).max(120),
  startTime: hhmmTimeSchema,
  endTime: hhmmTimeSchema,
  description: z.string().trim().min(1).max(1500),
  estimatedCostInr: z.number().int().nonnegative().nullable(),
});

export const itineraryDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  date: isoDateSchema,
  island: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(1000),
  activities: z.array(itineraryActivitySchema).min(1).max(12),
  stayRecommendation: z.string().trim().min(1).max(250),
  transfers: z.array(z.string().trim().min(1).max(200)).max(5),
});

export const itinerarySchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  name: z.string().trim().min(1).max(200),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  preferences: tripPreferencesSchema,
  days: z.array(itineraryDaySchema).min(1).max(21),
  islandsCovered: z.array(z.string().trim().min(1).max(120)).min(1).max(10),
  estimatedBudgetRange: z.string().trim().min(1).max(120),
  modelVersion: z.string().trim().min(1).max(120),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export const itinerarySummarySchema = z.object({
  id: uuidSchema,
  name: z.string().trim().min(1).max(200),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  islandsCovered: z.array(z.string().trim().min(1).max(120)),
  estimatedBudgetRange: z.string().trim().min(1).max(120),
  modelVersion: z.string().trim().min(1).max(120),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export const plannerGenerateRequestSchema = z.object({
  preferences: tripPreferencesSchema,
});

export const plannerGenerateResponseSchema = z.object({
  apiVersion: z.literal("v1"),
  itinerary: itinerarySchema,
});

export const plannerListResponseSchema = z.object({
  apiVersion: z.literal("v1"),
  itineraries: z.array(itinerarySummarySchema),
});

export const plannerGetResponseSchema = z.object({
  apiVersion: z.literal("v1"),
  itinerary: itinerarySchema,
});

export const plannerApiErrorSchema = z.object({
  apiVersion: z.literal("v1"),
  error: z.object({
    code: z.string().trim().min(1),
    message: z.string().trim().min(1),
    details: z.unknown().optional(),
  }),
});

export type UserIdentityInput = z.infer<typeof userIdentitySchema>;
export type TripPreferencesInput = z.infer<typeof tripPreferencesSchema>;
export type ItineraryDayInput = z.infer<typeof itineraryDaySchema>;
export type ItineraryInput = z.infer<typeof itinerarySchema>;
