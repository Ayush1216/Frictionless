'use client';

import { useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  ArrowRight,
  Rocket,
  TrendingUp,
  Building2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { Hero } from '@/components/marketing/Hero';
import { FeatureBento } from '@/components/marketing/FeatureBento';
import { LogoMarquee } from '@/components/marketing/LogoMarquee';
import { TestimonialCarousel } from '@/components/marketing/TestimonialCarousel';

/* ═══════════════════════════════════════════
   ROLE TABS SECTION
   ═══════════════════════════════════════════ */
const roles = [
  {
    id: 'startups',
    label: 'For Startups',
    icon: Rocket,
    headline: 'Raise your next round with confidence',
    description:
      'Get a clear picture of your investment Frictionless, connect with the right investors, and close your round faster than ever.',
    bullets: [
      'AI-powered Frictionless score across 12 dimensions',
      'Smart investor matching based on your stage & sector',
      'Automated task engine to stay fundraise-ready',
      'Secure data room with real-time analytics',
    ],
    mockupGradient: 'from-electric-blue/20 to-electric-cyan/20',
    mockupLabel: 'Startup Dashboard',
  },
  {
    id: 'investors',
    label: 'For Investors',
    icon: TrendingUp,
    headline: 'Discover your next portfolio winner',
    description:
      'Access pre-scored deal flow that matches your thesis. Spend less time sourcing and more time on deals that matter.',
    bullets: [
      'Pre-qualified deal flow matched to your thesis',
      'Standardized startup scoring for quick evaluation',
      'Portfolio monitoring and analytics',
      'Direct access to vetted data rooms',
    ],
    mockupGradient: 'from-electric-purple/20 to-electric-blue/20',
    mockupLabel: 'Investor Portal',
  },
  {
    id: 'accelerators',
    label: 'For Accelerators',
    icon: Building2,
    headline: 'Scale your portfolio support',
    description:
      'Give your cohort startups the tools they need to raise successfully. Track progress and drive outcomes at scale.',
    bullets: [
      'Cohort-wide Frictionless tracking dashboard',
      'Automated mentor and investor introductions',
      'Bulk assessment and benchmarking tools',
      'White-label options for your brand',
    ],
    mockupGradient: 'from-electric-cyan/20 to-score-excellent/20',
    mockupLabel: 'Accelerator Hub',
  },
];

function RoleTabsSection() {
  const [activeRole, setActiveRole] = useState('startups');
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const role = roles.find((r) => r.id === activeRole)!;

  return (
    <section ref={ref} className="role-tabs-section py-20 md:py-32 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-4">
            Built for <span className="gradient-text">every side</span> of the table
          </h2>
          <p className="role-tabs-subtitle text-obsidian-400 text-base md:text-lg max-w-2xl mx-auto font-body">
            Whether you&apos;re raising, investing, or accelerating — we&apos;ve got you covered.
          </p>
        </motion.div>

        {/* Tab buttons */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-12 md:mb-16"
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          {roles.map((r) => {
            const Icon = r.icon;
            return (
              <button
                key={r.id}
                onClick={() => setActiveRole(r.id)}
                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-display font-semibold transition-all duration-300 w-full sm:w-auto justify-center ${
                  activeRole === r.id
                    ? 'role-tabs-btn-active text-white bg-white/10 shadow-lg'
                    : 'role-tabs-btn-inactive text-obsidian-400 hover:text-obsidian-200 hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {r.label}
                {activeRole === r.id && (
                  <motion.div
                    layoutId="activeRoleTab"
                    className="absolute inset-0 rounded-xl border border-electric-blue/30"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </motion.div>

        {/* Tab content */}
        <motion.div
          key={activeRole}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center"
        >
          {/* Text side */}
          <div>
            <h3 className="role-tabs-headline text-2xl md:text-3xl font-display font-bold text-white mb-4">
              {role.headline}
            </h3>
            <p className="role-tabs-desc text-obsidian-400 font-body mb-8 leading-relaxed">
              {role.description}
            </p>
            <ul className="space-y-4">
              {role.bullets.map((bullet, i) => (
                <motion.li
                  key={bullet}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 + 0.2 }}
                  className="flex items-start gap-3 text-sm md:text-base font-body"
                >
                  <CheckCircle2 className="w-5 h-5 text-electric-blue mt-0.5 flex-shrink-0" />
                  <span className="role-tabs-bullet text-obsidian-300">{bullet}</span>
                </motion.li>
              ))}
            </ul>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 mt-8 text-electric-blue hover:text-electric-cyan transition-colors font-display font-semibold text-sm"
            >
              Get started as {role.label.replace('For ', '').toLowerCase()}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mockup side */}
          <div
            className={`relative aspect-[4/3] rounded-2xl bg-gradient-to-br ${role.mockupGradient} border border-white/5 overflow-hidden`}
          >
            {/* Window chrome */}
            <div className="absolute top-0 left-0 right-0 h-10 bg-obsidian-800/80 border-b border-white/5 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="ml-3 text-xs text-obsidian-500 font-mono">
                {role.mockupLabel}
              </span>
            </div>

            {/* Placeholder content */}
            <div className="absolute inset-0 top-10 p-6 flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="flex-1 h-20 rounded-xl bg-white/5 skeleton-shimmer" />
                <div className="flex-1 h-20 rounded-xl bg-white/5 skeleton-shimmer" />
              </div>
              <div className="flex-1 rounded-xl bg-white/5 skeleton-shimmer" />
              <div className="flex gap-4">
                <div className="flex-1 h-16 rounded-xl bg-white/5 skeleton-shimmer" />
                <div className="flex-1 h-16 rounded-xl bg-white/5 skeleton-shimmer" />
                <div className="flex-1 h-16 rounded-xl bg-white/5 skeleton-shimmer" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   FINAL CTA SECTION
   ═══════════════════════════════════════════ */
function FinalCTA() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="py-20 md:py-32 px-4">
      <motion.div
        className="max-w-3xl mx-auto"
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
      >
        <div className="relative glass-card p-8 md:p-14 text-center overflow-hidden">
          {/* Background orbs */}
          <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-electric-blue/10 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-electric-purple/10 blur-3xl" />

          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={isInView ? { scale: 1, opacity: 1 } : {}}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="inline-flex p-3 rounded-2xl bg-neon-gradient mb-6"
            >
              <Sparkles className="w-6 h-6 text-white" />
            </motion.div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-4">
              Ready to <span className="gradient-text">raise smarter</span>?
            </h2>
            <p className="text-obsidian-400 font-body text-base md:text-lg mb-8 max-w-lg mx-auto">
              Join thousands of startups using Frictionless Intelligence to
              accelerate their fundraising journey.
            </p>

            {/* Email form */}
            <form
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-xl bg-obsidian-800/60 border border-obsidian-600/50 text-white placeholder:text-obsidian-500 focus:outline-none focus:ring-2 focus:ring-electric-blue/50 focus:border-electric-blue/50 font-body text-sm transition-all"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-neon-gradient animated-gradient text-white font-display font-semibold text-sm shadow-glow hover:shadow-glow-lg transition-shadow whitespace-nowrap"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="text-xs text-obsidian-600 mt-4 font-body">
              Free to start · No credit card required
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   HOMEPAGE
   ═══════════════════════════════════════════ */
export default function HomePage() {
  return (
    <>
      <Hero />
      <LogoMarquee />
      <FeatureBento />
      <RoleTabsSection />
      <TestimonialCarousel />
      <FinalCTA />
    </>
  );
}
