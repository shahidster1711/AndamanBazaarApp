import React, { useState, useCallback } from "react";
import { PlannerForm, ItineraryView, LoadingSpinner, ErrorAlert } from "@andaman-planner/ui";
import type { TripPreferences, Itinerary, ItineraryDay } from "@andaman-planner/shared";
import { daysBetween, estimateBudgetRange } from "@andaman-planner/shared";

/**
 * Vite embed demo — proves the UI package works outside Next.js.
 * In production, the form would POST to the real API.
 * Here we generate a mock itinerary client-side.
 */
export function App() {
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (prefs: TripPreferences) => {
    setLoading(true);
    setError(null);

    try {
      // Determine if a real API is configured
      const apiBase = (import.meta as unknown as { env?: { VITE_PLANNER_API_URL?: string } }).env?.VITE_PLANNER_API_URL;

      if (apiBase) {
        const res = await fetch(`${apiBase}/api/planner/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferences: prefs }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "API error");
        setItinerary(data.itinerary);
      } else {
        // Generate a mock itinerary for demo
        await new Promise((r) => setTimeout(r, 1500));
        const numDays = daysBetween(prefs.startDate, prefs.endDate);
        const days: ItineraryDay[] = Array.from({ length: numDays }, (_, i) => ({
          dayNumber: i + 1,
          date: new Date(
            new Date(prefs.startDate).getTime() + i * 86400000
          ).toISOString().split("T")[0],
          title: i === 0 ? "Arrival in Port Blair" : `Day ${i + 1} Adventures`,
          island: i < 2 ? "Port Blair" : "Havelock Island (Swaraj Dweep)",
          activities: [
            {
              time: "09:00",
              title: i === 0 ? "Airport Arrival" : "Morning Activity",
              description: i === 0
                ? "Arrive at Veer Savarkar Airport and transfer to hotel"
                : "Explore the beautiful beaches and local attractions",
              location: i < 2 ? "Port Blair" : "Radhanagar Beach",
              duration: "2 hours",
              cost: i === 0 ? "₹500 taxi" : "Free",
              tips: null,
            },
            {
              time: "14:00",
              title: "Afternoon Exploration",
              description: "Visit local attractions and enjoy the scenery",
              location: i < 2 ? "Cellular Jail" : "Elephant Beach",
              duration: "3 hours",
              cost: "₹200 per person",
              tips: "Carry sunscreen and water",
            },
          ],
          meals: {
            breakfast: i === 0 ? null : "Hotel restaurant",
            lunch: "Local seafood restaurant",
            dinner: "Beachside dining",
          },
          transportNotes: i === 2 ? "Ferry from Port Blair to Havelock (2.5 hrs)" : null,
          accommodationNotes: i < 2 ? "Hotel in Port Blair" : "Beach resort in Havelock",
        }));

        const mockItinerary: Itinerary = {
          id: crypto.randomUUID(),
          userId: "demo-user",
          name: `${numDays}-Day Andaman Paradise`,
          startDate: prefs.startDate,
          endDate: prefs.endDate,
          preferences: prefs,
          days,
          islandsCovered: ["Port Blair", "Havelock Island (Swaraj Dweep)"],
          estimatedBudgetRange: estimateBudgetRange(numDays, prefs.travelersCount, prefs.budgetLevel),
          modelVersion: "mock-v1",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setItinerary(mockItinerary);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-100 bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-heading font-bold text-teal-800">
            Andaman Planner Pro
            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-normal text-amber-700">
              Vite Demo
            </span>
          </h1>
          {itinerary && (
            <button
              type="button"
              onClick={() => setItinerary(null)}
              className="text-sm text-teal-600 hover:text-teal-800 font-medium"
            >
              + New Trip
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {error && (
          <ErrorAlert message={error} onRetry={() => setError(null)} className="mb-6" />
        )}
        {loading && <LoadingSpinner message="Generating your dream itinerary..." />}
        {!loading && !itinerary && <PlannerForm onSubmit={handleSubmit} />}
        {!loading && itinerary && <ItineraryView itinerary={itinerary} />}
      </div>
    </div>
  );
}
