'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export interface MatchFilterValues {
  scoreMin: number;
  scoreMax: number;
  stages: string[];
  sectors: string[];
  status: string;
  sortBy: string;
}

interface MatchFiltersProps {
  filters: MatchFilterValues;
  onChange: (filters: MatchFilterValues) => void;
  totalCount: number;
  filteredCount: number;
}

const STAGES = [
  { value: 'pre_seed', label: 'Pre-Seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series_a', label: 'Series A' },
  { value: 'series_b', label: 'Series B' },
  { value: 'series_c', label: 'Series C' },
];

const STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'saved', label: 'Saved' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'passed', label: 'Passed' },
];

const SORT_OPTIONS = [
  { value: 'score_desc', label: 'Highest Score' },
  { value: 'score_asc', label: 'Lowest Score' },
  { value: 'date_desc', label: 'Newest First' },
  { value: 'date_asc', label: 'Oldest First' },
  { value: 'name_asc', label: 'Name A–Z' },
];

function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
        active
          ? 'bg-electric-blue/15 text-electric-blue border-electric-blue/30'
          : 'bg-obsidian-800/50 text-muted-foreground border-obsidian-600/30 hover:border-obsidian-500'
      )}
    >
      {label}
    </button>
  );
}

function FilterContent({
  filters,
  onChange,
}: {
  filters: MatchFilterValues;
  onChange: (filters: MatchFilterValues) => void;
}) {
  const toggleStage = (stage: string) => {
    const stages = filters.stages.includes(stage)
      ? filters.stages.filter((s) => s !== stage)
      : [...filters.stages, stage];
    onChange({ ...filters, stages });
  };

  const clearAll = () => {
    onChange({
      scoreMin: 0,
      scoreMax: 100,
      stages: [],
      sectors: [],
      status: 'all',
      sortBy: 'score_desc',
    });
  };

  const hasFilters =
    filters.stages.length > 0 ||
    filters.status !== 'all' ||
    filters.scoreMin > 0 ||
    filters.scoreMax < 100;

  return (
    <div className="space-y-5">
      {/* Score range */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
          Score Range
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={filters.scoreMin}
            onChange={(e) =>
              onChange({ ...filters, scoreMin: Number(e.target.value) })
            }
            className="flex-1 accent-electric-blue"
          />
          <span className="text-sm text-foreground tabular-nums w-16 text-center">
            {filters.scoreMin}–{filters.scoreMax}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={filters.scoreMax}
            onChange={(e) =>
              onChange({ ...filters, scoreMax: Number(e.target.value) })
            }
            className="flex-1 accent-electric-blue"
          />
        </div>
      </div>

      {/* Stage filter */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
          Stage Preference
        </label>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((s) => (
            <ToggleChip
              key={s.value}
              label={s.label}
              active={filters.stages.includes(s.value)}
              onClick={() => toggleStage(s.value)}
            />
          ))}
        </div>
      </div>

      {/* Status filter */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
          Status
        </label>
        <Select
          value={filters.status}
          onValueChange={(v) => onChange({ ...filters, status: v })}
        >
          <SelectTrigger className="bg-obsidian-800/60 border-obsidian-600/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sort */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
          Sort By
        </label>
        <Select
          value={filters.sortBy}
          onValueChange={(v) => onChange({ ...filters, sortBy: v })}
        >
          <SelectTrigger className="bg-obsidian-800/60 border-obsidian-600/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear all */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="text-muted-foreground hover:text-foreground gap-1"
        >
          <X className="w-3.5 h-3.5" />
          Clear All Filters
        </Button>
      )}
    </div>
  );
}

export function MatchFilters({
  filters,
  onChange,
  totalCount,
  filteredCount,
}: MatchFiltersProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const hasFilters =
    filters.stages.length > 0 ||
    filters.status !== 'all' ||
    filters.scoreMin > 0 ||
    filters.scoreMax < 100;

  return (
    <>
      {/* Desktop: horizontal bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="hidden lg:block glass-card p-4"
      >
        <FilterContent filters={filters} onChange={onChange} />
        {filteredCount !== totalCount && (
          <p className="text-xs text-muted-foreground mt-3">
            Showing {filteredCount} of {totalCount} matches
          </p>
        )}
      </motion.div>

      {/* Mobile: sheet trigger + bottom sheet */}
      <div className="lg:hidden flex items-center gap-3">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-obsidian-600/50 bg-obsidian-800/60"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {hasFilters && (
                <Badge className="bg-electric-blue/20 text-electric-blue border-none text-[10px] px-1.5 h-4">
                  {filters.stages.length + (filters.status !== 'all' ? 1 : 0)}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="bg-obsidian-900 border-obsidian-700 rounded-t-2xl max-h-[80vh] overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle>Filter Matches</SheetTitle>
              <SheetDescription>
                Narrow down your investor matches
              </SheetDescription>
            </SheetHeader>
            <FilterContent filters={filters} onChange={onChange} />
          </SheetContent>
        </Sheet>

        {/* Sort select on mobile */}
        <Select
          value={filters.sortBy}
          onValueChange={(v) => onChange({ ...filters, sortBy: v })}
        >
          <SelectTrigger className="w-[140px] bg-obsidian-800/60 border-obsidian-600/50 h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filteredCount !== totalCount && (
          <span className="text-xs text-muted-foreground">
            {filteredCount}/{totalCount}
          </span>
        )}
      </div>
    </>
  );
}
