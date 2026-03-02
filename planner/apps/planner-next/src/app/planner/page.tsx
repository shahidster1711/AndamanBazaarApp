"use client";

import { useState, useEffect } from "react";
import { PlannerForm, ItineraryView, ItineraryCard, LoadingSpinner, ErrorAlert } from "@andaman-planner/ui";
import type { Itinerary, ItinerarySummary, TripPreferences } from "@andaman-planner/shared";

export default function PlannerPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentItinerary, setCurrentItinerary] = useState<Itinerary | null>(null);
  const [savedItineraries, setSavedItineraries] = useState<ItinerarySummary[]>([]);
  const [view, setView] = useState<"form" | "result" | "detail">("form");

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  const getAuthHeaders = (): Record<string, string> => {
    const storageKey = Object.keys(localStorage).find((k) =>
      k.startsWith("sb-") && k.endsWith("-auth-token")
    );
    if (!storageKey) return {};
    try {
      const session = JSON.parse(localStorage.getItem(storageKey) || "{}");
      const token = session?.access_token;
      if (token) return { Authorization: `Bearer ${token}` };
    } catch {
      // ignore
    }
    return {};
  };

  useEffect(() => {
    fetchItineraries();
  }, []);

  async function fetchItineraries() {
    try {
      const res = await fetch(`${basePath}/api/planner/itineraries`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSavedItineraries(data.itineraries ?? []);
      }
    } catch {
      // silently fail for list
    }
  }

  async function handleGenerate(prefs: TripPreferences) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${basePath}/api/planner/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ preferences: prefs }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || "Failed to generate itinerary");
        return;
      }

      setCurrentItinerary(data.itinerary);
      setView("result");
      fetchItineraries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleViewItinerary(id: string) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${basePath}/api/planner/itineraries/${id}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || "Failed to load itinerary");
        return;
      }
      setCurrentItinerary(data.itinerary);
      setView("detail");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-100 bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-heading font-bold text-teal-800">
            Andaman Planner Pro
          </h1>
          {view !== "form" && (
            <button
              type="button"
              onClick={() => { setView("form"); setCurrentItinerary(null); }}
              className="text-sm text-teal-600 hover:text-teal-800 font-medium"
            >
              + New Trip
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {error && (
          <ErrorAlert
            message={error}
            onRetry={() => setError(null)}
            className="mb-6"
          />
        )}

        {isLoading && <LoadingSpinner message="Crafting your perfect itinerary..." />}

        {!isLoading && view === "form" && (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <PlannerForm onSubmit={handleGenerate} isLoading={isLoading} />
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Your Trips
              </h3>
              {savedItineraries.length === 0 ? (
                <p className="text-sm text-gray-400">No saved itineraries yet.</p>
              ) : (
                <div className="space-y-3">
                  {savedItineraries.map((it) => (
                    <ItineraryCard
                      key={it.id}
                      itinerary={it}
                      onClick={handleViewItinerary}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!isLoading && (view === "result" || view === "detail") && currentItinerary && (
          <ItineraryView itinerary={currentItinerary} />
        )}
      </div>
    </main>
  );
}
