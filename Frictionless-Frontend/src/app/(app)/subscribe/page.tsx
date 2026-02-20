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
  TrendingUp,
  Rocket,
  Lock,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const plans = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: 200,
    period: '/mo',
    subtitle: 'Billed monthly',
    perMonth: 200,
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
      'See exactly where you stand across team, market, product, traction, financials and 7 more dimensions that investors evaluate.',
    gradient: 'from-blue-500/20 to-cyan-500/20',
  },
  {
    icon: Target,
    title: 'AI Investor Matching',
    description:
      'Get matched with investors who actively fund your stage, sector, and geography. No more cold outreach — warm intros only.',
    gradient: 'from-purple-500/20 to-blue-500/20',
  },
  {
    icon: Brain,
    title: 'Unlimited AI Assistant',
    description:
      'Ask anything about fundraising. Get pitch feedback, refine your narrative, prep for due diligence, and sharpen your story.',
    gradient: 'from-emerald-500/20 to-teal-500/20',
  },
  {
    icon: Zap,
    title: 'Smart Task Engine',
    description:
      'Prioritized action items that move your readiness score up fast. Always know exactly what to work on next.',
    gradient: 'from-amber-500/20 to-orange-500/20',
  },
  {
    icon: FolderOpen,
    title: 'Secure Data Rooms',
    description:
      'Share documents with investors through tracked, branded data rooms. See who opened what and for how long.',
    gradient: 'from-rose-500/20 to-pink-500/20',
  },
  {
    icon: TrendingUp,
    title: 'Investor Analytics & Tracking',
    description:
      'Track which investors viewed your profile, how engaged they are, and get notified on the best moment to follow up.',
    gradient: 'from-indigo-500/20 to-violet-500/20',
  },
];

const allFeatures = [
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
  const [loading, setLoading] = useState(false);

  const selectedPlan = plans.find((p) => p.id === selected)!;

  const handleCheckout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const token = (await supabase?.auth.getSession())?.data?.session?.access_token;
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ plan: selected }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('[subscribe] Checkout error:', data.error);
        setLoading(false);
      }
    } catch (err) {
      console.error('[subscribe] Checkout failed:', err);
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-y-auto overflow-x-hidden" style={{ background: 'var(--fi-bg-primary)' }}>
      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden pt-12 sm:pt-20 pb-12">
        {/* Background glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, rgba(16,185,129,0.12) 0%, rgba(59,130,246,0.06) 50%, transparent 70%)',
          }}
        />

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
            style={{
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.25)',
            }}
          >
            <Rocket className="w-3.5 h-3.5" style={{ color: 'var(--fi-primary)' }} />
            <span
              className="text-xs font-display font-semibold tracking-wide uppercase"
              style={{ color: 'var(--fi-primary)' }}
            >
              Onboarding complete
            </span>
          </motion.div>

          <motion.h1
            className="text-3xl sm:text-5xl font-display font-extrabold mb-4 leading-[1.15]"
            style={{ color: 'var(--fi-text-primary)' }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            You&apos;re one step away from{' '}
            <br className="hidden sm:block" />
            <span className="gradient-text">raising with confidence</span>
          </motion.h1>

          <motion.p
            className="font-body text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-2"
            style={{ color: 'var(--fi-text-secondary)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            Frictionless Pro gives you the AI-powered tools, investor intelligence,
            and fundraising infrastructure that top startups use to close rounds faster.
          </motion.p>
        </div>
      </section>

      {/* ─── What You Get ─── */}
      <section className="relative max-w-5xl mx-auto px-4 sm:px-6 pb-14">
        <motion.div
          className="flex items-center justify-center gap-2.5 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(16,185,129,0.12)' }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--fi-primary)' }} />
          </div>
          <h2 className="text-base font-display font-bold" style={{ color: 'var(--fi-text-primary)' }}>
            What you get with Frictionless Pro
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {valueProps.map((item, i) => (
            <motion.div
              key={item.title}
              className="relative rounded-xl p-5 transition-all duration-300 group"
              style={{
                background: 'var(--fi-bg-card)',
                border: '1px solid var(--fi-border)',
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.06 }}
              whileHover={{ y: -2 }}
            >
              {/* Icon with colored gradient bg */}
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br',
                  item.gradient
                )}
              >
                <item.icon className="w-5 h-5" style={{ color: 'var(--fi-text-primary)' }} />
              </div>
              <h3
                className="text-sm font-display font-bold mb-2"
                style={{ color: 'var(--fi-text-primary)' }}
              >
                {item.title}
              </h3>
              <p
                className="text-[13px] font-body leading-relaxed"
                style={{ color: 'var(--fi-text-secondary)' }}
              >
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Pricing Section ─── */}
      <section
        className="relative py-14"
        style={{ background: 'var(--fi-bg-secondary)' }}
      >
        {/* Top separator line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-neon-gradient opacity-30" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.55 }}
          >
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
              style={{
                background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.2)',
              }}
            >
              <Crown className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-display font-semibold text-primary uppercase tracking-wider">
                Choose your plan
              </span>
            </div>
            <h2
              className="text-2xl sm:text-3xl font-display font-extrabold mb-2"
              style={{ color: 'var(--fi-text-primary)' }}
            >
              Simple, transparent pricing
            </h2>
            <p className="font-body text-sm" style={{ color: 'var(--fi-text-secondary)' }}>
              Every plan includes full access to all features. Pick the billing cycle that works for you.
            </p>
          </motion.div>

          {/* Plan Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-8">
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
                    'relative rounded-xl p-6 text-left transition-all duration-300 cursor-pointer overflow-hidden',
                    plan.recommended && isSelected && 'sm:scale-[1.02]'
                  )}
                  style={{
                    background: isSelected ? 'var(--fi-bg-tertiary)' : 'var(--fi-bg-card)',
                    border: isSelected
                      ? '2px solid var(--fi-primary)'
                      : '1px solid var(--fi-border)',
                    boxShadow: isSelected
                      ? '0 0 24px rgba(16,185,129,0.15), 0 4px 12px rgba(0,0,0,0.2)'
                      : undefined,
                  }}
                >
                  {/* Top accent */}
                  {isSelected && (
                    <div
                      className="absolute top-0 left-0 right-0 h-[3px]"
                      style={{ background: 'linear-gradient(90deg, #10B981, #3B82F6, #8B5CF6)' }}
                    />
                  )}

                  {/* Badge */}
                  {plan.badge && (
                    <div className="mb-3">
                      <span
                        className="text-[10px] font-display font-bold px-2.5 py-1 rounded-full"
                        style={{
                          background:
                            plan.id === 'annual'
                              ? 'rgba(16,185,129,0.15)'
                              : 'rgba(59,130,246,0.15)',
                          color:
                            plan.id === 'annual'
                              ? 'var(--fi-primary)'
                              : 'hsl(217 91% 60%)',
                        }}
                      >
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  {/* Plan name */}
                  <p
                    className="text-xs font-body mb-3 uppercase tracking-wider font-medium"
                    style={{ color: 'var(--fi-text-tertiary)' }}
                  >
                    {plan.name}
                  </p>

                  {/* Price */}
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span
                      className="text-4xl font-display font-extrabold"
                      style={{ color: 'var(--fi-text-primary)' }}
                    >
                      ${plan.price.toLocaleString()}
                    </span>
                    <span
                      className="font-body text-sm"
                      style={{ color: 'var(--fi-text-tertiary)' }}
                    >
                      {plan.period}
                    </span>
                  </div>

                  {/* Per-month + saving */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="text-xs font-body"
                      style={{ color: 'var(--fi-text-secondary)' }}
                    >
                      ${plan.perMonth}/mo equivalent
                    </span>
                  </div>
                  {plan.saving && (
                    <span
                      className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mb-2"
                      style={{
                        background: 'rgba(16,185,129,0.12)',
                        color: 'var(--fi-primary)',
                      }}
                    >
                      {plan.saving}
                    </span>
                  )}

                  <p
                    className="text-[11px] font-body"
                    style={{ color: 'var(--fi-text-muted)' }}
                  >
                    {plan.subtitle}
                  </p>

                  {/* Radio indicator */}
                  <div
                    className="absolute top-5 right-5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200"
                    style={{
                      borderColor: isSelected ? 'var(--fi-primary)' : 'var(--fi-border-strong)',
                      background: isSelected ? 'var(--fi-primary)' : 'transparent',
                    }}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.8 }}
            className="mb-5"
          >
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="group flex items-center justify-center gap-2.5 w-full py-4 rounded-xl font-display font-semibold text-base text-white shadow-glow hover:shadow-glow-lg transition-all duration-300 disabled:opacity-70"
              style={{
                background: 'linear-gradient(135deg, #10B981, #059669)',
                boxShadow: '0 0 24px rgba(16,185,129,0.25), 0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              {loading ? 'Redirecting to checkout...' : `Get Frictionless Pro — $${selectedPlan.price.toLocaleString()}${selectedPlan.period}`}
              {!loading && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />}
            </button>
          </motion.div>

          {/* Trust */}
          <motion.div
            className="flex items-center justify-center gap-4 flex-wrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.85 }}
          >
            <span className="flex items-center gap-1.5 text-xs font-body" style={{ color: 'var(--fi-text-tertiary)' }}>
              <Shield className="w-3 h-3" />
              Secured by Stripe
            </span>
            <span className="text-xs" style={{ color: 'var(--fi-border-strong)' }}>|</span>
            <span className="text-xs font-body" style={{ color: 'var(--fi-text-tertiary)' }}>
              30-day money-back guarantee
            </span>
            <span className="text-xs" style={{ color: 'var(--fi-border-strong)' }}>|</span>
            <span className="text-xs font-body" style={{ color: 'var(--fi-text-tertiary)' }}>
              Cancel anytime
            </span>
          </motion.div>
        </div>
      </section>

      {/* ─── Full Feature Checklist ─── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          <div className="flex items-center gap-2.5 mb-6">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(59,130,246,0.12)' }}
            >
              <Zap className="w-3.5 h-3.5 text-primary" />
            </div>
            <h3
              className="text-base font-display font-bold"
              style={{ color: 'var(--fi-text-primary)' }}
            >
              Everything included in every plan
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {allFeatures.map((feature, i) => (
              <motion.div
                key={feature}
                className="flex items-start gap-3 py-2.5 px-3 rounded-lg"
                style={{ background: 'var(--fi-bg-card)' }}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.95 + i * 0.04 }}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(16,185,129,0.15)' }}
                >
                  <Check className="w-3 h-3" style={{ color: 'var(--fi-primary)' }} />
                </div>
                <span
                  className="text-sm font-body leading-snug"
                  style={{ color: 'var(--fi-text-secondary)' }}
                >
                  {feature}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─── Closing ─── */}
      <section className="text-center pb-12 px-4">
        <motion.p
          className="text-sm font-body max-w-md mx-auto leading-relaxed"
          style={{ color: 'var(--fi-text-tertiary)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 1.1 }}
        >
          Join hundreds of startups using Frictionless to understand their readiness,
          connect with the right investors, and raise with confidence.
        </motion.p>
      </section>
    </div>
  );
}
