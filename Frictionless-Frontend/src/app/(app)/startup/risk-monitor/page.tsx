'use client';

import { motion } from 'framer-motion';
import { Shield, AlertTriangle, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function RiskMonitorPage() {
  return (
    <div className="p-6 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-amber-500/20">
            <Shield className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Risk Monitor</h1>
            <p className="text-sm text-muted-foreground">Track and mitigate investment Frictionless risks</p>
          </div>
        </div>
        <div className="glass-card p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500/60 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Coming Soon</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            Monitor key risk factors across your profile and get proactive alerts before they impact your fundraising.
          </p>
          <Link
            href="/startup/readiness"
            className="inline-flex items-center gap-2 text-primary hover:text-chart-5 transition-colors text-sm font-medium"
          >
            <BarChart3 className="w-4 h-4" />
            View Frictionless Score
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
