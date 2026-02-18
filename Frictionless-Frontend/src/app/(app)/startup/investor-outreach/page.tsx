'use client';

import { motion } from 'framer-motion';
import { Send, Mail, Target } from 'lucide-react';
import Link from 'next/link';

export default function InvestorOutreachPage() {
  return (
    <div className="p-6 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-accent/20">
            <Send className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Investor Outreach Planner</h1>
            <p className="text-sm text-muted-foreground">Plan and track your investor outreach</p>
          </div>
        </div>
        <div className="glass-card p-8 text-center">
          <Mail className="w-12 h-12 text-accent/60 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Coming Soon</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            Build a prioritized outreach list, track touchpoints, and manage your investor conversations in one place.
          </p>
          <Link
            href="/startup/matches"
            className="inline-flex items-center gap-2 text-primary hover:text-chart-5 transition-colors text-sm font-medium"
          >
            <Target className="w-4 h-4" />
            View Matches
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
