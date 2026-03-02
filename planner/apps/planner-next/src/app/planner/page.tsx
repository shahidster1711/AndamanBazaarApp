"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Itinerary, ItinerarySummary, TripPreferences } from "@andaman-planner/shared";
import { PlannerForm, ItineraryView, ItineraryCard, LoadingSpinner, ErrorMessage } from "@andaman-planner/ui";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}

type View = "form" | "loading" | "result" | "history";

export default function PlannerPage() {
  const [view, setView] = useState<View>("form");
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [history, setHistory] = useState<ItinerarySummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const client = createClient(supabaseUrl, supabaseAnonKey);
    client.auth.getSession().then(({ data }) => {
      setAccessToken(data.session?.access_token ?? null);
    });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const apiHeaders = useCallback((): HeadersInit => {
    const h: HeadersInit = { "Content-Type": "application/json" };
    if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
    return h;
  }, [accessToken]);

  const handleGenerate = useCallback(async (prefs: TripPreferences) => {
    setView("loading");
    setError(null);
    try {
      const res = await fetch(`${getBasePath()}/api/planner/generate`, {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ preferences: prefs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Generation failed");
      setItinerary(data.itinerary);
      setView("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setView("form");
    }
  }, [apiHeaders]);

  const loadHistory = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${getBasePath()}/api/planner/itineraries`, {
        headers: apiHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to load history");
      setHistory(data.itineraries);
      setView("history");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [apiHeaders]);

  const loadItinerary = useCallback(async (id: string) => {
    setView("loading");
    setError(null);
    try {
      const res = await fetch(`${getBasePath()}/api/planner/itineraries/${id}`, {
        headers: apiHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to load itinerary");
      setItinerary(data.itinerary);
      setView("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setView("history");
    }
  }, [apiHeaders]);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, color: "#0d9488" }}>
          🏝️ Andaman Planner Pro
        </h1>
        <nav style={{ display: "flex", gap: "0.5rem" }}>
          <button className="ap-btn ap-btn-secondary" onClick={() => { setView("form"); setError(null); }}>
            New Trip
          </button>
          <button className="ap-btn ap-btn-secondary" onClick={loadHistory}>
            My Trips
          </button>
        </nav>
      </header>

      {!accessToken && (
        <div className="ap-card" style={{ background: "#fffbeb", borderColor: "#fcd34d", marginBottom: "1rem" }}>
          <p style={{ margin: 0, color: "#92400e", fontSize: "0.875rem" }}>
            ⚠️ Please sign in to generate and save itineraries.
          </p>
        </div>
      )}

      {error && <ErrorMessage message={error} onRetry={() => setError(null)} />}

      {view === "form" && (
        <PlannerForm onSubmit={handleGenerate} isLoading={false} />
      )}

      {view === "loading" && (
        <LoadingSpinner message="Our AI is crafting your perfect Andaman itinerary… This may take 15–30 seconds." />
      )}

      {view === "result" && itinerary && (
        <div>
          <button
            className="ap-btn ap-btn-secondary"
            style={{ marginBottom: "1rem" }}
            onClick={() => setView("form")}
          >
            ← Plan Another Trip
          </button>
          <ItineraryView itinerary={itinerary} />
        </div>
      )}

      {view === "history" && (
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>My Trips</h2>
          {history.length === 0 ? (
            <p style={{ color: "#64748b" }}>No itineraries yet. Plan your first trip!</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {history.map((it) => (
                <ItineraryCard key={it.id} itinerary={it} onClick={loadItinerary} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
