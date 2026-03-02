export type BudgetLevel = "budget" | "midrange" | "premium";

export type TripPace = "relaxed" | "balanced" | "packed";

export interface UserIdentity {
  userId: string;
  email: string | null;
}

export interface TripPreferences {
  startDate: string;
  endDate: string;
  travelersCount: number;
  budgetLevel: BudgetLevel;
  pace: TripPace;
  interests: string[];
  preferredIslands: string[];
  notes: string | null;
}

export interface ItineraryActivity {
  title: string;
  island: string;
  startTime: string;
  endTime: string;
  description: string;
  estimatedCostInr: number | null;
}

export interface ItineraryDay {
  dayNumber: number;
  date: string;
  island: string;
  summary: string;
  activities: ItineraryActivity[];
  stayRecommendation: string;
  transfers: string[];
}

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

export interface ItinerarySummary {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  islandsCovered: string[];
  estimatedBudgetRange: string;
  modelVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlannerGenerateRequest {
  preferences: TripPreferences;
}

export interface PlannerGenerateResponse {
  apiVersion: "v1";
  itinerary: Itinerary;
}

export interface PlannerListResponse {
  apiVersion: "v1";
  itineraries: ItinerarySummary[];
}

export interface PlannerGetResponse {
  apiVersion: "v1";
  itinerary: Itinerary;
}

export interface PlannerApiError {
  apiVersion: "v1";
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
