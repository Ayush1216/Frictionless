'use client';

import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface TooltipInfoProps {
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function TooltipInfo({ text, position = 'top' }: TooltipInfoProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [adjustedAlign, setAdjustedAlign] = useState<'center' | 'right' | 'left'>('center');

  // Check if tooltip would overflow viewport and adjust alignment
  useEffect(() => {
    if (!open || !containerRef.current || !tooltipRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    // Check right overflow
    if (containerRect.left + tooltipRect.width / 2 > viewportWidth - 16) {
      setAdjustedAlign('right');
    }
    // Check left overflow
    else if (containerRect.left - tooltipRect.width / 2 < 16) {
      setAdjustedAlign('left');
    } else {
      setAdjustedAlign('center');
    }
  }, [open]);

  const getPositionStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {};

    if (position === 'top' || position === 'bottom') {
      if (position === 'top') base.bottom = 'calc(100% + 8px)';
      else base.top = 'calc(100% + 8px)';

      if (adjustedAlign === 'right') {
        base.right = 0;
        base.transform = undefined;
      } else if (adjustedAlign === 'left') {
        base.left = 0;
        base.transform = undefined;
      } else {
        base.left = '50%';
        base.transform = 'translateX(-50%)';
      }
    } else if (position === 'left') {
      base.right = 'calc(100% + 8px)';
      base.top = '50%';
      base.transform = 'translateY(-50%)';
    } else {
      base.left = 'calc(100% + 8px)';
      base.top = '50%';
      base.transform = 'translateY(-50%)';
    }

    return base;
  };

  const getArrowStyle = (): React.CSSProperties => {
    if (position === 'top') {
      if (adjustedAlign === 'right') return { bottom: -4, right: 8, transform: 'rotate(45deg)' };
      if (adjustedAlign === 'left') return { bottom: -4, left: 8, transform: 'rotate(45deg)' };
      return { bottom: -4, left: '50%', transform: 'translateX(-50%) rotate(45deg)' };
    }
    if (position === 'bottom') {
      if (adjustedAlign === 'right') return { top: -4, right: 8, transform: 'rotate(45deg)' };
      if (adjustedAlign === 'left') return { top: -4, left: 8, transform: 'rotate(45deg)' };
      return { top: -4, left: '50%', transform: 'translateX(-50%) rotate(45deg)' };
    }
    if (position === 'left') return { right: -4, top: '50%', transform: 'translateY(-50%) rotate(45deg)' };
    return { left: -4, top: '50%', transform: 'translateY(-50%) rotate(45deg)' };
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="inline-flex items-center justify-center shrink-0 rounded-full transition-all duration-200"
        style={{ color: open ? 'var(--fi-text-secondary)' : 'var(--fi-text-muted)' }}
      >
        <Info className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.92, y: position === 'top' ? 4 : position === 'bottom' ? -4 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            className="absolute z-50 pointer-events-none"
            style={{
              ...getPositionStyle(),
              width: 'max-content',
              maxWidth: 260,
            }}
          >
            <div
              className="relative px-3 py-2 rounded-lg text-xs leading-relaxed"
              style={{
                background: 'var(--fi-bg-tertiary)',
                color: 'var(--fi-text-primary)',
                border: '1px solid var(--fi-border)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.04)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {text}
              <div
                className="absolute w-2 h-2"
                style={{
                  ...getArrowStyle(),
                  background: 'var(--fi-bg-tertiary)',
                  borderRight: '1px solid var(--fi-border)',
                  borderBottom: '1px solid var(--fi-border)',
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
