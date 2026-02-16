'use client';

import { motion } from 'framer-motion';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

export default function OnboardingPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-[calc(100vh-4rem)] bg-obsidian-900"
    >
      <OnboardingWizard />
    </motion.div>
  );
}
