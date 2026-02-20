'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Shield,
  Check,
  ArrowRight,
  Crown,
  Zap,
  BarChart3,
  Users,
  Brain,
  FolderOpen,
  Target,
  FileSearch,
  Lightbulb,
  TrendingUp,
  Rocket,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

const MONTHLY_LINK = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_LINK ?? '';
const QUARTERLY_LINK = process.env.NEXT_PUBLIC_STRIPE_QUARTERLY_LINK ?? '';
const ANNUAL_LINK = process.env.NEXT_PUBLIC_STRIPE_ANNUAL_LINK ?? '';

const plans = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: 200,
    period: '/mo',
    subtitle: 'Billed monthly',
    perMonth: 200,
    link: MONTHLY_LINK,
    badge: null,
    saving: null,
    recommended: false,
  },
  {
    id: 'quarterly',
    name: 'Quarterly',
    price: 500,
    period: '/quarter',
    subtitle: 'Billed every 3 months',
    perMonth: Math.round(500 / 3),
    link: QUARTERLY_LINK,
    badge: 'Most Popular',
    saving: 'Save 17%',
    recommended: true,
  },
  {
    id: 'annual',
    name: 'Annual',
    price: 1800,
    period: '/year',
    subtitle: 'Billed annually',
    perMonth: 150,
    link: ANNUAL_LINK,
    badge: 'Best Value',
    saving: 'Save 25%',
    recommended: false,
  },
];

const valueProps = [
  {
    icon: BarChart3,
    title: '12-Dimension Readiness Score',
    description:
      'Understand exactly where you stand across team, market, product, financials, and 8 more dimensions investors care about.',
  },
  {
    icon: Target,
    title: 'AI Investor Matching',
    description:
      'Get matched with investors who actively fund your stage, sector, and geography — no more cold outreach.',
  },
  {
    icon: Brain,
    title: 'Unlimited AI Assistant',
    description:
      'Ask anything about fundraising, get pitch feedback, refine your narrative, and prepare for investor meetings.',
  },
  {
    icon: Zap,
    title: 'Smart Task Engine',
    description:
      'Prioritized action items that move your readiness score up — know exactly what to work on next.',
  },
  {
    icon: FolderOpen,
    title: 'Secure Data Rooms',
    description:
      'Share documents with investors through tracked, branded data rooms with real-time analytics.',
  },
  {
    icon: TrendingUp,
    title: 'Investor Analytics',
    description:
      'Track which investors viewed your profile, how long they spent, and when to follow up.',
  },
];

const features = [
  'Advanced readiness scoring (12 dimensions)',
  'Unlimited investor matches',
  'AI chat assistant (unlimited)',
  'Smart task engine with priorities',
  'Unlimited data rooms (10GB)',
  'Investor analytics & tracking',
  'Pitch deck AI review',
  'Priority support',
];

export default function SubscribePage() {
  const user = useAuthStore((s) => s.user);
  const [selected, setSelected] = useState('quarterly');

  const orgId = user?.org_id ?? '';
  const email = user?.email ?? '';

  const selectedPlan = plans.find((p) => p.id === selected)!;
  const paymentUrl = `${selectedPlan.link}?client_reference_id=${orgId}&prefilled_email=${encodeURIComponent(email)}`;

  return (
    <div className="relative min-h-screen overflow-y-auto overflow-x-hidden bg-background">
      {/* Atmospheric background */}
      <div className="fixed inset-0 bg-mesh-gradient opacity-60 pointer-events-none" />
      <div
        className="fixed top-[-15%] left-[5%] w-[600px] h-[600px] rounded-full opacity-[0.06] blur-[140px] pointer-events-none"
        style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}
      />
      <div
        className="fixed bottom-[-10%] right-[0%] w-[500px] h-[500px] rounded-full opacity-[0.04] blur-[120px] pointer-events-none"
        style={{ background: 'linear-gradient(135deg, #06B6D4, #3B82F6)' }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* ─── Hero Section ─── */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-score-excellent/10 border border-score-excellent/20 mb-5"
          >
            <Rocket className="w-3.5 h-3.5 text-score-excellent" />
            <span className="text-xs font-display font-semibold text-score-excellent tracking-wide uppercase">
              Your onboarding is complete
            </span>
          </motion.div>

          <motion.h1
            className="text-3xl sm:text-5xl font-display font-extrabold text-white mb-4 leading-tight"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            You&apos;re one step away from{' '}
            <br className="hidden sm:block" />
            <span className="gradient-text">raising with confidence</span>
          </motion.h1>

          <motion.p
            className="text-muted-foreground font-body text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            Frictionless Pro gives you the AI-powered tools, investor intelligence,
            and fundraising infrastructure that top startups use to close rounds faster.
          </motion.p>
        </div>

        {/* ─── What You Get Section ─── */}
        <motion.div
          className="mb-14"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <div className="flex items-center justify-center gap-2 mb-8">
            <Lightbulb className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-display font-semibold text-white uppercase tracking-wider">
              What you get with Pro
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {valueProps.map((item, i) => (
              <motion.div
                key={item.title}
                className="glass-card p-5 group hover:border-primary/30 transition-all duration-300"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.06 }}
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
                  <item.icon className="w-4.5 h-4.5 text-primary" />
                </div>
                <h3 className="text-sm font-display font-bold text-white mb-1.5">
                  {item.title}
                </h3>
                <p className="text-xs font-body text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ─── Pricing Cards ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.55 }}
        >
          <div className="flex items-center justify-center gap-2 mb-8">
            <Crown className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-display font-semibold text-white uppercase tracking-wider">
              Choose your plan
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 max-w-3xl mx-auto mb-6">
            {plans.map((plan, i) => {
              const isSelected = selected === plan.id;
              return (
                <motion.button
                  key={plan.id}
                  onClick={() => setSelected(plan.id)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.6 + i * 0.08 }}
                  className={cn(
                    'relative glass-card p-6 text-left transition-all duration-300 cursor-pointer overflow-hidden',
                    isSelected
                      ? 'border-primary/50 shadow-glow'
                      : 'hover:border-border-strong',
                    plan.recommended && isSelected && 'sm:scale-[1.03]'
                  )}
                >
                  {/* Top gradient accent for selected */}
                  {isSelected && (
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-neon-gradient" />
                  )}

                  {/* Badge */}
                  {plan.badge && (
                    <div className="mb-3">
                      <span
                        className={cn(
                          'text-[10px] font-display font-bold px-2.5 py-1 rounded-full',
                          plan.id === 'annual'
                            ? 'bg-score-excellent/15 text-score-excellent'
                            : 'bg-primary/15 text-primary'
                        )}
                      >
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  {/* Plan name */}
                  <p className="text-xs font-body text-muted-foreground mb-2 uppercase tracking-wider">
                    {plan.name}
                  </p>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-display font-extrabold text-white">
                      ${plan.price.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground font-body text-sm">
                      {plan.period}
                    </span>
                  </div>

                  {/* Per month equivalent */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-muted-foreground font-body">
                      ${plan.perMonth}/mo equivalent
                    </span>
                  </div>

                  {/* Saving badge */}
                  {plan.saving && (
                    <span className="inline-block text-[11px] font-semibold text-score-excellent bg-score-excellent/10 px-2 py-0.5 rounded-full mb-2">
                      {plan.saving}
                    </span>
                  )}

                  {/* Billed info */}
                  <p className="text-[11px] text-muted-foreground/50 font-body">
                    {plan.subtitle}
                  </p>

                  {/* Selection indicator */}
                  <div
                    className={cn(
                      'absolute top-5 right-5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                      isSelected
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground/30'
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.8 }}
            className="max-w-3xl mx-auto mb-4"
          >
            <a
              href={paymentUrl}
              className="group flex items-center justify-center gap-2.5 w-full py-4 rounded-xl font-display font-semibold text-base bg-neon-gradient animated-gradient text-white shadow-glow hover:shadow-glow-lg transition-all duration-300"
            >
              <Sparkles className="w-4.5 h-4.5" />
              Get Started — ${selectedPlan.price.toLocaleString()}
              {selectedPlan.period}
              <ArrowRight className="w-4.5 h-4.5 transition-transform group-hover:translate-x-0.5" />
            </a>
          </motion.div>

          {/* Trust line */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-body mb-12">
            <Shield className="w-3 h-3" />
            Secured by Stripe. 30-day money-back guarantee. Cancel anytime.
          </div>
        </motion.div>

        {/* ─── Full Feature List ─── */}
        <motion.div
          className="glass-card p-6 sm:p-8 overflow-hidden relative max-w-3xl mx-auto mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.85 }}
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-neon-gradient opacity-40" />

          <div className="flex items-center gap-2 mb-5">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-display font-semibold text-white">
              Everything included with every plan
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature}
                className="flex items-start gap-2.5"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.9 + i * 0.03 }}
              >
                <Check className="w-4 h-4 mt-0.5 text-score-excellent flex-shrink-0" />
                <span className="text-sm font-body text-muted-foreground leading-snug">
                  {feature}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ─── Social Proof / Closing ─── */}
        <motion.div
          className="text-center pb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 1.0 }}
        >
          <p className="text-sm font-body text-muted-foreground max-w-md mx-auto leading-relaxed">
            Join startups already using Frictionless to understand their readiness,
            connect with the right investors, and raise with confidence.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
