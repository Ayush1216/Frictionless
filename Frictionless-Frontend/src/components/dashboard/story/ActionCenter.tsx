'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';
import {
  CheckCircle2,
  ArrowRight,
  Zap,
  UserCheck,
  ShieldCheck,
  Share2,
  Mail,
} from 'lucide-react';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { AskButton } from '@/components/ui/AskButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { sectionVariants, staggerContainer, staggerItem } from './storyVariants';
import { getScoreColor } from '@/lib/scores';
import type { NarrativeData } from './useNarrativeData';

interface ActionCenterProps {
  data: NarrativeData;
  onAskAI?: (prompt: string) => void;
}

export function ActionCenter({ data, onAskAI }: ActionCenterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      variants={sectionVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className="fi-card fi-card-depth fi-card-shine"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold" style={{ color: 'var(--fi-text-primary)' }}>
            Strategic Action Center
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fi-text-tertiary)' }}>
            Highest-impact tasks for your round
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT: Top impact tasks */}
        <div className="lg:col-span-3">
          {data.topImpactTasks.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="w-6 h-6" />}
              title="All caught up"
              description="Complete a Frictionless assessment to get personalized action items."
              className="py-8"
            />
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              className="space-y-2"
            >
              {data.topImpactTasks.map((task, idx) => (
                <motion.div
                  key={task.id}
                  variants={staggerItem}
                  className="fi-task-slide flex items-center gap-3 p-3 rounded-lg"
                  style={{ background: 'var(--fi-bg-secondary)', border: '1px solid var(--fi-border)' }}
                >
                  {/* Priority indicator */}
                  <span
                    className="text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shrink-0"
                    style={{
                      background: idx < 2 ? 'var(--fi-primary)' : 'var(--fi-bg-tertiary)',
                      color: idx < 2 ? 'white' : 'var(--fi-text-muted)',
                    }}
                  >
                    {idx + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: 'var(--fi-text-primary)' }}
                    >
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.potential_points && (
                        <span
                          className="text-xs font-semibold flex items-center gap-1"
                          style={{ color: 'var(--fi-score-excellent)' }}
                        >
                          <Zap className="w-3 h-3" />
                          +{task.potential_points} pts
                        </span>
                      )}
                    </div>
                  </div>

                  <AskButton onClick={() => onAskAI?.(`Help me complete this task: "${task.title}". ${task.description || ''} This task has a potential impact of +${task.potential_points ?? 0} points. Give me a step-by-step guide with examples.`)} size="sm" variant="outline" />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* RIGHT: Score Impact Simulator + Quick Actions */}
        <div className="lg:col-span-2 space-y-5">
          {/* Score simulator */}
          {data.topImpactTasks.length > 0 && (
            <div
              className="p-4 rounded-xl"
              style={{ background: 'var(--fi-bg-secondary)', border: '1px solid var(--fi-border)' }}
            >
              <h4 className="text-xs font-semibold mb-3" style={{ color: 'var(--fi-text-secondary)' }}>
                Score Impact
              </h4>
              <div className="flex items-center justify-center gap-4">
                <div className="flex flex-col items-center">
                  <ScoreGauge score={data.readinessScore} size="sm" showLabel={false} animated={false} />
                  <span className="text-[10px] mt-1" style={{ color: 'var(--fi-text-muted)' }}>
                    Current
                  </span>
                </div>

                <ArrowRight className="w-5 h-5 shrink-0" style={{ color: 'var(--fi-primary)' }} />

                <div className="flex flex-col items-center">
                  <ScoreGauge
                    score={Math.min(data.scoreProjection, 100)}
                    size="sm"
                    showLabel={false}
                    animated={false}
                  />
                  <span className="text-[10px] mt-1 font-semibold" style={{ color: 'var(--fi-primary)' }}>
                    Projected
                  </span>
                </div>
              </div>
              <p className="text-center text-xs mt-2" style={{ color: 'var(--fi-text-tertiary)' }}>
                Complete top tasks to reach{' '}
                <span className="font-bold" style={{ color: getScoreColor(data.scoreProjection) }}>
                  {Math.min(data.scoreProjection, 100)}%
                </span>
              </p>
            </div>
          )}

          {/* Quick action buttons */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold" style={{ color: 'var(--fi-text-secondary)' }}>
              Quick Actions
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <QuickActionBtn
                href="/startup/company-profile"
                icon={<UserCheck className="w-3.5 h-3.5" />}
                label="Update Profile"
              />
              <QuickActionBtn
                href="/startup/readiness"
                icon={<ShieldCheck className="w-3.5 h-3.5" />}
                label="Run Assessment"
              />
              <QuickActionBtn
                href="/startup/readiness"
                icon={<Share2 className="w-3.5 h-3.5" />}
                label="Share Report"
              />
              <QuickActionBtn
                href="/startup/investors"
                icon={<Mail className="w-3.5 h-3.5" />}
                label="Outreach"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function QuickActionBtn({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="fi-btn fi-btn-outline fi-btn-shine w-full justify-center text-xs py-2"
    >
      {icon}
      {label}
    </Link>
  );
}
