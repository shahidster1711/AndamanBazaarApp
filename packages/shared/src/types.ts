export type BudgetLevel = 'budget' | 'midrange' | 'premium';
export type Pace = 'relaxed' | 'balanced' | 'packed';

export type UserIdentity = {
  userId: string; // uuid (auth.users.id)
  email: string | null;
};

export type TripPreferences = {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  travelersCount: number;
  budgetLevel: BudgetLevel;
  pace: Pace;
  interests: string[];
  preferredIslands: string[];
  notes: string | null;
};

export type ItineraryActivity = {
  time: string; // e.g. "08:30"
  title: string;
  description: string;
  location: string;
  island: string;
  durationMinutes: number | null;
  costEstimateInr: number | null;
  bookingNotes: string | null;
};

export type ItineraryDay = {
  date: string; // YYYY-MM-DD
  island: string;
  title: string;
  summary: string;
  activities: ItineraryActivity[];
  notes: string | null;
};

export type Itinerary = {
  id: string; // uuid
  userId: string; // uuid
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  preferences: TripPreferences; // jsonb snapshot
  days: ItineraryDay[]; // jsonb
  islandsCovered: string[];
  estimatedBudgetRange: string;
  modelVersion: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type ItinerarySummary = Pick<
  Itinerary,
  'id' | 'name' | 'startDate' | 'endDate' | 'islandsCovered' | 'estimatedBudgetRange' | 'updatedAt'
>;

