"use client";

import React, { useCallback, useMemo, useState } from "react";
import { getDatesBetween } from "@planner/shared/helpers";
import {
  plannerGenerateResponseSchema,
  plannerGetResponseSchema,
  plannerListResponseSchema,
  tripPreferencesSchema,
} from "@planner/shared/schemas";
import type { Itinerary, ItinerarySummary, TripPreferences } from "@planner/shared/types";
import { PlannerForm, ItineraryCard, ItineraryView } from "@planner/ui";
import { withPlannerBasePath } from "../lib/base-path";

const buildDefaultPreferences = (): TripPreferences => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 7));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 10));
  const dates = getDatesBetween(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10));
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  return tripPreferencesSchema.parse({
    startDate,
    endDate,
    travelersCount: 2,
    budgetLevel: "midrange",
    pace: "balanced",
    interests: ["Beaches", "Snorkeling"],
    preferredIslands: ["Port Blair", "Havelock Island", "Neil Island"],
    notes: null,
  });
};

const plannerApiBase = withPlannerBasePath("/api/planner");

export const PlannerClient: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [history, setHistory] = useState<ItinerarySummary[]>([]);

  const loadHistory = useCallback(async () => {
    const response = await fetch(`${plannerApiBase}/itineraries?limit=20`, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error("Unable to load itineraries");
    }

    const payload: unknown = await response.json();
    const parsed = plannerListResponseSchema.parse(payload);
    setHistory(parsed.itineraries);
  }, []);

  const handleGenerate = useCallback(
    async (preferences: TripPreferences) => {
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
        await loadHistory();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unknown planner error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [loadHistory],
  );

  const openItinerary = useCallback(async (itineraryId: string) => {
    setErrorMessage(null);
    try {
      const response = await fetch(`${plannerApiBase}/itineraries/${itineraryId}`, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const maybeError = payload as { error?: { message?: string } };
        throw new Error(maybeError.error?.message ?? "Failed to open itinerary");
      }
      const parsed = plannerGetResponseSchema.parse(payload);
      setItinerary(parsed.itinerary);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown planner error");
    }
  }, []);

  const defaultPreferences = useMemo(buildDefaultPreferences, []);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem", display: "grid", gap: "1rem" }}>
      <section>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Andaman Planner Pro</h1>
        <p style={{ color: "#334155", marginTop: "0.5rem" }}>
          Supabase-authenticated itinerary generation with strict schema output.
        </p>
      </section>

      <PlannerForm initialPreferences={defaultPreferences} isSubmitting={isSubmitting} onSubmit={handleGenerate} />

      {errorMessage ? (
        <p role="alert" style={{ color: "#be123c", fontWeight: 500 }}>
          {errorMessage}
        </p>
      ) : null}

      {itinerary ? <ItineraryView itinerary={itinerary} /> : null}

      <section style={{ display: "grid", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Saved itineraries</h2>
          <button
            type="button"
            onClick={() => void loadHistory()}
            style={{ border: "1px solid #0284c7", borderRadius: 8, padding: "0.4rem 0.75rem", color: "#0369a1" }}
          >
            Refresh
          </button>
        </div>
        {history.length === 0 ? (
          <p style={{ color: "#475569" }}>No saved itineraries yet.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.75rem" }}>
            {history.map((item) => (
              <ItineraryCard key={item.id} itinerary={item} onOpen={openItinerary} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
};
