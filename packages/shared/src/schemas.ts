import { z } from 'zod';

export const budgetLevelSchema = z.enum(['budget', 'midrange', 'premium']);
export const paceSchema = z.enum(['relaxed', 'balanced', 'packed']);

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected date in YYYY-MM-DD format');

const timeHHMMSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Expected time in HH:MM format');

export const userIdentitySchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email().nullable(),
});

export const tripPreferencesSchema = z
  .object({
    startDate: isoDateSchema,
    endDate: isoDateSchema,
    travelersCount: z.number().int().min(1).max(20),
    budgetLevel: budgetLevelSchema,
    pace: paceSchema,
    interests: z.array(z.string().min(1)).max(30),
    preferredIslands: z.array(z.string().min(1)).max(20),
    notes: z.string().max(2000).nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.endDate < val.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'endDate must be on/after startDate',
        path: ['endDate'],
      });
    }
  });

export const itineraryActivitySchema = z.object({
  time: timeHHMMSchema,
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(600),
  location: z.string().min(1).max(120),
  island: z.string().min(1).max(80),
  durationMinutes: z.number().int().min(15).max(24 * 60).nullable(),
  costEstimateInr: z.number().int().min(0).max(500000).nullable(),
  bookingNotes: z.string().max(500).nullable(),
});

export const itineraryDaySchema = z.object({
  date: isoDateSchema,
  island: z.string().min(1).max(80),
  title: z.string().min(1).max(140),
  summary: z.string().min(1).max(700),
  activities: z.array(itineraryActivitySchema).min(1).max(20),
  notes: z.string().max(1200).nullable(),
});

export const itinerarySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(140),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  preferences: tripPreferencesSchema,
  days: z.array(itineraryDaySchema).min(1).max(60),
  islandsCovered: z.array(z.string().min(1).max(80)).min(1).max(20),
  estimatedBudgetRange: z.string().min(1).max(60),
  modelVersion: z.string().min(1).max(80),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const itinerarySummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(140),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  islandsCovered: z.array(z.string().min(1).max(80)).min(1).max(20),
  estimatedBudgetRange: z.string().min(1).max(60),
  updatedAt: z.string().datetime(),
});

