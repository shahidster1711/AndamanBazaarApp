/** Calculate the number of days between two ISO date strings (inclusive). */
export function dayCount(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

/** Format a budget range string from the budget level. */
export function budgetRangeLabel(level: "budget" | "midrange" | "premium"): string {
  const ranges: Record<string, string> = {
    budget: "₹1,500–3,000/day/person",
    midrange: "₹3,000–7,000/day/person",
    premium: "₹7,000–15,000+/day/person",
  };
  return ranges[level] ?? level;
}

/** Generate ISO date strings for each day in a range (inclusive). */
export function dateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]!);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/** Format date as "Mon, 15 Jan 2025" */
export function formatDisplayDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
