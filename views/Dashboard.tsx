import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertsSection, DashboardHero, KPISection, PrimaryInsightsSection, SecondaryPanelsSection } from './dashboard/DashboardSections';
import { DEFAULT_PROFILE } from './dashboard/types';
import type { DashboardState } from './dashboard/types';
import { DASHBOARD_TARGETS, daysAgo } from './dashboard/utils';
import { useDashboardMetrics } from './dashboard/useDashboardMetrics';
import { RefreshCw, AlertCircle } from 'lucide-react';

const EMPTY_DASHBOARD_STATE: DashboardState = {
  profile: null,
  listings: [],
  chats: [],
  recentChats: [],
};

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardState>(EMPTY_DASHBOARD_STATE);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setData(EMPTY_DASHBOARD_STATE);
        return;
      }

      const recentTrendStart = daysAgo(DASHBOARD_TARGETS.trendWindowDays * 2 - 1).toISOString();

      const [profileResult, listingsResult, chatsResult, recentChatsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('successful_sales, trust_level, is_location_verified')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('listings')
          .select('id, title, status, views_count, created_at, updated_at, is_featured')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('chats')
          .select('id, listing_id, seller_unread_count')
          .eq('seller_id', user.id),
        supabase
          .from('chats')
          .select('created_at')
          .eq('seller_id', user.id)
          .gte('created_at', recentTrendStart),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (listingsResult.error) throw listingsResult.error;
      if (chatsResult.error) throw chatsResult.error;
      if (recentChatsResult.error) throw recentChatsResult.error;

      setData({
        profile: profileResult.data ?? DEFAULT_PROFILE,
        listings: listingsResult.data || [],
        chats: chatsResult.data || [],
        recentChats: recentChatsResult.data || [],
      });
    } catch (err: any) {
      console.error('Dashboard error:', err);
      setError(err.message || 'Failed to sync with island network.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const metrics = useDashboardMetrics(data);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-ocean-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-8 h-8 bg-ocean-50 rounded-full animate-pulse"></div>
          </div>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Syncing Island Metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center space-y-8 animate-slide-up">
        <div className="w-20 h-20 bg-coral-50 text-coral-600 rounded-[28px] flex items-center justify-center mx-auto border border-coral-100 shadow-sm">
           <AlertCircle size={32} />
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-black text-slate-950 tracking-tighter uppercase">Connection Issue</h2>
          <p className="text-slate-500 font-medium text-lg max-w-md mx-auto">{error}</p>
        </div>
        <button 
          onClick={fetchDashboard}
          className="btn-premium px-10 py-4 text-xs uppercase tracking-widest flex items-center justify-center mx-auto space-x-3"
        >
          <RefreshCw size={18} />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12 animate-fade-in">
      <DashboardHero totalViews={metrics.totalViews} activeAlertCount={metrics.activeAlertCount} />
      <KPISection kpis={metrics.kpis} />
      <PrimaryInsightsSection
        chartData={metrics.chartData}
        primaryChartTone={metrics.primaryChartTone}
        inquiryTrend={metrics.inquiryTrend}
        immediateReadout={metrics.immediateReadout}
      />
      <SecondaryPanelsSection
        statusData={metrics.statusData}
        viewDistribution={metrics.viewDistribution}
        priorityListings={metrics.priorityListings}
      />
      <AlertsSection alerts={metrics.alerts} />
    </div>
  );
};
