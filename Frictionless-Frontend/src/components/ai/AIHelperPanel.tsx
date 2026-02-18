'use client';

import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  Plus,
  FileText,
  Send,
  ListChecks,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

const QUICK_ACTIONS = [
  { label: 'Create or update a task', href: '/startup/readiness', icon: Plus, query: '?tab=tasks' },
  { label: 'Generate outreach draft', href: '/startup/chat', icon: Send, query: '?prompt=outreach' },
  { label: 'Summarize readiness gaps', href: '/startup/readiness', icon: ListChecks },
  { label: 'Prepare founder checklist', href: '/startup/readiness', icon: FileText, query: '?tab=tasks&view=checklist' },
];

interface AIHelperPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AIHelperPanel({ open, onClose }: AIHelperPanelProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50',
              'bg-card border-t border-border rounded-t-2xl shadow-2xl',
              'max-h-[70vh] flex flex-col',
              'safe-area-bottom'
            )}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">AI Helper</h2>
                  <p className="text-xs text-muted-foreground">
                    Context: {pathname?.replace(/\//g, ' › ') || 'Dashboard'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-sm text-muted-foreground mb-4">
                Do this for me — quick actions based on your current page:
              </p>
              <div className="space-y-2">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  const href = `${action.href}${action.query || ''}`;
                  return (
                    <Link
                      key={action.label}
                      href={href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl',
                        'border border-border bg-muted/30 hover:bg-muted/60',
                        'text-foreground transition-colors group'
                      )}
                    >
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="flex-1 text-sm font-medium">{action.label}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                    </Link>
                  );
                })}
              </div>

              <Link
                href="/startup/chat"
                onClick={onClose}
                className="mt-4 block w-full py-3 rounded-xl bg-primary text-primary-foreground text-center text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Open full AI chat
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
