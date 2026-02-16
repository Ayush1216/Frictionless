'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useSwipeable } from 'react-swipeable';
import { useState } from 'react';
import { Bookmark, X, DollarSign, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DeltaArrow } from './DeltaArrow';
import { cn } from '@/lib/utils';
import type { DummyMatch } from '@/lib/dummy-data/matches';
import type { DummyInvestor } from '@/lib/dummy-data/investors';

interface MatchCardProps {
  match: DummyMatch;
  investor: DummyInvestor;
  index?: number;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  new: {
    label: 'New',
    className: 'bg-electric-blue/15 text-electric-blue border-electric-blue/30',
  },
  viewed: {
    label: 'Viewed',
    className: 'bg-obsidian-600/50 text-obsidian-300 border-obsidian-500/30',
  },
  saved: {
    label: 'Saved',
    className: 'bg-electric-purple/15 text-electric-purple border-electric-purple/30',
  },
  contacted: {
    label: 'Contacted',
    className: 'bg-score-excellent/15 text-score-excellent border-score-excellent/30',
  },
  passed: {
    label: 'Passed',
    className: 'bg-obsidian-700/50 text-obsidian-400 border-obsidian-600/30',
  },
};

function getScoreColor(score: number) {
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#3B82F6';
  if (score >= 40) return '#F59E0B';
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
          className="text-obsidian-700"
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

export function MatchCard({ match, investor, index = 0 }: MatchCardProps) {
  const router = useRouter();
  const [swipeState, setSwipeState] = useState<'idle' | 'save' | 'pass'>('idle');

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
        onClick={() => router.push(`/startup/matches/${match.id}`)}
        className="w-full text-left glass-card p-4 lg:p-5 hover:border-electric-blue/20 transition-all duration-200 cursor-pointer"
      >
        <div className="flex items-start gap-4">
          {/* Investor logo */}
          <div className="w-11 h-11 rounded-xl bg-obsidian-700 border border-obsidian-600/50 flex items-center justify-center overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={investor.org.logo_url}
              alt={investor.org.name}
              className="w-8 h-8"
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
              <MiniGauge score={match.overall_score} />
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
          </div>
        </div>
      </button>
    </motion.div>
  );
}
