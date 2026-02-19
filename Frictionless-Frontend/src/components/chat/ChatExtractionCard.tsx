'use client';

import { motion } from 'framer-motion';
import { Database, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface ExtractedField {
  field: string;
  value: string;
}

interface ChatExtractionCardProps {
  content: string;
  fields?: ExtractedField[];
}

function formatFieldName(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/Arr\b/, 'ARR')
    .replace(/Mrr\b/, 'MRR')
    .replace(/Cac\b/, 'CAC')
    .replace(/Ltv\b/, 'LTV');
}

export function ChatExtractionCard({ content, fields }: ChatExtractionCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-md"
    >
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(16,185,129,0.02) 100%)',
          border: '1px solid rgba(16,185,129,0.2)',
        }}
      >
        <button
          onClick={() => fields?.length && setExpanded(!expanded)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(16,185,129,0.15)' }}
          >
            <Database className="w-4 h-4" style={{ color: 'var(--fi-primary)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold" style={{ color: 'var(--fi-primary)' }}>
              Data Saved to Profile
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--fi-text-muted)' }}>
              {content}
            </p>
          </div>
          {fields && fields.length > 0 && (
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4" style={{ color: 'var(--fi-text-muted)' }} />
            </motion.div>
          )}
        </button>

        {expanded && fields && fields.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="px-4 pb-3"
          >
            <div className="space-y-1 pt-1" style={{ borderTop: '1px solid rgba(16,185,129,0.15)' }}>
              {fields.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md"
                  style={{ background: 'rgba(16,185,129,0.04)' }}
                >
                  <span className="text-[11px] font-medium" style={{ color: 'var(--fi-text-muted)' }}>
                    {formatFieldName(f.field)}
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums" style={{ color: 'var(--fi-text-primary)' }}>
                    {f.value}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
