'use client';

import { motion } from 'framer-motion';
import { ChevronRight, Building2 } from 'lucide-react';
import Link from 'next/link';
import { TrendIndicator } from '@/components/charts/TrendIndicator';
import { cn } from '@/lib/utils';
import type { DummyMatch } from '@/lib/dummy-data/matches';
import type { DummyInvestor } from '@/lib/dummy-data/investors';

interface MatchPreviewListProps {
  matches: DummyMatch[];
  investors: DummyInvestor[];
  maxItems?: number;
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 86) return 'text-score-excellent';
  if (score >= 81) return 'text-score-good';
  return 'text-score-poor';
}

const statusConfig: Record<string, { label: string; style: string }> = {
  new: { label: 'New', style: 'bg-primary/15 text-primary' },
  viewed: { label: 'Viewed', style: 'bg-muted text-muted-foreground' },
  saved: { label: 'Saved', style: 'bg-accent/15 text-accent' },
  contacted: { label: 'Contacted', style: 'bg-score-excellent/15 text-score-excellent' },
  passed: { label: 'Passed', style: 'bg-muted text-muted-foreground' },
};

export function MatchPreviewList({
  matches,
  investors,
  maxItems = 5,
  className,
}: MatchPreviewListProps) {
  const investorMap = new Map(investors.map((inv) => [inv.org_id, inv]));
  const topMatches = [...matches]
    .sort((a, b) => b.overall_score - a.overall_score)
    .slice(0, maxItems);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className={cn('glass-card p-6', className)}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-body font-medium text-muted-foreground">
          Top Matches
        </h3>
        <Link
          href="/startup/investors"
          className="text-xs font-medium text-primary hover:text-chart-5 transition-colors flex items-center gap-1"
        >
          View All
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      {/* Horizontally scrollable on mobile, vertical list on desktop */}
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar md:flex-col md:overflow-x-visible md:pb-0">
        {topMatches.map((match, i) => {
          const investor = investorMap.get(match.capital_provider_org_id);
          const status = statusConfig[match.status] ?? statusConfig.new;
          return (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 + i * 0.06 }}
              className="flex-shrink-0 w-[260px] md:w-full p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/30 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                  {investor?.org.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={investor.org.logo_url}
                      alt={investor.org.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {investor?.org.name ?? 'Unknown Investor'}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full shrink-0',
                        status.style,
                      )}
                    >
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground capitalize">
                      {investor?.provider_type?.replace('_', ' ') ?? 'VC'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className={cn('text-lg font-mono font-bold', getScoreColor(match.overall_score))}>
                    {match.overall_score}
                  </span>
                  <TrendIndicator value={match.score_delta} className="text-[10px]" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
