'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AIFloatingButtonProps {
  onClick?: () => void;
  className?: string;
}

export function AIFloatingButton({ onClick, className }: AIFloatingButtonProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            onClick={onClick}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className={cn(
              'fixed bottom-6 right-6 z-40',
              'sm:bottom-8 sm:right-8',
              'max-sm:bottom-24',
              'group',
              className
            )}
          >
            {/* Subtle blur glow behind the logo */}
            <div
              className="absolute inset-[-8px] rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"
              style={{ background: 'var(--fi-primary)', opacity: 0.1 }}
            />

            {/* Frosted glass circle */}
            <div
              className={cn(
                'relative w-14 h-14 rounded-full',
                'flex items-center justify-center',
                'backdrop-blur-xl',
                'shadow-lg',
                'group-hover:shadow-xl',
                'transition-all duration-300',
                'overflow-hidden',
              )}
              style={{
                background: 'color-mix(in srgb, var(--fi-bg) 60%, transparent)',
                border: '1px solid var(--fi-border)',
              }}
            >
              <Image
                src="/ai-logo.png"
                alt="Frictionless Intelligence"
                width={384}
                height={384}
                className="w-10 h-10 object-contain relative z-10"
              />
            </div>
          </motion.button>
        </TooltipTrigger>
        <TooltipContent
          side="left"
          sideOffset={16}
          className="hidden sm:block"
          style={{
            background: 'var(--fi-bg-card)',
            border: '1px solid var(--fi-border)',
            color: 'var(--fi-text-primary)',
          }}
        >
          <div className="flex items-center gap-2">
            <span>Frictionless Intelligence</span>
            <kbd
              className="text-[10px] px-1.5 py-0.5 rounded font-mono"
              style={{
                background: 'var(--fi-bg-secondary)',
                border: '1px solid var(--fi-border)',
                color: 'var(--fi-text-muted)',
              }}
            >
              ⌘J
            </kbd>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
