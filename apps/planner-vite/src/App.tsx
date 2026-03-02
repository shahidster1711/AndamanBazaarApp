import React, { useMemo, useState } from "react";
import {
  getDatesBetween,
  plannerGenerateResponseSchema,
  tripPreferencesSchema,
  type Itinerary,
  type TripPreferences,
} from "@planner/shared";
import { ItineraryView, PlannerForm } from "@planner/ui";

const plannerApiBase = import.meta.env.VITE_PLANNER_API_BASE ?? "/planner/api/planner";

const buildDefaultPreferences = (): TripPreferences => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 5));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 8));
  const dates = getDatesBetween(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10));

  return tripPreferencesSchema.parse({
    startDate: dates[0],
    endDate: dates[dates.length - 1],
    travelersCount: 2,
    budgetLevel: "midrange",
    pace: "balanced",
    interests: ["Snorkeling", "Scuba diving"],
    preferredIslands: ["Havelock Island", "Neil Island", "Port Blair"],
    notes: "Vite embed harness",
  });
};

const App: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const defaultPreferences = useMemo(buildDefaultPreferences, []);

  const handleGenerate = async (preferences: TripPreferences) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${plannerApiBase}/generate`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ preferences }),
      });

      const payload: unknown = await response.json();
      if (!response.ok) {
        const maybeError = payload as { error?: { message?: string } };
        throw new Error(maybeError.error?.message ?? "Failed to generate itinerary");
      }

      const parsed = plannerGenerateResponseSchema.parse(payload);
      setItinerary(parsed.itinerary);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Planner request failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "1.5rem", display: "grid", gap: "1rem" }}>
      <h1 style={{ margin: 0, fontSize: "1.75rem" }}>Andaman Planner (Vite Embed Harness)</h1>
      <p style={{ margin: 0, color: "#334155" }}>
        This app demonstrates embedding portable planner UI in a React + Vite host.
      </p>
      <PlannerForm initialPreferences={defaultPreferences} isSubmitting={isSubmitting} onSubmit={handleGenerate} />
      {errorMessage ? <p style={{ color: "#be123c" }}>{errorMessage}</p> : null}
      {itinerary ? <ItineraryView itinerary={itinerary} /> : null}
    </main>
  );
};

export default App;
