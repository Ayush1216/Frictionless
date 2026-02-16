'use client';

import { useState, useEffect, useRef } from 'react';

export interface UseAnimatedCounterOptions {
  /** Duration of the animation in milliseconds */
  duration?: number;
  /** Easing function (0-1) -> (0-1). Default: easeOutQuart */
  easing?: (t: number) => number;
  /** Callback when animation completes */
  onComplete?: () => void;
}

const easeOutQuart = (t: number): number => 1 - (1 - t) ** 4;

export function useAnimatedCounter(
  target: number,
  options: UseAnimatedCounterOptions = {}
): number {
  const { duration = 1000, easing = easeOutQuart, onComplete } = options;
  const [value, setValue] = useState(0);
  const valueRef = useRef(0);
  valueRef.current = value;
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    startValueRef.current = valueRef.current;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easing(progress);
      const current = startValueRef.current + (target - startValueRef.current) * eased;
      setValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, easing, onComplete]);

  return Math.round(value * 100) / 100;
}
