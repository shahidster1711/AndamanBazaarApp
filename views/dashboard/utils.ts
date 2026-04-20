import type {
  ListingRow,
  MetricBarData,
  PriorityListingData,
  Tone,
} from './types';

export const DAY_MS = 24 * 60 * 60 * 1000;

export const DASHBOARD_TARGETS = {
  activeInventory: 5,
  healthyViewsPerListing: 20,
  trendWindowDays: 7,
} as const;

export const formatSignedPercent = (value: number) => {
  if (!Number.isFinite(value) || value === 0) return '0%';
  return `${value > 0 ? '+' : ''}${Math.round(value)}%`;
};

export const formatSignedCount = (value: number) => {
  if (value === 0) return '0';
  return `${value > 0 ? '+' : ''}${value}`;
};

export const getPercentChange = (current: number, previous: number) => {
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }

  return ((current - previous) / previous) * 100;
};

export const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const daysAgo = (days: number) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
};

export const isBetween = (iso: string, start: Date, end: Date) => {
  const value = new Date(iso).getTime();
  return value >= start.getTime() && value < end.getTime();
};

export const getTrendTone = (value: number): Tone => {
  if (value === 0) return 'neutral';
  return value > 0 ? 'good' : 'bad';
};

export const toMetricBar = (
  label: string,
  hint: string,
  value: number,
  total: number,
  barColor: string,
  textColor: string,
): MetricBarData => ({
  label,
  hint,
  value,
  width: total ? Math.max((value / total) * 100, value > 0 ? 8 : 0) : 0,
  barColor,
  textColor,
});

export const scorePriorityListing = ({
  listing,
  unreadForListing,
  nowMs = Date.now(),
}: {
  listing: ListingRow;
  unreadForListing: number;
  nowMs?: number;
}): PriorityListingData => {
  const views = listing.views_count || 0;
  const ageDays = Math.max(0, Math.floor((nowMs - new Date(listing.created_at).getTime()) / DAY_MS));
  let priority = 0;
  let reason = 'Stable performance';
  let tone: Tone = 'good';

  if (unreadForListing > 0) {
    priority += 50 + unreadForListing * 10;
    reason = `${unreadForListing} unread buyer ${unreadForListing === 1 ? 'reply' : 'replies'}`;
    tone = 'bad';
  } else if (views === 0) {
    priority += 18 + ageDays;
    reason = ageDays > 7 ? 'No views after a week' : 'No views yet';
    tone = 'bad';
  } else if (ageDays > 14 && views < 10) {
    priority += 12;
    reason = 'Stale listing with weak reach';
    tone = 'bad';
  } else if (views < 10) {
    priority += 6;
    reason = 'Needs stronger title or pricing';
    tone = 'neutral';
  } else {
    priority += Math.max(1, 20 - views);
    reason = 'Healthy but monitor conversion';
    tone = 'good';
  }

  return {
    id: listing.id,
    title: listing.title,
    views,
    ageDays,
    unreadForListing,
    priority,
    reason,
    tone,
  };
};
