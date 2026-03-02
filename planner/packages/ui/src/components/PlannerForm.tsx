/**
 * PlannerForm — portable React form for collecting TripPreferences.
 *
 * Zero Next.js imports. Works in any React 18 app (Vite or Next).
 * Styling uses Tailwind utility classes compatible with AndamanBazaar tokens.
 * Validation is done via Zod on submit.
 */

import React, { useState } from "react"
import {
  TripPreferencesSchema,
  ANDAMAN_ISLANDS,
  INTEREST_OPTIONS,
  budgetLevelLabel,
  paceLevelLabel,
} from "@andaman-planner/shared"
import type { TripPreferences } from "@andaman-planner/shared"

// ----------------------------------------------------------------
// Helper: today and max date
// ----------------------------------------------------------------

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function maxDateISO(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

// ----------------------------------------------------------------
// Props
// ----------------------------------------------------------------

export interface PlannerFormProps {
  /** Called when the user submits valid preferences. */
  onSubmit: (preferences: TripPreferences) => void | Promise<void>
  /** Optional pre-filled values (e.g. from a saved profile). */
  defaultValues?: Partial<TripPreferences>
  /** Show a loading spinner on the submit button. */
  isLoading?: boolean
  /** Extra class names for the outer wrapper. */
  className?: string
}

// ----------------------------------------------------------------
// Form state
// ----------------------------------------------------------------

interface FormState {
  startDate: string
  endDate: string
  travelersCount: number
  budgetLevel: TripPreferences["budgetLevel"]
  pace: TripPreferences["pace"]
  interests: string[]
  preferredIslands: string[]
  notes: string
}

const DEFAULT_FORM_STATE: FormState = {
  startDate: todayISO(),
  endDate: "",
  travelersCount: 2,
  budgetLevel: "midrange",
  pace: "balanced",
  interests: [],
  preferredIslands: [],
  notes: "",
}

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export function PlannerForm({
  onSubmit,
  defaultValues,
  isLoading = false,
  className = "",
}: PlannerFormProps) {
  const [form, setForm] = useState<FormState>({
    ...DEFAULT_FORM_STATE,
    ...defaultValues,
    notes: defaultValues?.notes ?? "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const toggleArrayItem = (key: "interests" | "preferredIslands", item: string) => {
    setForm((prev) => {
      const arr = prev[key]
      return {
        ...prev,
        [key]: arr.includes(item) ? arr.filter((v) => v !== item) : [...arr, item],
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const raw: TripPreferences = {
      startDate: form.startDate,
      endDate: form.endDate,
      travelersCount: form.travelersCount,
      budgetLevel: form.budgetLevel,
      pace: form.pace,
      interests: form.interests,
      preferredIslands: form.preferredIslands,
      notes: form.notes.trim() || null,
    }

    const result = TripPreferencesSchema.safeParse(raw)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach((err) => {
        const field = err.path.join(".")
        fieldErrors[field] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    await onSubmit(result.data)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-white rounded-2xl shadow-lg p-6 space-y-6 max-w-2xl mx-auto ${className}`}
    >
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-teal-700">Plan Your Andaman Trip</h2>
        <p className="text-sm text-gray-500 mt-1">
          Fill in your preferences and our AI will craft your perfect itinerary.
        </p>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            min={todayISO()}
            max={maxDateISO()}
            value={form.startDate}
            onChange={(e) => set("startDate", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            required
          />
          {errors.startDate && (
            <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            min={form.startDate || todayISO()}
            max={maxDateISO()}
            value={form.endDate}
            onChange={(e) => set("endDate", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            required
          />
          {errors.endDate && (
            <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>
          )}
        </div>
      </div>

      {/* Travelers count */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Number of Travelers
        </label>
        <input
          type="number"
          min={1}
          max={20}
          value={form.travelersCount}
          onChange={(e) => set("travelersCount", Number(e.target.value))}
          className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          required
        />
        {errors.travelersCount && (
          <p className="text-red-500 text-xs mt-1">{errors.travelersCount}</p>
        )}
      </div>

      {/* Budget */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Budget Level
        </label>
        <div className="flex flex-wrap gap-3">
          {(["budget", "midrange", "premium"] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => set("budgetLevel", level)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                form.budgetLevel === level
                  ? "bg-teal-600 text-white border-teal-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-teal-400"
              }`}
            >
              {budgetLevelLabel(level).split(" ")[0]}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">{budgetLevelLabel(form.budgetLevel)}</p>
      </div>

      {/* Pace */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Travel Pace
        </label>
        <div className="flex flex-wrap gap-3">
          {(["relaxed", "balanced", "packed"] as const).map((pace) => (
            <button
              key={pace}
              type="button"
              onClick={() => set("pace", pace)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors capitalize ${
                form.pace === pace
                  ? "bg-coral-500 text-white border-coral-500"
                  : "bg-white text-gray-700 border-gray-300 hover:border-coral-400"
              }`}
            >
              {pace}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">{paceLevelLabel(form.pace)}</p>
      </div>

      {/* Interests */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Interests{" "}
          <span className="text-gray-400 font-normal">(select at least one)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((interest) => (
            <button
              key={interest}
              type="button"
              onClick={() => toggleArrayItem("interests", interest)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                form.interests.includes(interest)
                  ? "bg-teal-100 text-teal-800 border-teal-400"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:border-teal-300"
              }`}
            >
              {interest}
            </button>
          ))}
        </div>
        {errors.interests && (
          <p className="text-red-500 text-xs mt-1">{errors.interests}</p>
        )}
      </div>

      {/* Preferred Islands */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Preferred Islands{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {ANDAMAN_ISLANDS.map((island) => (
            <button
              key={island}
              type="button"
              onClick={() => toggleArrayItem("preferredIslands", island)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                form.preferredIslands.includes(island)
                  ? "bg-sandy-100 text-sandy-800 border-sandy-400"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:border-sandy-300"
              }`}
            >
              {island}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Additional Notes{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          maxLength={500}
          placeholder="Any special requirements, dietary needs, mobility considerations…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
        <p className="text-xs text-gray-400 text-right">{form.notes.length}/500</p>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Generating your itinerary…
          </>
        ) : (
          "Generate My Itinerary ✨"
        )}
      </button>
    </form>
  )
}
