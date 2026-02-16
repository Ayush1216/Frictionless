'use client';

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

interface TooltipPayloadItem {
  payload: {
    run: number;
    score: number;
    delta: number;
    date: string;
    fullDate: string;
    update_source?: string;
    note?: string;
  };
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;

  return (
    <div className="glass-card px-3 py-2 text-xs border border-obsidian-600/50">
      <p className="text-foreground font-semibold">Run #{data.run}</p>
      <p className="text-muted-foreground">{data.fullDate}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-lg font-bold text-electric-blue tabular-nums">
          {data.score}
        </span>
        {Number.isFinite(data.delta) && data.delta !== 0 && <DeltaArrow delta={data.delta} size="sm" />}
      </div>
      {data.update_source && (
        <p className="text-obsidian-400 mt-1 capitalize">{data.update_source.replace(/_/g, ' ')}</p>
      )}
      {data.note && <p className="text-muted-foreground mt-0.5 italic">{data.note}</p>}
    </div>
  );
}

export function AssessmentHistory({ runs = [], scoreHistory }: AssessmentHistoryProps) {
  const toScore = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const chartData = scoreHistory?.length
    ? scoreHistory.map((entry, i) => {
        const score = toScore(entry.score);
        const prevScore = i > 0 ? toScore(scoreHistory[i - 1].score) : score;
        const delta = score - prevScore;
        return {
          run: i + 1,
          score,
          delta,
          date: new Date(entry.updated_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          fullDate: new Date(entry.updated_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
          update_source: entry.update_source,
          note: entry.note,
        };
      })
    : runs.map((run) => ({
        run: run.run_number,
        score: run.overall_score,
        delta: run.delta_from_previous,
        date: new Date(run.scored_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        fullDate: new Date(run.scored_at).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
      }));

  const dataSource = scoreHistory?.length ? scoreHistory : runs;
  const latestDelta =
    dataSource.length > 1
      ? toScore((dataSource[dataSource.length - 1] as { score?: unknown }).score) -
        toScore((dataSource[dataSource.length - 2] as { score?: unknown }).score)
      : 0;

  const count = chartData.length;
  const showLatestDelta = Number.isFinite(latestDelta) && latestDelta !== 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="glass-card p-4 lg:p-6"
    >
      <div className="flex items-center justify-between mb-4">
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
        {showLatestDelta && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-obsidian-700/60 text-xs">
            <span className="text-muted-foreground">Latest</span>
            <DeltaArrow delta={latestDelta} size="sm" />
          </div>
        )}
      </div>

      {count === 0 ? (
        <div className="h-[180px] lg:h-[200px] flex items-center justify-center rounded-lg border border-dashed border-obsidian-600/50 bg-obsidian-900/30">
          <p className="text-sm text-muted-foreground">
            Run an assessment to see your score history
          </p>
        </div>
      ) : (
      <div className="h-[180px] lg:h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(75, 85, 99, 0.2)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickCount={5}
            />
            <Tooltip content={<CustomTooltip />} />
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
