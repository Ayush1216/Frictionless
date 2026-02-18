'use client';

import { motion } from 'framer-motion';
import { Sparkles, Check, X, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIExtraction } from '@/types/database';

interface AIExtractionCardProps {
  extractions: AIExtraction[];
  onAcceptAll?: () => void;
  onEdit?: () => void;
  onReject?: () => void;
  className?: string;
}

function confidenceColor(confidence: number) {
  if (confidence >= 0.85) return 'bg-score-excellent';
  if (confidence >= 0.6) return 'bg-score-fair';
  return 'bg-score-poor';
}

function confidenceTextColor(confidence: number) {
  if (confidence >= 0.85) return 'text-score-excellent';
  if (confidence >= 0.6) return 'text-score-fair';
  return 'text-score-poor';
}

export function AIExtractionCard({ extractions, onAcceptAll, onEdit, onReject, className }: AIExtractionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'glass-card p-5 space-y-4',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-accent" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">Extracted Data</h4>
          <p className="text-[11px] text-muted-foreground">AI-extracted fields from your document</p>
        </div>
      </div>

      {/* Extraction fields */}
      <div className="space-y-3">
        {extractions.map((extraction, i) => (
          <motion.div
            key={extraction.field}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {extraction.field}
              </span>
              <span className={cn('text-[11px] font-semibold', confidenceTextColor(extraction.confidence))}>
                {Math.round(extraction.confidence * 100)}%
              </span>
            </div>
            <div className="text-sm text-foreground font-medium">
              {String(extraction.value ?? '—')}
            </div>
            {/* Confidence bar */}
            <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
              <motion.div
                className={cn('h-full rounded-full', confidenceColor(extraction.confidence))}
                initial={{ width: 0 }}
                animate={{ width: `${extraction.confidence * 100}%` }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={onAcceptAll}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-score-excellent/15 text-score-excellent border border-score-excellent/20 text-sm font-medium hover:bg-score-excellent/25 transition-colors"
        >
          <Check className="w-4 h-4" />
          Accept All
        </button>
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-muted/50 text-foreground border border-border/50 text-sm font-medium hover:bg-muted transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>
        <button
          onClick={onReject}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-sm font-medium hover:bg-destructive/20 transition-colors"
        >
          <X className="w-4 h-4" />
          Reject
        </button>
      </div>
    </motion.div>
  );
}
