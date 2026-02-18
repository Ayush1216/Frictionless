'use client';

import { motion } from 'framer-motion';
import { Send, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function OutreachStudioPage() {
  return (
    <div className="p-6 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-score-excellent/20">
            <Send className="w-6 h-6 text-score-excellent" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">AI Outreach Studio</h1>
            <p className="text-sm text-muted-foreground">Craft personalized investor outreach at scale</p>
          </div>
        </div>
        <div className="glass-card p-8 text-center">
          <MessageSquare className="w-12 h-12 text-score-excellent/60 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Coming Soon</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            Generate and refine cold emails, intro requests, and follow-ups tailored to each investor.
          </p>
          <Link
            href="/startup/matches"
            className="inline-flex items-center gap-2 text-primary hover:text-chart-5 transition-colors text-sm font-medium"
          >
            View Matches
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
