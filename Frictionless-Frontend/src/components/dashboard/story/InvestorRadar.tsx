'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Users, ArrowUpRight } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/fi-skeleton';
import { sectionVariants, staggerContainer, staggerItem, cardHover } from './storyVariants';
import { getScoreColor, calculateFrictionlessScore } from '@/lib/scores';
import type { NarrativeData } from './useNarrativeData';

interface InvestorRadarProps {
  data: NarrativeData;
}

function formatCurrency(n: number | null | undefined): string {
  if (!n) return '\u2014';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function InvestorRadar({ data }: InvestorRadarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      variants={sectionVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className="fi-card fi-card-depth fi-card-shine fi-card-accent-flow"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold" style={{ color: 'var(--fi-text-primary)' }}>
            Investor Radar
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fi-text-tertiary)' }}>
            Top matches by Match Score
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data.highMatchCount > 0 && (
            <span className="fi-badge fi-badge-green">{data.highMatchCount} high match</span>
          )}
          <Link href="/startup/investors" className="fi-btn fi-btn-ghost text-xs">
            View All <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {data.investorLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : data.topMatches.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6" />}
          title="No investor matches yet"
          description="Complete your readiness assessment to start matching with relevant investors."
          action={
            <Link href="/startup/readiness" className="fi-btn fi-btn-primary">
              Run Assessment
            </Link>
          }
        />
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          {data.topMatches.map((match) => {
            const ip = match.investor_profile;
            const fscore = calculateFrictionlessScore(data.readinessScore, match.fit_score_0_to_100);
            const scoreColor = getScoreColor(fscore);

            return (
              <motion.div key={match.investor_id} variants={staggerItem}>
                <Link href={`/startup/investors/${match.investor_id}`}>
                  <motion.div
                    className="fi-card fi-card-interactive fi-card-depth fi-card-shine fi-investor-card p-4"
                    initial="rest"
                    whileHover="hover"
                    variants={cardHover}
                  >
                    {/* Header: logo + name */}
                    <div className="flex items-center gap-3 mb-3">
                      {ip.logo_url ? (
                        <Image
                          src={ip.logo_url}
                          alt=""
                          width={32}
                          height={32}
                          className="rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: 'var(--fi-bg-tertiary)', color: 'var(--fi-text-secondary)' }}
                        >
                          {(ip.name ?? '?').charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-semibold truncate"
                          style={{ color: 'var(--fi-text-primary)' }}
                        >
                          {ip.name ?? 'Unknown'}
                        </p>
                        {ip.investor_type && (
                          <p className="text-[11px]" style={{ color: 'var(--fi-text-muted)' }}>
                            {ip.investor_type}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Fit score bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px]" style={{ color: 'var(--fi-text-muted)' }}>
                          Match Score
                        </span>
                        <span className="text-xs font-bold tabular-nums" style={{ color: scoreColor }}>
                          {fscore}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--fi-bg-tertiary)' }}>
                        <div
                          className="h-full rounded-full fi-bar-animated"
                          style={{
                            width: `${fscore}%`,
                            background: scoreColor,
                          }}
                        />
                      </div>
                    </div>

                    {/* Stage / Sector / Check indicators */}
                    <div className="flex flex-wrap gap-1.5">
                      {ip.stages && (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--fi-bg-tertiary)', color: 'var(--fi-text-secondary)' }}
                        >
                          {Array.isArray(ip.stages) ? ip.stages[0] : ip.stages}
                        </span>
                      )}
                      {ip.sectors && (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--fi-bg-tertiary)', color: 'var(--fi-text-secondary)' }}
                        >
                          {Array.isArray(ip.sectors) ? ip.sectors[0] : ip.sectors}
                        </span>
                      )}
                    </div>

                    {/* Ticket range */}
                    <div className="mt-3 pt-2" style={{ borderTop: '1px solid var(--fi-border)' }}>
                      <span className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>
                        {formatCurrency(ip.check_min_usd)} &ndash; {formatCurrency(ip.check_max_usd)}
                      </span>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
