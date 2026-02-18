/**
 * Feature flags for optional/experimental pages.
 * Set via env NEXT_PUBLIC_FEATURE_* or override in code.
 * Fully removable without side effects when disabled.
 */

export const featureFlags = {
  focusMode: process.env.NEXT_PUBLIC_FEATURE_FOCUS_MODE !== 'false', // on by default
  insightsLab: process.env.NEXT_PUBLIC_FEATURE_INSIGHTS_LAB === 'true',
  riskMonitor: process.env.NEXT_PUBLIC_FEATURE_RISK_MONITOR === 'true',
  investorOutreachPlanner: process.env.NEXT_PUBLIC_FEATURE_INVESTOR_OUTREACH === 'true',
  dealMemo: process.env.NEXT_PUBLIC_FEATURE_DEAL_MEMO === 'true',
  diligenceCopilot: process.env.NEXT_PUBLIC_FEATURE_DILIGENCE_COPILOT === 'true',
  outreachStudio: process.env.NEXT_PUBLIC_FEATURE_OUTREACH_STUDIO === 'true',
  growthHub: process.env.NEXT_PUBLIC_FEATURE_GROWTH_HUB === 'true',
  aiHelper: process.env.NEXT_PUBLIC_FEATURE_AI_HELPER !== 'false', // on by default
  activityEvents: process.env.NEXT_PUBLIC_FEATURE_ACTIVITY_EVENTS !== 'false', // on by default
};

export type FeatureFlagKey = keyof typeof featureFlags;

export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return !!featureFlags[flag];
}
