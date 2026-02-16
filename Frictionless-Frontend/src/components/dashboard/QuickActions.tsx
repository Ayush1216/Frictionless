'use client';

import { motion } from 'framer-motion';
import { Upload, ListChecks, Sparkles, Users } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface QuickActionsProps {
  className?: string;
}

const actions = [
  {
    label: 'Upload Document',
    description: 'Add to data room',
    href: '/startup/data-room',
    icon: Upload,
    gradient: 'from-electric-blue/20 to-electric-cyan/10',
    iconColor: 'text-electric-blue',
  },
  {
    label: 'Complete a Task',
    description: 'Improve your score',
    href: '/startup/tasks',
    icon: ListChecks,
    gradient: 'from-electric-purple/20 to-electric-blue/10',
    iconColor: 'text-electric-purple',
  },
  {
    label: 'Ask AI',
    description: 'Get guidance',
    href: '/startup/chat',
    icon: Sparkles,
    gradient: 'from-electric-cyan/20 to-electric-purple/10',
    iconColor: 'text-electric-cyan',
  },
  {
    label: 'View Matches',
    description: 'See investor fits',
    href: '/startup/matches',
    icon: Users,
    gradient: 'from-score-excellent/20 to-electric-blue/10',
    iconColor: 'text-score-excellent',
  },
];

export function QuickActions({ className }: QuickActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className={cn('glass-card p-6', className)}
    >
      <h3 className="text-sm font-body font-medium text-muted-foreground mb-4">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {actions.map((action, i) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.5 + i * 0.06 }}
          >
            <Link
              href={action.href}
              className={cn(
                'flex flex-col items-center p-4 rounded-xl border border-obsidian-600/30',
                'bg-gradient-to-br',
                action.gradient,
                'hover:border-obsidian-500/50 hover:shadow-lg transition-all group',
              )}
            >
              <action.icon
                className={cn(
                  'w-6 h-6 mb-2 group-hover:scale-110 transition-transform',
                  action.iconColor,
                )}
              />
              <span className="text-sm font-medium text-foreground text-center">
                {action.label}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5 text-center">
                {action.description}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
