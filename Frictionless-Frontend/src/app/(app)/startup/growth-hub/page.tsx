'use client';

import { motion } from 'framer-motion';
import { TrendingUp, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function GrowthHubPage() {
  return (
    <div className="p-6 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-chart-5/20">
            <TrendingUp className="w-6 h-6 text-chart-5" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">AI Growth Experiments Hub</h1>
            <p className="text-sm text-muted-foreground">Design and track growth experiments with AI suggestions</p>
          </div>
        </div>
        <div className="glass-card p-8 text-center">
          <BarChart3 className="w-12 h-12 text-chart-5/60 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Coming Soon</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            Run A/B tests, track experiments, and get AI recommendations to accelerate growth.
          </p>
          <Link
            href="/startup/analytics"
            className="inline-flex items-center gap-2 text-primary hover:text-chart-5 transition-colors text-sm font-medium"
          >
            View Analytics
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
