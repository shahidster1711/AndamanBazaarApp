/**
 * Vite Demo Harness for Andaman Planner Pro.
 *
 * This app demonstrates that the @andaman-planner/ui components work
 * correctly when embedded in a Vite (non-Next) React application — exactly
 * as they would appear when integrated into AndamanBazaar.in.
 *
 * The demo uses mock data when no Supabase session is active, so it can be
 * previewed without credentials.
 */

import React, { useState, useEffect } from "react"
import type { Itinerary, TripPreferences } from "@andaman-planner/shared"
import { PlannerForm, ItineraryView, ItineraryCard } from "@andaman-planner/ui"
import { createPlannerBrowserClient } from "@andaman-planner/supabase"

// ----------------------------------------------------------------
// Mock itinerary for UI preview (no auth needed)
// ----------------------------------------------------------------

const MOCK_ITINERARY: Itinerary = {
  id: "demo-id-0000-0000-0000-000000000001",
  userId: "demo-user",
  name: "Havelock & Neil Island Dream Escape",
  startDate: "2025-03-15",
  endDate: "2025-03-19",
  preferences: {
    startDate: "2025-03-15",
    endDate: "2025-03-19",
    travelersCount: 2,
    budgetLevel: "midrange",
    pace: "balanced",
    interests: ["Scuba Diving", "Beach Relaxation", "Local Food & Markets"],
    preferredIslands: ["Havelock Island (Swaraj Dweep)", "Neil Island (Shaheed Dweep)"],
    notes: null,
  },
  days: [
    {
      dayNumber: 1,
      date: "2025-03-15",
      island: "Port Blair",
      theme: "Arrival & Colonial History",
      activities: [
        {
          time: "14:00",
          title: "Cellular Jail Light & Sound Show",
          description: "An emotional journey through India's independence struggle. The evening Light & Sound show is a must-see at the historic Cellular Jail.",
          location: "Cellular Jail, Port Blair",
          durationMinutes: 60,
          estimatedCost: 400,
          category: "sightseeing",
          tips: ["Book tickets in advance", "Arrive 15 min early for good seats"],
        },
        {
          time: "17:00",
          title: "Aberdeen Bazaar Evening Walk",
          description: "Stroll through Port Blair's main market for local snacks, souvenirs, and the authentic island vibe.",
          location: "Aberdeen Bazaar, Port Blair",
          durationMinutes: 90,
          estimatedCost: 200,
          category: "leisure",
          tips: ["Try the local coconut water", "Bargain for shell jewellery"],
        },
      ],
      accommodation: "Sinclair's Bay View Hotel",
      mealRecommendations: ["New Lighthouse Restaurant — fresh seafood thali", "Annapurna Cafeteria — South Indian breakfast"],
      transportNotes: "Auto-rickshaw or taxi from airport to hotel (~30 min, ₹300–400)",
      estimatedDailyCost: 3500,
    },
    {
      dayNumber: 2,
      date: "2025-03-16",
      island: "Havelock Island (Swaraj Dweep)",
      theme: "Asia's Best Beach & Snorkelling",
      activities: [
        {
          time: "06:30",
          title: "Makruzz Ferry to Havelock",
          description: "Board the premium Makruzz catamaran from Port Blair Phoenix Bay Jetty. Smooth 2-hour ride through the Andaman Sea.",
          location: "Phoenix Bay Jetty, Port Blair",
          durationMinutes: 120,
          estimatedCost: 1200,
          category: "travel",
          tips: ["Book ferry tickets 2–3 days ahead", "Bring motion sickness tablets if prone"],
        },
        {
          time: "11:00",
          title: "Radhanagar Beach",
          description: "Consistently voted one of Asia's best beaches. Crystal-clear water, white sand, and lush jungle backdrop.",
          location: "Radhanagar Beach (Beach 7), Havelock",
          durationMinutes: 180,
          estimatedCost: 100,
          category: "leisure",
          tips: ["Best for swimming in the morning", "Watch the sunset from the beach"],
        },
        {
          time: "15:30",
          title: "Elephant Beach Snorkelling",
          description: "Vibrant coral reefs just below the surface. Snorkel equipment available for rent on the beach.",
          location: "Elephant Beach, Havelock",
          durationMinutes: 120,
          estimatedCost: 800,
          category: "water_sport",
          tips: ["Apply reef-safe sunscreen only", "Bring an underwater camera"],
        },
      ],
      accommodation: "Symphony Palms Beach Resort",
      mealRecommendations: ["Full Moon Café — fresh grilled seafood", "Anju Coco Resto — wood-fired pizza with sea view"],
      transportNotes: "Rent a scooter (₹400/day) or hire an auto for island sightseeing",
      estimatedDailyCost: 4500,
    },
  ],
  islandsCovered: ["Port Blair", "Havelock Island (Swaraj Dweep)"],
  estimatedBudgetRange: "₹12,000 – ₹18,000 per person",
  modelVersion: "demo",
  createdAt: "2025-03-01T10:00:00Z",
  updatedAt: "2025-03-01T10:00:00Z",
}

// ----------------------------------------------------------------
// App
// ----------------------------------------------------------------

type DemoView = "form" | "result" | "list"

export default function App() {
  const [user, setUser] = useState<{ email: string | null } | null>(null)
  const [view, setView] = useState<DemoView>("form")
  const [currentItinerary, setCurrentItinerary] = useState<Itinerary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Try to detect a Supabase session (non-blocking)
  useEffect(() => {
    try {
      const client = createPlannerBrowserClient()
      client.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser({ email: session.user.email ?? null })
        }
      })
    } catch {
      // No Supabase configured — demo mode
    }
  }, [])

  const handleFormSubmit = async (preferences: TripPreferences) => {
    setIsLoading(true)
    setError(null)

    if (user) {
      // Real mode: call the Next.js API
      try {
        const res = await fetch("/api/planner/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferences }),
          credentials: "include",
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error?.message ?? `HTTP ${res.status}`)
        setCurrentItinerary(json.itinerary)
        setView("result")
      } catch (err) {
        setError(String(err))
      } finally {
        setIsLoading(false)
      }
    } else {
      // Demo mode: show mock data after a fake delay
      await new Promise((r) => setTimeout(r, 1500))
      setCurrentItinerary({ ...MOCK_ITINERARY, preferences })
      setView("result")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-warm-50">
      {/* Header */}
      <header className="bg-teal-700 text-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏝️</span>
            <div>
              <h1 className="font-bold text-lg leading-none">Andaman Planner Pro</h1>
              <p className="text-teal-200 text-xs">Vite Embed Demo</p>
            </div>
          </div>
          {user ? (
            <span className="text-xs text-teal-200">{user.email}</span>
          ) : (
            <span className="text-xs bg-sandy-400 text-sandy-900 px-2 py-1 rounded-full font-medium">
              Demo Mode
            </span>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Demo notice */}
        {!user && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
            <strong>Demo Mode:</strong> No Supabase session detected. The form works fully and
            shows a sample itinerary on submit. Set{" "}
            <code className="bg-blue-100 px-1 rounded">VITE_SUPABASE_URL</code> and{" "}
            <code className="bg-blue-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> for live
            generation.
          </div>
        )}

        {/* Nav */}
        <div className="flex gap-2">
          <button
            onClick={() => setView("form")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === "form"
                ? "bg-teal-600 text-white"
                : "bg-white text-gray-700 border border-gray-200 hover:border-teal-300"
            }`}
          >
            New Trip
          </button>
          {currentItinerary && (
            <button
              onClick={() => setView("result")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === "result"
                  ? "bg-teal-600 text-white"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-teal-300"
              }`}
            >
              Current Itinerary
            </button>
          )}
          <button
            onClick={() => setView("list")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === "list"
                ? "bg-teal-600 text-white"
                : "bg-white text-gray-700 border border-gray-200 hover:border-teal-300"
            }`}
          >
            Sample Cards
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            ⚠️ {error}
          </div>
        )}

        {/* View: Form */}
        {view === "form" && (
          <PlannerForm onSubmit={handleFormSubmit} isLoading={isLoading} />
        )}

        {/* View: Result */}
        {view === "result" && currentItinerary && (
          <ItineraryView
            itinerary={currentItinerary}
            onReset={() => setView("form")}
          />
        )}

        {/* View: Sample cards (showcases ItineraryCard component) */}
        {view === "list" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">
              ItineraryCard Component Demo
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[MOCK_ITINERARY, { ...MOCK_ITINERARY, id: "demo-2", name: "Baratang Caves & Mangrove Adventure", islandsCovered: ["Port Blair", "Baratang Island"], estimatedBudgetRange: "₹8,000 – ₹12,000 per person" }].map(
                (it) => (
                  <ItineraryCard
                    key={it.id}
                    itinerary={it}
                    onClick={(id) => {
                      setCurrentItinerary(MOCK_ITINERARY)
                      setView("result")
                      console.log("Clicked itinerary:", id)
                    }}
                    onDelete={(id) => alert(`Delete itinerary ${id}`)}
                  />
                )
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
