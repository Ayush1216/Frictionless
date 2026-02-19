'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn('flex flex-col items-center justify-center py-16 px-6 text-center', className)}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--fi-bg-secondary)', border: '1px solid var(--fi-border)' }}
      >
        <Icon className="w-8 h-8" style={{ color: 'var(--fi-text-muted)' }} />
      </div>
      <h3 className="text-lg font-display font-semibold mb-1" style={{ color: 'var(--fi-text-primary)' }}>{title}</h3>
      {description && (
        <p className="text-sm max-w-sm" style={{ color: 'var(--fi-text-muted)' }}>{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="fi-btn fi-btn-primary mt-4"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
