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
  <section className="rounded-lg border border-warm bg-carbon p-8 md:p-12 shadow-elevation-high relative overflow-hidden">
    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2"></div>
    <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between relative z-10">
      <div className="max-w-2xl space-y-6">
        <p className="text-[11px] font-mono uppercase tracking-[0.4em] text-emerald-500 flex items-center space-x-3">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
          <span>root@system_health :: ONLINE</span>
        </p>
        <h1 className="hero-heading font-black tracking-tighter text-snow uppercase leading-none">
          Command <span className="text-emerald-500 logo-glow">&amp; Control.</span>
        </h1>
        <p className="text-base md:text-lg font-medium text-parchment leading-relaxed max-w-xl">
          Real-time telemetry from the island network. Monitor unit performance, resolve protocol breaches, and optimize conversion streams.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:flex sm:flex-wrap">
        <SummaryStat label="NET_TRAFFIC" value={totalViews} />
        <SummaryStat label="SYSTEM_ALERTS" value={activeAlertCount} isAlert={activeAlertCount > 0} />
      </div>
    </div>
  </section>
);

export const KPISection: React.FC<{ kpis: KpiCardData[] }> = ({ kpis }) => (
  <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
    {kpis.map((kpi) => {
      const Icon = kpi.icon;
      const trendStyles = TONE_STYLES[kpi.tone];
      const TrendIcon = kpi.tone === 'bad' ? ArrowDownRight : kpi.tone === 'good' ? ArrowUpRight : ArrowRight;

      return (
        <div key={kpi.label} className="premium-card p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-4">
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-slate-500">{kpi.label}</p>
              <p className="text-4xl font-black tracking-tighter text-snow uppercase">{kpi.value}</p>
              <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">{kpi.helper}</p>
            </div>
            <div className="w-12 h-12 rounded bg-abyss flex items-center justify-center text-emerald-500 border border-warm shadow-glow">
              <Icon size={20} />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between pt-6 border-t border-warm/50">
            <div className={`inline-flex items-center gap-2 rounded px-3 py-1 text-[10px] font-mono uppercase tracking-widest border ${trendStyles.badge}`}>
              <TrendIcon size={12} className={trendStyles.icon} />
              <span>{kpi.trend}</span>
            </div>
            <p className="text-[9px] font-mono uppercase tracking-widest text-slate-600">{kpi.trendText}</p>
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
  <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
    <div className="xl:col-span-2 rounded-lg border border-warm bg-carbon p-8 md:p-12 shadow-elevation-high">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-12 border-b border-warm pb-8">
        <div className="space-y-3">
          <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-emerald-500">Inquiry_Telemetry</p>
          <h2 className="text-3xl font-black tracking-tight text-snow uppercase">Demand Acceleration</h2>
          <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">
            Protocol: Recent_14D vs Baseline_Period
          </p>
        </div>
        <div className={`inline-flex items-center gap-3 self-start rounded border px-4 py-2 text-[10px] font-mono uppercase tracking-widest ${TONE_STYLES[primaryChartTone].badge}`}>
          {primaryChartTone === 'bad' ? <ArrowDownRight size={14} /> : primaryChartTone === 'good' ? <ArrowUpRight size={14} /> : <ArrowRight size={14} />}
          <span>{formatSignedPercent(inquiryTrend)} DRIFT_RATE</span>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={12}>
            <CartesianGrid vertical={false} stroke="#3d3a39" strokeDasharray="4 4" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#8b949e', fontSize: 10, fontFamily: 'monospace' }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              tick={{ fill: '#8b949e', fontSize: 10, fontFamily: 'monospace' }}
              dx={-10}
            />
            <Tooltip
              cursor={{ fill: '#101010', opacity: 0.5 }}
              contentStyle={{
                backgroundColor: '#050507',
                borderRadius: '4px',
                border: '1px solid #3d3a39',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                padding: '12px',
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#f2f2f2'
              }}
            />
            <Bar dataKey="previous" radius={[2, 2, 0, 0]} fill="#3d3a39" barSize={12} />
            <Bar dataKey="current" radius={[2, 2, 0, 0]} barSize={12}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`current-${index}`}
                  fill={entry.current >= entry.previous ? '#00d992' : '#fb565b'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-12 flex flex-wrap gap-6 pt-8 border-t border-warm/30">
        <LegendChip color="bg-warm" label="BASELINE" />
        <LegendChip color="bg-emerald-500" label="OVER_PERFORM" />
        <LegendChip color="bg-red-500" label="UNDER_PERFORM" />
      </div>
    </div>

    <div className="rounded-lg bg-abyss border border-emerald-500/20 p-8 md:p-12 text-snow shadow-glow relative overflow-hidden flex flex-col">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl"></div>
      <div className="relative z-10 space-y-12 flex-grow">
        <div className="space-y-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-emerald-500">cat readout.log</p>
          <h2 className="text-3xl font-black tracking-tight uppercase">Quick Wins</h2>
        </div>
        <div className="space-y-4 flex-grow">
          {immediateReadout.map((item) => (
            <InsightRow key={item.label} {...item} />
          ))}
        </div>
        <div className="pt-8 border-t border-warm/30 text-[9px] font-mono text-slate-600 uppercase tracking-widest text-center animate-pulse">
          AUTO_SYNC: READY
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
  <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
    <Panel title="Registry Health" subtitle="INVENTORY_STATE_SYNC">
      <div className="space-y-8">
        {statusData.map((item) => (
          <MetricBar key={item.label} {...item} />
        ))}
      </div>
    </Panel>

    <Panel title="Reach Funnel" subtitle="USER_ATTENTION_CLUSTER">
      <div className="space-y-8">
        {viewDistribution.map((item) => (
          <MetricBar key={item.label} {...item} />
        ))}
      </div>
    </Panel>

    <Panel title="Action Buffer" subtitle="INTERVENTION_REQUIRED">
      <div className="space-y-3">
        {priorityListings.length === 0 ? (
          <EmptyState text="System Nominal. All units performing within expected parameters." />
        ) : (
          priorityListings.map((listing) => <PriorityListingCard key={listing.id} listing={listing} />)
        )}
      </div>
    </Panel>
  </section>
);

export const AlertsSection: React.FC<{ alerts: AlertData[] }> = ({ alerts }) => (
  <section className="rounded-lg border border-warm bg-carbon p-8 md:p-12 shadow-elevation-high">
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
      <div className="space-y-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-red-500 flex items-center space-x-3">
          <AlertTriangle size={12} className="animate-pulse" />
          <span>ANOMALY_DETECTION</span>
        </p>
        <h2 className="text-3xl font-black tracking-tight text-snow uppercase">System Alerts</h2>
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest leading-loose">
          Autonomous scanning identified the following protocol deviations.
        </p>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {alerts.length === 0 ? (
        <div className="lg:col-span-2 p-16 bg-abyss rounded border border-dashed border-warm text-center">
           <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-6 logo-glow" />
           <p className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-[0.4em]">Zero anomalies identified</p>
        </div>
      ) : alerts.map((alert) => (
        <AlertCard key={alert.id} {...alert} />
      ))}
    </div>
  </section>
);

const SummaryStat: React.FC<{ label: string; value: number; isAlert?: boolean }> = ({ label, value, isAlert }) => (
  <div className={`rounded border px-6 py-5 flex flex-col justify-center min-w-[150px] transition-colors ${isAlert ? 'bg-red-500/10 border-red-500/30' : 'bg-abyss border-warm'}`}>
    <p className={`text-[9px] font-mono uppercase tracking-[0.3em] ${isAlert ? 'text-red-500 animate-pulse' : 'text-slate-500'}`}>{label}</p>
    <p className={`mt-2 text-3xl font-black ${isAlert ? 'text-red-400' : 'text-snow'}`}>{value}</p>
  </div>
);

const LegendChip: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div className="inline-flex items-center gap-3 rounded bg-abyss px-4 py-2 border border-warm shadow-elevation-low">
    <span className={`h-2 w-2 rounded-full ${color}`}></span>
    <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400">{label}</span>
  </div>
);

const InsightRow: React.FC<InsightItem> = ({ label, value, detail }) => (
  <div className="rounded bg-carbon border border-warm p-6 hover:border-emerald-500/50 transition-all group">
    <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-slate-500 group-hover:text-emerald-500 transition-colors">{label}</p>
    <div className="mt-3 flex items-center justify-between gap-4">
      <p className="text-2xl font-black tracking-tight text-snow uppercase">{value}</p>
    </div>
    <p className="mt-3 text-xs font-medium text-parchment leading-relaxed font-sans">{detail}</p>
  </div>
);

const Panel: React.FC<{ title: string; subtitle: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div className="rounded-lg border border-warm bg-carbon p-8 shadow-elevation-low h-full flex flex-col">
    <h3 className="text-2xl font-black tracking-tighter text-snow uppercase border-l-4 border-emerald-500 pl-4">{title}</h3>
    <p className="mt-3 text-[10px] font-mono uppercase tracking-[0.3em] text-slate-600 border-b border-warm/30 pb-6">{subtitle}</p>
    <div className="mt-8 flex-grow">{children}</div>
  </div>
);

const MetricBar: React.FC<MetricBarData> = ({ label, hint, value, width, barColor, textColor }) => (
  <div className="space-y-4">
    <div className="flex items-end justify-between gap-4 px-1">
      <div className="space-y-1">
        <p className="text-[11px] font-mono font-bold text-snow uppercase tracking-widest">{label}</p>
        <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">{hint}</p>
      </div>
      <p className={`text-xs font-mono font-bold ${textColor}`}>{value}</p>
    </div>
    <div className="h-2 rounded-full bg-abyss border border-warm overflow-hidden">
      <div 
        className={`h-full rounded-full ${barColor.replace('bg-', 'bg-')} shadow-glow transition-all duration-1000 ease-out`} 
        style={{ width: `${Math.min(width, 100)}%` }}
      ></div>
    </div>
  </div>
);

const PriorityListingCard: React.FC<{ listing: PriorityListingData }> = ({ listing }) => {
  const style = TONE_STYLES[listing.tone];

  return (
    <div className="rounded border border-warm bg-abyss p-5 hover:border-emerald-500/50 transition-all group">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-mono font-bold text-snow line-clamp-1 uppercase tracking-widest">{listing.title}</p>
          <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">{listing.reason}</p>
        </div>
        <div className={`rounded px-2.5 py-1 text-[8px] font-mono font-bold uppercase tracking-[0.2em] border ${style.badge}`}>
          {listing.tone === 'bad' ? 'CRITICAL' : listing.tone === 'neutral' ? 'MONITOR' : 'NOMINAL'}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {[
          { label: 'PINGS', value: listing.views },
          { label: 'AGE', value: `${listing.ageDays}D` },
        ].map(stat => (
          <span key={stat.label} className="rounded bg-carbon border border-warm px-2 py-1 text-[8px] font-mono font-bold uppercase tracking-widest text-slate-500 group-hover:border-emerald-500/30">
             {stat.label}: {stat.value}
          </span>
        ))}
        {listing.unreadForListing > 0 && (
          <span className="rounded bg-red-500/10 border border-red-500/30 px-2 py-1 text-[8px] font-mono font-bold uppercase tracking-widest text-red-400 animate-pulse">
            QUEUED: {listing.unreadForListing}
          </span>
        )}
      </div>
    </div>
  );
};

const AlertCard: React.FC<AlertData> = ({ title, detail, tone }) => {
  const config = {
    good: {
      wrapper: 'border-emerald-500/20 bg-emerald-500/5',
      title: 'text-emerald-500',
      detail: 'text-slate-400',
      icon: <CheckCircle2 size={16} className="text-emerald-500 logo-glow" />,
    },
    bad: {
      wrapper: 'border-red-500/20 bg-red-500/5',
      title: 'text-red-500',
      detail: 'text-slate-400',
      icon: <AlertTriangle size={16} className="text-red-500 animate-pulse" />,
    },
    neutral: {
      wrapper: 'border-warm bg-carbon',
      title: 'text-snow',
      detail: 'text-slate-500',
      icon: <Clock3 size={16} className="text-slate-500" />,
    },
  }[tone];

  return (
    <div className={`rounded border p-6 flex items-start gap-5 transition-all hover:shadow-elevation-low ${config.wrapper}`}>
      <div className="mt-0.5 p-2 bg-abyss rounded border border-warm shadow-elevation-low">{config.icon}</div>
      <div className="space-y-2">
        <p className={`text-[10px] font-mono font-bold uppercase tracking-[0.2em] ${config.title}`}>{title}</p>
        <p className={`text-xs font-medium leading-relaxed font-sans ${config.detail}`}>{detail}</p>
      </div>
    </div>
  );
};

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="rounded border border-dashed border-warm bg-abyss p-8 text-center">
    <p className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-[0.3em] leading-loose">{text}</p>
  </div>
);
