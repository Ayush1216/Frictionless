'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Users,
  Flame,
  Clock,
  Eye,
  CheckCircle2,
  Loader2,
  PieChart as PieChartIcon,
  LayoutGrid,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { AnimatedLineChart } from '@/components/charts/AnimatedLineChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { AnimatedGauge } from '@/components/charts/AnimatedGauge';
import { ExtractionChart } from '@/components/analytics/ExtractionChart';
import { dummyStartups } from '@/lib/dummy-data/startups';
import { useAuthStore } from '@/stores/auth-store';
import { useReadinessStore } from '@/stores/readiness-store';
import { useTaskStore } from '@/stores/task-store';
import { supabase } from '@/lib/supabase/client';

// Use first startup (NeuralPay)
const startup = dummyStartups[0];

// Dummy time-series data
const scoreTrend = [
  { date: 'Sep', score: 62 },
  { date: 'Oct', score: 65 },
  { date: 'Nov', score: 68 },
  { date: 'Dec', score: 72 },
  { date: 'Jan', score: 78 },
  { date: 'Feb', score: 82 },
];

const mrrGrowth = [
  { date: 'Sep', value: 280000 },
  { date: 'Oct', value: 310000 },
  { date: 'Nov', value: 340000 },
  { date: 'Dec', value: 365000 },
  { date: 'Jan', value: 390000 },
  { date: 'Feb', value: 420000 },
];

const customerGrowth = [
  { date: 'Sep', value: 120 },
  { date: 'Oct', value: 135 },
  { date: 'Nov', value: 148 },
  { date: 'Dec', value: 158 },
  { date: 'Jan', value: 172 },
  { date: 'Feb', value: 187 },
];

const burnRate = [
  { date: 'Sep', value: 350000 },
  { date: 'Oct', value: 345000 },
  { date: 'Nov', value: 335000 },
  { date: 'Dec', value: 330000 },
  { date: 'Jan', value: 325000 },
  { date: 'Feb', value: 320000 },
];

const matchActivity = [
  { date: 'Week 1', views: 12, intros: 3 },
  { date: 'Week 2', views: 18, intros: 5 },
  { date: 'Week 3', views: 22, intros: 7 },
  { date: 'Week 4', views: 15, intros: 4 },
  { date: 'Week 5', views: 28, intros: 9 },
  { date: 'Week 6', views: 35, intros: 11 },
];

// Fallback radar data from dummy assessment
const fallbackRadarData = startup.assessment.categories.map((c) => ({
  dimension: c.name.split(' ')[0],
  score: c.score,
}));

// Task completion donut
const taskDonut = [
  { name: 'Completed', value: 18, color: '#10B981' },
  { name: 'Remaining', value: 7, color: '#374151' },
];

function ChartTooltip({ active, payload, label }: Record<string, unknown>) {
  if (!active || !payload || !(payload as Array<Record<string, unknown>>).length) return null;
  const items = payload as Array<{ value: number; name: string; color: string }>;
  return (
    <div className="glass-card px-3 py-2 text-xs">
      <p className="text-muted-foreground mb-1">{label as string}</p>
      {items.map((item, i) => (
        <p key={i} className="font-mono font-semibold" style={{ color: item.color }}>
          {item.name}: {typeof item.value === 'number' && item.value > 1000
            ? `$${(item.value / 1000).toFixed(0)}K`
            : item.value}
        </p>
      ))}
    </div>
  );
}

function ChartCard({
  title,
  icon: Icon,
  children,
  index = 0,
  className,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  index?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 + index * 0.06 }}
      className={`glass-card p-5 ${className ?? ''}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-sm font-display font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

function formatKpiValue(value: number, unit?: string): string {
  if (unit === 'USD') return `$${value >= 1e6 ? (value / 1e6).toFixed(1) + 'M' : value >= 1e3 ? (value / 1e3).toFixed(0) + 'K' : value.toLocaleString()}`;
  if (unit === 'Billion USD') return `$${value}B`;
  if (unit === '%') return `${value}%`;
  return value.toLocaleString();
}

export default function AnalyticsPage() {
  const router = useRouter();
  // Redirect to Company Profile insights section
  useEffect(() => {
    router.replace('/startup/company-profile#insights');
  }, [router]);

  const user = useAuthStore((s) => s.user);
  const { readiness, scoreHistory } = useReadinessStore();
  const { tasks } = useTaskStore();

  // Real KPI data from stores
  const overallScore = readiness?.score_summary?._overall?.raw_percentage ?? startup.assessment.overall_score;
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const totalTasks = tasks.length;
  const overdueTasks = tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length;

  // Build real score trend from scoreHistory
  const realScoreTrend = scoreHistory.length >= 2
    ? scoreHistory.slice(-6).map((h) => ({ date: new Date(h.updated_at).toLocaleDateString('en-US', { month: 'short' }), score: Math.round(h.score) }))
    : scoreTrend;

  // Real task donut
  const realTaskDonut = [
    { name: 'Completed', value: doneTasks, color: '#10B981' },
    { name: 'Remaining', value: Math.max(totalTasks - doneTasks, 0), color: '#374151' },
  ];
  const taskCompletionPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const [extractionData, setExtractionData] = useState<{
    charts?: Array<{
      chart_type?: string;
      chart_title?: string;
      series?: Array<{ name: string; data: Array<{ x: string; y: number }> }>;
      unit?: string;
      insight?: string;
      categories?: string[];
    }>;
    kpi_cards?: Array<{
      label?: string;
      value?: number;
      unit?: string;
      as_of?: string | null;
    }>;
    startup_name?: string;
  } | null>(null);
  const [extractionLoaded, setExtractionLoaded] = useState(false);
  const [readinessCategories, setReadinessCategories] = useState<Array<{ name: string; score: number }> | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token ?? null;
      if (!token || cancelled) return;
      const res = await fetch('/api/extraction/data', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (json.status === 'ready' && json.extraction_data?.charts) {
        const charts = json.extraction_data.charts;
        setExtractionData({
          charts: charts.charts ?? [],
          kpi_cards: charts.kpi_cards ?? [],
          startup_name: charts.startup_name,
        });
      }
      if (!cancelled) setExtractionLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Fetch Frictionless categories for radar chart
  useEffect(() => {
    if (!user || user.org_type !== 'startup') return;
    let cancelled = false;
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token ?? null;
      if (!token || cancelled) return;
      const res = await fetch('/api/readiness/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (json.status === 'ready' && json.score_summary && typeof json.score_summary === 'object') {
        const cats = Object.entries(json.score_summary)
          .filter(([k]) => k !== '_overall' && k !== 'totals')
          .map(([, v]) => {
            const c = v as { category_name?: string; percentage?: number };
            return { name: c.category_name ?? '', score: c.percentage ?? 0 };
          })
          .filter((c) => c.name);
        setReadinessCategories(cats);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const radarData = readinessCategories?.length
    ? readinessCategories.map((c) => ({
        dimension: c.name.length > 12 ? c.name.slice(0, 10) + '…' : c.name,
        score: c.score,
      }))
    : fallbackRadarData;

  const extractionCharts = extractionData?.charts ?? [];
  const kpiCards = extractionData?.kpi_cards ?? [];

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-1"
      >
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-primary" />
          Analytics & Insights
        </h1>
        <p className="text-muted-foreground text-sm">
          Track your startup&apos;s performance and Frictionless over time.
        </p>
      </motion.div>

      {/* Pitch deck extraction charts */}
      {(extractionCharts.length > 0 || !extractionLoaded) && (
        <div className="space-y-4">
          <h2 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-primary" />
            Pitch Deck Insights
            {extractionData?.startup_name && (
              <span className="text-sm font-normal text-muted-foreground">— {extractionData.startup_name}</span>
            )}
          </h2>
          {!extractionLoaded ? (
            <div className="space-y-4 animate-pulse">
              {/* KPI skeleton */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="glass-card p-4 space-y-2">
                    <div className="h-3 w-16 bg-muted/20 rounded" />
                    <div className="h-6 w-12 bg-muted/30 rounded" />
                    <div className="h-2 w-20 bg-muted/15 rounded" />
                  </div>
                ))}
              </div>
              {/* Chart skeletons */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="glass-card p-5 space-y-3">
                    <div className="h-4 w-28 bg-muted/20 rounded" />
                    <div className="h-40 bg-muted/10 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          ) : extractionCharts.length > 0 ? (
            <>
              {/* KPI cards */}
              {kpiCards.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {kpiCards.map((kpi, i) => (
                    <motion.div
                      key={kpi.label ?? i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="glass-card p-4"
                    >
                      <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
                      <p className="text-xl font-mono font-bold text-foreground mt-1">
                        {formatKpiValue(kpi.value ?? 0, kpi.unit)}
                      </p>
                      {kpi.as_of && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">as of {kpi.as_of}</p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {extractionCharts.map((chart, i) => (
                  <ExtractionChart key={(chart as { chart_id?: string }).chart_id ?? i} chart={chart as Parameters<typeof ExtractionChart>[0]['chart']} index={i} />
                ))}
              </div>
            </>
          ) : (
            <div className="glass-card p-8 text-center text-muted-foreground text-sm">
              No pitch deck charts yet. Upload a pitch deck during onboarding to extract financial charts.
            </div>
          )}
        </div>
      )}

      {/* Frictionless & Execution KPIs — driven by real store data */}
      <div className="space-y-4">
      <h2 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
        <LayoutGrid className="w-5 h-5 text-primary" />
        Frictionless & Execution
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4"
        >
          <p className="text-xs text-muted-foreground">Frictionless Score</p>
          <p className="text-2xl font-mono font-bold text-primary">{Math.round(overallScore)}%</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card p-4"
        >
          <p className="text-xs text-muted-foreground">Tasks Completed</p>
          <p className="text-2xl font-mono font-bold text-score-excellent">{doneTasks}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4"
        >
          <p className="text-xs text-muted-foreground">Overdue</p>
          <p className={`text-2xl font-mono font-bold ${overdueTasks > 0 ? 'text-score-fair' : 'text-foreground'}`}>{overdueTasks}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-4"
        >
          <p className="text-xs text-muted-foreground">Total Tasks</p>
          <p className="text-2xl font-mono font-bold text-foreground">{totalTasks}</p>
        </motion.div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Score Trend — from Frictionless store */}
        <ChartCard title="Frictionless Score Trend" icon={TrendingUp} index={0}>
          <AnimatedLineChart data={realScoreTrend} color="#3B82F6" height={220} />
        </ChartCard>

        {/* Category scores — bar chart instead of radar (F2) */}
        <ChartCard title="Category Scores" icon={BarChart3} index={1}>
          <div className="w-full" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={radarData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(75,85,99,0.2)" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--fi-text-muted)' }} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="dimension" width={80} tick={{ fontSize: 10, fill: 'var(--fi-text-muted)' }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="score" name="Score" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* MRR Growth */}
        <ChartCard title="MRR Growth" icon={TrendingUp} index={2}>
          <div className="w-full" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mrrGrowth} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(75,85,99,0.2)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--fi-text-muted)' }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--fi-text-muted)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `$${v / 1000}K`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="MRR"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#mrrGrad)"
                  dot={{ r: 3, fill: '#10B981', strokeWidth: 0 }}
                  isAnimationActive={true}
                  animationDuration={1200}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Customer Count */}
        <ChartCard title="Customer Count" icon={Users} index={3}>
          <div className="w-full" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={customerGrowth} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(75,85,99,0.2)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--fi-text-muted)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--fi-text-muted)' }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="value"
                  name="Customers"
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={1000}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Burn Rate */}
        <ChartCard title="Monthly Burn Rate" icon={Flame} index={4}>
          <div className="w-full" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={burnRate} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="burnGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(75,85,99,0.2)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--fi-text-muted)' }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--fi-text-muted)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `$${v / 1000}K`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="Burn"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  fill="url(#burnGrad)"
                  dot={{ r: 3, fill: '#F59E0B', strokeWidth: 0 }}
                  isAnimationActive={true}
                  animationDuration={1200}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Runway Gauge */}
        <ChartCard title="Runway (Months)" icon={Clock} index={5}>
          <div className="flex items-center justify-center py-2">
            <AnimatedGauge
              score={Math.min((startup.latest_metrics.runway_months / 36) * 100, 100)}
              size={180}
              strokeWidth={14}
            />
          </div>
          <div className="text-center mt-2">
            <span className="text-2xl font-mono font-bold text-foreground">
              {startup.latest_metrics.runway_months}
            </span>
            <span className="text-sm text-muted-foreground ml-1">months</span>
          </div>
        </ChartCard>

        {/* Match Activity */}
        <ChartCard title="Match Activity" icon={Eye} index={6}>
          <div className="w-full" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={matchActivity} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(75,85,99,0.2)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--fi-text-muted)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--fi-text-muted)' }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="views"
                  name="Views"
                  fill="#8B5CF6"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={1000}
                />
                <Bar
                  dataKey="intros"
                  name="Intros"
                  fill="#06B6D4"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={1000}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Task Completion — using real data */}
        <ChartCard title="Task Completion" icon={CheckCircle2} index={7}>
          <div className="flex items-center justify-center py-2">
            <DonutChart
              data={realTaskDonut}
              centerValue={`${taskCompletionPercent}%`}
              centerLabel="Done"
              size={180}
            />
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-score-excellent" />
              <span className="text-muted-foreground">Completed ({doneTasks})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-muted" />
              <span className="text-muted-foreground">Remaining ({Math.max(totalTasks - doneTasks, 0)})</span>
            </div>
          </div>
        </ChartCard>
      </div>
      </div>
    </div>
  );
}
