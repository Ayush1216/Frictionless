'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Image from 'next/image';
import { TrendingUp, CheckCircle2, Users, Zap, Sparkles } from 'lucide-react';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { sectionVariants, chipVariants } from './storyVariants';
import { getScoreColor } from '@/lib/scores';
import type { NarrativeData } from './useNarrativeData';

interface HeroNarrativeProps {
  data: NarrativeData;
}

// Typewriter hook
function useTypewriter(text: string, speed = 25, startDelay = 1000) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    const timeout = setTimeout(() => {
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
    }, startDelay);
    return () => clearTimeout(timeout);
  }, [text, speed, startDelay]);

  return { displayed, done };
}

function formatCurrency(n: number | null): string {
  if (!n) return '\u2014';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function HeroNarrative({ data }: HeroNarrativeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const { displayed, done } = useTypewriter(data.heroNarrative, 20, 1000);

  const scoreColor = getScoreColor(data.readinessScore);

  // Score-aware gradient class
  const gradientStyle = {
    background: data.readinessScore >= 86
      ? 'radial-gradient(ellipse 80% 60% at 20% 50%, rgba(34, 197, 94, 0.06) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 30%, rgba(16, 185, 129, 0.04) 0%, transparent 70%), var(--fi-bg-card)'
      : data.readinessScore >= 80
        ? 'radial-gradient(ellipse 80% 60% at 20% 50%, rgba(250, 204, 21, 0.05) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 30%, rgba(16, 185, 129, 0.03) 0%, transparent 70%), var(--fi-bg-card)'
        : 'radial-gradient(ellipse 80% 60% at 20% 50%, rgba(239, 68, 68, 0.04) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 30%, rgba(16, 185, 129, 0.03) 0%, transparent 70%), var(--fi-bg-card)',
  };

  return (
    <motion.div
      ref={ref}
      variants={sectionVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className="fi-hero-gradient fi-card-shine rounded-2xl overflow-hidden"
      style={{
        ...gradientStyle,
        border: '1px solid var(--fi-border)',
        minHeight: 240,
      }}
    >
      <div className="p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">

          {/* LEFT: Score gauge with pulse ring + breathing glow */}
          <div className="lg:col-span-4 flex flex-col items-center gap-3">
            <div className="relative">
              <div
                className="fi-gauge-ring-glow"
                style={{
                  inset: -20,
                  ['--fi-glow-color' as string]: `${scoreColor}18`,
                }}
              />
              <div className="fi-pulse-ring absolute inset-[-8px] rounded-full" style={{ borderColor: `${scoreColor}30` }} />
              <ScoreGauge
                score={data.readinessScore}
                size="xl"
                showDelta={data.readinessDelta !== 0}
                delta={data.readinessDelta}
                variant="circle"
              />
            </div>
            {/* Score delta sparkline (mini bar) */}
            {data.chartData.length > 1 && (
              <div className="flex items-end gap-[3px] h-6">
                {data.chartData.slice(-8).map((d, i) => (
                  <div
                    key={i}
                    className="w-[5px] rounded-full transition-all duration-500"
                    style={{
                      height: `${Math.max((d.score / 100) * 24, 3)}px`,
                      background: i === data.chartData.slice(-8).length - 1 ? scoreColor : 'var(--fi-bg-tertiary)',
                      opacity: 0.5 + (i / 8) * 0.5,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* CENTER: AI narrative + signal chips */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Image src="/ai-logo.png" alt="" width={18} height={18} />
              <span className="text-xs font-semibold" style={{ color: 'var(--fi-primary)' }}>
                Frictionless Intelligence
              </span>
              <span className="fi-sparkle">
                <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--fi-primary)' }} />
              </span>
            </div>

            <p
              className="text-base lg:text-lg leading-relaxed fi-narrative-fade"
              style={{ color: 'var(--fi-text-primary)', minHeight: 72 }}
            >
              {displayed}
              {!done && (
                <span
                  className="inline-block w-[2px] h-[1em] ml-0.5 align-text-bottom"
                  style={{ background: 'var(--fi-primary)', animation: 'fi-cursor-blink 0.8s step-end infinite' }}
                />
              )}
            </p>

            {/* Signal chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              <motion.span
                custom={0}
                variants={chipVariants}
                initial="hidden"
                animate={isInView ? 'visible' : 'hidden'}
                className="fi-badge fi-badge-green"
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                {data.readinessDelta >= 0 ? '+' : ''}{data.readinessDelta.toFixed(1)} trend
              </motion.span>
              <motion.span
                custom={1}
                variants={chipVariants}
                initial="hidden"
                animate={isInView ? 'visible' : 'hidden'}
                className="fi-badge"
                style={{ background: 'var(--fi-bg-tertiary)', color: 'var(--fi-text-secondary)' }}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {data.taskCompletionRate}% tasks done
              </motion.span>
              {data.highMatchCount > 0 && (
                <motion.span
                  custom={2}
                  variants={chipVariants}
                  initial="hidden"
                  animate={isInView ? 'visible' : 'hidden'}
                  className="fi-badge fi-badge-green"
                >
                  <Users className="w-3 h-3 mr-1" />
                  {data.highMatchCount} investor matches
                </motion.span>
              )}
            </div>
          </div>

          {/* RIGHT: Company identity + key metrics */}
          <div className="lg:col-span-3 space-y-4">
            {/* Identity */}
            <div className="flex items-center gap-3">
              {data.companyLogo ? (
                <Image
                  src={data.companyLogo}
                  alt={data.companyName}
                  width={40}
                  height={40}
                  className="rounded-lg object-cover shrink-0 fi-logo-glow"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold shrink-0 fi-logo-glow"
                  style={{ background: 'var(--fi-primary)', color: 'white' }}
                >
                  {data.companyName.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-lg font-bold truncate fi-text-shimmer">
                  {data.companyName}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="fi-badge fi-badge-green text-[11px]">{data.companyStage}</span>
                  {data.companySector && (
                    <span className="text-xs" style={{ color: 'var(--fi-text-tertiary)' }}>
                      {data.companySector}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Key metrics */}
            <div className="space-y-2 pt-1">
              <MetricRow label="MRR" value={formatCurrency(data.metrics.mrr)} />
              <MetricRow label="Runway" value={data.metrics.runway_months ? `${data.metrics.runway_months}mo` : '\u2014'} />
              <MetricRow label="Headcount" value={data.metrics.headcount ? `${data.metrics.headcount}` : '\u2014'} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>{label}</span>
      <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--fi-text-primary)' }}>{value}</span>
    </div>
  );
}
