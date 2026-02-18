'use client';

import { motion } from 'framer-motion';
import { Sparkles, AlertTriangle, TrendingUp, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface TodayBriefItem {
  type: 'change' | 'risk' | 'opportunity' | 'action';
  title: string;
  description?: string;
  href?: string;
  severity?: 'high' | 'medium' | 'low';
}

interface TodayBriefCardProps {
  items: TodayBriefItem[];
  topActions: { label: string; href: string }[];
  loading?: boolean;
  className?: string;
}

export function TodayBriefCard({ items, topActions, loading, className }: TodayBriefCardProps) {
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn('glass-card p-6 skeleton-shimmer min-h-[240px]', className)}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
          <div className="h-5 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </motion.div>
    );
  }

  const changes = items.filter((i) => i.type === 'change');
  const risks = items.filter((i) => i.type === 'risk');
  const opportunities = items.filter((i) => i.type === 'opportunity');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className={cn('glass-card p-6', className)}
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary shrink-0" />
        <h3 className="text-sm font-semibold text-foreground">Today&apos;s Brief</h3>
      </div>

      <div className="space-y-4">
        {risks.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
              Immediate risks
            </p>
            <ul className="space-y-1.5">
              {risks.slice(0, 2).map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <AlertTriangle
                    className={cn(
                      'w-3.5 h-3.5 mt-0.5 shrink-0',
                      r.severity === 'high' ? 'text-destructive' : 'text-score-fair'
                    )}
                  />
                  <span className="text-sm text-foreground">{r.title}</span>
                  {r.href && (
                    <Link href={r.href} className="text-primary text-xs hover:underline ml-auto shrink-0">
                      View
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {opportunities.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
              Top opportunities
            </p>
            <ul className="space-y-1.5">
              {opportunities.slice(0, 2).map((o, i) => (
                <li key={i} className="flex items-start gap-2">
                  <TrendingUp className="w-3.5 h-3.5 mt-0.5 shrink-0 text-score-excellent" />
                  <span className="text-sm text-foreground">{o.title}</span>
                  {o.href && (
                    <Link href={o.href} className="text-primary text-xs hover:underline ml-auto shrink-0">
                      View
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {topActions.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
              Next 3 actions
            </p>
            <ul className="space-y-1.5">
              {topActions.slice(0, 3).map((a, i) => (
                <li key={i}>
                  <Link
                    href={a.href}
                    className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors group"
                  >
                    <span>{a.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {items.length === 0 && topActions.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">No updates in the last 24h. Run an assessment to get insights.</p>
        )}
      </div>
    </motion.div>
  );
}
