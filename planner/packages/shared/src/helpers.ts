export function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1);
}

export function formatDateRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return `${s.toLocaleDateString("en-IN", opts)} – ${e.toLocaleDateString("en-IN", opts)}`;
}

export function budgetLabel(level: string): string {
  switch (level) {
    case "budget":
      return "Budget-Friendly";
    case "midrange":
      return "Mid-Range";
    case "premium":
      return "Premium";
    default:
      return level;
  }
}

export function paceLabel(pace: string): string {
  switch (pace) {
    case "relaxed":
      return "Relaxed";
    case "balanced":
      return "Balanced";
    case "packed":
      return "Action-Packed";
    default:
      return pace;
  }
}

export function estimateBudgetRange(
  days: number,
  travelers: number,
  level: string
): string {
  const perDayPerPerson: Record<string, [number, number]> = {
    budget: [2000, 4000],
    midrange: [5000, 9000],
    premium: [10000, 20000],
  };
  const [lo, hi] = perDayPerPerson[level] ?? [3000, 7000];
  const totalLo = lo * days * travelers;
  const totalHi = hi * days * travelers;
  return `₹${(totalLo / 1000).toFixed(0)}K – ₹${(totalHi / 1000).toFixed(0)}K`;
}
