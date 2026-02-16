'use client';

import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Sparkles, TrendingUp } from 'lucide-react';
import { useAnimatedCounter } from '@/lib/hooks/useAnimatedCounter';

interface MissingItem {
  item: string;
  severity: 'high' | 'medium' | 'low';
}

interface ImprovementChartProps {
  currentScore: number;
  missingData: MissingItem[];
}

interface TooltipPayloadItem {
  payload: {
    name: string;
    impact: number;
    severity: string;
  };
}

function getImpact(severity: 'high' | 'medium' | 'low'): number {
  if (severity === 'high') return 5;
  if (severity === 'medium') return 3;
  return 1;
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
      <p className="text-foreground font-medium">{data.name}</p>
      <p className="text-electric-blue font-semibold mt-1">
        +{data.impact} points potential
      </p>
    </div>
  );
}

export function ImprovementChart({ currentScore, missingData }: ImprovementChartProps) {
  const improvementData = missingData.map((item) => ({
    name: item.item,
    impact: getImpact(item.severity),
    severity: item.severity,
  }));

  const totalImprovement = improvementData.reduce((acc, item) => acc + item.impact, 0);
  const projectedScore = Math.min(100, currentScore + totalImprovement);
  const animatedProjected = useAnimatedCounter(projectedScore, { duration: 1200 });

  const barColors: Record<string, string> = {
    high: '#EF4444',
    medium: '#F59E0B',
    low: '#3B82F6',
  };

  if (missingData.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="glass-card p-6 lg:p-8"
      >
        <div className="flex flex-col items-center text-center py-6">
          <div className="w-12 h-12 rounded-xl bg-score-excellent/15 flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6 text-score-excellent" />
          </div>
          <h3 className="text-lg font-display font-semibold text-foreground">
            All Data Complete
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            You have no missing data items. Your score reflects your full readiness profile.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-card p-4 lg:p-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-sm font-display font-semibold text-foreground">
            Score Improvement Potential
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fix {missingData.length} item{missingData.length !== 1 ? 's' : ''} to improve your score
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-score-excellent/10 text-xs text-score-excellent font-semibold">
          <TrendingUp className="w-3.5 h-3.5" />
          +{totalImprovement}
        </div>
      </div>

      {/* Projected score display */}
      <div className="flex items-center gap-4 mb-5 p-3 rounded-lg bg-obsidian-800/50 border border-obsidian-600/30">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Current</p>
          <p className="text-xl font-bold text-foreground tabular-nums">{currentScore}</p>
        </div>
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-obsidian-700 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-electric-blue to-score-excellent"
              initial={{ width: `${currentScore}%` }}
              animate={{ width: `${projectedScore}%` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
          </div>
        </div>
        <div className="text-center">
          <p className="text-xs text-score-excellent">Projected</p>
          <p className="text-xl font-bold text-score-excellent tabular-nums">
            {Math.round(animatedProjected)}
          </p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={improvementData} layout="vertical" margin={{ top: 0, right: 5, bottom: 0, left: 0 }}>
            <XAxis
              type="number"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              domain={[0, 'auto']}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#D1D5DB', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={130}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar dataKey="impact" radius={[0, 4, 4, 0]} barSize={20}>
              {improvementData.map((entry, idx) => (
                <Cell key={idx} fill={barColors[entry.severity] ?? '#3B82F6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
