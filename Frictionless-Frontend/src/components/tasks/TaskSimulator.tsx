'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTaskStore } from '@/stores/task-store';

interface TaskSimulatorProps {
  className?: string;
}

/** E3: Simple scenario simulator – shows potential score gain from completing high-point tasks. */
export function TaskSimulator({ className }: TaskSimulatorProps) {
  const tasks = useTaskStore((s) => s.tasks);

  const { topByPoints, potentialGain } = useMemo(() => {
    const withPoints = tasks
      .filter((t) => t.status !== 'done' && typeof t.potential_points === 'number' && t.potential_points > 0)
      .sort((a, b) => (b.potential_points ?? 0) - (a.potential_points ?? 0));
    const top3 = withPoints.slice(0, 3);
    const gain = top3.reduce((s, t) => s + (t.potential_points ?? 0), 0);
    return { topByPoints: top3, potentialGain: gain };
  }, [tasks]);

  if (topByPoints.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'glass-card p-4 border border-primary/20',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
          <Target className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-display font-semibold text-foreground">Scenario Simulator</h3>
          <p className="text-[11px] text-muted-foreground">Impact of completing high-value tasks</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Complete these {topByPoints.length} task{topByPoints.length > 1 ? 's' : ''} to add{' '}
          <span className="font-semibold text-score-excellent">+{potentialGain} pts</span> to your readiness.
        </p>
        <ul className="space-y-1.5">
          {topByPoints.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg bg-muted"
            >
              <Sparkles className="w-3 h-3 text-accent flex-shrink-0" />
              <span className="text-foreground truncate flex-1">{t.title}</span>
              <span className="text-score-excellent font-medium flex-shrink-0">+{t.potential_points}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
