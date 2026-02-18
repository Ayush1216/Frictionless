'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileUp,
  TrendingUp,
  CheckCircle2,
  Eye,
  MessageSquare,
  Bookmark,
  Phone,
  ShieldCheck,
  UserCheck,
  LogIn,
  Sparkles,
  XCircle,
  GraduationCap,
  Activity,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Activity event from real-time logs (score history, completed tasks, etc.) */
export interface ActivityEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
}

interface ActivityTimelineProps {
  activities: ActivityEvent[];
  maxItems?: number;
  className?: string;
}

const activityIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  score_change: { icon: <TrendingUp className="w-3.5 h-3.5" />, color: 'text-score-excellent bg-score-excellent/10' },
  file_upload: { icon: <FileUp className="w-3.5 h-3.5" />, color: 'text-primary bg-primary/10' },
  task_completed: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-score-excellent bg-score-excellent/10' },
  match_viewed: { icon: <Eye className="w-3.5 h-3.5" />, color: 'text-accent bg-accent/10' },
  chat_message: { icon: <MessageSquare className="w-3.5 h-3.5" />, color: 'text-chart-5 bg-chart-5/10' },
  task_status_changed: { icon: <Activity className="w-3.5 h-3.5" />, color: 'text-score-fair bg-score-fair/10' },
  match_saved: { icon: <Bookmark className="w-3.5 h-3.5" />, color: 'text-accent bg-accent/10' },
  assessment_run: { icon: <ShieldCheck className="w-3.5 h-3.5" />, color: 'text-primary bg-primary/10' },
  profile_update: { icon: <UserCheck className="w-3.5 h-3.5" />, color: 'text-chart-5 bg-chart-5/10' },
  match_contacted: { icon: <Phone className="w-3.5 h-3.5" />, color: 'text-score-excellent bg-score-excellent/10' },
  match_passed: { icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-muted-foreground bg-muted' },
  login: { icon: <LogIn className="w-3.5 h-3.5" />, color: 'text-muted-foreground bg-muted' },
  program_enrollment: { icon: <GraduationCap className="w-3.5 h-3.5" />, color: 'text-primary bg-primary/10' },
};

function formatActivityDate(timestamp: string): string {
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ActivityTimeline({
  activities,
  maxItems = 5,
  className,
}: ActivityTimelineProps) {
  const filtered = useMemo(() => {
    return [...activities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, maxItems);
  }, [activities, maxItems]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className={cn('glass-card p-6', className)}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-body font-medium text-muted-foreground">
          Recent Activity
        </h3>
        <span className="text-[10px] text-muted-foreground">
          {filtered.length} event{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-1">
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No recent activity
          </p>
        )}
        {filtered.map((event, i) => {
          const config = activityIcons[event.type] ?? {
            icon: <Sparkles className="w-3.5 h-3.5" />,
            color: 'text-muted-foreground bg-muted',
          };
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.05 + i * 0.04 }}
              className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors"
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                  config.color,
                )}
              >
                {config.icon}
              </div>
              <span className="text-sm text-foreground flex-1 min-w-0 truncate">
                {event.title}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                {formatActivityDate(event.timestamp)}
              </span>
            </motion.div>
          );
        })}
      </div>

      {activities.length > maxItems && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <Link
            href="/startup/analytics"
            className="text-xs font-medium text-primary hover:text-chart-5 transition-colors flex items-center gap-1"
          >
            View all activity
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </motion.div>
  );
}
