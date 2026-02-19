import type { Variants } from 'framer-motion';

// ─── Shared cascade animation variants ───
// Each section fades-up on scroll via useInView

export const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: [0.23, 1, 0.32, 1] },
  },
};

export const chipVariants: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: 1.4 + i * 0.1, duration: 0.3, ease: [0.34, 1.56, 0.64, 1] },
  }),
};

export const cardHover: Variants = {
  rest: {
    y: 0,
    scale: 1,
    boxShadow: 'var(--fi-shadow-sm)',
    transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] },
  },
  hover: {
    y: -6,
    scale: 1.015,
    boxShadow: 'var(--fi-shadow-xl)',
    transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] },
  },
};

export const barFill: Variants = {
  hidden: { width: '0%' },
  visible: (pct: number) => ({
    width: `${pct}%`,
    transition: { duration: 0.8, ease: [0.33, 1, 0.68, 1], delay: 0.3 },
  }),
};
