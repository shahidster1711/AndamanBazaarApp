import type { BudgetLevel, ItineraryDay, Pace, TripPreferences } from './types';

export function uniqStringsPreserveOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = v.trim();
    if (!key) continue;
    const norm = key.toLowerCase();
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(key);
  }
  return out;
}

export function deriveIslandsCovered(days: ItineraryDay[], preferredIslands: string[]): string[] {
  const fromDays = days.map((d) => d.island);
  return uniqStringsPreserveOrder([...fromDays, ...preferredIslands]);
}

function budgetLabel(budgetLevel: BudgetLevel): { perPersonPerDayMin: number; perPersonPerDayMax: number } {
  if (budgetLevel === 'budget') return { perPersonPerDayMin: 2500, perPersonPerDayMax: 6000 };
  if (budgetLevel === 'midrange') return { perPersonPerDayMin: 6000, perPersonPerDayMax: 12000 };
  return { perPersonPerDayMin: 12000, perPersonPerDayMax: 25000 };
}

export function estimateBudgetRange(preferences: TripPreferences): string {
  const start = new Date(preferences.startDate + 'T00:00:00Z');
  const end = new Date(preferences.endDate + 'T00:00:00Z');
  const msPerDay = 24 * 60 * 60 * 1000;
  const tripDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / msPerDay) + 1);

  const { perPersonPerDayMin, perPersonPerDayMax } = budgetLabel(preferences.budgetLevel);
  const travelers = Math.max(1, Math.floor(preferences.travelersCount));
  const min = perPersonPerDayMin * travelers * tripDays;
  const max = perPersonPerDayMax * travelers * tripDays;

  const fmt = (n: number) => {
    const lakh = 100000;
    if (n >= 10 * lakh) return `₹${(n / lakh).toFixed(1)}L`;
    if (n >= lakh) return `₹${(n / lakh).toFixed(2)}L`;
    return `₹${Math.round(n / 1000)}k`;
  };

  return `${fmt(min)}–${fmt(max)}`;
}

export function defaultTripName(preferences: TripPreferences, islandsCovered: string[], pace: Pace): string {
  const main = islandsCovered[0] ?? 'Andaman';
  const paceLabel = pace === 'relaxed' ? 'Relaxed' : pace === 'packed' ? 'Packed' : 'Balanced';
  return `${paceLabel} ${main} Trip`;
}

