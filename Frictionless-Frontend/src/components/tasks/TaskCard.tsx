'use client';

import { motion } from 'framer-motion';
import {
  Calendar,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusChip } from '@/components/shared/StatusChip';
import type { Task } from '@/types/database';
import { format, isPast, parseISO } from 'date-fns';

const priorityConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  critical: { label: 'Critical', color: 'bg-red-500/15 text-red-400 border-red-500/30', icon: Flame },
  high: { label: 'High', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30', icon: ArrowUp },
  medium: { label: 'Medium', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', icon: ArrowRight },
  low: { label: 'Low', color: 'bg-green-500/15 text-green-400 border-green-500/30', icon: ArrowDown },
};

interface TaskCardProps {
  task: Task;
  category?: string;
  onClick?: () => void;
  className?: string;
}

export function TaskCard({ task, category, onClick, className }: TaskCardProps) {
  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const PriorityIcon = priority.icon;
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
  const isAI = task.completion_source === 'ai_file_upload' || task.completion_source === 'ai_chat';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
      whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.3), 0 0 0 1px rgba(59,130,246,0.1)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'p-4 rounded-xl bg-obsidian-800/80 border border-obsidian-700/50 cursor-pointer',
        'transition-colors hover:border-obsidian-600/60',
        task.status === 'done' && 'opacity-70',
        className
      )}
    >
      {/* Title */}
      <h4 className={cn(
        'text-sm font-semibold text-foreground mb-2 line-clamp-2',
        task.status === 'done' && 'line-through text-muted-foreground'
      )}>
        {task.title}
      </h4>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {/* Priority */}
        <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border', priority.color)}>
          <PriorityIcon className="w-3 h-3" />
          {priority.label}
        </span>

        {/* Status */}
        <StatusChip status={task.status} />

        {/* AI badge */}
        {isAI && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-electric-purple/15 text-electric-purple border border-electric-purple/30">
            <Sparkles className="w-3 h-3" />
            AI
          </span>
        )}

        {/* Rescore badge */}
        {task.requires_rescore && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-electric-cyan/15 text-electric-cyan border border-electric-cyan/30">
            <RefreshCw className="w-3 h-3" />
            Rescore
          </span>
        )}

        {/* Potential points */}
        {typeof task.potential_points === 'number' && task.potential_points > 0 && task.status !== 'done' && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-score-excellent/15 text-score-excellent border border-score-excellent/30">
            +{task.potential_points} pts
          </span>
        )}
      </div>

      {/* Footer: due date + category */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {task.due_date ? (
          <span className={cn('flex items-center gap-1', isOverdue && 'text-red-400')}>
            {isOverdue && <AlertTriangle className="w-3 h-3" />}
            <Calendar className="w-3 h-3" />
            {format(parseISO(task.due_date), 'MMM d')}
          </span>
        ) : (
          <span className="text-obsidian-500">No due date</span>
        )}

        {category && (
          <span className="px-1.5 py-0.5 rounded bg-obsidian-700/50 text-[10px] font-medium text-obsidian-300 truncate max-w-[120px]">
            {category}
          </span>
        )}
      </div>
    </motion.div>
  );
}
