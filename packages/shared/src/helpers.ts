import type { BudgetLevel, ItineraryDay, TripPreferences } from "./types";

export const normalizeIslandName = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (segment) => segment.toUpperCase());

export const getTripDurationDays = (startDate: string, endDate: string): number => {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / dayMs) + 1);
};

export const getDatesBetween = (startDate: string, endDate: string): string[] => {
  const start = new Date(`${startDate}T00:00:00Z`);
  const duration = getTripDurationDays(startDate, endDate);

  return Array.from({ length: duration }, (_, index) => {
    const current = new Date(start.getTime());
    current.setUTCDate(start.getUTCDate() + index);
    return current.toISOString().slice(0, 10);
  });
};

export const deriveIslandsCovered = (days: ItineraryDay[]): string[] => {
  const islands = new Set<string>();
  for (const day of days) {
    islands.add(normalizeIslandName(day.island));
    for (const activity of day.activities) {
      islands.add(normalizeIslandName(activity.island));
    }
  }
  return Array.from(islands).filter(Boolean);
};

const budgetMultiplierByLevel: Record<BudgetLevel, number> = {
  budget: 1,
  midrange: 1.8,
  premium: 3,
};

export const estimateBudgetRange = (preferences: TripPreferences, daysCount: number): string => {
  const perPersonPerDayBaseline = 3500;
  const multiplier = budgetMultiplierByLevel[preferences.budgetLevel];
  const total = Math.round(
    perPersonPerDayBaseline * multiplier * preferences.travelersCount * Math.max(daysCount, 1),
  );

  const lower = Math.max(8000, Math.floor(total * 0.85 / 1000) * 1000);
  const upper = Math.max(lower + 4000, Math.ceil(total * 1.2 / 1000) * 1000);

  return `INR ${lower.toLocaleString("en-IN")} - ${upper.toLocaleString("en-IN")}`;
};

export const buildTripTitle = (
  preferences: TripPreferences,
  islandsCovered: string[],
  daysCount: number,
): string => {
  const islandLabel = islandsCovered.length > 0 ? islandsCovered.slice(0, 2).join(" & ") : "Andaman";
  const paceLabel =
    preferences.pace === "relaxed"
      ? "Leisure Escape"
      : preferences.pace === "packed"
        ? "Explorer Sprint"
        : "Balanced Discovery";

  return `${daysCount}D ${islandLabel} ${paceLabel}`.slice(0, 200);
};
