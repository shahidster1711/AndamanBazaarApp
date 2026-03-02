/** Core identity type — derived from Supabase auth.users */
export interface UserIdentity {
  userId: string; // uuid from auth.users.id
  email: string | null;
}

/** Budget tiers */
export type BudgetLevel = "budget" | "midrange" | "premium";

/** Pace options for the trip */
export type PaceOption = "relaxed" | "balanced" | "packed";

/** User-supplied trip preferences fed to the AI planner */
export interface TripPreferences {
  startDate: string; // ISO date "YYYY-MM-DD"
  endDate: string;
  travelersCount: number;
  budgetLevel: BudgetLevel;
  pace: PaceOption;
  interests: string[];
  preferredIslands: string[];
  notes: string | null;
}

/** A single activity within a day */
export interface ItineraryActivity {
  time: string; // e.g. "09:00"
  title: string;
  description: string;
  location: string;
  duration: string; // e.g. "2 hours"
  estimatedCost: string | null;
  category: string; // e.g. "sightseeing", "water-sports", "dining"
  tips: string | null;
}

/** A single day in the itinerary */
export interface ItineraryDay {
  dayNumber: number;
  date: string; // ISO date
  island: string;
  theme: string; // e.g. "Beach & Snorkeling Day"
  activities: ItineraryActivity[];
  meals: {
    breakfast: string | null;
    lunch: string | null;
    dinner: string | null;
  };
  accommodation: string | null;
  travelNotes: string | null;
}

/** Full itinerary as stored in DB + returned by API */
export interface Itinerary {
  id: string;
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  preferences: TripPreferences;
  days: ItineraryDay[];
  islandsCovered: string[];
  estimatedBudgetRange: string;
  modelVersion: string;
  createdAt: string;
  updatedAt: string;
}

/** Summary version for list endpoints */
export interface ItinerarySummary {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  islandsCovered: string[];
  estimatedBudgetRange: string;
  createdAt: string;
}

/** Planner user profile */
export interface PlannerProfile {
  id: string;
  homeCity: string | null;
  typicalBudgetRange: string | null;
  createdAt: string;
  updatedAt: string;
}

/** API response envelope */
export interface ApiResponse<T> {
  apiVersion: string;
  data: T;
}

/** API error shape */
export interface ApiError {
  apiVersion: string;
  error: {
    code: string;
    message: string;
  };
}

/** Generate endpoint request body */
export interface GenerateRequest {
  preferences: TripPreferences;
}

/** Generate endpoint response */
export interface GenerateResponse {
  apiVersion: string;
  itinerary: Itinerary;
}

/** List itineraries response */
export interface ListItinerariesResponse {
  apiVersion: string;
  itineraries: ItinerarySummary[];
}

/** Get single itinerary response */
export interface GetItineraryResponse {
  apiVersion: string;
  itinerary: Itinerary;
}
