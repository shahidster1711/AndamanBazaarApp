import React, { useState, useCallback } from "react";
import {
  type TripPreferences,
  type BudgetLevel,
  type TripPace,
  ANDAMAN_ISLANDS,
  INTEREST_OPTIONS,
  tripPreferencesSchema,
} from "@andaman-planner/shared";
import { cn } from "../lib/cn.js";

export interface PlannerFormProps {
  onSubmit: (prefs: TripPreferences) => void;
  isLoading?: boolean;
  className?: string;
}

const todayStr = () => new Date().toISOString().split("T")[0];
const weekLater = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
};

export function PlannerForm({ onSubmit, isLoading, className }: PlannerFormProps) {
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(weekLater());
  const [travelersCount, setTravelersCount] = useState(2);
  const [budgetLevel, setBudgetLevel] = useState<BudgetLevel>("midrange");
  const [pace, setPace] = useState<TripPace>("balanced");
  const [interests, setInterests] = useState<string[]>([]);
  const [preferredIslands, setPreferredIslands] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleItem = useCallback(
    (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
      setList((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));
    },
    []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prefs: TripPreferences = {
      startDate,
      endDate,
      travelersCount,
      budgetLevel,
      pace,
      interests,
      preferredIslands,
      notes: notes.trim() || null,
    };

    const result = tripPreferencesSchema.safeParse(prefs);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path.join(".");
        fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    onSubmit(result.data);
  };

  const inputCls =
    "w-full rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-colors";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("space-y-6 rounded-xl bg-white p-6 shadow-md", className)}
    >
      <h2 className="text-xl font-heading font-bold text-teal-800">
        Plan Your Andaman Trip
      </h2>

      {/* Dates */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Start Date</label>
          <input
            type="date"
            className={inputCls}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min={todayStr()}
          />
        </div>
        <div>
          <label className={labelCls}>End Date</label>
          <input
            type="date"
            className={inputCls}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
          />
          {errors.endDate && <p className="mt-1 text-xs text-red-600">{errors.endDate}</p>}
        </div>
      </div>

      {/* Travelers */}
      <div>
        <label className={labelCls}>Number of Travelers</label>
        <input
          type="number"
          className={cn(inputCls, "max-w-[120px]")}
          min={1}
          max={20}
          value={travelersCount}
          onChange={(e) => setTravelersCount(Number(e.target.value))}
        />
      </div>

      {/* Budget */}
      <div>
        <label className={labelCls}>Budget Level</label>
        <div className="flex gap-2">
          {(["budget", "midrange", "premium"] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setBudgetLevel(lvl)}
              className={cn(
                "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                budgetLevel === lvl
                  ? "border-teal-600 bg-teal-600 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-teal-300"
              )}
            >
              {lvl === "budget" ? "Budget" : lvl === "midrange" ? "Mid-Range" : "Premium"}
            </button>
          ))}
        </div>
      </div>

      {/* Pace */}
      <div>
        <label className={labelCls}>Trip Pace</label>
        <div className="flex gap-2">
          {(["relaxed", "balanced", "packed"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPace(p)}
              className={cn(
                "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                pace === p
                  ? "border-teal-600 bg-teal-600 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-teal-300"
              )}
            >
              {p === "relaxed" ? "Relaxed" : p === "balanced" ? "Balanced" : "Action-Packed"}
            </button>
          ))}
        </div>
      </div>

      {/* Interests */}
      <div>
        <label className={labelCls}>Interests</label>
        {errors.interests && <p className="mb-1 text-xs text-red-600">{errors.interests}</p>}
        <div className="flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((interest) => (
            <button
              key={interest}
              type="button"
              onClick={() => toggleItem(interests, setInterests, interest)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                interests.includes(interest)
                  ? "border-teal-600 bg-teal-50 text-teal-700"
                  : "border-gray-200 text-gray-600 hover:border-teal-300"
              )}
            >
              {interest.replace(/-/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Islands */}
      <div>
        <label className={labelCls}>Preferred Islands (optional)</label>
        <div className="flex flex-wrap gap-2">
          {ANDAMAN_ISLANDS.map((island) => (
            <button
              key={island}
              type="button"
              onClick={() => toggleItem(preferredIslands, setPreferredIslands, island)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                preferredIslands.includes(island)
                  ? "border-coral-500 bg-coral-50 text-coral-700"
                  : "border-gray-200 text-gray-600 hover:border-coral-300"
              )}
            >
              {island}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className={labelCls}>Additional Notes</label>
        <textarea
          className={cn(inputCls, "min-h-[80px] resize-y")}
          placeholder="Any special requirements, dietary needs, accessibility needs..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          "w-full rounded-lg bg-teal-600 py-3 text-sm font-semibold text-white transition-colors",
          "hover:bg-teal-700 focus:ring-2 focus:ring-teal-500/20",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        {isLoading ? "Generating your itinerary..." : "Generate Itinerary"}
      </button>
    </form>
  );
}
