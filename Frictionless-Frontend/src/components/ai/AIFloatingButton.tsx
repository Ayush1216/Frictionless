'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
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
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            onClick={onClick}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full',
              'bg-neon-gradient shadow-glow-lg',
              'flex items-center justify-center',
              'sm:bottom-8 sm:right-8',
              // On mobile, sit above the bottom nav
              'max-sm:bottom-24',
              className
            )}
          >
            {/* Pulse ring */}
            <motion.div
              className="absolute inset-0 rounded-full bg-electric-blue/20"
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            />
            <Sparkles className="w-6 h-6 text-white relative z-10" />
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={12} className="hidden sm:block">
          Chat with AI
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
