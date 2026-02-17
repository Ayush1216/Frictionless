'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MetaChipsProps {
  /** Already cleaned/deduped list for display */
  items: string[];
  variant?: 'keywords' | 'industries';
  className?: string;
  /** Optional label (e.g. "Keywords") - single label, no duplication */
  label?: string;
  /** Max chips visible before "+N more"; default 6 */
  maxVisible?: number;
}

/**
 * Chip/tag list for Keywords and Industries. Expects dedupe-ready (cleaned) input.
 * Clean typography, spacing, wrap. No redundant tags. Optional limit with "+N more".
 */
export function MetaChips({ items, variant = 'keywords', className, label, maxVisible = 6 }: MetaChipsProps) {
  if (items.length === 0) return null;

  const [expanded, setExpanded] = useState(false);
  const isIndustries = variant === 'industries';
  const showAll = expanded || items.length <= maxVisible;
  const visibleItems = showAll ? items : items.slice(0, maxVisible);
  const remaining = items.length - maxVisible;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {visibleItems.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className={cn(
              'inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium',
              'border transition-colors',
              isIndustries
                ? 'bg-electric-blue/10 text-electric-blue border-electric-blue/30'
                : 'bg-obsidian-700/60 text-foreground border-obsidian-600/50'
            )}
          >
            {item}
          </span>
        ))}
        {!showAll && remaining > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={cn(
              'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              'text-muted-foreground hover:text-foreground border-obsidian-600/50 hover:border-obsidian-500'
            )}
          >
            +{remaining} more
            <ChevronDown className="w-3 h-3" />
          </button>
        )}
        {showAll && items.length > maxVisible && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground"
          >
            Show less <ChevronUp className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
