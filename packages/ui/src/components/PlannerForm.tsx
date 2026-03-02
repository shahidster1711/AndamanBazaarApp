import React, { useMemo, useState } from 'react';
import type { TripPreferences } from '@andamanbazaar/planner-shared';
import { tripPreferencesSchema } from '@andamanbazaar/planner-shared';

export type PlannerFormProps = {
  initial?: Partial<TripPreferences>;
  onGenerate: (preferences: TripPreferences) => Promise<void> | void;
  disabled?: boolean;
};

function todayISO(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10);
}

function addDays(dateISO: string, days: number): string {
  const d = new Date(dateISO + 'T00:00:00Z');
  const out = new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
  return out.toISOString().slice(0, 10);
}

export function PlannerForm(props: PlannerFormProps) {
  const defaultStart = useMemo(() => todayISO(), []);
  const defaultEnd = useMemo(() => addDays(defaultStart, 4), [defaultStart]);

  const [startDate, setStartDate] = useState(props.initial?.startDate ?? defaultStart);
  const [endDate, setEndDate] = useState(props.initial?.endDate ?? defaultEnd);
  const [travelersCount, setTravelersCount] = useState<number>(props.initial?.travelersCount ?? 2);
  const [budgetLevel, setBudgetLevel] = useState<TripPreferences['budgetLevel']>(props.initial?.budgetLevel ?? 'midrange');
  const [pace, setPace] = useState<TripPreferences['pace']>(props.initial?.pace ?? 'balanced');
  const [interests, setInterests] = useState<string>((props.initial?.interests ?? ['beaches', 'snorkeling']).join(', '));
  const [preferredIslands, setPreferredIslands] = useState<string>(
    (props.initial?.preferredIslands ?? ['Port Blair', 'Havelock (Swaraj Dweep)']).join(', ')
  );
  const [notes, setNotes] = useState<string>(props.initial?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const disabled = props.disabled || submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const candidate: TripPreferences = {
      startDate,
      endDate,
      travelersCount,
      budgetLevel,
      pace,
      interests: interests
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      preferredIslands: preferredIslands
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      notes: notes.trim() ? notes.trim() : null,
    };

    const parsed = tripPreferencesSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid preferences');
      return;
    }

    setSubmitting(true);
    try {
      await props.onGenerate(parsed.data);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to generate itinerary');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="w-full max-w-3xl space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-black tracking-tight text-slate-900">Plan your Andaman trip</h2>
          <p className="text-sm text-slate-600">Preferences stay client-side; generation happens through your configured API.</p>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">Start date</div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-900 outline-none focus:border-sky-400 focus:bg-white"
              disabled={disabled}
              required
            />
          </label>

          <label className="space-y-2">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">End date</div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-900 outline-none focus:border-sky-400 focus:bg-white"
              disabled={disabled}
              required
            />
          </label>

          <label className="space-y-2">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">Travelers</div>
            <input
              type="number"
              min={1}
              max={20}
              value={travelersCount}
              onChange={(e) => setTravelersCount(Number(e.target.value))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-900 outline-none focus:border-sky-400 focus:bg-white"
              disabled={disabled}
              required
            />
          </label>

          <label className="space-y-2">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">Budget level</div>
            <select
              value={budgetLevel}
              onChange={(e) => setBudgetLevel(e.target.value as any)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-900 outline-none focus:border-sky-400 focus:bg-white"
              disabled={disabled}
            >
              <option value="budget">Budget</option>
              <option value="midrange">Midrange</option>
              <option value="premium">Premium</option>
            </select>
          </label>

          <label className="space-y-2">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">Pace</div>
            <select
              value={pace}
              onChange={(e) => setPace(e.target.value as any)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-900 outline-none focus:border-sky-400 focus:bg-white"
              disabled={disabled}
            >
              <option value="relaxed">Relaxed</option>
              <option value="balanced">Balanced</option>
              <option value="packed">Packed</option>
            </select>
          </label>

          <label className="space-y-2 md:col-span-2">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">Interests (comma-separated)</div>
            <input
              type="text"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="beaches, scuba, history, food"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-900 outline-none focus:border-sky-400 focus:bg-white"
              disabled={disabled}
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">Preferred islands (comma-separated)</div>
            <input
              type="text"
              value={preferredIslands}
              onChange={(e) => setPreferredIslands(e.target.value)}
              placeholder="Port Blair, Havelock (Swaraj Dweep), Neil (Shaheed Dweep)"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-900 outline-none focus:border-sky-400 focus:bg-white"
              disabled={disabled}
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">Notes (optional)</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-900 outline-none focus:border-sky-400 focus:bg-white"
              disabled={disabled}
              placeholder="Any constraints: mobility, dietary, ferry anxiety, must-do activities..."
            />
          </label>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="text-xs font-semibold text-slate-500">
            {submitting ? 'Generating…' : ' '}
          </div>
          <button
            type="submit"
            disabled={disabled}
            className="rounded-2xl bg-slate-900 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-slate-900/20 transition hover:bg-black disabled:opacity-50"
          >
            {submitting ? 'Generating…' : 'Generate itinerary'}
          </button>
        </div>
      </div>
    </form>
  );
}

