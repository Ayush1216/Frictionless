'use client';

import { Search, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InvestorFilterValues {
  scoreMin: number;
  scoreMax: number;
  eligibleOnly: boolean;
  search: string;
  sortBy: 'score_desc' | 'score_asc' | 'name_asc';
}

interface InvestorFiltersProps {
  filters: InvestorFilterValues;
  onChange: (filters: Partial<InvestorFilterValues>) => void;
  totalCount: number;
  filteredCount: number;
}

function getScoreLabel(score: number): string {
  if (score >= 86) return 'Excellent';
  if (score >= 80) return 'Good';
  return 'All';
}

function getScoreColor(score: number): string {
  if (score >= 86) return '#10B981';
  if (score >= 80) return '#EAB308';
  return '#9CA3AF';
}

export function InvestorFilters({ filters, onChange, totalCount, filteredCount }: InvestorFiltersProps) {
  return (
    <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 xl:-mx-10 xl:px-10 py-4 border-b border-border/40">
      <div className="flex flex-col gap-3">
        {/* Row 1: Search + count */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Search investors..."
              value={filters.search}
              onChange={(e) => onChange({ search: e.target.value })}
              className={cn(
                'w-full pl-10 pr-4 py-2.5 rounded-xl text-sm',
                'bg-muted/40 border border-border/40',
                'placeholder:text-muted-foreground/40',
                'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30',
                'transition-all'
              )}
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
            <SlidersHorizontal className="w-4 h-4" />
            <span className="font-semibold text-foreground tabular-nums">{filteredCount}</span>
            <span>of {totalCount}</span>
          </div>
        </div>

        {/* Row 2: Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Min score slider */}
          <div className="flex items-center gap-3 bg-muted/30 rounded-xl px-4 py-2 border border-border/30">
            <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Min score</label>
            <input
              type="range"
              min={0}
              max={100}
              value={filters.scoreMin}
              onChange={(e) => onChange({ scoreMin: Number(e.target.value) })}
              className="w-24 lg:w-32 h-1.5 accent-primary cursor-pointer"
            />
            <span className="flex items-center gap-1.5 min-w-[4rem]">
              <span className="text-sm font-mono font-bold tabular-nums" style={{ color: getScoreColor(filters.scoreMin) }}>
                {filters.scoreMin}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {getScoreLabel(filters.scoreMin)}
              </span>
            </span>
          </div>

          {/* Eligible toggle */}
          <button
            onClick={() => onChange({ eligibleOnly: !filters.eligibleOnly })}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all border',
              filters.eligibleOnly
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-muted/30 text-muted-foreground border-border/30 hover:bg-muted/50'
            )}
          >
            <div className={cn(
              'w-3.5 h-3.5 rounded-full border-2 transition-all flex items-center justify-center',
              filters.eligibleOnly ? 'border-emerald-500 bg-emerald-500' : 'border-muted-foreground/30'
            )}>
              {filters.eligibleOnly && (
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </div>
            Eligible only
          </button>

          {/* Sort dropdown */}
          <div className="relative ml-auto">
            <select
              value={filters.sortBy}
              onChange={(e) => onChange({ sortBy: e.target.value as InvestorFilterValues['sortBy'] })}
              className={cn(
                'appearance-none text-xs font-medium',
                'bg-muted/30 border border-border/30 rounded-xl',
                'pl-4 pr-8 py-2 text-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer',
                'transition-all hover:bg-muted/50'
              )}
            >
              <option value="score_desc">Score: High → Low</option>
              <option value="score_asc">Score: Low → High</option>
              <option value="name_asc">Name: A → Z</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
