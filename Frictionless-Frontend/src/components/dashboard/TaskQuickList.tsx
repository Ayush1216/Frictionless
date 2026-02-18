'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { TaskGroup } from '@/types/database';

interface TaskQuickListProps {
  taskGroups: TaskGroup[];
  maxItems?: number;
  className?: string;
}

function impactColor(pts: number): string {
  if (pts >= 5) return 'border-l-primary';
  if (pts >= 3) return 'border-l-primary/60';
  return 'border-l-primary/30';
}

export function TaskQuickList({
  taskGroups,
  maxItems = 5,
  className,
}: TaskQuickListProps) {
  const { displayTasks, totalImpact } = useMemo(() => {
    const allTasks = taskGroups.flatMap((g) => g.tasks);
    const incomplete = allTasks.filter((t) => t.status === 'todo' || t.status === 'in_progress');
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

    // Sort by potential_points descending, then by priority
    const sorted = [...incomplete].sort((a, b) => {
      const ptsA = a.potential_points ?? 0;
      const ptsB = b.potential_points ?? 0;
      if (ptsB !== ptsA) return ptsB - ptsA;
      return (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
    });

    const display = sorted.slice(0, maxItems);
    const total = display.reduce((sum, t) => sum + (t.potential_points ?? 0), 0);

    return { displayTasks: display, totalImpact: total };
  }, [taskGroups, maxItems]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className={cn('glass-card p-6', className)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-display font-semibold text-foreground">
            Smart Next Steps
          </h3>
        </div>
        <Link
          href="/startup/tasks"
          className="text-xs font-medium text-primary hover:text-chart-5 transition-colors flex items-center gap-1"
        >
          View All
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-1.5">
        <AnimatePresence>
          {displayTasks.map((task, i) => {
            const pts = task.potential_points ?? 0;
            return (
              <Link key={task.id} href={`/startup/tasks?task=${encodeURIComponent(task.id)}`}>
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className={cn(
                    'flex items-center gap-3 p-2.5 rounded-lg transition-colors',
                    'bg-muted/50 hover:bg-muted cursor-pointer',
                    'border-l-2',
                    impactColor(pts),
                  )}
                >
                  <span className="text-sm text-foreground flex-1 min-w-0 truncate">
                    {task.title}
                  </span>
                  {pts > 0 && (
                    <span className="text-[10px] font-mono font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
                      +{pts} pts
                    </span>
                  )}
                </motion.div>
              </Link>
            );
          })}
        </AnimatePresence>
      </div>

      {totalImpact > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Completing these could add{' '}
            <span className="text-primary font-medium">+{totalImpact} points</span>
          </p>
        </div>
      )}
    </motion.div>
  );
}
