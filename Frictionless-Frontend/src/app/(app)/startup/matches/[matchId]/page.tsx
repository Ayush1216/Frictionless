'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InvestorProfileHeader } from '@/components/matches/InvestorProfileHeader';
import { ScoreBreakdownRadar } from '@/components/matches/ScoreBreakdownRadar';
import { MatchDetailTabs } from '@/components/matches/MatchDetailTabs';
import { dummyMatches } from '@/lib/dummy-data/matches';
import { dummyInvestors } from '@/lib/dummy-data/investors';

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;

  const match = useMemo(
    () => dummyMatches.find((m) => m.id === matchId),
    [matchId]
  );

  const investor = useMemo(
    () =>
      match
        ? dummyInvestors.find((i) => i.org_id === match.capital_provider_org_id)
        : undefined,
    [match]
  );

  if (!match || !investor) {
    return (
      <div className="p-6 lg:p-8 flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-lg font-display font-semibold text-foreground mb-2">
          Match not found
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          The match you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button
          variant="outline"
          onClick={() => router.push('/startup/investors')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Matches
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 pb-24 lg:pb-8">
      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/startup/investors')}
          className="text-muted-foreground hover:text-foreground gap-1.5 -ml-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Matches
        </Button>
      </motion.div>

      {/* Investor Profile Header */}
      <InvestorProfileHeader investor={investor} match={match} />

      {/* AI Explanation */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass-card p-5 lg:p-6 border-l-4 border-l-electric-purple"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-electric-purple/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-electric-purple" />
          </div>
          <div>
            <h3 className="text-sm font-display font-semibold text-foreground mb-1.5">
              Why This Investor Matches You
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {match.ai_explanation}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Radar + Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Radar chart */}
        <div className="lg:col-span-1">
          <ScoreBreakdownRadar breakdown={match.breakdown} />
        </div>

        {/* Detail Tabs */}
        <div className="lg:col-span-2">
          <MatchDetailTabs investor={investor} match={match} />
        </div>
      </div>
    </div>
  );
}
