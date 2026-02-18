'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ExpandableTextProps {
  text: string | undefined | null;
  clampLines?: number;
  emptyPlaceholder?: string;
  className?: string;
}

/**
 * Long text with Read more / Read less. Prevents card stretching.
 */
export function ExpandableText({
  text,
  clampLines = 4,
  emptyPlaceholder = '—',
  className,
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const content = (text || '').trim() || emptyPlaceholder;
  const needsToggle = content.length > 120;

  return (
    <div className={cn('flex flex-col min-w-0', className)}>
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
          className="mt-2 text-xs font-medium text-primary hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded self-start inline-flex items-center gap-1"
        >
          {expanded ? (
            <>
              Read less <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              Read more <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
