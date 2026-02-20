'use client';

import { motion } from 'framer-motion';
import { PricingCards } from '@/components/marketing/PricingCards';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

/* ═══════════════════════════════════════════
   FEATURE COMPARISON TABLE
   ═══════════════════════════════════════════ */
const comparisonCategories = [
  {
    category: 'Frictionless Assessment',
    features: [
      { name: 'Basic Frictionless score', starter: true, pro: true, enterprise: true },
      { name: '12-dimension deep analysis', starter: false, pro: true, enterprise: true },
      { name: 'Custom scoring models', starter: false, pro: false, enterprise: true },
      { name: 'Benchmarking against peers', starter: false, pro: true, enterprise: true },
    ],
  },
  {
    category: 'Investor Matching',
    features: [
      { name: 'Monthly match limit', starter: '3/mo', pro: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'Match quality scoring', starter: false, pro: true, enterprise: true },
      { name: 'Direct introductions', starter: false, pro: true, enterprise: true },
      { name: 'Custom match criteria', starter: false, pro: false, enterprise: true },
    ],
  },
  {
    category: 'AI Assistant',
    features: [
      { name: 'Chat messages', starter: '50/mo', pro: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'Pitch deck review', starter: false, pro: true, enterprise: true },
      { name: 'Financial model analysis', starter: false, pro: true, enterprise: true },
      { name: 'Custom AI training', starter: false, pro: false, enterprise: true },
    ],
  },
  {
    category: 'Data Room & Storage',
    features: [
      { name: 'Data rooms', starter: '1', pro: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'Storage', starter: '100MB', pro: '10GB', enterprise: 'Unlimited' },
      { name: 'Viewer analytics', starter: false, pro: true, enterprise: true },
      { name: 'Custom branding', starter: false, pro: false, enterprise: true },
    ],
  },
  {
    category: 'Support & Security',
    features: [
      { name: 'Community support', starter: true, pro: true, enterprise: true },
      { name: 'Priority support', starter: false, pro: true, enterprise: true },
      { name: 'Dedicated success manager', starter: false, pro: false, enterprise: true },
      { name: 'SSO & advanced security', starter: false, pro: false, enterprise: true },
      { name: 'API access', starter: false, pro: false, enterprise: true },
    ],
  },
];

function CellValue({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <span className="text-sm text-obsidian-300 font-body">{value}</span>;
  }
  return value ? (
    <Check className="w-4 h-4 text-electric-blue mx-auto" />
  ) : (
    <Minus className="w-4 h-4 text-obsidian-700 mx-auto" />
  );
}

function ComparisonTable() {
  const [expanded, setExpanded] = useState(true);

  return (
    <motion.div
      className="max-w-5xl mx-auto mt-20 md:mt-28"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center mb-10">
        <h3 className="text-2xl md:text-3xl font-display font-bold text-white mb-2">
          Feature comparison
        </h3>
        <p className="text-obsidian-400 font-body text-sm">
          See exactly what&apos;s included in each plan
        </p>
      </div>

      {/* Mobile toggle */}
      <button
        className="md:hidden w-full glass rounded-xl px-4 py-3 mb-4 text-sm font-display font-semibold text-obsidian-300 flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? 'Collapse comparison' : 'Expand comparison'}
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▾
        </motion.span>
      </button>

      <div className={cn('overflow-x-auto', !expanded && 'hidden md:block')}>
        <table className="w-full min-w-[600px]">
          {/* Header */}
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left py-4 px-4 text-sm font-display font-semibold text-obsidian-400 w-[40%]">
                Feature
              </th>
              <th className="text-center py-4 px-4 text-sm font-display font-semibold text-obsidian-400 w-[20%]">
                Starter
              </th>
              <th className="text-center py-4 px-4 text-sm font-display font-semibold text-white w-[20%]">
                <span className="px-3 py-1 rounded-full bg-electric-blue/10 text-electric-blue text-xs">
                  Pro
                </span>
              </th>
              <th className="text-center py-4 px-4 text-sm font-display font-semibold text-obsidian-400 w-[20%]">
                Enterprise
              </th>
            </tr>
          </thead>
          <tbody>
            {comparisonCategories.map((cat) => (
              <>
                <tr key={cat.category}>
                  <td
                    colSpan={4}
                    className="pt-6 pb-2 px-4 text-xs font-display font-bold text-obsidian-500 uppercase tracking-wider"
                  >
                    {cat.category}
                  </td>
                </tr>
                {cat.features.map((f) => (
                  <tr
                    key={f.name}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3.5 px-4 text-sm text-obsidian-300 font-body">
                      {f.name}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <CellValue value={f.starter} />
                    </td>
                    <td className="py-3.5 px-4 text-center bg-electric-blue/[0.02]">
                      <CellValue value={f.pro} />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <CellValue value={f.enterprise} />
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   FAQ
   ═══════════════════════════════════════════ */
const faqs = [
  {
    q: 'Can I try Pro features before committing?',
    a: 'Absolutely! Every Pro plan comes with a 14-day free trial. No credit card required to start. You can explore all Pro features and decide if it\'s right for you.',
  },
  {
    q: 'What happens when my trial ends?',
    a: 'When your trial ends, you\'ll be downgraded to the Starter plan automatically. No surprise charges. You can upgrade to Pro anytime to regain access to advanced features.',
  },
  {
    q: 'Can I switch between monthly and annual billing?',
    a: 'Yes, you can switch at any time. If you switch from monthly to annual, you\'ll receive a prorated credit. Annual billing saves you 20% compared to monthly.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit cards (Visa, Mastercard, Amex), as well as ACH bank transfers for annual Enterprise plans. All payments are processed securely through Stripe.',
  },
  {
    q: 'Is there a refund policy?',
    a: 'We offer a 30-day money-back guarantee on all paid plans. If you\'re not satisfied, contact our support team for a full refund — no questions asked.',
  },
  {
    q: 'How is Enterprise pricing determined?',
    a: 'Enterprise pricing is based on team size, usage volume, and required features. Contact our sales team for a custom quote tailored to your organization\'s needs.',
  },
];

function FAQSection() {
  return (
    <motion.div
      className="max-w-3xl mx-auto mt-20 md:mt-28"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center mb-10">
        <h3 className="text-2xl md:text-3xl font-display font-bold text-white mb-2">
          Frequently asked questions
        </h3>
        <p className="text-obsidian-400 font-body text-sm">
          Everything you need to know about our pricing
        </p>
      </div>

      <Accordion type="single" collapsible className="space-y-3">
        {faqs.map((faq, i) => (
          <AccordionItem
            key={i}
            value={`faq-${i}`}
            className="glass-card px-6 border-obsidian-700/30 rounded-xl overflow-hidden"
          >
            <AccordionTrigger className="text-left text-white font-display font-semibold text-sm md:text-base hover:no-underline py-5">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-obsidian-400 font-body text-sm leading-relaxed">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   PRICING PAGE
   ═══════════════════════════════════════════ */
export default function PricingPage() {
  return (
    <div className="pt-28 md:pt-36 pb-20 md:pb-32 px-4">
      {/* Hero */}
      <motion.div
        className="text-center mb-14 md:mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-6 text-sm text-obsidian-400">
          <span className="w-1.5 h-1.5 rounded-full bg-electric-purple" />
          Simple, transparent pricing
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-extrabold mb-4">
          Plans that <span className="gradient-text">scale with you</span>
        </h1>
        <p className="text-obsidian-400 text-base md:text-lg max-w-2xl mx-auto font-body">
          Start free and upgrade as you grow. No hidden fees, no surprises.
        </p>
      </motion.div>

      <PricingCards />
      <ComparisonTable />
      <FAQSection />
    </div>
  );
}
