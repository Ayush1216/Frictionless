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

interface AssessmentHistoryProps {
  runs: DummyAssessmentRun[];
}

interface TooltipPayloadItem {
  payload: {
    run: number;
    score: number;
    delta: number;
    date: string;
    fullDate: string;
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
        {data.delta !== 0 && <DeltaArrow delta={data.delta} size="sm" />}
      </div>
    </div>
  );
}

export function AssessmentHistory({ runs }: AssessmentHistoryProps) {
  const chartData = runs.map((run) => ({
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

  const latestDelta =
    runs.length > 1
      ? runs[runs.length - 1].overall_score - runs[runs.length - 2].overall_score
      : 0;

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
            {runs.length} assessment{runs.length !== 1 ? 's' : ''} completed
          </p>
        </div>
        {latestDelta !== 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-obsidian-700/60 text-xs">
            <span className="text-muted-foreground">Latest</span>
            <DeltaArrow delta={latestDelta} size="sm" />
          </div>
        )}
      </div>

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
    </motion.div>
  );
}
