'use client';

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
} from 'lucide-react';
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
  file_upload: { icon: <FileUp className="w-3.5 h-3.5" />, color: 'text-electric-blue bg-electric-blue/10' },
  task_completed: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-score-excellent bg-score-excellent/10' },
  match_viewed: { icon: <Eye className="w-3.5 h-3.5" />, color: 'text-electric-purple bg-electric-purple/10' },
  chat_message: { icon: <MessageSquare className="w-3.5 h-3.5" />, color: 'text-electric-cyan bg-electric-cyan/10' },
  task_status_changed: { icon: <Activity className="w-3.5 h-3.5" />, color: 'text-score-fair bg-score-fair/10' },
  match_saved: { icon: <Bookmark className="w-3.5 h-3.5" />, color: 'text-electric-purple bg-electric-purple/10' },
  assessment_run: { icon: <ShieldCheck className="w-3.5 h-3.5" />, color: 'text-electric-blue bg-electric-blue/10' },
  profile_update: { icon: <UserCheck className="w-3.5 h-3.5" />, color: 'text-electric-cyan bg-electric-cyan/10' },
  match_contacted: { icon: <Phone className="w-3.5 h-3.5" />, color: 'text-score-excellent bg-score-excellent/10' },
  match_passed: { icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-obsidian-400 bg-obsidian-600/30' },
  login: { icon: <LogIn className="w-3.5 h-3.5" />, color: 'text-obsidian-400 bg-obsidian-600/30' },
  program_enrollment: { icon: <GraduationCap className="w-3.5 h-3.5" />, color: 'text-electric-blue bg-electric-blue/10' },
};

function formatActivityDate(timestamp: string): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ActivityTimeline({
  activities,
  maxItems = 8,
  className,
}: ActivityTimelineProps) {
  const recent = [...activities]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, maxItems);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className={cn('glass-card p-6', className)}
    >
      <h3 className="text-sm font-body font-medium text-muted-foreground mb-5">
        Recent Activity
      </h3>
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-obsidian-700/50" />
        <div className="space-y-4">
          {recent.map((event, i) => {
            const config = activityIcons[event.type] ?? {
              icon: <Sparkles className="w-3.5 h-3.5" />,
              color: 'text-obsidian-400 bg-obsidian-600/30',
            };
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.6 + i * 0.05 }}
                className="flex items-start gap-3 relative"
              >
                <div
                  className={cn(
                    'w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 z-10',
                    config.color,
                  )}
                >
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm text-foreground font-medium truncate">
                      {event.title}
                    </span>
                    <span className="text-[10px] font-mono text-obsidian-400 shrink-0">
                      {formatActivityDate(event.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {event.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
