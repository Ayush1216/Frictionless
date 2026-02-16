'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Wallet,
  PlusCircle,
  BarChart3,
  DollarSign,
  Briefcase,
  ArrowRight,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusChip } from '@/components/shared/StatusChip';
import { dummyInvestors } from '@/lib/dummy-data/investors';
import { Button } from '@/components/ui/button';

/* Use General Catalyst as the logged-in investor */
const investor = dummyInvestors[0];

function fmt(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function FundCard({ fund, index }: { fund: (typeof investor.funds)[number]; index: number }) {
  const deployedPct = 100 - fund.capital_remaining_pct;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      className="glass-card group hover:shadow-card-hover transition-all duration-300"
    >
      <Link href={`/capital/funds/${fund.id}`} className="block p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-display font-semibold text-foreground text-lg truncate group-hover:text-electric-blue transition-colors">
              {fund.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Vintage {fund.vintage_year}</p>
          </div>
          <StatusChip status={fund.status} />
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-obsidian-800/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Target Size</p>
            <p className="text-base font-mono font-bold text-foreground mt-0.5">{fmt(fund.target_size)}</p>
          </div>
          <div className="p-3 rounded-lg bg-obsidian-800/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Deployed</p>
            <p className="text-base font-mono font-bold text-electric-blue mt-0.5">{fmt(fund.capital_deployed)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Capital Deployed</span>
            <span className="font-mono font-semibold text-foreground">{deployedPct}%</span>
          </div>
          <div className="w-full h-2.5 bg-obsidian-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-electric-blue to-electric-purple"
              initial={{ width: 0 }}
              animate={{ width: `${deployedPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.08 + 0.2 }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] mt-1">
            <span className="text-muted-foreground">Remaining: {fmt(fund.target_size * fund.capital_remaining_pct / 100)}</span>
          </div>
        </div>

        {/* Investment count + arrow */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Briefcase className="w-3.5 h-3.5" />
            <span>{fund.investments.length} investments</span>
          </div>
          <ArrowRight className="w-4 h-4 text-obsidian-500 group-hover:text-electric-blue group-hover:translate-x-1 transition-all" />
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── Summary Stats ─── */
function SummaryStat({ label, value, icon, color, delay }: { label: string; value: string; icon: React.ReactNode; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass-card p-4 flex items-center gap-3"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-mono font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </motion.div>
  );
}

export default function FundsPage() {
  const totalTarget = investor.funds.reduce((sum, f) => sum + f.target_size, 0);
  const totalDeployed = investor.funds.reduce((sum, f) => sum + f.capital_deployed, 0);
  const totalInvestments = investor.funds.reduce((sum, f) => sum + f.investments.length, 0);

  return (
    <div className="p-4 lg:p-8 space-y-6 pb-24 lg:pb-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <PageHeader
        title="Fund Management"
        subtitle={`${investor.funds.length} active funds`}
        actions={
          <Button className="gap-1.5 bg-electric-blue hover:bg-electric-blue/90 text-white">
            <PlusCircle className="w-4 h-4" /> Create Fund
          </Button>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryStat
          label="Total Target"
          value={fmt(totalTarget)}
          icon={<Wallet className="w-5 h-5 text-electric-blue" />}
          color="bg-electric-blue/10"
          delay={0.1}
        />
        <SummaryStat
          label="Total Deployed"
          value={fmt(totalDeployed)}
          icon={<DollarSign className="w-5 h-5 text-electric-purple" />}
          color="bg-electric-purple/10"
          delay={0.15}
        />
        <SummaryStat
          label="Investments"
          value={String(totalInvestments)}
          icon={<Briefcase className="w-5 h-5 text-score-fair" />}
          color="bg-score-fair/10"
          delay={0.2}
        />
        <SummaryStat
          label="AUM"
          value={fmt(investor.aum_usd)}
          icon={<BarChart3 className="w-5 h-5 text-score-excellent" />}
          color="bg-score-excellent/10"
          delay={0.25}
        />
      </div>

      {/* Fund cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {investor.funds.map((fund, i) => (
          <FundCard key={fund.id} fund={fund} index={i} />
        ))}
      </div>

      {/* Show all investors' funds for richer demo */}
      <div>
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm font-display font-semibold text-muted-foreground mb-3 mt-2"
        >
          Other Managed Funds (Demo)
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {dummyInvestors.slice(1, 5).flatMap((inv) => inv.funds).map((fund, i) => (
            <FundCard key={fund.id} fund={fund} index={i + investor.funds.length} />
          ))}
        </div>
      </div>
    </div>
  );
}
