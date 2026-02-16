'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import {
  Target,
  Layers,
  DollarSign,
  Sparkles,
  Edit3,
  Zap,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { BadgeScore } from '@/components/shared/BadgeScore';
import { dummyInvestors } from '@/lib/dummy-data/investors';
import { dummyMatches } from '@/lib/dummy-data/matches';
import { dummyStartups } from '@/lib/dummy-data/startups';
import { Button } from '@/components/ui/button';

/* Use General Catalyst as the logged-in investor */
const investor = dummyInvestors[0];

function fmt(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

const stageLabels: Record<string, string> = {
  pre_seed: 'Pre-Seed',
  seed: 'Seed',
  series_a: 'Series A',
  series_b: 'Series B',
  series_c: 'Series C',
  series_d: 'Series D',
};

export default function ThesisPage() {
  // Recent deals matching thesis
  const matchingDeals = useMemo(() => {
    return dummyMatches
      .filter((m) => m.capital_provider_org_id === investor.org_id)
      .sort((a, b) => b.overall_score - a.overall_score)
      .slice(0, 5);
  }, []);

  const startupMap = useMemo(() => {
    const map = new Map<string, (typeof dummyStartups)[number]>();
    dummyStartups.forEach((s) => map.set(s.org_id, s));
    return map;
  }, []);

  return (
    <div className="p-4 lg:p-8 space-y-6 pb-24 lg:pb-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <PageHeader
        title="Investment Thesis"
        subtitle={investor.org.name}
        actions={
          <Button variant="outline" className="gap-1.5 border-obsidian-600/50 text-muted-foreground hover:text-electric-blue hover:border-electric-blue/40">
            <Edit3 className="w-4 h-4" /> Edit Thesis
          </Button>
        }
      />

      {/* Thesis summary */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-electric-blue" />
          <h3 className="text-sm font-display font-semibold text-foreground">Thesis Summary</h3>
        </div>
        <p className="text-base text-foreground/90 leading-relaxed">{investor.thesis_summary}</p>
      </motion.div>

      {/* Grid: Sectors, Stages, Check Size, Sweet Spot */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Preferred Sectors */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-electric-purple" />
            <h3 className="text-sm font-display font-semibold text-foreground">Preferred Sectors</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {investor.preferred_sectors.map((sector) => (
              <span
                key={sector}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-electric-purple/10 text-electric-purple border border-electric-purple/20 capitalize"
              >
                {sector.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Preferred Stages */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-electric-cyan" />
            <h3 className="text-sm font-display font-semibold text-foreground">Preferred Stages</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {investor.preferred_stages.map((stage) => (
              <span
                key={stage}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-electric-cyan/10 text-electric-cyan border border-electric-cyan/20"
              >
                {stageLabels[stage] || stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Check Size */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-score-fair" />
            <h3 className="text-sm font-display font-semibold text-foreground">Check Size Range</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 p-3 rounded-lg bg-obsidian-800/50 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Minimum</p>
              <p className="text-lg font-mono font-bold text-foreground mt-0.5">{fmt(investor.check_size_min)}</p>
            </div>
            <div className="text-obsidian-500">—</div>
            <div className="flex-1 p-3 rounded-lg bg-obsidian-800/50 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Maximum</p>
              <p className="text-lg font-mono font-bold text-foreground mt-0.5">{fmt(investor.check_size_max)}</p>
            </div>
          </div>
        </motion.div>

        {/* Sweet Spot */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-score-excellent" />
            <h3 className="text-sm font-display font-semibold text-foreground">Sweet Spot</h3>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-electric-blue/5 to-electric-purple/5 border border-electric-blue/10">
            <p className="text-lg font-display font-semibold text-foreground">{investor.sweet_spot}</p>
            <p className="text-xs text-muted-foreground mt-1">Primary focus area for new investments</p>
          </div>
        </motion.div>
      </div>

      {/* Recent deals matching thesis */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card overflow-hidden"
      >
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-electric-blue" />
            <h3 className="text-sm font-display font-semibold text-foreground">Recent Matches Aligned with Thesis</h3>
          </div>
          <Link href="/capital/deal-flow">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 hover:text-electric-blue">
              View All <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>

        <div className="divide-y divide-white/5">
          {matchingDeals.map((match, i) => {
            const startup = startupMap.get(match.startup_org_id);
            if (!startup) return null;

            return (
              <motion.div
                key={match.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 + i * 0.05 }}
              >
                <Link
                  href={`/capital/deal-flow/${startup.org_id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-obsidian-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-obsidian-700 flex-shrink-0">
                      <Image src={startup.org.logo_url} alt={startup.org.name} width={32} height={32} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{startup.org.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {startup.sector.name} · {stageLabels[startup.stage] || startup.stage}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <BadgeScore score={match.overall_score} delta={match.score_delta} size="sm" />
                    <ArrowRight className="w-4 h-4 text-obsidian-500" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
