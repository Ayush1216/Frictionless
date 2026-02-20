'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { RefreshCw, Sparkles, ShieldCheck, FolderOpen, UserCheck, FileText } from 'lucide-react';
import { AskButton } from '@/components/ui/AskButton';
import { sectionVariants, barFill } from './storyVariants';
import type { NarrativeData } from './useNarrativeData';

interface DailyBriefProps {
  data: NarrativeData;
  onAskAI?: (prompt: string) => void;
}

// Typewriter for AI insights
function useTypewriter(text: string, speed = 18, enabled = true) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!enabled || !text) {
      setDisplayed(text || '');
      setDone(true);
      return;
    }
    setDisplayed('');
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, enabled]);

  return { displayed, done };
}

export function DailyBrief({ data, onAskAI }: DailyBriefProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const hasInsights = data.aiAnalysis.status === 'generated' || data.aiAnalysis.status === 'cached';
  const { displayed: insightText, done: insightDone } = useTypewriter(
    data.aiAnalysis.insights ?? '',
    18,
    hasInsights && isInView
  );

  if (!data.hasAssessment) {
    return (
      <motion.div
        ref={ref}
        variants={sectionVariants}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        className="fi-card fi-card-accent fi-card-depth fi-card-shine"
      >
        <div className="flex items-center gap-3 mb-4">
          <Image src="/ai-logo.png" alt="" width={20} height={20} />
          <h3 className="text-base font-semibold" style={{ color: 'var(--fi-text-primary)' }}>
            AI Daily Brief
          </h3>
        </div>
        <p className="text-sm" style={{ color: 'var(--fi-text-tertiary)' }}>
          Complete your first Frictionless assessment to unlock AI-powered insights about your fundraising position.
        </p>
        <Link href="/startup/readiness" className="fi-btn fi-btn-primary mt-4">
          <Sparkles className="w-4 h-4" />
          Start Assessment
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={ref}
      variants={sectionVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className="fi-card fi-card-accent-flow fi-card-depth fi-card-shine"
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT: AI narrative */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Image src="/ai-logo.png" alt="" width={20} height={20} />
              <h3 className="text-base font-semibold" style={{ color: 'var(--fi-text-primary)' }}>
                AI Daily Brief
              </h3>
            </div>
            <button
              onClick={data.fetchAiInsights}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: 'var(--fi-text-muted)' }}
              title="Refresh insights"
            >
              <RefreshCw className={`w-4 h-4 ${data.aiAnalysis.status === 'loading' ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {data.aiAnalysis.status === 'loading' ? (
            <div className="space-y-3">
              <div className="fi-skeleton h-4 w-full rounded" />
              <div className="fi-skeleton h-4 w-5/6 rounded" />
              <div className="fi-skeleton h-4 w-4/6 rounded" />
            </div>
          ) : data.aiAnalysis.status === 'error' ? (
            <p className="text-sm" style={{ color: 'var(--fi-text-muted)' }}>
              Unable to load insights. Try refreshing.
            </p>
          ) : (
            <div className="space-y-4">
              {data.aiAnalysis.insights && (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--fi-text-secondary)' }}>
                  {insightText}
                  {!insightDone && (
                    <span
                      className="inline-block w-[2px] h-[1em] ml-0.5 align-text-bottom"
                      style={{ background: 'var(--fi-primary)', animation: 'fi-cursor-blink 0.8s step-end infinite' }}
                    />
                  )}
                </p>
              )}

              {/* Strength / Risk chips */}
              <div className="flex flex-wrap gap-2">
                {data.aiAnalysis.strengths?.slice(0, 2).map((s, i) => (
                  <span key={`s-${i}`} className="fi-badge fi-badge-green text-[11px]">
                    {s.length > 40 ? s.slice(0, 38) + '..' : s}
                  </span>
                ))}
                {data.aiAnalysis.risks?.slice(0, 2).map((r, i) => (
                  <span key={`r-${i}`} className="fi-badge fi-badge-red text-[11px]">
                    {r.length > 40 ? r.slice(0, 38) + '..' : r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Frictionless Signals */}
        <div className="lg:col-span-2">
          <h4 className="text-sm font-semibold mb-4" style={{ color: 'var(--fi-text-primary)' }}>
            Frictionless Signals
          </h4>

          <div className="space-y-3">
            <SignalBar
              icon={<ShieldCheck className="w-3.5 h-3.5" />}
              label="Meeting Ready"
              value={data.readinessScore >= 80 ? 100 : Math.round((data.readinessScore / 80) * 100)}
              isInView={isInView}
            />
            <SignalBar
              icon={<FileText className="w-3.5 h-3.5" />}
              label="Diligence Ready"
              value={data.readinessScore >= 85 ? 100 : Math.round((data.readinessScore / 85) * 100)}
              isInView={isInView}
            />
            <SignalBar
              icon={<FolderOpen className="w-3.5 h-3.5" />}
              label="Data Room"
              value={data.dataRoomCompleteness}
              isInView={isInView}
            />
            <SignalBar
              icon={<UserCheck className="w-3.5 h-3.5" />}
              label="Profile"
              value={data.profileCompleteness}
              isInView={isInView}
            />
          </div>

          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--fi-border)' }}>
            <AskButton onClick={() => onAskAI?.(`Give me a comprehensive AI analysis of my current Frictionless status. My score is ${data.readinessScore}% with ${data.topImpactTasks.length} high-impact tasks remaining. What should I focus on today to make the biggest progress?`)} size="md" variant="primary" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SignalBar({
  icon,
  label,
  value,
  isInView,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  isInView: boolean;
}) {
  const pct = Math.min(Math.max(value, 0), 100);
  const color = pct >= 80 ? 'var(--fi-score-excellent)' : pct >= 50 ? 'var(--fi-score-good)' : 'var(--fi-score-need-improvement)';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span style={{ color: 'var(--fi-text-muted)' }}>{icon}</span>
          <span className="text-xs font-medium" style={{ color: 'var(--fi-text-secondary)' }}>{label}</span>
        </div>
        <span className="text-xs font-semibold tabular-nums" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--fi-bg-tertiary)' }}>
        <motion.div
          className="h-full rounded-full"
          variants={barFill}
          custom={pct}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          style={{ background: color }}
        />
      </div>
    </div>
  );
}
