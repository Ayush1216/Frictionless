'use client';

import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnimatedCounter } from '@/lib/hooks/useAnimatedCounter';
import { DeltaArrow } from '@/components/matches/DeltaArrow';
import { cn } from '@/lib/utils';

interface ScoreHeroProps {
  score: number;
  badge: string;
  delta: number;
  lastAssessed: string;
  onRunAssessment?: () => void;
}

function getScoreColor(score: number) {
  if (score >= 80) return { ring: '#10B981', bg: 'from-score-excellent/20 to-score-excellent/5' };
  if (score >= 60) return { ring: '#3B82F6', bg: 'from-score-good/20 to-score-good/5' };
  if (score >= 40) return { ring: '#F59E0B', bg: 'from-score-fair/20 to-score-fair/5' };
  return { ring: '#EF4444', bg: 'from-score-poor/20 to-score-poor/5' };
}

function getBadgeLabel(badge: string) {
  const map: Record<string, { label: string; color: string }> = {
    assessed: { label: 'Assessed', color: 'bg-obsidian-600/50 text-muted-foreground border-obsidian-500/50' },
    exceptional: { label: 'Exceptional', color: 'bg-score-excellent/20 text-score-excellent border-score-excellent/30' },
    strong: { label: 'Strong', color: 'bg-score-good/20 text-score-good border-score-good/30' },
    promising: { label: 'Promising', color: 'bg-electric-cyan/20 text-electric-cyan border-electric-cyan/30' },
    developing: { label: 'Developing', color: 'bg-score-fair/20 text-score-fair border-score-fair/30' },
    early: { label: 'Early Stage', color: 'bg-score-poor/20 text-score-poor border-score-poor/30' },
  };
  return map[badge] ?? map.developing;
}

export function ScoreHero({ score, badge, delta, lastAssessed, onRunAssessment }: ScoreHeroProps) {
  const animatedScore = useAnimatedCounter(score, { duration: 1500 });
  const scoreColor = getScoreColor(score);
  const badgeInfo = getBadgeLabel(badge);

  // Gauge arc calculations
  const radius = 90;
  const circumference = Math.PI * radius; // semicircle
  const progress = (score / 100) * circumference;

  const lastAssessedDisplay = (() => {
    const d = new Date(lastAssessed);
    return isNaN(d.getTime()) ? lastAssessed : formatDistanceToNow(d, { addSuffix: true });
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card p-6 lg:p-8 relative overflow-hidden"
    >
      {/* Background gradient */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-30 pointer-events-none',
          scoreColor.bg
        )}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Gauge */}
        <div className="relative w-[200px] h-[120px] lg:w-[250px] lg:h-[145px] mb-4">
          <svg
            viewBox="0 0 200 120"
            className="w-full h-full"
          >
            {/* Background arc */}
            <path
              d="M 10 110 A 90 90 0 0 1 190 110"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              strokeLinecap="round"
              className="text-obsidian-700"
            />
            {/* Score arc */}
            <motion.path
              d="M 10 110 A 90 90 0 0 1 190 110"
              fill="none"
              stroke={scoreColor.ring}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - progress }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
          </svg>

          {/* Score number overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-0">
            <span className="text-5xl lg:text-6xl font-display font-bold text-foreground tabular-nums">
              {Math.round(animatedScore)}
            </span>
          </div>
        </div>

        {/* Badge + Delta */}
        <div className="flex items-center gap-3 mb-3">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border',
              badgeInfo.color
            )}
          >
            <Award className="w-3.5 h-3.5" />
            {badgeInfo.label}
          </span>
          <DeltaArrow delta={delta} size="md" />
        </div>

        {/* Last assessed + CTA */}
        <p className="text-sm text-muted-foreground mb-4">
          Last assessed: {lastAssessedDisplay}
        </p>

        <Button
          onClick={onRunAssessment}
          className="bg-electric-blue hover:bg-electric-blue/90 text-white gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Run New Assessment
        </Button>
      </div>
    </motion.div>
  );
}
