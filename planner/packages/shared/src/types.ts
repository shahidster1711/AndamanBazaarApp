export interface UserIdentity {
  userId: string;
  email: string | null;
}

export type BudgetLevel = "budget" | "midrange" | "premium";
export type TripPace = "relaxed" | "balanced" | "packed";

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
  time: string;
  title: string;
  description: string;
  location: string;
  duration: string;
  cost: string | null;
  tips: string | null;
}

export interface ItineraryDay {
  dayNumber: number;
  date: string;
  title: string;
  island: string;
  activities: ItineraryActivity[];
  meals: {
    breakfast: string | null;
    lunch: string | null;
    dinner: string | null;
  };
  transportNotes: string | null;
  accommodationNotes: string | null;
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
  createdAt: string;
}

export interface PlannerProfile {
  id: string;
  homeCity: string | null;
  typicalBudgetRange: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  apiVersion: "v1";
  data: T;
}

export interface ApiError {
  apiVersion: "v1";
  error: {
    code: string;
    message: string;
  };
}

export const ANDAMAN_ISLANDS = [
  "Port Blair",
  "Havelock Island (Swaraj Dweep)",
  "Neil Island (Shaheed Dweep)",
  "Baratang Island",
  "Ross Island (Netaji Subhas Chandra Bose Island)",
  "North Bay Island",
  "Jolly Buoy Island",
  "Cinque Island",
  "Diglipur",
  "Long Island",
  "Rangat",
] as const;

export type AndamanIsland = (typeof ANDAMAN_ISLANDS)[number];

export const INTEREST_OPTIONS = [
  "beaches",
  "snorkeling",
  "scuba-diving",
  "trekking",
  "history",
  "photography",
  "water-sports",
  "wildlife",
  "local-cuisine",
  "relaxation",
  "island-hopping",
  "kayaking",
  "fishing",
  "mangroves",
  "sunsets",
] as const;

export type Interest = (typeof INTEREST_OPTIONS)[number];

export const RATE_LIMIT = {
  maxGenerationsPerHour: 5,
  windowMs: 60 * 60 * 1000,
} as const;
