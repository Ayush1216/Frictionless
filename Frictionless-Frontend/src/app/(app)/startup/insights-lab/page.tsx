'use client';

import { motion } from 'framer-motion';
import { Sparkles, Lightbulb, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function InsightsLabPage() {
  return (
    <div className="p-6 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-primary/20">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Insights Lab</h1>
            <p className="text-sm text-muted-foreground">AI-powered insights and recommendations</p>
          </div>
        </div>
        <div className="glass-card p-8 text-center">
          <Lightbulb className="w-12 h-12 text-primary/60 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Coming Soon</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            Get deep AI-driven insights on your startup profile, market positioning, and investor Frictionless.
          </p>
          <Link
            href="/startup/company-profile"
            className="inline-flex items-center gap-2 text-primary hover:text-chart-5 transition-colors text-sm font-medium"
          >
            <TrendingUp className="w-4 h-4" />
            Go to Company Profile
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
