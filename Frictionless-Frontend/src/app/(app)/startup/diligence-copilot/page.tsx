'use client';

import { motion } from 'framer-motion';
import { Shield, FileCheck } from 'lucide-react';
import Link from 'next/link';

export default function DiligenceCopilotPage() {
  return (
    <div className="p-6 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-accent/20">
            <Shield className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">AI Diligence Copilot</h1>
            <p className="text-sm text-muted-foreground">Prepare for investor due diligence with AI guidance</p>
          </div>
        </div>
        <div className="glass-card p-8 text-center">
          <FileCheck className="w-12 h-12 text-accent/60 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Coming Soon</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            Get AI-powered suggestions to complete your data room and address common diligence requests.
          </p>
          <Link
            href="/startup/data-room"
            className="inline-flex items-center gap-2 text-primary hover:text-chart-5 transition-colors text-sm font-medium"
          >
            Open Data Room
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
