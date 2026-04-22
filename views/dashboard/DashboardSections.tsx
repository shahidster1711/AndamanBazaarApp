import React from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TONE_STYLES } from './types';
import { formatSignedPercent } from './utils';
import type {
  AlertData,
  ChartPoint,
  InsightItem,
  KpiCardData,
  MetricBarData,
  PriorityListingData,
  Tone,
} from './types';

export const DashboardHero: React.FC<{ totalViews: number; activeAlertCount: number }> = ({
  totalViews,
  activeAlertCount,
}) => (
  <section className="rounded-[48px] border border-slate-100 bg-white p-8 md:p-12 shadow-premium relative overflow-hidden">
    <div className="absolute top-0 right-0 w-64 h-64 bg-ocean-50 rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2"></div>
    <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between relative z-10">
      <div className="max-w-2xl space-y-4">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-ocean-600">Decision Dashboard</p>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-950 leading-[0.9]">
          Health & <span className="text-ocean-600">Action.</span>
        </h1>
        <p className="text-base md:text-lg font-medium text-slate-500 leading-relaxed max-w-xl">
          Understand system signals in seconds. Identify demand trends, intervene on listings, and resolve conversion blockers.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:flex sm:flex-wrap">
        <SummaryStat label="Total views" value={totalViews} />
        <SummaryStat label="Active alerts" value={activeAlertCount} isAlert={activeAlertCount > 0} />
      </div>
    </div>
  </section>
);

export const KPISection: React.FC<{ kpis: KpiCardData[] }> = ({ kpis }) => (
  <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
    {kpis.map((kpi) => {
      const Icon = kpi.icon;
      const trendStyles = TONE_STYLES[kpi.tone];
      const TrendIcon = kpi.tone === 'bad' ? ArrowDownRight : kpi.tone === 'good' ? ArrowUpRight : ArrowRight;

      return (
        <div key={kpi.label} className="premium-card p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{kpi.label}</p>
              <p className="text-4xl font-black tracking-tighter text-slate-950">{kpi.value}</p>
              <p className="text-sm font-bold text-slate-400">{kpi.helper}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 border border-slate-100 shadow-sm">
              <Icon size={24} />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${trendStyles.badge}`}>
              <TrendIcon size={12} className={trendStyles.icon} />
              <span>{kpi.trend}</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{kpi.trendText}</p>
          </div>
        </div>
      );
    })}
  </section>
);

export const PrimaryInsightsSection: React.FC<{
  chartData: ChartPoint[];
  primaryChartTone: Tone;
  inquiryTrend: number;
  immediateReadout: InsightItem[];
}> = ({ chartData, primaryChartTone, inquiryTrend, immediateReadout }) => (
  <section className="grid grid-cols-1 gap-8 xl:grid-cols-3">
    <div className="xl:col-span-2 rounded-[48px] border border-slate-100 bg-white p-8 md:p-12 shadow-premium">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Demand Signal</p>
          <h2 className="text-3xl font-black tracking-tight text-slate-950">
            Are inquiries accelerating?
          </h2>
          <p className="text-sm font-medium text-slate-500">
            New conversations started in the last 14 days vs previous period.
          </p>
        </div>
        <div className={`inline-flex items-center gap-2 self-start rounded-2xl border px-4 py-3 text-[10px] font-black uppercase tracking-widest ${TONE_STYLES[primaryChartTone].badge}`}>
          {primaryChartTone === 'bad' ? <ArrowDownRight size={14} /> : primaryChartTone === 'good' ? <ArrowUpRight size={14} /> : <ArrowRight size={14} />}
          <span>{formatSignedPercent(inquiryTrend)} Inquiry Trend</span>
        </div>
      </div>

      <div className="mt-12 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={12}>
            <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="0" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
              dx={-10}
            />
            <Tooltip
              cursor={{ fill: '#f8fafc', radius: 12 }}
              contentStyle={{
                borderRadius: '24px',
                border: 'none',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                padding: '16px',
              }}
            />
            <Bar dataKey="previous" radius={[8, 8, 8, 8]} fill="#e2e8f0" barSize={16} />
            <Bar dataKey="current" radius={[8, 8, 8, 8]} barSize={16}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`current-${index}`}
                  fill={entry.current >= entry.previous ? '#0ea5e9' : '#f43f5e'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <LegendChip color="bg-slate-200" label="Baseline" />
        <LegendChip color="bg-ocean-500" label="Above Baseline" />
        <LegendChip color="bg-coral-500" label="Below Baseline" />
      </div>
    </div>

    <div className="rounded-[48px] bg-slate-950 p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-ocean-500/10 rounded-full blur-2xl"></div>
      <div className="relative z-10 space-y-10">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Quick Wins</p>
          <h2 className="text-3xl font-black tracking-tight">Readout</h2>
        </div>
        <div className="space-y-6">
          {immediateReadout.map((item) => (
            <InsightRow key={item.label} {...item} />
          ))}
        </div>
      </div>
    </div>
  </section>
);

export const SecondaryPanelsSection: React.FC<{
  statusData: MetricBarData[];
  viewDistribution: MetricBarData[];
  priorityListings: PriorityListingData[];
}> = ({ statusData, viewDistribution, priorityListings }) => (
  <section className="grid grid-cols-1 gap-8 xl:grid-cols-3">
    <Panel title="Inventory Health" subtitle="Where is inventory getting stuck?">
      <div className="space-y-6">
        {statusData.map((item) => (
          <MetricBar key={item.label} {...item} />
        ))}
      </div>
    </Panel>

    <Panel title="Reach Funnel" subtitle="How is user attention distributed?">
      <div className="space-y-6">
        {viewDistribution.map((item) => (
          <MetricBar key={item.label} {...item} />
        ))}
      </div>
    </Panel>

    <Panel title="Priority Actions" subtitle="Listings requiring immediate intervention.">
      <div className="space-y-4">
        {priorityListings.length === 0 ? (
          <EmptyState text="No urgent actions identified. All listings are performing within healthy parameters." />
        ) : (
          priorityListings.map((listing) => <PriorityListingCard key={listing.id} listing={listing} />)
        )}
      </div>
    </Panel>
  </section>
);

export const AlertsSection: React.FC<{ alerts: AlertData[] }> = ({ alerts }) => (
  <section className="rounded-[48px] border border-slate-100 bg-white p-8 md:p-12 shadow-premium">
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-coral-600">Anomaly Watch</p>
        <h2 className="text-3xl font-black tracking-tight text-slate-950">System Alerts</h2>
        <p className="text-sm font-medium text-slate-500">
          Automated detection of trust gaps and invisible inventory.
        </p>
      </div>
    </div>

    <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
      {alerts.length === 0 ? (
        <div className="lg:col-span-2 p-12 bg-slate-50 rounded-[32px] border border-dashed border-slate-200 text-center">
           <CheckCircle2 size={32} className="mx-auto text-ocean-500 mb-4" />
           <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No active anomalies detected</p>
        </div>
      ) : alerts.map((alert) => (
        <AlertCard key={alert.id} {...alert} />
      ))}
    </div>
  </section>
);

const SummaryStat: React.FC<{ label: string; value: number; isAlert?: boolean }> = ({ label, value, isAlert }) => (
  <div className={`rounded-3xl border px-6 py-4 flex flex-col justify-center min-w-[140px] ${isAlert ? 'bg-coral-50 border-coral-100' : 'bg-slate-50 border-slate-100'}`}>
    <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${isAlert ? 'text-coral-600' : 'text-slate-400'}`}>{label}</p>
    <p className={`mt-1 text-3xl font-black ${isAlert ? 'text-coral-700' : 'text-slate-950'}`}>{value}</p>
  </div>
);

const LegendChip: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div className="inline-flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 shadow-sm">
    <span className={`h-2.5 w-2.5 rounded-full ${color}`}></span>
    <span>{label}</span>
  </div>
);

const InsightRow: React.FC<InsightItem> = ({ label, value, detail }) => (
  <div className="rounded-[32px] border border-white/5 bg-white/5 p-6 hover:bg-white/[0.08] transition-colors group">
    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 group-hover:text-ocean-400 transition-colors">{label}</p>
    <div className="mt-2 flex items-center justify-between gap-4">
      <p className="text-2xl font-black tracking-tight text-white">{value}</p>
    </div>
    <p className="mt-2 text-sm font-medium text-slate-400 leading-relaxed">{detail}</p>
  </div>
);

const Panel: React.FC<{ title: string; subtitle: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div className="rounded-[40px] border border-slate-100 bg-white p-8 shadow-premium">
    <h3 className="text-2xl font-black tracking-tighter text-slate-950">{title}</h3>
    <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{subtitle}</p>
    <div className="mt-8">{children}</div>
  </div>
);

const MetricBar: React.FC<MetricBarData> = ({ label, hint, value, width, barColor, textColor }) => (
  <div className="space-y-3">
    <div className="flex items-end justify-between gap-3 px-1">
      <div>
        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{label}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{hint}</p>
      </div>
      <p className={`text-sm font-black ${textColor}`}>{value}</p>
    </div>
    <div className="h-4 rounded-full bg-slate-50 border border-slate-100 overflow-hidden p-0.5">
      <div 
        className={`h-full rounded-full ${barColor} transition-all duration-1000 ease-out shadow-sm`} 
        style={{ width: `${Math.min(width, 100)}%` }}
      ></div>
    </div>
  </div>
);

const PriorityListingCard: React.FC<{ listing: PriorityListingData }> = ({ listing }) => {
  const style = TONE_STYLES[listing.tone];

  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-6 hover:bg-white hover:shadow-md transition-all group">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-black text-slate-900 line-clamp-2 uppercase tracking-tight">{listing.title}</p>
          <p className="text-xs font-bold text-slate-400">{listing.reason}</p>
        </div>
        <div className={`rounded-xl px-3 py-1.5 text-[9px] font-black uppercase tracking-widest border ${style.badge}`}>
          {listing.tone === 'bad' ? 'Urgent' : listing.tone === 'neutral' ? 'Monitor' : 'Healthy'}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {[
          { label: 'Views', value: listing.views },
          { label: 'Age', value: `${listing.ageDays}d` },
        ].map(stat => (
          <span key={stat.label} className="rounded-xl bg-white border border-slate-100 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500">
             {stat.value} {stat.label}
          </span>
        ))}
        {listing.unreadForListing > 0 && (
          <span className="rounded-xl bg-coral-50 border border-coral-100 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-coral-600">
            {listing.unreadForListing} Unread
          </span>
        )}
      </div>
    </div>
  );
};

const AlertCard: React.FC<AlertData> = ({ title, detail, tone }) => {
  const config = {
    good: {
      wrapper: 'border-ocean-100 bg-ocean-50/50',
      title: 'text-ocean-900',
      detail: 'text-ocean-700',
      icon: <CheckCircle2 size={20} className="text-ocean-500" />,
    },
    bad: {
      wrapper: 'border-coral-100 bg-coral-50/50',
      title: 'text-coral-900',
      detail: 'text-coral-700',
      icon: <AlertTriangle size={20} className="text-coral-500" />,
    },
    neutral: {
      wrapper: 'border-slate-200 bg-slate-50/50',
      title: 'text-slate-900',
      detail: 'text-slate-700',
      icon: <Clock3 size={20} className="text-slate-500" />,
    },
  }[tone];

  return (
    <div className={`rounded-[32px] border p-6 flex items-start gap-4 transition-all hover:shadow-md ${config.wrapper}`}>
      <div className="mt-1 p-2 bg-white rounded-xl shadow-sm border border-white/50">{config.icon}</div>
      <div className="space-y-2">
        <p className={`text-sm font-black uppercase tracking-tight ${config.title}`}>{title}</p>
        <p className={`text-sm font-medium leading-relaxed ${config.detail}`}>{detail}</p>
      </div>
    </div>
  );
};

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="rounded-[32px] border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-relaxed">{text}</p>
  </div>
);
