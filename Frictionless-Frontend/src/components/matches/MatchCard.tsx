'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useSwipeable } from 'react-swipeable';
import { useState } from 'react';
import { Bookmark, X, DollarSign, Target, MapPin, Zap, Gauge } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DeltaArrow } from './DeltaArrow';
import { cn } from '@/lib/utils';
import { getFallbackScore } from '@/lib/investor-score-fallback';
import { getInvestorLogoUrl, getInvestorFallbackAvatar } from '@/lib/investor-logo';
import type { DummyMatch } from '@/lib/dummy-data/matches';
import type { DummyInvestor } from '@/lib/dummy-data/investors';

interface MatchCardProps {
  match: DummyMatch;
  investor: DummyInvestor & { raw_profile_json?: Record<string, unknown>; metadata_json?: Record<string, unknown> };
  index?: number;
  showFitPillars?: boolean;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  new: {
    label: 'New',
    className: 'bg-primary/15 text-primary border-primary/30',
  },
  viewed: {
    label: 'Viewed',
    className: 'bg-muted text-muted-foreground border-border',
  },
  saved: {
    label: 'Saved',
    className: 'bg-accent/15 text-accent border-accent/30',
  },
  contacted: {
    label: 'Contacted',
    className: 'bg-score-excellent/15 text-score-excellent border-score-excellent/30',
  },
  passed: {
    label: 'Passed',
    className: 'bg-muted text-muted-foreground border-border',
  },
};

function getScoreColor(score: number) {
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#EAB308';
  return '#EF4444';
}

function formatCheckSize(min: number, max: number) {
  const fmt = (n: number) => {
    if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(0)}B`;
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n}`;
  };
  return `${fmt(min)}–${fmt(max)}`;
}

const FIT_PILLAR_MAP: Record<string, { label: string; icon: React.ElementType }> = {
  stage_fit: { label: 'Stage', icon: Target },
  sector_fit: { label: 'Sector', icon: Zap },
  check_size_fit: { label: 'Check', icon: DollarSign },
  traction_match: { label: 'Traction', icon: Gauge },
  geo_fit: { label: 'Geo', icon: MapPin },
  thesis_alignment: { label: 'Frictionless', icon: Gauge },
};

function MiniGauge({ score, size = 44 }: { score: number; size?: number }) {
  const color = getScoreColor(score);
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          className="text-muted"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground tabular-nums">
        {score}
      </span>
    </div>
  );
}

export function MatchCard({ match, investor, index = 0, showFitPillars = true }: MatchCardProps) {
  const router = useRouter();
  const [swipeState, setSwipeState] = useState<'idle' | 'save' | 'pass'>('idle');
  const logoUrl = getInvestorLogoUrl(investor) ?? getInvestorFallbackAvatar(investor.org?.name ?? '');

  const handlers = useSwipeable({
    onSwipedRight: () => setSwipeState('save'),
    onSwipedLeft: () => setSwipeState('pass'),
    onSwiping: (e) => {
      if (e.deltaX > 60) setSwipeState('save');
      else if (e.deltaX < -60) setSwipeState('pass');
      else setSwipeState('idle');
    },
    trackMouse: false,
    trackTouch: true,
    delta: 30,
  });

  const status = statusConfig[match.status] ?? statusConfig.new;

  // I3: Use fallback score 60–90 when real score missing
  const displayScore =
    match.overall_score != null && !Number.isNaN(match.overall_score)
      ? match.overall_score
      : getFallbackScore(match.capital_provider_org_id, investor.org?.website);

  const preferredStages = investor.preferred_stages
    .slice(0, 2)
    .map((s) => s.replace('_', ' '))
    .join(', ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -2, boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.15)' }}
      className="relative"
      {...handlers}
    >
      {/* Swipe indicators (mobile) */}
      <div
        className={cn(
          'absolute inset-y-0 left-0 w-16 rounded-l-xl flex items-center justify-center transition-opacity lg:hidden',
          swipeState === 'save' ? 'opacity-100 bg-score-excellent/20' : 'opacity-0'
        )}
      >
        <Bookmark className="w-5 h-5 text-score-excellent" />
      </div>
      <div
        className={cn(
          'absolute inset-y-0 right-0 w-16 rounded-r-xl flex items-center justify-center transition-opacity lg:hidden',
          swipeState === 'pass' ? 'opacity-100 bg-score-poor/20' : 'opacity-0'
        )}
      >
        <X className="w-5 h-5 text-score-poor" />
      </div>

      <button
        onClick={() => router.push(`/startup/investors/${match.id}`)}
        className="w-full text-left glass-card p-4 lg:p-5 hover:border-primary/20 transition-all duration-200 cursor-pointer"
      >
        <div className="flex items-start gap-4">
          {/* Investor logo — priority: raw_profile_json > metadata_json > org.logo_url > fallback avatar */}
          <div className="w-11 h-11 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt={investor.org?.name ?? 'Investor'}
              className="w-8 h-8 object-cover"
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {investor.org.name}
                </h3>
                <p className="text-xs text-muted-foreground capitalize">
                  {investor.provider_type === 'vc' ? 'Venture Capital' : investor.provider_type}
                </p>
              </div>
              <MiniGauge score={displayScore} />
            </div>

            {/* Delta */}
            <div className="flex items-center gap-2 mt-2">
              <DeltaArrow delta={match.score_delta} size="sm" />
              <Badge
                className={cn(
                  'text-[10px] px-2 py-0 h-5 border',
                  status.className
                )}
              >
                {status.label}
              </Badge>
            </div>

            {/* Key stats */}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {formatCheckSize(investor.check_size_min, investor.check_size_max)}
              </span>
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                <span className="capitalize truncate">{preferredStages}</span>
              </span>
            </div>

            {/* Fit pillars — stage, sector, geo, check-size, traction, Frictionless */}
            {showFitPillars && match.breakdown?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {match.breakdown
                  .filter((b) => FIT_PILLAR_MAP[b.dimension])
                  .slice(0, 6)
                  .map((b) => {
                    const config = FIT_PILLAR_MAP[b.dimension];
                    const Icon = config.icon;
                    const isStrong = b.score >= 80;
                    return (
                      <Badge
                        key={b.dimension}
                        variant="outline"
                        className={cn(
                          'text-[10px] px-2 py-0 h-5 gap-0.5',
                          isStrong ? 'border-score-excellent/40 text-score-excellent/90' : 'border-border text-muted-foreground'
                        )}
                      >
                        <Icon className="w-2.5 h-2.5" />
                        {config.label} {b.score}
                      </Badge>
                    );
                  })}
              </div>
            )}

            {/* AI Match Explanation — "Why this investor" / "Why not a fit" */}
            {match.ai_explanation && (
              <div className={cn(
                'mt-3 p-2.5 rounded-lg border text-[11px] leading-relaxed',
                displayScore >= 80
                  ? 'bg-score-excellent/5 border-score-excellent/20 text-score-excellent/90'
                  : displayScore >= 60
                    ? 'bg-score-good/5 border-score-good/20 text-score-good/90'
                    : 'bg-score-poor/5 border-score-poor/20 text-muted-foreground'
              )}>
                <span className="font-semibold text-foreground text-[10px] uppercase tracking-wider block mb-1">
                  {displayScore >= 80 ? 'Why this investor' : displayScore >= 60 ? 'Match insight' : 'Why not a fit yet'}
                </span>
                <p className="line-clamp-2">{match.ai_explanation}</p>
              </div>
            )}
          </div>
        </div>
      </button>
    </motion.div>
  );
}
