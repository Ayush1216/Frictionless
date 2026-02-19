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

function confidenceColor(confidence: number): string {
  if (confidence >= 0.85) return 'var(--fi-score-excellent)';
  if (confidence >= 0.6) return 'var(--fi-score-good)';
  return 'var(--fi-score-need-improvement)';
}

export function AIExtractionCard({ extractions, onAcceptAll, onEdit, onReject, className }: AIExtractionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn('fi-card p-5 space-y-4', className)}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(16,185,129,0.1)' }}
        >
          <Sparkles className="w-4 h-4" style={{ color: 'var(--fi-primary)' }} />
        </div>
        <div>
          <h4 className="text-sm font-semibold" style={{ color: 'var(--fi-text-primary)' }}>Extracted Data</h4>
          <p className="text-[11px]" style={{ color: 'var(--fi-text-muted)' }}>AI-extracted fields from your document</p>
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
              <span className="text-xs font-medium" style={{ color: 'var(--fi-text-muted)' }}>
                {extraction.field}
              </span>
              <span
                className="text-[11px] font-semibold"
                style={{ color: confidenceColor(extraction.confidence) }}
              >
                {Math.round(extraction.confidence * 100)}%
              </span>
            </div>
            <div className="text-sm font-medium" style={{ color: 'var(--fi-text-primary)' }}>
              {String(extraction.value ?? '\u2014')}
            </div>
            {/* Confidence bar */}
            <div
              className="h-1 rounded-full overflow-hidden"
              style={{ background: 'var(--fi-bg-tertiary)' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: confidenceColor(extraction.confidence) }}
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
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: 'rgba(16,185,129,0.1)',
            color: 'var(--fi-score-excellent)',
            border: '1px solid rgba(16,185,129,0.2)',
          }}
        >
          <Check className="w-4 h-4" />
          Accept All
        </button>
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: 'var(--fi-bg-secondary)',
            color: 'var(--fi-text-primary)',
            border: '1px solid var(--fi-border)',
          }}
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>
        <button
          onClick={onReject}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: 'rgba(239,68,68,0.06)',
            color: 'var(--fi-score-need-improvement)',
            border: '1px solid rgba(239,68,68,0.15)',
          }}
        >
          <X className="w-4 h-4" />
          Reject
        </button>
      </div>
    </motion.div>
  );
}
