'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const tiers = [
  {
    name: 'Starter',
    description: 'Perfect for early-stage startups exploring fundraising.',
    monthlyPrice: 0,
    annualPrice: 0,
    priceLabel: 'Free forever',
    cta: 'Get Started',
    ctaLink: '/register',
    popular: false,
    features: [
      'Basic Frictionless assessment',
      '3 investor matches per month',
      'AI chat (50 messages/mo)',
      'Basic task recommendations',
      '1 data room (100MB)',
      'Community support',
    ],
  },
  {
    name: 'Pro',
    description: 'For startups actively raising their next round.',
    monthlyPrice: 49,
    annualPrice: 39,
    priceLabel: '/month',
    cta: 'Start Free Trial',
    ctaLink: '/register?plan=pro',
    popular: true,
    features: [
      'Advanced Frictionless scoring (12 dimensions)',
      'Unlimited investor matches',
      'AI chat assistant (unlimited)',
      'Smart task engine with priorities',
      'Unlimited data rooms (10GB)',
      'Investor analytics & tracking',
      'Pitch deck AI review',
      'Email templates & sequences',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    description: 'For accelerators, VCs, and large portfolio management.',
    monthlyPrice: null,
    annualPrice: null,
    priceLabel: 'Custom pricing',
    cta: 'Contact Sales',
    ctaLink: '/contact',
    popular: false,
    features: [
      'Everything in Pro',
      'Multi-seat team access',
      'Portfolio-wide analytics',
      'Custom scoring models',
      'API access & integrations',
      'White-label options',
      'Dedicated success manager',
      'SSO & advanced security',
      'Custom SLA & onboarding',
    ],
  },
];

interface PricingCardsProps {
  showToggle?: boolean;
  showFaq?: boolean;
}

export function PricingCards({ showToggle = true }: PricingCardsProps) {
  const [annual, setAnnual] = useState(true);

  return (
    <div>
      {/* Toggle */}
      {showToggle && (
        <motion.div
          className="flex items-center justify-center gap-4 mb-14"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <span
            className={cn(
              'text-sm font-body transition-colors',
              !annual ? 'text-white' : 'text-muted-foreground'
            )}
          >
            Monthly
          </span>
          <button
            onClick={() => setAnnual(!annual)}
            className={cn(
              'relative w-14 h-7 rounded-full transition-colors duration-300',
              annual ? 'bg-primary' : 'bg-border'
            )}
            aria-label="Toggle annual pricing"
          >
            <motion.div
              className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md"
              animate={{ left: annual ? '30px' : '4px' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
          <span
            className={cn(
              'text-sm font-body transition-colors',
              annual ? 'text-white' : 'text-muted-foreground'
            )}
          >
            Annual
          </span>
          <AnimatePresence>
            {annual && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: -10 }}
                className="text-xs font-semibold text-score-excellent bg-score-excellent/10 px-2.5 py-1 rounded-full"
              >
                Save 20%
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 max-w-5xl mx-auto">
        {tiers.map((tier, i) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className={cn(
              'relative flex flex-col glass-card p-6 md:p-8 overflow-hidden',
              tier.popular && 'border-primary/40 shadow-glow md:scale-[1.02]'
            )}
          >
            {/* Popular badge with shimmer */}
            {tier.popular && (
              <div className="absolute top-0 right-0 overflow-hidden">
                <div className="relative bg-neon-gradient text-white text-xs font-display font-bold px-6 py-1.5 rounded-bl-xl">
                  <Sparkles className="w-3 h-3 inline-block mr-1" />
                  Most Popular
                  {/* Shimmer overlay */}
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
              </div>
            )}

            {/* Tier info */}
            <div className="mb-6">
              <h3 className="text-xl font-display font-bold text-white mb-2">
                {tier.name}
              </h3>
              <p className="text-sm text-muted-foreground font-body">
                {tier.description}
              </p>
            </div>

            {/* Price */}
            <div className="mb-8">
              {tier.monthlyPrice !== null ? (
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl md:text-5xl font-display font-extrabold text-white">
                    ${annual ? tier.annualPrice : tier.monthlyPrice}
                  </span>
                  <span className="text-muted-foreground font-body text-sm">
                    {tier.priceLabel}
                  </span>
                </div>
              ) : (
                <div className="text-2xl md:text-3xl font-display font-bold text-white">
                  {tier.priceLabel}
                </div>
              )}
              {tier.annualPrice !== null && annual && tier.monthlyPrice !== 0 && (
                <p className="text-xs text-muted-foreground mt-2 font-body">
                  Billed annually (${tier.annualPrice! * 12}/year)
                </p>
              )}
            </div>

            {/* CTA */}
            <Link
              href={tier.ctaLink}
              className={cn(
                'flex items-center justify-center gap-2 w-full py-3 rounded-xl font-display font-semibold text-sm transition-all duration-300 mb-8',
                tier.popular
                  ? 'bg-neon-gradient animated-gradient text-white shadow-glow hover:shadow-glow-lg'
                  : 'glass text-foreground/80 hover:bg-white/10'
              )}
            >
              {tier.cta}
              <ArrowRight className="w-4 h-4" />
            </Link>

            {/* Features */}
            <ul className="space-y-3 flex-1">
              {tier.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-3 text-sm font-body"
                >
                  <Check
                    className={cn(
                      'w-4 h-4 mt-0.5 flex-shrink-0',
                      tier.popular ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
