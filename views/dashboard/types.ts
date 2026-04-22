import type { LucideIcon } from 'lucide-react';
import type { Listing, Profile } from '../../types';

export type Tone = 'good' | 'bad' | 'neutral';

export interface ListingRow extends Pick<Listing, 'id' | 'title' | 'status' | 'created_at' | 'is_featured'> {
  views_count: Listing['views_count'] | null;
  updated_at?: string;
}

export interface UnreadChatRow {
  id: string;
  listing_id: string | null;
  seller_unread_count: number | null;
}

export interface TrendChatRow {
  created_at: string;
}

export type ProfileRow = Pick<Profile, 'successful_sales' | 'trust_level' | 'is_location_verified'>;

export interface DashboardState {
  profile: ProfileRow | null;
  listings: ListingRow[];
  chats: UnreadChatRow[];
  recentChats: TrendChatRow[];
}

export interface KpiCardData {
  label: string;
  value: string;
  helper: string;
  trend: string;
  trendText: string;
  tone: Tone;
  icon: LucideIcon;
}

export interface ChartPoint {
  label: string;
  current: number;
  previous: number;
}

export interface InsightItem {
  label: string;
  value: string;
  detail: string;
}

export interface MetricBarData {
  label: string;
  hint: string;
  value: number;
  width: number;
  barColor: string;
  textColor: string;
}

export interface PriorityListingData {
  id: string;
  title: string;
  views: number;
  ageDays: number;
  unreadForListing: number;
  priority: number;
  reason: string;
  tone: Tone;
}

export interface AlertData {
  id: string;
  title: string;
  detail: string;
  tone: Tone;
}

export interface DashboardMetrics {
  totalViews: number;
  activeAlertCount: number;
  kpis: KpiCardData[];
  chartData: ChartPoint[];
  primaryChartTone: Tone;
  inquiryTrend: number;
  immediateReadout: InsightItem[];
  statusData: MetricBarData[];
  viewDistribution: MetricBarData[];
  priorityListings: PriorityListingData[];
  alerts: AlertData[];
}

export const DEFAULT_PROFILE: ProfileRow = {
  successful_sales: 0,
  trust_level: 'newbie',
  is_location_verified: false,
};

export const TONE_STYLES = {
  good: {
    badge: 'bg-ocean-50 text-ocean-700 border-ocean-100',
    icon: 'text-ocean-600',
  },
  bad: {
    badge: 'bg-coral-50 text-coral-700 border-coral-100',
    icon: 'text-coral-600',
  },
  neutral: {
    badge: 'bg-slate-50 text-slate-700 border-slate-100',
    icon: 'text-slate-500',
  },
} as const;
