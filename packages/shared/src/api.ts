import { z } from 'zod';
import { itinerarySchema, itinerarySummarySchema, tripPreferencesSchema } from './schemas';

export const apiVersionSchema = z.literal('v1');

export const generateRequestSchema = z.object({
  preferences: tripPreferencesSchema,
});

export const generateResponseSchema = z.object({
  apiVersion: apiVersionSchema,
  itinerary: itinerarySchema,
});

export const listItinerariesResponseSchema = z.object({
  apiVersion: apiVersionSchema,
  itineraries: z.array(itinerarySummarySchema),
});

export const getItineraryResponseSchema = z.object({
  apiVersion: apiVersionSchema,
  itinerary: itinerarySchema,
});

export const apiErrorSchema = z.object({
  apiVersion: apiVersionSchema,
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

