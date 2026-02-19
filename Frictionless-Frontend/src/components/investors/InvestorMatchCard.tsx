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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getScoreStyle, formatUsd, getInitials } from '@/lib/investor-utils';
import { calculateFrictionlessScore, getScoreColor, getScoreLabel } from '@/lib/scores';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import type { InvestorMatchResult, CategoryBreakdown } from '@/types/database';

interface InvestorMatchCardProps {
  match: InvestorMatchResult;
  index?: number;
  readinessScore?: number;
  isNew?: boolean;
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

// ---------------------------------------------------------------------------
// Expanded breakdown
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
      <div className="pt-3 mt-3 space-y-3" style={{ borderTop: '1px solid var(--fi-border)' }}>
        {Object.entries(breakdown).map(([key, data]) => {
          const pct = data.max_point > 0 ? Math.round((data.raw_points / data.max_point) * 100) : 0;
          const label = CATEGORY_LABELS[key] || key.replace(/_/g, ' ');
          const subcats = (data as unknown as Record<string, unknown>).subcategories as Record<string, { raw_points: number; max_point: number; option_chosen?: string }> | undefined;

          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-xs w-20 truncate capitalize" style={{ color: 'var(--fi-text-muted)' }}>{label}</span>
                <div className="flex-1 h-[5px] rounded-full overflow-hidden" style={{ background: 'var(--fi-bg-tertiary)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: getScoreColor(pct) }}
                  />
                </div>
                <span className="text-xs font-mono w-8 text-right tabular-nums" style={{ color: 'var(--fi-text-muted)' }}>{pct}%</span>
              </div>
              {subcats && Object.keys(subcats).length > 0 && (
                <div className="ml-1 pl-2.5 space-y-0.5" style={{ borderLeft: '1px solid var(--fi-border)' }}>
                  {Object.entries(subcats).map(([subKey, subData]) => {
                    const optionChosen = subData.option_chosen;
                    if (!optionChosen) return null;
                    return (
                      <p key={subKey} className="text-[10px] leading-snug flex items-start gap-1.5" style={{ color: 'var(--fi-text-muted)', opacity: 0.7 }}>
                        <span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--fi-text-muted)', opacity: 0.3 }} />
                        <span><span className="capitalize" style={{ color: 'var(--fi-text-muted)' }}>{subKey.replace(/_/g, ' ')}:</span> {optionChosen}</span>
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
// Main Card
// ---------------------------------------------------------------------------
export function InvestorMatchCard({ match, index = 0, readinessScore = 0, isNew = false }: InvestorMatchCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const inv = match.investor_profile;
  const thesisFit = match.fit_score_0_to_100;
  const frictionlessScore = calculateFrictionlessScore(readinessScore, thesisFit);
  const breakdown = match.category_breakdown || {};
  const topSignals = getTopSignals(breakdown);

  const location = [inv?.city, inv?.state, inv?.country].filter(Boolean).join(', ');
  const stages = Array.isArray(inv?.stages)
    ? inv.stages.slice(0, 3)
    : typeof inv?.stages === 'string'
      ? [inv.stages]
      : [];
  const sectors = Array.isArray(inv?.sectors) ? inv.sectors : [];
  const name = inv?.name || 'Unknown Investor';
  const isCustom = (inv as Record<string, unknown>)?.is_custom === true;
  const aiReasoning = (inv as Record<string, unknown>)?.ai_reasoning as string | undefined;

  // Top reasons
  const topReasons = match.eligible
    ? topSignals.map((s) => `Strong ${s.label.toLowerCase()} match (${s.pct}%)`)
    : (match.gate_fail_reasons || []).slice(0, 2).map((r) => typeof r === 'string' ? r : String(r));

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.02, 0.3) }}
      className="fi-card-interactive overflow-hidden cursor-pointer group"
      style={{
        padding: 0,
        ...(isNew ? { boxShadow: '0 0 0 2px rgba(16,185,129,0.4)' } : {}),
      }}
      onClick={() => router.push(`/startup/investors/${match.investor_id}`)}
    >
      {/* Score accent bar */}
      <div
        className="h-[3px] w-full"
        style={{
          background: `linear-gradient(90deg, ${getScoreColor(frictionlessScore)}, transparent)`,
          opacity: 0.5,
        }}
      />

      <div className="p-5">
        {/* Top section: Logo + Name + Score */}
        <div className="flex items-start gap-4">
          {/* Logo */}
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden shrink-0"
            style={{ background: 'var(--fi-bg-secondary)', border: '1px solid var(--fi-border)' }}
          >
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
                    span.className = 'text-base font-bold';
                    span.style.color = 'var(--fi-text-muted)';
                    span.textContent = getInitials(name);
                    parent.appendChild(span);
                  }
                }}
              />
            ) : (
              <span className="text-base font-bold" style={{ color: 'var(--fi-text-muted)' }}>
                {getInitials(name)}
              </span>
            )}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h3
                className="text-base font-semibold truncate leading-snug transition-colors"
                style={{ color: 'var(--fi-text-primary)' }}
              >
                {name}
              </h3>
              {isCustom && (
                <span
                  className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                  style={{
                    background: 'rgba(16,185,129,0.1)',
                    color: 'var(--fi-primary)',
                    border: '1px solid rgba(16,185,129,0.2)',
                  }}
                >
                  Added
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {inv?.investor_type && (
                <span className="text-sm capitalize flex items-center gap-1.5" style={{ color: 'var(--fi-text-muted)' }}>
                  <Building2 className="w-3.5 h-3.5" />
                  {String(inv.investor_type).replace(/_/g, ' ')}
                </span>
              )}
              {location && (
                <span className="text-sm flex items-center gap-1.5" style={{ color: 'var(--fi-text-muted)' }}>
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[160px]">{location}</span>
                </span>
              )}
            </div>
          </div>

          {/* Frictionless Score Gauge */}
          <ScoreGauge score={frictionlessScore} size="sm" showLabel={false} animated />
        </div>

        {/* Frictionless Score label */}
        <div className="flex items-center justify-end mt-1">
          <span
            className="text-[10px] font-semibold tracking-wider uppercase"
            style={{ color: getScoreColor(frictionlessScore) }}
          >
            {getScoreLabel(frictionlessScore)}
          </span>
        </div>

        {/* Pills row: eligible + stages + check size */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {match.eligible ? (
            <span
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
              style={{
                background: 'rgba(16,185,129,0.08)',
                color: 'var(--fi-score-excellent)',
                border: '1px solid rgba(16,185,129,0.15)',
              }}
            >
              <CheckCircle2 className="w-3 h-3" />
              Eligible
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
              style={{
                background: 'var(--fi-bg-secondary)',
                color: 'var(--fi-text-muted)',
                border: '1px solid var(--fi-border)',
              }}
            >
              <XCircle className="w-3 h-3" />
              Not Eligible
            </span>
          )}
          {stages.map((s) => (
            <span
              key={String(s)}
              className="text-xs font-medium px-2.5 py-1 rounded-full capitalize"
              style={{
                background: 'rgba(16,185,129,0.05)',
                color: 'var(--fi-primary)',
                border: '1px solid rgba(16,185,129,0.1)',
              }}
            >
              {String(s).replace(/_/g, ' ')}
            </span>
          ))}
          {(inv?.check_min_usd || inv?.check_max_usd) && (
            <span className="text-xs flex items-center gap-1 ml-auto font-medium" style={{ color: 'var(--fi-text-muted)' }}>
              <DollarSign className="w-3.5 h-3.5" />
              {formatUsd(inv.check_min_usd)}&ndash;{formatUsd(inv.check_max_usd)}
            </span>
          )}
        </div>

        {/* Focus area tags */}
        {sectors.length > 0 && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {sectors.slice(0, 3).map((s) => (
              <span
                key={String(s)}
                className="text-[11px] font-medium px-2 py-0.5 rounded-md"
                style={{
                  background: 'var(--fi-bg-secondary)',
                  color: 'var(--fi-text-muted)',
                  border: '1px solid var(--fi-border)',
                }}
              >
                {String(s)}
              </span>
            ))}
            {sectors.length > 3 && (
              <span className="text-[11px] font-medium" style={{ color: 'var(--fi-text-muted)' }}>
                +{sectors.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Sub-scores as compact inline bars */}
        {topSignals.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            {topSignals.map((s) => (
              <div key={s.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>{s.label}</span>
                  <span className="text-xs font-mono font-semibold" style={{ color: getScoreColor(s.pct) }}>{s.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--fi-bg-tertiary)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: getScoreColor(s.pct) }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(s.pct, 100)}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI Reasoning (from DB) or top-reason bullets */}
        {aiReasoning ? (
          <p
            className="text-xs leading-relaxed mt-3 line-clamp-2"
            style={{ color: 'var(--fi-text-muted)', fontStyle: 'italic' }}
          >
            {aiReasoning}
          </p>
        ) : topReasons.length > 0 ? (
          <div className="mt-3 space-y-1.5">
            {topReasons.slice(0, 2).map((reason, i) => (
              <p key={i} className="text-xs flex items-start gap-2 leading-relaxed" style={{ color: 'var(--fi-text-muted)' }}>
                <span
                  className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: match.eligible ? 'var(--fi-score-excellent)' : 'var(--fi-score-need-improvement)' }}
                />
                <span className="line-clamp-1">{reason}</span>
              </p>
            ))}
          </div>
        ) : null}

        {/* Expandable breakdown */}
        {Object.keys(breakdown).length > 0 && (
          <div className="mt-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="flex items-center gap-1.5 text-xs transition-colors"
              style={{ color: 'var(--fi-text-muted)', opacity: 0.6 }}
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
        <div
          className="flex items-center justify-end gap-1.5 mt-4 pt-3"
          style={{ borderTop: '1px solid var(--fi-border)' }}
        >
          <span
            className="text-xs font-medium transition-colors"
            style={{ color: 'var(--fi-primary)', opacity: 0.6 }}
          >
            View Profile
          </span>
          <ArrowRight
            className="w-3.5 h-3.5 transition-all"
            style={{ color: 'var(--fi-primary)', opacity: 0.4 }}
          />
        </div>
      </div>
    </motion.div>
  );
}
