"use client"

import React, { useState, useEffect } from "react"
import type { TripPreferences, Itinerary, ItinerarySummary } from "@andaman-planner/shared"
import { PlannerForm } from "@andaman-planner/ui"
import { ItineraryView } from "@andaman-planner/ui"
import { ItineraryCard } from "@andaman-planner/ui"
import { createPlannerBrowserClient } from "@andaman-planner/supabase"
import { listItineraries } from "@andaman-planner/supabase"

type View = "form" | "result" | "list"

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

export default function PlannerPage() {
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [view, setView] = useState<View>("form")
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [summaries, setSummaries] = useState<ItinerarySummary[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ---- Auth ----
  useEffect(() => {
    const client = createPlannerBrowserClient()
    client.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? null } : null)
      setAuthLoading(false)
    })
    const { data: { subscription } } = client.auth.onAuthStateChange((_ev, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? null } : null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // ---- Generate itinerary ----
  const handleGenerate = async (preferences: TripPreferences) => {
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch(`${basePath}/api/planner/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences }),
        credentials: "include",
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        throw new Error(json.error?.message ?? `HTTP ${res.status}`)
      }
      setItinerary(json.itinerary)
      setView("result")
    } catch (err) {
      setError(String(err))
    } finally {
      setIsGenerating(false)
    }
  }

  // ---- Load list ----
  const handleShowList = async () => {
    setError(null)
    try {
      const client = createPlannerBrowserClient()
      const data = await listItineraries(client)
      setSummaries(data)
      setView("list")
    } catch (err) {
      setError(String(err))
    }
  }

  // ---- Open saved itinerary ----
  const handleOpenItinerary = async (id: string) => {
    setError(null)
    try {
      const res = await fetch(`${basePath}/api/planner/itineraries/${id}`, {
        credentials: "include",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? `HTTP ${res.status}`)
      setItinerary(json.itinerary)
      setView("result")
    } catch (err) {
      setError(String(err))
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-5xl mb-4">🏝️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in to plan your trip</h2>
        <p className="text-gray-500 text-sm mb-6">
          Use your AndamanBazaar account — no second login needed.
        </p>
        <a
          href="/auth"
          className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          Sign In
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Nav */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
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
          <button
            onClick={handleShowList}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === "list"
                ? "bg-teal-600 text-white"
                : "bg-white text-gray-700 border border-gray-200 hover:border-teal-300"
            }`}
          >
            My Trips
          </button>
        </div>
        <p className="text-xs text-gray-400">Signed in as {user.email}</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* Views */}
      {view === "form" && (
        <PlannerForm onSubmit={handleGenerate} isLoading={isGenerating} />
      )}

      {view === "result" && itinerary && (
        <ItineraryView itinerary={itinerary} onReset={() => setView("form")} />
      )}

      {view === "list" && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">My Saved Trips</h2>
          {summaries.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">🗺️</p>
              <p>No trips yet. Generate your first itinerary!</p>
              <button
                onClick={() => setView("form")}
                className="mt-4 text-teal-600 font-medium text-sm hover:underline"
              >
                Plan a trip →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {summaries.map((s) => (
                <ItineraryCard
                  key={s.id}
                  itinerary={s}
                  onClick={handleOpenItinerary}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
