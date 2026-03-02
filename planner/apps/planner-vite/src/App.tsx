import React, { useState, useCallback, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Itinerary, ItinerarySummary, TripPreferences } from "@andaman-planner/shared";
import { PlannerForm, ItineraryView, ItineraryCard, LoadingSpinner, ErrorMessage } from "@andaman-planner/ui";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const API_BASE = (import.meta.env.VITE_PLANNER_API_BASE as string) || "";

type View = "form" | "loading" | "result" | "history";

/**
 * Vite demo harness proving the planner UI components can be embedded
 * inside any React + Vite app (like AndamanBazaar) without Next.js.
 *
 * API calls go to the Next.js planner shell or can be replaced with
 * direct Supabase calls + edge function invocations.
 */
export function App() {
  const [view, setView] = useState<View>("form");
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [history, setHistory] = useState<ItinerarySummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    client.auth.getSession().then(({ data }) => {
      setAccessToken(data.session?.access_token ?? null);
    });
    const { data: { subscription } } = client.auth.onAuthStateChange((_ev, session) => {
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
      const res = await fetch(`${API_BASE}/api/planner/generate`, {
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
      const res = await fetch(`${API_BASE}/api/planner/itineraries`, {
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
      const res = await fetch(`${API_BASE}/api/planner/itineraries/${id}`, {
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

      {(!SUPABASE_URL || !SUPABASE_ANON_KEY) && (
        <div className="ap-card" style={{ background: "#f0f9ff", borderColor: "#7dd3fc", marginBottom: "1rem" }}>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#0c4a6e" }}>
            ℹ️ Running in demo mode. Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> for full functionality.
          </p>
        </div>
      )}

      {error && <ErrorMessage message={error} onRetry={() => setError(null)} />}

      {view === "form" && (
        <PlannerForm onSubmit={handleGenerate} isLoading={false} />
      )}

      {view === "loading" && (
        <LoadingSpinner />
      )}

      {view === "result" && itinerary && (
        <div>
          <button className="ap-btn ap-btn-secondary" style={{ marginBottom: "1rem" }} onClick={() => setView("form")}>
            ← Plan Another Trip
          </button>
          <ItineraryView itinerary={itinerary} />
        </div>
      )}

      {view === "history" && (
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>My Trips</h2>
          {history.length === 0 ? (
            <p style={{ color: "#64748b" }}>No itineraries yet.</p>
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
