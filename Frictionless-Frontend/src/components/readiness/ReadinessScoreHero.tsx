'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts';
import { TrendingUp, TrendingDown, Clock, Calendar, CalendarDays, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getScoreInfo } from '@/lib/score-utils';

type TimeRange = 'hour' | 'day' | 'month';

interface ScoreHistoryEntry {
  score: number;
  updated_at: string;
}

interface ReadinessScoreHeroProps {
  score: number;
  delta: number;
  scoreHistory: ScoreHistoryEntry[];
  completedTasks: number;
  totalTasks: number;
  onRefresh: () => void;
}

interface ChartDatum {
  timestamp: number;
  score: number;
  label: string;
  fullLabel: string;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartDatum }[] }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  const info = getScoreInfo(data.score);
  return (
    <div className="glass-card px-3 py-2 text-xs border border-border/50 shadow-lg">
      <p className="text-muted-foreground mb-1">{data.fullLabel}</p>
      <div className="flex items-center gap-2">
        <div className={cn('w-2 h-2 rounded-full', info.dotClass)} />
        <span className="text-lg font-bold text-foreground tabular-nums">{data.score}</span>
        <span className={cn('text-xs font-medium', info.textClass)}>{info.label}</span>
      </div>
    </div>
  );
}

export function ReadinessScoreHero({
  score,
  delta,
  scoreHistory,
  completedTasks,
  totalTasks,
  onRefresh,
}: ReadinessScoreHeroProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const scoreInfo = getScoreInfo(score);
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Gauge arc calculations
  const radius = 80;
  const circumference = Math.PI * radius;
  const progress = (score / 100) * circumference;

  // Chart data with time range grouping
  const chartData = useMemo((): ChartDatum[] => {
    if (!scoreHistory.length) return [];

    const entries = scoreHistory.map((e) => {
      const d = new Date(e.updated_at);
      return { score: Math.round(Number(e.score)), timestamp: d.getTime(), date: d };
    }).sort((a, b) => a.timestamp - b.timestamp);

    if (timeRange === 'hour') {
      return entries.map((e) => ({
        timestamp: e.timestamp,
        score: e.score,
        label: e.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        fullLabel: e.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      }));
    }

    if (timeRange === 'month') {
      const byMonth = new Map<string, { score: number; date: Date }>();
      for (const e of entries) {
        const key = `${e.date.getFullYear()}-${e.date.getMonth()}`;
        byMonth.set(key, { score: e.score, date: e.date });
      }
      return Array.from(byMonth.values()).map((v) => ({
        timestamp: v.date.getTime(),
        score: v.score,
        label: v.date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        fullLabel: v.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      }));
    }

    // day mode: one point per day (latest)
    const byDay = new Map<string, { score: number; date: Date }>();
    for (const e of entries) {
      byDay.set(e.date.toDateString(), { score: e.score, date: e.date });
    }
    return Array.from(byDay.values()).map((v) => ({
      timestamp: v.date.getTime(),
      score: v.score,
      label: v.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullLabel: v.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    }));
  }, [scoreHistory, timeRange]);

  const yDomain = useMemo((): [number, number] => {
    if (!chartData.length) return [0, 100];
    const scores = chartData.map((d) => d.score);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const padding = Math.max(3, (max - min) * 0.1);
    return [Math.max(0, Math.floor(min - padding)), Math.min(100, Math.ceil(max + padding))];
  }, [chartData]);

  const timeRangeOptions: { key: TimeRange; label: string; icon: React.ElementType }[] = [
    { key: 'hour', label: 'Hourly', icon: Clock },
    { key: 'day', label: 'Daily', icon: Calendar },
    { key: 'month', label: 'Monthly', icon: CalendarDays },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="space-y-4"
    >
      {/* Top row: Score gauge + Stats + Mini chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Score Gauge Card */}
        <div className="lg:col-span-3 glass-card p-6 flex flex-col items-center justify-center relative overflow-hidden">
          <div className={cn('absolute inset-0 opacity-20 pointer-events-none bg-gradient-to-br',
            score >= 80 ? 'from-score-excellent/30 to-transparent' :
            score >= 60 ? 'from-score-fair/30 to-transparent' :
            'from-score-poor/30 to-transparent'
          )} />
          <div className="relative">
            {/* SVG Gauge */}
            <div className="relative w-[180px] h-[110px]">
              <svg viewBox="0 0 180 110" className="w-full h-full">
                <path
                  d="M 10 100 A 80 80 0 0 1 170 100"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeLinecap="round"
                  className="text-muted/50"
                />
                <motion.path
                  d="M 10 100 A 80 80 0 0 1 170 100"
                  fill="none"
                  stroke={scoreInfo.color}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: circumference - progress }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />
                {/* Glow effect */}
                <defs>
                  <filter id="score-glow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <motion.path
                  d="M 10 100 A 80 80 0 0 1 170 100"
                  fill="none"
                  stroke={scoreInfo.color}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: circumference - progress }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  filter="url(#score-glow)"
                  opacity={0.4}
                />
              </svg>
              {/* Score number */}
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-0">
                <span className="text-5xl font-display font-bold text-foreground tabular-nums">{Math.round(score)}</span>
              </div>
            </div>
            {/* Badge + Delta */}
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', scoreInfo.bgClass, scoreInfo.textClass)}>
                {scoreInfo.label}
              </span>
              {delta !== 0 && (
                <span className={cn('flex items-center gap-0.5 text-xs font-bold', delta > 0 ? 'text-score-excellent' : 'text-score-poor')}>
                  {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {delta > 0 ? '+' : ''}{delta}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-1 gap-3">
          {/* Tasks Progress */}
          <div className="glass-card p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tasks Completed</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-display font-bold text-foreground tabular-nums">{completedTasks}</span>
              <span className="text-sm text-muted-foreground">/ {totalTasks}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-score-excellent"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 block">{progressPct}% complete</span>
          </div>
          {/* Refresh */}
          <div className="glass-card p-4 flex flex-col justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Assessment</span>
            <p className="text-xs text-muted-foreground mt-1">Run a new assessment to update your score after completing tasks.</p>
            <button
              onClick={onRefresh}
              className="flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors w-fit"
            >
              <RefreshCw className="w-3 h-3" />
              Re-assess
            </button>
          </div>
        </div>

        {/* Score History Chart */}
        <div className="lg:col-span-6 glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-display font-semibold text-foreground">Score History</h3>
              <p className="text-[10px] text-muted-foreground">
                {chartData.length === 0 ? 'No scores yet' : `${chartData.length} data points`}
              </p>
            </div>
            <div className="flex rounded-lg bg-muted/50 border border-border/50 p-0.5">
              {timeRangeOptions.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTimeRange(key)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md transition-colors',
                    timeRange === key ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {chartData.length > 0 ? (
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={scoreInfo.color} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={scoreInfo.color} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={yDomain}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickCount={4}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke={scoreInfo.color}
                    strokeWidth={2}
                    fill="url(#scoreGradient)"
                    dot={{ r: 3, fill: scoreInfo.color, strokeWidth: 2, stroke: 'hsl(var(--bg-surface))' }}
                    activeDot={{ r: 5, fill: scoreInfo.color, strokeWidth: 2, stroke: 'hsl(var(--bg-surface))' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[160px] flex items-center justify-center rounded-lg border border-dashed border-border/50">
              <p className="text-xs text-muted-foreground">Run an assessment to see score history</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
