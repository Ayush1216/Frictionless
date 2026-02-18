'use client';

import { motion } from 'framer-motion';
import {
  Mic,
  Users,
  Cpu,
  Settings,
  BarChart3,
  Megaphone,
  TrendingUp,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getScoreInfo } from '@/lib/score-utils';
import type { ParsedRubricCategory } from '@/lib/readiness-rubric';

interface ReadinessCategorySidebarProps {
  overallScore: number;
  categories: ParsedRubricCategory[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}

export function getCategoryIcon(name: string): React.ReactNode {
  const lower = name.toLowerCase();
  if (lower.includes('storytelling') || lower.includes('pitch') || lower.includes('comms')) return <Mic className="w-4 h-4" />;
  if (lower.includes('founder') || lower.includes('team')) return <Users className="w-4 h-4" />;
  if (lower.includes('product') || lower.includes('tech')) return <Cpu className="w-4 h-4" />;
  if (lower.includes('foundational') || lower.includes('setup')) return <Settings className="w-4 h-4" />;
  if (lower.includes('metric') || lower.includes('financial')) return <BarChart3 className="w-4 h-4" />;
  if (lower.includes('go-to-market') || lower.includes('gtm')) return <Megaphone className="w-4 h-4" />;
  if (lower.includes('traction') || lower.includes('validation')) return <TrendingUp className="w-4 h-4" />;
  if (lower.includes('market')) return <Globe className="w-4 h-4" />;
  return <BarChart3 className="w-4 h-4" />;
}

export function ReadinessCategorySidebar({
  overallScore,
  categories,
  selectedKey,
  onSelect,
}: ReadinessCategorySidebarProps) {
  const overallInfo = getScoreInfo(overallScore);

  return (
    <>
      {/* Desktop sidebar — expanded, fills parent height */}
      <div className="hidden lg:flex flex-col w-[280px] shrink-0 glass-card">
        {/* Overall score */}
        <div className="px-4 py-3 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Overall</span>
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', overallInfo.bgClass, overallInfo.textClass)}>
              {overallInfo.label}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-display font-bold text-foreground tabular-nums">{Math.round(overallScore)}</span>
            <div className={cn('w-2 h-2 rounded-full', overallInfo.dotClass)} />
          </div>
          <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${overallScore}%`, backgroundColor: overallInfo.color }} />
          </div>
        </div>

        {/* Category list — scrolls if needed */}
        <div className="py-1 flex-1 overflow-y-auto">
          {categories.map((cat, idx) => {
            const info = getScoreInfo(cat.score);
            const isSelected = selectedKey === cat.key;
            return (
              <motion.button
                key={cat.key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                onClick={() => onSelect(cat.key)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150',
                  isSelected
                    ? 'border-l-[3px] border-primary bg-primary/5'
                    : 'border-l-[3px] border-transparent hover:bg-muted/40'
                )}
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                  isSelected ? 'bg-primary/10 text-primary' : 'bg-muted/60 text-muted-foreground'
                )}>
                  {getCategoryIcon(cat.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={cn(
                    'text-sm truncate block transition-colors leading-tight',
                    isSelected ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'
                  )}>
                    {cat.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={cn('text-sm font-bold tabular-nums', info.textClass)}>{cat.score}</span>
                  <div className={cn('w-2 h-2 rounded-full', info.dotClass)} />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Mobile horizontal chip strip */}
      <div className="lg:hidden overflow-x-auto no-scrollbar -mx-4 px-4">
        <div className="flex gap-2 pb-3">
          {categories.map((cat) => {
            const info = getScoreInfo(cat.score);
            const isSelected = selectedKey === cat.key;
            return (
              <motion.button
                key={cat.key}
                onClick={() => onSelect(cat.key)}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors shrink-0',
                  isSelected
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-muted/30 text-muted-foreground border-border hover:text-foreground'
                )}
              >
                <div className={cn('w-1.5 h-1.5 rounded-full', info.dotClass)} />
                {cat.name}
                <span className={cn('tabular-nums', info.textClass)}>{cat.score}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </>
  );
}
