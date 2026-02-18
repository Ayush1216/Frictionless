'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { DeltaArrow } from '@/components/matches/DeltaArrow';
import type { DummyAssessmentRun } from '@/lib/dummy-data/assessments';

type XAxisMode = 'day' | 'hour';

export interface ScoreHistoryEntry {
  id: string;
  score: number;
  updated_at: string;
  update_source?: string;
  note?: string;
}

interface AssessmentHistoryProps {
  /** Legacy: dummy assessment runs (used as fallback when no real data) */
  runs?: DummyAssessmentRun[];
  /** Real score history from readiness_score_history table */
  scoreHistory?: ScoreHistoryEntry[];
}

interface ChartDatum {
  run: number;
  score: number;
  delta: number;
  timestamp: number;
  date: string;
  dateHour: string;
  fullDate: string;
  fullDateHour: string;
  update_source?: string;
  note?: string;
}

interface TooltipPayloadItem {
  payload: ChartDatum;
}

function CustomTooltip({
  active,
  payload,
  xAxisMode,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  xAxisMode?: XAxisMode;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  const dateLabel = xAxisMode === 'hour' ? data.fullDateHour : data.fullDate;

  return (
    <div className="glass-card px-3 py-2 text-xs border border-border/50">
      <p className="text-foreground font-semibold">Run #{data.run}</p>
      <p className="text-muted-foreground">{dateLabel}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-lg font-bold text-primary tabular-nums">
          {data.score}
        </span>
        {Number.isFinite(data.delta) && data.delta !== 0 && <DeltaArrow delta={data.delta} size="sm" />}
      </div>
      {data.update_source && (
        <p className="text-muted-foreground mt-1 capitalize">{data.update_source.replace(/_/g, ' ')}</p>
      )}
      {data.note && <p className="text-muted-foreground mt-0.5 italic">{data.note}</p>}
    </div>
  );
}

const Y_PADDING = 2;
const Y_RANGE_PADDING_RATIO = 0.05;
const Y_MIN_DOMAIN = 0;
const Y_MAX_DOMAIN = 100;

export function AssessmentHistory({ runs = [], scoreHistory }: AssessmentHistoryProps) {
  const [xAxisMode, setXAxisMode] = useState<XAxisMode>('day');

  const toScore = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const chartData: ChartDatum[] = useMemo(
    () =>
      scoreHistory?.length
        ? scoreHistory.map((entry, i) => {
            const score = toScore(entry.score);
            const prevScore = i > 0 ? toScore(scoreHistory[i - 1].score) : score;
            const delta = score - prevScore;
            const d = new Date(entry.updated_at);
            return {
              run: i + 1,
              score,
              delta,
              timestamp: d.getTime(),
              date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              dateHour: d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              }),
              fullDate: d.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              }),
              fullDateHour: d.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              }),
              update_source: entry.update_source,
              note: entry.note,
            };
          })
        : runs.map((run) => {
            const d = new Date(run.scored_at);
            return {
              run: run.run_number,
              score: run.overall_score,
              delta: run.delta_from_previous,
              timestamp: d.getTime(),
              date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              dateHour: d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              }),
              fullDate: d.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              }),
              fullDateHour: d.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              }),
            };
          }),
    [scoreHistory, runs]
  );

  /** In day mode: one point per day = latest score of that day. In hour mode: all points. */
  const displayData = useMemo(() => {
    if (xAxisMode === 'hour' || chartData.length === 0) return chartData;
    const dayKey = (ts: number) => new Date(ts).toDateString();
    const byDay = new Map<string, ChartDatum[]>();
    for (const d of chartData) {
      const key = dayKey(d.timestamp);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(d);
    }
    const sortedDays = Array.from(byDay.keys()).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
    const result: ChartDatum[] = [];
    let prevScore: number | null = null;
    for (let i = 0; i < sortedDays.length; i++) {
      const dayEntries = byDay.get(sortedDays[i])!;
      const latest = dayEntries[dayEntries.length - 1];
      const delta = prevScore !== null ? latest.score - prevScore : 0;
      prevScore = latest.score;
      result.push({
        ...latest,
        run: i + 1,
        delta,
        date: latest.date,
        dateHour: latest.date,
        fullDate: latest.fullDate,
        fullDateHour: latest.fullDate,
      });
    }
    return result;
  }, [chartData, xAxisMode]);

  const yDomain = useMemo(() => {
    if (displayData.length === 0) return [Y_MIN_DOMAIN, Y_MAX_DOMAIN] as [number, number];
    const scores = displayData.map((d) => d.score);
    const dataMin = Math.min(...scores);
    const dataMax = Math.max(...scores);
    const range = dataMax - dataMin;
    const padding = Math.max(Y_PADDING, range * Y_RANGE_PADDING_RATIO);
    const min = Math.max(Y_MIN_DOMAIN, dataMin - padding);
    const max = Math.min(Y_MAX_DOMAIN, dataMax + padding);
    return [min, max] as [number, number];
  }, [displayData]);

  const dataSource = scoreHistory?.length ? scoreHistory : runs;
  const latestDeltaRaw =
    dataSource.length > 1
      ? toScore((dataSource[dataSource.length - 1] as { score?: unknown }).score) -
        toScore((dataSource[dataSource.length - 2] as { score?: unknown }).score)
      : 0;
  const latestDelta = Math.round(latestDeltaRaw * 10) / 10;

  const count = chartData.length;
  const showLatestDelta = Number.isFinite(latestDelta) && latestDelta !== 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="glass-card p-4 lg:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-display font-semibold text-foreground">
            Score History
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {count === 0
              ? 'No scores yet'
              : `${count} score${count !== 1 ? 's' : ''} recorded`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <div className="flex rounded-lg bg-card/60 border border-border/50 p-0.5">
              <button
                type="button"
                onClick={() => setXAxisMode('day')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  xAxisMode === 'day'
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                By day
              </button>
              <button
                type="button"
                onClick={() => setXAxisMode('hour')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  xAxisMode === 'hour'
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                By hour
              </button>
            </div>
          )}
          {showLatestDelta && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 text-xs">
              <span className="text-muted-foreground">Latest</span>
              <DeltaArrow delta={latestDelta} size="sm" />
            </div>
          )}
        </div>
      </div>

      {count === 0 ? (
        <div className="h-[180px] lg:h-[200px] flex items-center justify-center rounded-lg border border-dashed border-border/50 bg-background/30">
          <p className="text-sm text-muted-foreground">
            Run an assessment to see your score history
          </p>
        </div>
      ) : (
      <div className="h-[180px] lg:h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displayData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(75, 85, 99, 0.2)"
              vertical={false}
            />
            <XAxis
              dataKey="timestamp"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(ts: number) => {
                const d = new Date(ts);
                return xAxisMode === 'hour'
                  ? d.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }}
            />
            <YAxis
              domain={yDomain}
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickCount={5}
              allowDataOverflow
            />
            <Tooltip content={<CustomTooltip xAxisMode={xAxisMode} />} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#3B82F6"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#111827' }}
              activeDot={{ r: 6, fill: '#3B82F6', strokeWidth: 2, stroke: '#111827' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      )}
    </motion.div>
  );
}
