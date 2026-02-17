'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEFAULT_CLAMP_LINES = 4;

export interface ProfileCardProps {
  title: string;
  icon?: LucideIcon;
  iconClassName?: string;
  children: React.ReactNode;
  /** Minimum height in rem for equalized grid (e.g. 12 = 12rem) */
  minHeightRem?: number;
  /** Optional className for the card container */
  className?: string;
  /** Optional header action (e.g. refresh button) */
  headerAction?: React.ReactNode;
}

export function ProfileCard({
  title,
  icon: Icon,
  iconClassName = 'text-electric-blue',
  children,
  minHeightRem,
  className,
  headerAction,
}: ProfileCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl border border-obsidian-700/50 bg-obsidian-900/40 overflow-hidden flex flex-col transition-shadow hover:shadow-lg hover:shadow-black/10',
        className
      )}
      style={minHeightRem != null ? { minHeight: `${minHeightRem}rem` } : undefined}
    >
      <div className="flex items-center justify-between gap-2 p-5 pb-3 border-b border-obsidian-700/30">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 truncate">
          {Icon && <Icon className={cn('w-5 h-5 shrink-0', iconClassName)} />}
          {title}
        </h3>
        {headerAction}
      </div>
      <div className="p-5 pt-4 flex-1 flex flex-col min-w-0">{children}</div>
    </motion.div>
  );
}

/** Use as children of ProfileCard for long text: clamp by default + Read more / Read less */
export function ProfileCardExpandableBody({
  text,
  clampLines = DEFAULT_CLAMP_LINES,
  emptyPlaceholder = '—',
}: {
  text: string | undefined | null;
  clampLines?: number;
  emptyPlaceholder?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const content = (text || '').trim() || emptyPlaceholder;
  const needsToggle = content.length > 120;

  return (
    <div className="flex flex-col min-w-0">
      {expanded ? (
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
          {content}
        </p>
      ) : (
        <p
          className="text-sm text-foreground/90 leading-relaxed break-words overflow-hidden"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: clampLines,
            WebkitBoxOrient: 'vertical',
            lineClamp: clampLines,
          }}
        >
          {content}
        </p>
      )}
      {needsToggle && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-xs font-medium text-electric-blue hover:text-electric-blue/80 focus:outline-none focus:ring-2 focus:ring-electric-blue/50 rounded self-start inline-flex items-center gap-1"
        >
          {expanded ? <>Read less <ChevronUp className="w-3.5 h-3.5" /></> : <>Read more <ChevronDown className="w-3.5 h-3.5" /></>}
        </button>
      )}
    </div>
  );
}
