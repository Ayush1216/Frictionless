'use client';

import { Search, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getScoreColor, getScoreLabel } from '@/lib/scores';
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

export function InvestorFilters({ filters, onChange, totalCount, filteredCount }: InvestorFiltersProps) {
  return (
    <div
      className="sticky top-0 z-10 backdrop-blur-xl -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 xl:-mx-10 xl:px-10 py-4"
      style={{ background: 'color-mix(in srgb, var(--fi-bg) 80%, transparent)', borderBottom: '1px solid var(--fi-border)' }}
    >
      <div className="flex flex-col gap-3">
        {/* Row 1: Search + count */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--fi-text-muted)', opacity: 0.5 }} />
            <input
              type="text"
              placeholder="Search investors by name..."
              value={filters.search}
              onChange={(e) => onChange({ search: e.target.value })}
              className={cn(
                'w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all',
                'focus:outline-none',
              )}
              style={{
                background: 'var(--fi-bg-secondary)',
                border: '1px solid var(--fi-border)',
                color: 'var(--fi-text-primary)',
              }}
            />
          </div>
          <div className="flex items-center gap-2 text-sm ml-auto" style={{ color: 'var(--fi-text-muted)' }}>
            <SlidersHorizontal className="w-4 h-4" />
            <span className="font-semibold tabular-nums" style={{ color: 'var(--fi-text-primary)' }}>{filteredCount}</span>
            <span>of {totalCount}</span>
          </div>
        </div>

        {/* Row 2: Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Min score slider */}
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-2"
            style={{ background: 'var(--fi-bg-secondary)', border: '1px solid var(--fi-border)' }}
          >
            <label className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--fi-text-muted)' }}>Min score</label>
            <input
              type="range"
              min={0}
              max={100}
              value={filters.scoreMin}
              onChange={(e) => onChange({ scoreMin: Number(e.target.value) })}
              className="w-24 lg:w-32 h-1.5 cursor-pointer"
              style={{ accentColor: 'var(--fi-primary)' }}
            />
            <span className="flex items-center gap-1.5 min-w-[4rem]">
              <span className="text-sm font-mono font-bold tabular-nums" style={{ color: getScoreColor(filters.scoreMin) }}>
                {filters.scoreMin}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--fi-text-muted)' }}>
                {filters.scoreMin >= 80 ? 'Excellent' : filters.scoreMin >= 60 ? 'Good' : 'All'}
              </span>
            </span>
          </div>

          {/* Eligible toggle */}
          <button
            onClick={() => onChange({ eligibleOnly: !filters.eligibleOnly })}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all"
            style={{
              background: filters.eligibleOnly ? 'rgba(16,185,129,0.08)' : 'var(--fi-bg-secondary)',
              color: filters.eligibleOnly ? 'var(--fi-score-excellent)' : 'var(--fi-text-muted)',
              border: `1px solid ${filters.eligibleOnly ? 'rgba(16,185,129,0.2)' : 'var(--fi-border)'}`,
            }}
          >
            <div
              className="w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all"
              style={{
                border: `2px solid ${filters.eligibleOnly ? 'var(--fi-score-excellent)' : 'var(--fi-text-muted)'}`,
                background: filters.eligibleOnly ? 'var(--fi-score-excellent)' : 'transparent',
                opacity: filters.eligibleOnly ? 1 : 0.3,
              }}
            >
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
                'rounded-xl pl-4 pr-8 py-2',
                'focus:outline-none cursor-pointer transition-all'
              )}
              style={{
                background: 'var(--fi-bg-secondary)',
                border: '1px solid var(--fi-border)',
                color: 'var(--fi-text-primary)',
              }}
            >
              <option value="score_desc">Match Score: High → Low</option>
              <option value="score_asc">Match Score: Low → High</option>
              <option value="name_asc">Name: A → Z</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--fi-text-muted)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
