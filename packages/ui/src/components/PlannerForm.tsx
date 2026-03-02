"use client";

import React, { useMemo, useState } from "react";
import { tripPreferencesSchema } from "../../../shared/src/schemas";
import type { TripPreferences } from "../../../shared/src/types";

const normalizeCsv = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const formatCsv = (values: string[]): string => values.join(", ");

export interface PlannerFormProps {
  initialPreferences: TripPreferences;
  isSubmitting?: boolean;
  onSubmit: (preferences: TripPreferences) => Promise<void> | void;
}

export const PlannerForm: React.FC<PlannerFormProps> = ({
  initialPreferences,
  isSubmitting = false,
  onSubmit,
}) => {
  const [startDate, setStartDate] = useState(initialPreferences.startDate);
  const [endDate, setEndDate] = useState(initialPreferences.endDate);
  const [travelersCount, setTravelersCount] = useState(initialPreferences.travelersCount);
  const [budgetLevel, setBudgetLevel] = useState<TripPreferences["budgetLevel"]>(
    initialPreferences.budgetLevel,
  );
  const [pace, setPace] = useState<TripPreferences["pace"]>(initialPreferences.pace);
  const [interestsCsv, setInterestsCsv] = useState(formatCsv(initialPreferences.interests));
  const [islandsCsv, setIslandsCsv] = useState(formatCsv(initialPreferences.preferredIslands));
  const [notes, setNotes] = useState(initialPreferences.notes ?? "");
  const [formError, setFormError] = useState<string | null>(null);

  const submitDisabled = useMemo(() => isSubmitting, [isSubmitting]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setFormError(null);

    const candidate: TripPreferences = {
      startDate,
      endDate,
      travelersCount,
      budgetLevel,
      pace,
      interests: normalizeCsv(interestsCsv),
      preferredIslands: normalizeCsv(islandsCsv),
      notes: notes.trim().length > 0 ? notes.trim() : null,
    };

    const parsed = tripPreferencesSchema.safeParse(candidate);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Invalid preferences");
      return;
    }

    await onSubmit(parsed.data);
  };

  return (
    <form className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Start date
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          End date
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            required
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Travelers
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            type="number"
            min={1}
            max={20}
            value={travelersCount}
            onChange={(event) => setTravelersCount(Number(event.target.value))}
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Budget level
          <select
            className="rounded-md border border-slate-300 px-3 py-2"
            value={budgetLevel}
            onChange={(event) => setBudgetLevel(event.target.value as TripPreferences["budgetLevel"])}
          >
            <option value="budget">Budget</option>
            <option value="midrange">Midrange</option>
            <option value="premium">Premium</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Pace
          <select
            className="rounded-md border border-slate-300 px-3 py-2"
            value={pace}
            onChange={(event) => setPace(event.target.value as TripPreferences["pace"])}
          >
            <option value="relaxed">Relaxed</option>
            <option value="balanced">Balanced</option>
            <option value="packed">Packed</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-2 text-sm text-slate-700">
        Interests (comma separated)
        <input
          className="rounded-md border border-slate-300 px-3 py-2"
          type="text"
          value={interestsCsv}
          onChange={(event) => setInterestsCsv(event.target.value)}
          placeholder="Scuba diving, beaches, local food"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm text-slate-700">
        Preferred islands (comma separated)
        <input
          className="rounded-md border border-slate-300 px-3 py-2"
          type="text"
          value={islandsCsv}
          onChange={(event) => setIslandsCsv(event.target.value)}
          placeholder="Havelock, Neil, Port Blair"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm text-slate-700">
        Notes
        <textarea
          className="min-h-24 rounded-md border border-slate-300 px-3 py-2"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Any accessibility or transport constraints"
        />
      </label>

      {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}

      <button
        type="submit"
        disabled={submitDisabled}
        className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitDisabled ? "Generating..." : "Generate itinerary"}
      </button>
    </form>
  );
};
