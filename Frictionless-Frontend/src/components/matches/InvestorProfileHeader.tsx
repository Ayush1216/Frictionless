'use client';

import { motion } from 'framer-motion';
import { Globe, Bookmark, Mail, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DeltaArrow } from './DeltaArrow';
import type { DummyInvestor } from '@/lib/dummy-data/investors';
import type { DummyMatch } from '@/lib/dummy-data/matches';

interface InvestorProfileHeaderProps {
  investor: DummyInvestor;
  match: DummyMatch;
}

function getScoreColor(score: number) {
  if (score >= 86) return '#10B981';
  if (score >= 80) return '#EAB308';
  return '#EF4444';
}

function formatAUM(aum: number) {
  if (aum >= 1_000_000_000) return `$${(aum / 1_000_000_000).toFixed(0)}B`;
  if (aum >= 1_000_000) return `$${(aum / 1_000_000).toFixed(0)}M`;
  return `$${(aum / 1_000).toFixed(0)}K`;
}

function LargeGauge({ score, size = 72 }: { score: number; size?: number }) {
  const color = getScoreColor(score);
  const radius = (size - 8) / 2;
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
          strokeWidth={4}
          className="text-muted"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-foreground tabular-nums">
        {score}
      </span>
    </div>
  );
}

const providerTypeLabels: Record<string, string> = {
  vc: 'Venture Capital',
  angel: 'Angel Investor',
  bank: 'Bank',
  grant: 'Grant Provider',
  family_office: 'Family Office',
  cvc: 'Corporate VC',
};

export function InvestorProfileHeader({ investor, match }: InvestorProfileHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card p-5 lg:p-8"
    >
      <div className="flex flex-col lg:flex-row lg:items-start gap-5">
        {/* Logo + Name */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-xl bg-muted border border-border/50 flex items-center justify-center overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={investor.org.logo_url}
              alt={investor.org.name}
              className="w-10 h-10 lg:w-12 lg:h-12"
            />
          </div>

          <div className="min-w-0">
            <h1 className="text-xl lg:text-2xl font-display font-bold text-foreground truncate">
              {investor.org.name}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className="bg-accent/15 text-accent border-accent/30 text-xs">
                <Building2 className="w-3 h-3 mr-1" />
                {providerTypeLabels[investor.provider_type] ?? investor.provider_type}
              </Badge>
              <DeltaArrow delta={match.score_delta} size="sm" />
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
              <span>
                <span className="font-semibold text-foreground">{formatAUM(investor.aum_usd)}</span>{' '}
                AUM
              </span>
              <span>
                <span className="font-semibold text-foreground">{investor.investment_count}</span>{' '}
                investments
              </span>
              <span>
                <span className="font-semibold text-foreground">{investor.portfolio_exits}</span>{' '}
                exits
              </span>
            </div>
          </div>
        </div>

        {/* Score gauge + actions */}
        <div className="flex items-center gap-4 lg:flex-col lg:items-end shrink-0">
          <LargeGauge score={match.overall_score} />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-border/50 gap-1.5"
            >
              <Bookmark className="w-4 h-4" />
              Save
            </Button>
            <Button
              size="sm"
              className="bg-electric-blue hover:bg-electric-blue/90 text-white gap-1.5"
            >
              <Mail className="w-4 h-4" />
              Contact
            </Button>
          </div>
          {investor.org.website && (
            <a
              href={investor.org.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-electric-blue hover:underline flex items-center gap-1"
            >
              <Globe className="w-3 h-3" />
              {investor.org.website.replace('https://', '')}
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}
