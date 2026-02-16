'use client';

import { motion } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Wallet,
  Users,
  Handshake,
  BarChart3,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DummyInvestor } from '@/lib/dummy-data/investors';
import type { DummyMatch } from '@/lib/dummy-data/matches';

interface MatchDetailTabsProps {
  investor: DummyInvestor;
  match: DummyMatch;
}

const DIMENSION_LABELS: Record<string, string> = {
  sector_fit: 'Sector Fit',
  stage_fit: 'Stage Fit',
  thesis_alignment: 'Thesis Alignment',
  check_size_fit: 'Check Size Fit',
  traction_match: 'Traction Match',
  team_quality: 'Team Quality',
  market_size: 'Market Size',
};

function getScoreColor(score: number) {
  if (score >= 80) return 'text-score-excellent';
  if (score >= 60) return 'text-score-good';
  if (score >= 40) return 'text-score-fair';
  return 'text-score-poor';
}

function getScoreBarColor(score: number) {
  if (score >= 80) return 'bg-score-excellent';
  if (score >= 60) return 'bg-score-good';
  if (score >= 40) return 'bg-score-fair';
  return 'bg-score-poor';
}

function formatCurrency(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function TabMotionWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

export function MatchDetailTabs({ investor, match }: MatchDetailTabsProps) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="w-full justify-start bg-obsidian-800/60 border border-obsidian-600/30 overflow-x-auto no-scrollbar flex-nowrap">
        <TabsTrigger value="overview" className="gap-1.5 text-xs">
          <FileText className="w-3.5 h-3.5" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="funds" className="gap-1.5 text-xs">
          <Wallet className="w-3.5 h-3.5" />
          Funds
        </TabsTrigger>
        <TabsTrigger value="team" className="gap-1.5 text-xs">
          <Users className="w-3.5 h-3.5" />
          Team
        </TabsTrigger>
        <TabsTrigger value="deals" className="gap-1.5 text-xs">
          <Handshake className="w-3.5 h-3.5" />
          Deals
        </TabsTrigger>
        <TabsTrigger value="fit" className="gap-1.5 text-xs">
          <BarChart3 className="w-3.5 h-3.5" />
          Fit Analysis
        </TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview">
        <TabMotionWrapper>
          <div className="space-y-4 mt-4">
            {/* Thesis */}
            <div className="glass-card p-4 lg:p-5">
              <h4 className="text-sm font-display font-semibold text-foreground mb-2">
                Investment Thesis
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {investor.thesis_summary}
              </p>
            </div>

            {/* Preferences */}
            <div className="glass-card p-4 lg:p-5">
              <h4 className="text-sm font-display font-semibold text-foreground mb-3">
                Preferences
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                    Preferred Stages
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {investor.preferred_stages.map((s) => (
                      <Badge
                        key={s}
                        variant="outline"
                        className="text-xs capitalize border-obsidian-600/50"
                      >
                        {s.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                    Preferred Sectors
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {investor.preferred_sectors.map((s) => (
                      <Badge
                        key={s}
                        variant="outline"
                        className="text-xs capitalize border-obsidian-600/50"
                      >
                        {s.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                    Sweet Spot
                  </p>
                  <p className="text-sm text-foreground">{investor.sweet_spot}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                    Check Size Range
                  </p>
                  <p className="text-sm text-foreground">
                    {formatCurrency(investor.check_size_min)} – {formatCurrency(investor.check_size_max)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabMotionWrapper>
      </TabsContent>

      {/* Funds Tab */}
      <TabsContent value="funds">
        <TabMotionWrapper>
          <div className="space-y-4 mt-4">
            {investor.funds.map((fund) => (
              <div key={fund.id} className="glass-card p-4 lg:p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      {fund.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Vintage {fund.vintage_year} · {fund.status}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs border',
                      fund.status === 'deploying'
                        ? 'border-score-excellent/30 text-score-excellent'
                        : 'border-obsidian-600/50 text-muted-foreground'
                    )}
                  >
                    {fund.capital_remaining_pct}% remaining
                  </Badge>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Deployed: {formatCurrency(fund.capital_deployed)}</span>
                    <span>Target: {formatCurrency(fund.target_size)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-obsidian-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-electric-blue transition-all"
                      style={{ width: `${100 - fund.capital_remaining_pct}%` }}
                    />
                  </div>
                </div>

                {/* Investments table */}
                {fund.investments.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Notable Investments
                    </p>
                    <div className="space-y-2">
                      {fund.investments.map((inv) => (
                        <div
                          key={inv.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-obsidian-800/40"
                        >
                          <div className="flex items-center gap-3">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {inv.startup_name}
                              </p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {inv.sector} · {inv.stage.replace('_', ' ')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-foreground">
                              {formatCurrency(inv.amount)}
                            </p>
                            <Badge
                              className={cn(
                                'text-[10px] h-4 border',
                                inv.status === 'active'
                                  ? 'bg-score-excellent/15 text-score-excellent border-score-excellent/30'
                                  : inv.status === 'exited'
                                  ? 'bg-electric-purple/15 text-electric-purple border-electric-purple/30'
                                  : 'bg-score-poor/15 text-score-poor border-score-poor/30'
                              )}
                            >
                              {inv.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabMotionWrapper>
      </TabsContent>

      {/* Team Tab */}
      <TabsContent value="team">
        <TabMotionWrapper>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {investor.team_members.map((member) => (
              <div key={member.id} className="glass-card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-obsidian-700 border border-obsidian-600/50 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={member.photo_url}
                      alt={member.full_name}
                      className="w-full h-full"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {member.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{member.title}</p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="mt-3 text-xs capitalize border-obsidian-600/50"
                >
                  {member.role}
                </Badge>
                {member.bio && (
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {member.bio}
                  </p>
                )}
              </div>
            ))}
          </div>
        </TabMotionWrapper>
      </TabsContent>

      {/* Deals Tab */}
      <TabsContent value="deals">
        <TabMotionWrapper>
          <div className="glass-card mt-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-obsidian-600/30">
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Company
                    </th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Sector
                    </th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Stage
                    </th>
                    <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-obsidian-600/20">
                  {investor.funds.flatMap((f) =>
                    f.investments.map((inv) => (
                      <tr
                        key={inv.id}
                        className="hover:bg-obsidian-700/20 transition-colors"
                      >
                        <td className="p-3 font-medium text-foreground">
                          {inv.startup_name}
                        </td>
                        <td className="p-3 text-muted-foreground capitalize">
                          {inv.sector}
                        </td>
                        <td className="p-3 text-muted-foreground capitalize">
                          {inv.stage.replace('_', ' ')}
                        </td>
                        <td className="p-3 text-right font-semibold text-foreground">
                          {formatCurrency(inv.amount)}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(inv.date).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="p-3">
                          <Badge
                            className={cn(
                              'text-[10px] border',
                              inv.status === 'active'
                                ? 'bg-score-excellent/15 text-score-excellent border-score-excellent/30'
                                : inv.status === 'exited'
                                ? 'bg-electric-purple/15 text-electric-purple border-electric-purple/30'
                                : 'bg-score-poor/15 text-score-poor border-score-poor/30'
                            )}
                          >
                            {inv.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabMotionWrapper>
      </TabsContent>

      {/* Fit Analysis Tab */}
      <TabsContent value="fit">
        <TabMotionWrapper>
          <div className="space-y-3 mt-4">
            {match.breakdown.map((dim) => (
              <div
                key={dim.dimension}
                className="glass-card p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    {DIMENSION_LABELS[dim.dimension] ?? dim.dimension}
                  </h4>
                  <span
                    className={cn(
                      'text-sm font-bold tabular-nums',
                      getScoreColor(dim.score)
                    )}
                  >
                    {dim.score}/100
                  </span>
                </div>
                <div className="h-2 rounded-full bg-obsidian-700 overflow-hidden mb-2">
                  <motion.div
                    className={cn('h-full rounded-full', getScoreBarColor(dim.score))}
                    initial={{ width: 0 }}
                    animate={{ width: `${dim.score}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{dim.detail}</p>
                <p className="text-[10px] text-obsidian-400 mt-1">
                  Weight: {(dim.weight * 100).toFixed(0)}%
                </p>
              </div>
            ))}
          </div>
        </TabMotionWrapper>
      </TabsContent>
    </Tabs>
  );
}
