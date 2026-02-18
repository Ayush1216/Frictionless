'use client';

import { motion } from 'framer-motion';
import { Building2, Gauge, Share2, Users } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface QuickActionsProps {
  className?: string;
}

const actions = [
  {
    label: 'Update Profile',
    href: '/startup/company-profile',
    icon: Building2,
    gradient: 'from-primary/10 to-chart-5/5',
    iconColor: 'text-primary',
  },
  {
    label: 'Run Assessment',
    href: '/startup/readiness',
    icon: Gauge,
    gradient: 'from-accent/10 to-primary/5',
    iconColor: 'text-accent',
  },
  {
    label: 'Share Profile',
    href: '/startup/data-room',
    icon: Share2,
    gradient: 'from-chart-5/10 to-accent/5',
    iconColor: 'text-chart-5',
  },
  {
    label: 'Outreach',
    href: '/startup/matches',
    icon: Users,
    gradient: 'from-score-excellent/10 to-primary/5',
    iconColor: 'text-score-excellent',
  },
];

export function QuickActions({ className }: QuickActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className={cn('glass-card p-5', className)}
    >
      <h3 className="text-sm font-body font-medium text-muted-foreground mb-3">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action, i) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.4 + i * 0.06 }}
          >
            <Link
              href={action.href}
              className={cn(
                'flex flex-col items-center justify-center p-3 rounded-xl border border-border/50',
                'bg-gradient-to-br cursor-pointer',
                action.gradient,
                'hover:border-primary/20 hover:shadow-[0_0_16px_hsl(217_91%_60%/0.08)] transition-all group',
              )}
            >
              <action.icon
                className={cn(
                  'w-7 h-7 mb-1.5 group-hover:scale-110 transition-transform',
                  action.iconColor,
                )}
              />
              <span className="text-xs font-medium text-foreground text-center">
                {action.label}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
