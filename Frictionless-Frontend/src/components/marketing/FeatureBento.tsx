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
} from 'lucide-react';

const features = [
  {
    icon: Gauge,
    title: 'Frictionless Scoring',
    description:
      'Get an AI-powered investment Frictionless score across 12 key dimensions. Know exactly where you stand and what to improve before approaching investors.',
    color: 'from-primary to-accent',
    glowColor: 'rgba(59, 130, 246, 0.15)',
    size: 'large' as const,
  },
  {
    icon: Users,
    title: 'Investor Matching',
    description:
      'Our matching algorithm analyzes thousands of data points to connect you with investors who are the best fit for your stage, sector, and geography.',
    color: 'from-accent to-primary',
    glowColor: 'rgba(139, 92, 246, 0.15)',
    size: 'large' as const,
  },
  {
    icon: MessageSquareText,
    title: 'AI Chat Assistant',
    description:
      'Get instant answers about fundraising strategy, pitch deck feedback, and investor intelligence.',
    color: 'from-accent to-score-excellent',
    glowColor: 'rgba(6, 182, 212, 0.15)',
    size: 'medium' as const,
  },
  {
    icon: ListChecks,
    title: 'Task Engine',
    description:
      'AI-generated action items that prioritize what matters most for your raise. Never miss a critical step.',
    color: 'from-score-fair to-primary',
    glowColor: 'rgba(245, 158, 11, 0.15)',
    size: 'medium' as const,
  },
  {
    icon: FolderLock,
    title: 'Data Room',
    description:
      'Secure, investor-ready data room with smart organization and permission controls.',
    color: 'from-score-excellent to-accent',
    glowColor: 'rgba(16, 185, 129, 0.15)',
    size: 'medium' as const,
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description:
      'Track investor engagement, document views, and pipeline metrics in real-time.',
    color: 'from-primary to-accent',
    glowColor: 'rgba(59, 130, 246, 0.15)',
    size: 'medium' as const,
  },
];

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[number];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const Icon = feature.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1, ease: 'easeOut' }}
      className={`group relative glass-card p-6 md:p-8 overflow-hidden hover:border-muted-foreground/50 transition-all duration-500 ${
        feature.size === 'large'
          ? 'md:col-span-3 lg:col-span-3'
          : 'md:col-span-3 lg:col-span-2'
      }`}
    >
      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"
        style={{
          background: `radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${feature.glowColor}, transparent 40%)`,
        }}
      />

      {/* Decorative gradient orb */}
      <div
        className={`absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br ${feature.color} opacity-5 group-hover:opacity-10 blur-3xl transition-opacity duration-500`}
      />

      <div className="relative z-10">
        {/* Icon */}
        <div
          className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-5`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>

        {/* Content */}
        <h3 className="text-xl md:text-2xl font-display font-bold text-white mb-3">
          {feature.title}
        </h3>
        <p className="text-muted-foreground font-body leading-relaxed text-sm md:text-base">
          {feature.description}
        </p>

        {/* Subtle animated line */}
        <div className="mt-6 h-px w-full bg-border/50 overflow-hidden">
          <motion.div
            className={`h-full bg-gradient-to-r ${feature.color}`}
            initial={{ x: '-100%' }}
            animate={isInView ? { x: '100%' } : {}}
            transition={{ duration: 2, delay: index * 0.15 + 0.5, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export function FeatureBento() {
  return (
    <section id="features" className="py-20 md:py-32 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          className="text-center mb-14 md:mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-6 text-sm text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Platform Features
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-4">
            Everything you need to{' '}
            <span className="gradient-text">raise successfully</span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto font-body">
            A complete suite of AI-powered tools designed to maximize your
            fundraising success from day one.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-5">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
