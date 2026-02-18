'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  MapPin,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Building2,
  ChevronDown,
  TrendingUp,
  Globe,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getScoreStyle, formatUsd, getInitials } from '@/lib/investor-utils';
import type { InvestorMatchResult, CategoryBreakdown } from '@/types/database';

interface InvestorMatchCardProps {
  match: InvestorMatchResult;
  index?: number;
}

// ---------------------------------------------------------------------------
// Score Ring (larger, cleaner)
// ---------------------------------------------------------------------------
function ScoreRing({ score, size = 68 }: { score: number; size?: number }) {
  const style = getScoreStyle(score);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="currentColor" strokeWidth={3}
            className="text-muted/20"
          />
          <motion.circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={style.ringColor} strokeWidth={3.5}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-foreground tabular-nums">
          {Math.round(score)}
        </span>
      </div>
      <span
        className="text-[10px] font-semibold tracking-wider uppercase"
        style={{ color: style.variantColor }}
      >
        {style.label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top signal chips (shows the 3 strongest breakdown categories)
// ---------------------------------------------------------------------------
const CATEGORY_LABELS: Record<string, string> = {
  deal_compatibility: 'Deal Fit',
  sector_business_model_fit: 'Sector',
  traction_vs_thesis_bar: 'Traction',
  founder_team_fit: 'Team',
  risk_regulatory_alignment: 'Alignment',
  diligence_process_fit: 'Diligence',
};

function getTopSignals(breakdown: Record<string, CategoryBreakdown>, limit = 3) {
  return Object.entries(breakdown)
    .map(([key, data]) => ({
      key,
      label: CATEGORY_LABELS[key] || key.replace(/_/g, ' '),
      pct: data.max_point > 0 ? Math.round((data.raw_points / data.max_point) * 100) : 0,
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, limit);
}

function getBarColor(pct: number): string {
  if (pct >= 86) return '#10B981';
  if (pct >= 80) return '#EAB308';
  return '#EF4444';
}

// ---------------------------------------------------------------------------
// Expanded breakdown (collapsible)
// ---------------------------------------------------------------------------
function FullBreakdown({ breakdown }: { breakdown: Record<string, CategoryBreakdown> }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="pt-3 mt-3 border-t border-border/30 space-y-3">
        {Object.entries(breakdown).map(([key, data]) => {
          const pct = data.max_point > 0 ? Math.round((data.raw_points / data.max_point) * 100) : 0;
          const label = CATEGORY_LABELS[key] || key.replace(/_/g, ' ');
          const subcats = (data as Record<string, unknown>).subcategories as Record<string, { raw_points: number; max_point: number; option_chosen?: string }> | undefined;

          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-20 truncate capitalize">{label}</span>
                <div className="flex-1 h-[5px] bg-muted/40 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: getBarColor(pct) }}
                  />
                </div>
                <span className="text-xs font-mono text-muted-foreground w-8 text-right tabular-nums">{pct}%</span>
              </div>
              {/* Subcategory reasoning */}
              {subcats && Object.keys(subcats).length > 0 && (
                <div className="ml-1 pl-2.5 border-l border-border/30 space-y-0.5">
                  {Object.entries(subcats).map(([subKey, subData]) => {
                    const optionChosen = subData.option_chosen;
                    if (!optionChosen) return null;
                    return (
                      <p key={subKey} className="text-[10px] text-muted-foreground/70 leading-snug flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/30 mt-1.5 shrink-0" />
                        <span><span className="capitalize text-muted-foreground">{subKey.replace(/_/g, ' ')}:</span> {optionChosen}</span>
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Card - Redesigned with larger fonts and better layout
// ---------------------------------------------------------------------------
export function InvestorMatchCard({ match, index = 0 }: InvestorMatchCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const inv = match.investor_profile;
  const score = match.fit_score_0_to_100;
  const style = getScoreStyle(score);
  const breakdown = match.category_breakdown || {};
  const topSignals = getTopSignals(breakdown);

  const location = [inv?.city, inv?.state, inv?.country].filter(Boolean).join(', ');
  const stages = Array.isArray(inv?.stages)
    ? inv.stages.slice(0, 3)
    : typeof inv?.stages === 'string'
      ? [inv.stages]
      : [];
  const sectors = Array.isArray(inv?.sectors) ? inv.sectors.slice(0, 2) : [];
  const name = inv?.name || 'Unknown Investor';

  // Top reasons
  const topReasons = match.eligible
    ? topSignals.map((s) => `Strong ${s.label.toLowerCase()} match (${s.pct}%)`)
    : (match.gate_fail_reasons || []).slice(0, 2).map((r) => typeof r === 'string' ? r : String(r));

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.02, 0.3) }}
      className="rounded-2xl border border-border/50 bg-card hover:border-primary/20 hover:shadow-lg transition-all duration-300 cursor-pointer group overflow-hidden"
      onClick={() => router.push(`/startup/investors/${match.investor_id}`)}
    >
      {/* Score accent bar */}
      <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${style.variantColor}60, ${style.variantColor}10, transparent)` }} />

      <div className="p-5">
        {/* Top section: Logo + Name + Score */}
        <div className="flex items-start gap-4">
          {/* Logo circle */}
          <div className="w-14 h-14 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center overflow-hidden shrink-0">
            {inv?.logo_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={inv.logo_url}
                alt={name}
                className="w-full h-full object-contain p-2"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    const span = document.createElement('span');
                    span.className = 'text-base font-bold text-muted-foreground';
                    span.textContent = getInitials(name);
                    parent.appendChild(span);
                  }
                }}
              />
            ) : (
              <span className="text-base font-bold text-muted-foreground">
                {getInitials(name)}
              </span>
            )}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors leading-snug">
              {name}
            </h3>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {inv?.investor_type && (
                <span className="text-sm text-muted-foreground capitalize flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  {inv.investor_type.replace(/_/g, ' ')}
                </span>
              )}
              {location && (
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[160px]">{location}</span>
                </span>
              )}
            </div>
          </div>

          {/* Score ring */}
          <ScoreRing score={score} />
        </div>

        {/* Pills row: eligible + stages + sectors + check size */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {match.eligible ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15">
              <CheckCircle2 className="w-3 h-3" />
              Eligible
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border/40">
              <XCircle className="w-3 h-3" />
              Not Eligible
            </span>
          )}
          {stages.map((s) => (
            <span
              key={String(s)}
              className="text-xs font-medium px-2.5 py-1 rounded-full capitalize bg-primary/5 text-primary/80 border border-primary/10"
            >
              {String(s).replace(/_/g, ' ')}
            </span>
          ))}
          {(inv?.check_min_usd || inv?.check_max_usd) && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto font-medium">
              <DollarSign className="w-3.5 h-3.5" />
              {formatUsd(inv.check_min_usd)}&ndash;{formatUsd(inv.check_max_usd)}
            </span>
          )}
        </div>

        {/* Sectors row */}
        {sectors.length > 0 && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {sectors.map((s) => (
              <span
                key={String(s)}
                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/30"
              >
                {String(s)}
              </span>
            ))}
          </div>
        )}

        {/* Top signals as compact inline bars */}
        {topSignals.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            {topSignals.map((s) => (
              <div key={s.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <span className="text-xs font-mono font-semibold" style={{ color: getBarColor(s.pct) }}>{s.pct}%</span>
                </div>
                <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: getBarColor(s.pct) }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(s.pct, 100)}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Top reasons */}
        {topReasons.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {topReasons.slice(0, 2).map((reason, i) => (
              <p key={i} className="text-xs text-muted-foreground flex items-start gap-2 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: match.eligible ? '#10B981' : '#EF4444' }} />
                <span className="line-clamp-1">{reason}</span>
              </p>
            ))}
          </div>
        )}

        {/* Expandable breakdown */}
        {Object.keys(breakdown).length > 0 && (
          <div className="mt-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-180')} />
              {expanded ? 'Hide' : 'Show'} breakdown
            </button>
            <AnimatePresence>
              {expanded && <FullBreakdown breakdown={breakdown} />}
            </AnimatePresence>
          </div>
        )}

        {/* View profile CTA */}
        <div className="flex items-center justify-end gap-1.5 mt-4 pt-3 border-t border-border/30">
          <span className="text-xs text-primary/60 group-hover:text-primary font-medium transition-colors">
            View Profile
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </motion.div>
  );
}
