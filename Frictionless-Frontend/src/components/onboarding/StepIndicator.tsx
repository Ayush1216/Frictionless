'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isActive = idx === currentStep;

          return (
            <div key={idx} className="flex items-center flex-1 last:flex-initial">
              {/* Step circle + label */}
              <div className="flex flex-col items-center">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    backgroundColor: isCompleted
                      ? '#10B981'
                      : isActive
                        ? '#3B82F6'
                        : '#374151',
                    borderColor: isCompleted
                      ? '#10B981'
                      : isActive
                        ? '#3B82F6'
                        : '#4B5563',
                  }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center border-2 relative z-10',
                    isActive && 'shadow-glow'
                  )}
                >
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <Check className="w-4 h-4 text-white" />
                    </motion.div>
                  ) : (
                    <span
                      className={cn(
                        'text-xs font-mono font-bold',
                        isActive ? 'text-white' : 'text-obsidian-400'
                      )}
                    >
                      {idx + 1}
                    </span>
                  )}
                </motion.div>
                <span
                  className={cn(
                    'mt-2 text-[10px] sm:text-xs font-medium text-center max-w-[60px] sm:max-w-[80px] leading-tight',
                    isActive
                      ? 'text-electric-blue'
                      : isCompleted
                        ? 'text-score-excellent'
                        : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 rounded-full bg-obsidian-700 relative -mt-5 sm:-mt-4">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-score-excellent"
                    initial={false}
                    animate={{ width: isCompleted ? '100%' : '0%' }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
