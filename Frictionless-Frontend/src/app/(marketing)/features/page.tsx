'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  Gauge,
  Users,
  MessageSquareText,
  ListChecks,
  FolderLock,
  BarChart3,
  ArrowRight,
  Shield,
  Zap,
  Globe,
} from 'lucide-react';
import Link from 'next/link';

const features = [
  {
    id: 'scoring',
    icon: Gauge,
    title: 'AI Frictionless Scoring',
    tagline: 'Know exactly where you stand',
    description:
      'Our proprietary AI engine evaluates your startup across 12 critical investment dimensions — from market opportunity and traction to team composition and financial health. Get a comprehensive score with actionable insights to improve before you approach investors.',
    highlights: [
      '12-dimension analysis framework',
      'Real-time score updates as you progress',
      'Peer benchmarking against similar startups',
      'Prioritized improvement recommendations',
    ],
    gradient: 'from-electric-blue to-electric-cyan',
    glowColor: 'rgba(59, 130, 246, 0.1)',
  },
  {
    id: 'matching',
    icon: Users,
    title: 'Smart Investor Matching',
    tagline: 'Find your perfect investor fit',
    description:
      'Stop cold-emailing investors who aren\'t a fit. Our matching algorithm analyzes thousands of data points — investment thesis, portfolio, check size, stage preference, sector focus — to connect you with investors most likely to say yes.',
    highlights: [
      'ML-powered compatibility scoring',
      'Filters by stage, sector, and geography',
      'Investor activity and responsiveness data',
      'Warm introduction pathways',
    ],
    gradient: 'from-electric-purple to-electric-blue',
    glowColor: 'rgba(139, 92, 246, 0.1)',
  },
  {
    id: 'ai-chat',
    icon: MessageSquareText,
    title: 'AI Chat Assistant',
    tagline: 'Your 24/7 fundraising advisor',
    description:
      'Get instant, contextual answers to your fundraising questions. Our AI assistant is trained on thousands of successful raises, investor preferences, and fundraising best practices. Ask about strategy, get pitch deck feedback, or draft investor emails.',
    highlights: [
      'Fundraising strategy guidance',
      'Pitch deck and financial model review',
      'Investor email drafting and templates',
      'Market research and competitive analysis',
    ],
    gradient: 'from-electric-cyan to-score-excellent',
    glowColor: 'rgba(6, 182, 212, 0.1)',
  },
  {
    id: 'tasks',
    icon: ListChecks,
    title: 'Smart Task Engine',
    tagline: 'Never miss a critical step',
    description:
      'Based on your Frictionless score and fundraising stage, our AI generates and prioritizes action items to keep your raise on track. From updating financials to following up with investors, every task is optimized for maximum impact.',
    highlights: [
      'AI-generated task priorities',
      'Stage-specific action items',
      'Deadline tracking and reminders',
      'Progress analytics and velocity metrics',
    ],
    gradient: 'from-score-fair to-electric-blue',
    glowColor: 'rgba(245, 158, 11, 0.1)',
  },
  {
    id: 'dataroom',
    icon: FolderLock,
    title: 'Secure Data Room',
    tagline: 'Investor-ready from day one',
    description:
      'Create beautiful, organized data rooms that investors love. Smart auto-categorization, granular permissions, watermarking, and real-time analytics tell you exactly who viewed what and for how long.',
    highlights: [
      'Smart auto-organization and tagging',
      'Granular viewer permissions',
      'Document watermarking and NDA tracking',
      'Real-time viewer analytics and heatmaps',
    ],
    gradient: 'from-score-excellent to-electric-cyan',
    glowColor: 'rgba(16, 185, 129, 0.1)',
  },
  {
    id: 'analytics',
    icon: BarChart3,
    title: 'Analytics Dashboard',
    tagline: 'Data-driven fundraising decisions',
    description:
      'Track every metric that matters — investor engagement, document views, pipeline progression, and conversion rates. Beautiful visualizations give you the clarity to make smart decisions and report progress to stakeholders.',
    highlights: [
      'Real-time investor engagement tracking',
      'Pipeline and conversion analytics',
      'Cohort and benchmarking comparisons',
      'Export-ready investor reports',
    ],
    gradient: 'from-electric-blue to-electric-purple',
    glowColor: 'rgba(59, 130, 246, 0.1)',
  },
];

const platformHighlights = [
  {
    icon: Shield,
    title: 'Enterprise-grade Security',
    description: 'SOC 2 Type II compliant. End-to-end encryption. Your data never leaves our secure infrastructure.',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Built on modern infrastructure with edge computing. Every interaction feels instant.',
  },
  {
    icon: Globe,
    title: 'Global Coverage',
    description: 'Access 850+ investors across 40+ countries. Fundraise anywhere in the world.',
  },
];

function FeatureSection({
  feature,
  index,
}: {
  feature: (typeof features)[number];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const Icon = feature.icon;
  const isReversed = index % 2 !== 0;

  return (
    <section
      id={feature.id}
      ref={ref}
      className="py-16 md:py-24 px-4"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          className={`grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center ${
            isReversed ? 'lg:direction-rtl' : ''
          }`}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {/* Text content */}
          <div className={isReversed ? 'lg:order-2' : ''}>
            <div
              className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.gradient} mb-5`}
            >
              <Icon className="w-6 h-6 text-white" />
            </div>

            <p className="text-sm text-electric-blue font-display font-semibold mb-2">
              {feature.tagline}
            </p>

            <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-white mb-4">
              {feature.title}
            </h2>

            <p className="text-obsidian-400 font-body leading-relaxed mb-8 text-sm md:text-base">
              {feature.description}
            </p>

            <ul className="space-y-3 mb-8">
              {feature.highlights.map((highlight, i) => (
                <motion.li
                  key={highlight}
                  initial={{ opacity: 0, x: -10 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: i * 0.08 + 0.3 }}
                  className="flex items-center gap-3"
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${feature.gradient}`}
                  />
                  <span className="text-sm text-obsidian-300 font-body">
                    {highlight}
                  </span>
                </motion.li>
              ))}
            </ul>

            <Link
              href="/register"
              className="inline-flex items-center gap-2 text-electric-blue hover:text-electric-cyan transition-colors font-display font-semibold text-sm"
            >
              Try it free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Illustration placeholder */}
          <div className={isReversed ? 'lg:order-1' : ''}>
            <div
              className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/5"
              style={{
                background: `radial-gradient(ellipse at center, ${feature.glowColor}, transparent 70%)`,
              }}
            >
              {/* Window chrome */}
              <div className="absolute top-0 left-0 right-0 h-9 bg-obsidian-800/80 border-b border-white/5 flex items-center px-4 gap-2 z-10">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                <span className="ml-3 text-[10px] text-obsidian-500 font-mono">
                  {feature.title}
                </span>
              </div>

              {/* Shimmer placeholder content */}
              <div className="absolute inset-0 top-9 bg-obsidian-800/40 p-5 flex flex-col gap-3">
                <div className="flex gap-3">
                  <div className="flex-1 h-16 rounded-lg bg-white/5 skeleton-shimmer" />
                  <div className="w-24 h-16 rounded-lg bg-white/5 skeleton-shimmer" />
                </div>
                <div className="flex-1 rounded-lg bg-white/5 skeleton-shimmer" />
                <div className="flex gap-3">
                  <div className="flex-1 h-12 rounded-lg bg-white/5 skeleton-shimmer" />
                  <div className="flex-1 h-12 rounded-lg bg-white/5 skeleton-shimmer" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default function FeaturesPage() {
  return (
    <div className="pt-28 md:pt-36 pb-12">
      {/* Hero */}
      <motion.div
        className="text-center px-4 mb-10 md:mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-6 text-sm text-obsidian-400">
          <span className="w-1.5 h-1.5 rounded-full bg-electric-cyan" />
          Platform
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-extrabold mb-4">
          Everything you need to{' '}
          <span className="gradient-text">raise successfully</span>
        </h1>
        <p className="text-obsidian-400 text-base md:text-lg max-w-2xl mx-auto font-body">
          A complete AI-powered toolkit that takes you from preparation to close.
          Every feature designed to maximize your fundraising success.
        </p>
      </motion.div>

      {/* Feature sections */}
      {features.map((feature, i) => (
        <FeatureSection key={feature.id} feature={feature} index={i} />
      ))}

      {/* Platform highlights */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {platformHighlights.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  className="glass-card p-6 md:p-8 text-center"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <div className="inline-flex p-3 rounded-xl bg-white/5 mb-4">
                    <Icon className="w-6 h-6 text-electric-blue" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-obsidian-400 font-body">
                    {item.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 px-4">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Ready to see it in action?
          </h2>
          <p className="text-obsidian-400 font-body mb-8">
            Start your free trial today. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-display font-semibold text-white bg-neon-gradient animated-gradient shadow-glow hover:shadow-glow-lg transition-shadow text-sm"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-display font-semibold text-obsidian-200 glass hover:bg-white/10 transition-all text-sm"
            >
              View Pricing
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
