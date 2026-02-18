'use client';

import { motion } from 'framer-motion';
import { FileText, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function DealMemoPage() {
  return (
    <div className="p-6 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-primary/20">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">AI Deal Memo Generator</h1>
            <p className="text-sm text-muted-foreground">Generate investor-ready deal memos from your profile</p>
          </div>
        </div>
        <div className="glass-card p-8 text-center">
          <Sparkles className="w-12 h-12 text-primary/60 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Coming Soon</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            AI-powered deal memos that synthesize your company profile, metrics, and traction into investor-ready summaries.
          </p>
          <Link
            href="/startup/company-profile"
            className="inline-flex items-center gap-2 text-primary hover:text-chart-5 transition-colors text-sm font-medium"
          >
            Update Company Profile
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
