import React, { useState, useCallback } from "react";
import type { TripPreferences, BudgetLevel, PaceOption } from "@andaman-planner/shared";
import {
  ANDAMAN_ISLANDS,
  INTEREST_OPTIONS,
  MAX_TRIP_DAYS,
  MAX_TRAVELERS,
} from "@andaman-planner/shared";
import { clsx } from "clsx";

export interface PlannerFormProps {
  onSubmit: (preferences: TripPreferences) => void | Promise<void>;
  isLoading?: boolean;
  className?: string;
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0]!;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0]!;
}

export function PlannerForm({ onSubmit, isLoading = false, className }: PlannerFormProps) {
  const [startDate, setStartDate] = useState(addDays(todayStr(), 7));
  const [endDate, setEndDate] = useState(addDays(todayStr(), 10));
  const [travelersCount, setTravelersCount] = useState(2);
  const [budgetLevel, setBudgetLevel] = useState<BudgetLevel>("midrange");
  const [pace, setPace] = useState<PaceOption>("balanced");
  const [interests, setInterests] = useState<string[]>(["beaches", "snorkeling"]);
  const [preferredIslands, setPreferredIslands] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const toggleChip = useCallback((list: string[], item: string, setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  }, []);

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
    onSubmit(prefs);
  };

  const dayCount = Math.max(
    1,
    Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000) + 1
  );

  return (
    <form onSubmit={handleSubmit} className={clsx("ap-form", className)}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
        Plan Your Andaman Trip
      </h2>

      <div className="ap-grid-2">
        <div className="ap-field">
          <label className="ap-label">Start Date</label>
          <input
            type="date"
            className="ap-input"
            value={startDate}
            min={todayStr()}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (e.target.value > endDate) setEndDate(addDays(e.target.value, 2));
            }}
            required
          />
        </div>
        <div className="ap-field">
          <label className="ap-label">End Date</label>
          <input
            type="date"
            className="ap-input"
            value={endDate}
            min={startDate}
            max={addDays(startDate, MAX_TRIP_DAYS - 1)}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
      </div>

      <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0 }}>
        {dayCount} day{dayCount > 1 ? "s" : ""} trip
      </p>

      <div className="ap-field">
        <label className="ap-label">Travelers</label>
        <input
          type="number"
          className="ap-input"
          value={travelersCount}
          min={1}
          max={MAX_TRAVELERS}
          onChange={(e) => setTravelersCount(Number(e.target.value))}
          required
        />
      </div>

      <div className="ap-field">
        <label className="ap-label">Budget</label>
        <select
          className="ap-select"
          value={budgetLevel}
          onChange={(e) => setBudgetLevel(e.target.value as BudgetLevel)}
        >
          <option value="budget">Budget (₹1,500–3,000/day)</option>
          <option value="midrange">Mid-Range (₹3,000–7,000/day)</option>
          <option value="premium">Premium (₹7,000–15,000+/day)</option>
        </select>
      </div>

      <div className="ap-field">
        <label className="ap-label">Pace</label>
        <select
          className="ap-select"
          value={pace}
          onChange={(e) => setPace(e.target.value as PaceOption)}
        >
          <option value="relaxed">Relaxed — fewer activities, more free time</option>
          <option value="balanced">Balanced — a good mix</option>
          <option value="packed">Packed — see and do as much as possible</option>
        </select>
      </div>

      <div className="ap-field">
        <label className="ap-label">Interests</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {INTEREST_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              className="ap-chip"
              data-selected={interests.includes(opt)}
              onClick={() => toggleChip(interests, opt, setInterests)}
            >
              {opt.replace(/-/g, " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="ap-field">
        <label className="ap-label">Preferred Islands (optional)</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {ANDAMAN_ISLANDS.map((island) => (
            <button
              key={island}
              type="button"
              className="ap-chip"
              data-selected={preferredIslands.includes(island)}
              onClick={() => toggleChip(preferredIslands, island, setPreferredIslands)}
            >
              {island}
            </button>
          ))}
        </div>
      </div>

      <div className="ap-field">
        <label className="ap-label">Special Requests (optional)</label>
        <textarea
          className="ap-textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="E.g., honeymoon trip, need wheelchair accessibility, prefer vegetarian food…"
        />
      </div>

      <button
        type="submit"
        className="ap-btn ap-btn-primary"
        disabled={isLoading || interests.length === 0}
      >
        {isLoading ? "Generating your itinerary…" : "Generate Itinerary ✨"}
      </button>
    </form>
  );
}
