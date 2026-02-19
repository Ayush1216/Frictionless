'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  Sparkles,
  Eye,
  Bookmark,
  XCircle,
  ArrowUpDown,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { BadgeScore } from '@/components/shared/BadgeScore';
import { StatusChip } from '@/components/shared/StatusChip';
import { dummyStartups, type DummyStartup } from '@/lib/dummy-data/startups';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/* ───────── helpers ───────── */
function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function getScoreColorClass(score: number) {
  if (score >= 86) return 'text-score-excellent';
  if (score >= 81) return 'text-score-good';
  return 'text-score-poor';
}

/* ───────── mini gauge ───────── */
function MiniGauge({ score }: { score: number }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color =
    score >= 86
      ? '#10B981'
      : score >= 81
        ? '#EAB308'
        : '#EF4444';

  return (
    <div className="relative w-10 h-10 flex-shrink-0">
      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={radius} fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
        <motion.circle
          cx="20" cy="20" r={radius} fill="none" stroke={color} strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${getScoreColorClass(score)}`}>
        {score}
      </span>
    </div>
  );
}

/* ───────── startup card ───────── */
function StartupCard({ startup, index, isNew }: { startup: DummyStartup; index: number; isNew?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className="glass-card group hover:shadow-card-hover transition-all duration-300"
    >
      <Link href={`/capital/deal-flow/${startup.org_id}`} className="block p-5">
        {/* Top row */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-muted flex-shrink-0 ring-1 ring-white/5">
            <Image src={startup.org.logo_url} alt={startup.org.name} width={40} height={40} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {startup.org.name}
              </h3>
              {isNew && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/30">
                  NEW
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusChip status={startup.stage} />
              <span className="text-xs text-muted-foreground">{startup.sector.name}</span>
            </div>
          </div>
          <MiniGauge score={startup.current_readiness_score} />
        </div>

        {/* Summary */}
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{startup.short_summary}</p>

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 rounded-lg bg-card/50">
            <p className="text-xs text-muted-foreground">MRR</p>
            <p className="text-sm font-mono font-bold text-foreground">{formatCurrency(startup.latest_metrics.mrr)}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-card/50">
            <p className="text-xs text-muted-foreground">Customers</p>
            <p className="text-sm font-mono font-bold text-foreground">{startup.latest_metrics.customer_count}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-card/50">
            <p className="text-xs text-muted-foreground">Runway</p>
            <p className="text-sm font-mono font-bold text-foreground">{startup.latest_metrics.runway_months}mo</p>
          </div>
        </div>

        {/* Score delta + tags */}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {startup.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-2 py-0.5 text-[10px] rounded-full bg-muted/60 text-muted-foreground border border-border/30">
                {tag}
              </span>
            ))}
          </div>
          <BadgeScore score={startup.current_readiness_score} delta={startup.score_delta} size="sm" />
        </div>
      </Link>

      {/* Quick actions */}
      <div className="border-t border-white/5 px-5 py-2.5 flex items-center gap-2">
        <Link href={`/capital/deal-flow/${startup.org_id}`}>
          <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-primary">
            <Eye className="w-3.5 h-3.5" /> View
          </Button>
        </Link>
        <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-score-fair">
          <Bookmark className="w-3.5 h-3.5" /> Save
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-muted-foreground">
          <XCircle className="w-3.5 h-3.5" /> Pass
        </Button>
      </div>
    </motion.div>
  );
}

/* ───────── sectors / stages for filters ───────── */
const ALL_SECTORS = Array.from(new Set(dummyStartups.map((s) => s.sector.name))).sort();
const ALL_STAGES = Array.from(new Set(dummyStartups.map((s) => s.stage))).sort();

/* ───────── page ───────── */
export default function DealFlowPage() {
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'score' | 'name' | 'date'>('score');
  const [scoreMin, setScoreMin] = useState(0);

  const filtered = useMemo(() => {
    let results = [...dummyStartups];

    // Search
    if (search) {
      const q = search.toLowerCase();
      results = results.filter(
        (s) =>
          s.org.name.toLowerCase().includes(q) ||
          s.sector.name.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sector
    if (sectorFilter !== 'all') {
      results = results.filter((s) => s.sector.name === sectorFilter);
    }

    // Stage
    if (stageFilter !== 'all') {
      results = results.filter((s) => s.stage === stageFilter);
    }

    // Score min
    if (scoreMin > 0) {
      results = results.filter((s) => s.current_readiness_score >= scoreMin);
    }

    // Sort
    results.sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.current_readiness_score - a.current_readiness_score;
        case 'name':
          return a.org.name.localeCompare(b.org.name);
        case 'date':
          return b.founded_year - a.founded_year;
        default:
          return 0;
      }
    });

    return results;
  }, [search, sectorFilter, stageFilter, sortBy, scoreMin]);

  // "New" startups = top scoring ones added recently (score_delta > 3)
  const newStartups = filtered.filter((s) => s.score_delta > 3);
  const otherStartups = filtered.filter((s) => s.score_delta <= 3);

  return (
    <div className="p-4 lg:p-8 space-y-6 pb-24 lg:pb-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <PageHeader
        title="Deal Flow"
        subtitle={`${dummyStartups.length} startups in pipeline`}
        actions={
          <div className="flex items-center gap-2">
            {newStartups.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">{newStartups.length} new</span>
              </div>
            )}
          </div>
        }
      />

      {/* Filter bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="glass-card p-4"
      >
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search startups, sectors, tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card/50 border-border/30"
            />
          </div>

          {/* Sector */}
          <Select value={sectorFilter} onValueChange={setSectorFilter}>
            <SelectTrigger className="w-full lg:w-[160px] bg-card/50 border-border/30">
              <SelectValue placeholder="Sector" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sectors</SelectItem>
              {ALL_SECTORS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Stage */}
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-full lg:w-[160px] bg-card/50 border-border/30">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {ALL_STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Score min */}
          <Select value={String(scoreMin)} onValueChange={(v) => setScoreMin(Number(v))}>
            <SelectTrigger className="w-full lg:w-[140px] bg-card/50 border-border/30">
              <SelectValue placeholder="Min Score" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Any Score</SelectItem>
              <SelectItem value="40">40+</SelectItem>
              <SelectItem value="60">60+</SelectItem>
              <SelectItem value="80">80+</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'score' | 'name' | 'date')}>
            <SelectTrigger className="w-full lg:w-[140px] bg-card/50 border-border/30">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score">Score</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="date">Founded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active filter count */}
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {dummyStartups.length} startups
          </p>
          {(sectorFilter !== 'all' || stageFilter !== 'all' || scoreMin > 0 || search) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground h-7"
              onClick={() => { setSearch(''); setSectorFilter('all'); setStageFilter('all'); setScoreMin(0); }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </motion.div>

      {/* New startups section */}
      {newStartups.length > 0 && (
        <div>
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-display font-semibold text-primary mb-3 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            New Startups
            <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
              {newStartups.length}
            </span>
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {newStartups.map((s, i) => (
              <StartupCard key={s.org_id} startup={s} index={i} isNew />
            ))}
          </div>
        </div>
      )}

      {/* All startups */}
      <div>
        {newStartups.length > 0 && otherStartups.length > 0 && (
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-display font-semibold text-muted-foreground mb-3"
          >
            All Startups
          </motion.h2>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {otherStartups.map((s, i) => (
            <StartupCard key={s.org_id} startup={s} index={i + newStartups.length} />
          ))}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-12 flex flex-col items-center text-center"
        >
          <Search className="w-8 h-8 text-muted-foreground mb-3" />
          <p className="text-lg font-display font-semibold text-foreground mb-2">No startups found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your filters to see more results.</p>
        </motion.div>
      )}
    </div>
  );
}
