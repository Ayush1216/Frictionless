'use client';

import { motion } from 'framer-motion';
import { Brain, Zap, Shield, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const floatingIcons = [
  { Icon: Brain, x: '15%', y: '20%', delay: 0 },
  { Icon: Zap, x: '75%', y: '15%', delay: 0.5 },
  { Icon: Shield, x: '25%', y: '70%', delay: 1 },
  { Icon: TrendingUp, x: '80%', y: '65%', delay: 1.5 },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel - gradient brand imagery (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-obsidian-950">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-neon-gradient opacity-20 animated-gradient" />
        <div className="absolute inset-0 bg-mesh-gradient" />

        {/* Floating icons */}
        {floatingIcons.map(({ Icon, x, y, delay }, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: x, top: y }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.15, scale: 1 }}
            transition={{ delay, duration: 0.8, ease: 'easeOut' }}
          >
            <motion.div
              animate={{ y: [-8, 8, -8] }}
              transition={{
                duration: 4 + i,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Icon className="w-12 h-12 text-white" />
            </motion.div>
          </motion.div>
        ))}

        {/* Brand content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-neon-gradient flex items-center justify-center shadow-glow">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-display font-bold text-white">
              Frictionless
            </span>
          </Link>

          {/* Center tagline */}
          <div className="space-y-6">
            <motion.h1
              className="text-4xl xl:text-5xl font-display font-bold text-white leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              AI-Powered
              <br />
              <span className="gradient-text">Investment Intelligence</span>
            </motion.h1>
            <motion.p
              className="text-lg text-obsidian-300 max-w-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Score your startup&apos;s investment readiness, get matched with
              ideal investors, and accelerate your fundraising journey.
            </motion.p>

            {/* Feature pills */}
            <motion.div
              className="flex flex-wrap gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              {['Readiness Scoring', 'Investor Matching', 'AI Chat', 'Data Room'].map(
                (feature) => (
                  <span
                    key={feature}
                    className="px-3 py-1.5 rounded-full text-sm font-medium bg-white/10 text-white/80 border border-white/10"
                  >
                    {feature}
                  </span>
                )
              )}
            </motion.div>
          </div>

          {/* Bottom testimonial */}
          <motion.div
            className="glass-card p-6 max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <p className="text-obsidian-200 text-sm italic leading-relaxed">
              &ldquo;Frictionless Intelligence helped us identify the right
              investors and close our Series A 3 months faster than expected.&rdquo;
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-electric-blue/20 flex items-center justify-center text-xs font-bold text-electric-blue">
                JK
              </div>
              <div>
                <p className="text-sm font-medium text-white">Jason Kim</p>
                <p className="text-xs text-obsidian-400">CEO, DataFlow AI</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right panel - form area */}
      <div className="flex-1 flex flex-col bg-background relative">
        {/* Theme toggle - top right */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <ThemeToggle size="md" />
        </div>

        {/* Mobile header */}
        <div className="lg:hidden">
          <div className="relative overflow-hidden bg-card px-6 py-8">
            <div className="absolute inset-0 bg-neon-gradient opacity-10 animated-gradient" />
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neon-gradient flex items-center justify-center shadow-glow">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-display font-bold text-white">
                Frictionless Intelligence
              </span>
            </div>
          </div>
        </div>

        {/* Form content */}
        <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-12">
          <motion.div
            className="w-full max-w-md"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
