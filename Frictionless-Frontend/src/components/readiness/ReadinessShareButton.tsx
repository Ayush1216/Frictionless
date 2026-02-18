'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Copy, Check, Loader2, Download, Link2, X, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useTaskStore } from '@/stores/task-store';
import { useReadinessStore } from '@/stores/readiness-store';
import { streamChat, isAIEnabled } from '@/lib/ai/openai-client';
import { isGeminiEnabled, geminiAnalyze } from '@/lib/ai/gemini-client';
import { getPrompt } from '@/lib/ai/prompts';
import type { ParsedRubricCategory } from '@/lib/readiness-rubric';

interface ReadinessShareButtonProps {
  overallScore: number;
  categories: ParsedRubricCategory[];
  completedTasks: number;
  totalTasks: number;
  delta: number;
}

const EXPIRY_OPTIONS = [
  { value: 168, label: '7 Days' },
  { value: 720, label: '30 Days' },
  { value: 2160, label: '90 Days' },
  { value: 0, label: 'Never' },
];

/** Generate AI insights to embed in the share link snapshot */
async function generateShareInsights(
  overallScore: number,
  categories: ParsedRubricCategory[],
  completedTasks: number,
  totalTasks: number,
): Promise<{ executive_summary: string; investor_verdict: string; top_priorities: string[] }> {
  const catSummary = categories
    .map((c) => `${c.name}: ${c.score}% (weight ${c.weight}%, ${c.items.filter((i) => ((i.Points as number) ?? 0) === 0).length} missing items)`)
    .join('\n');

  const prompt = `You are a senior investment readiness analyst. Based on this startup's readiness data, generate insights for a shareable report.

Overall Score: ${overallScore}%
Tasks: ${completedTasks}/${totalTasks} completed
Categories:
${catSummary}

Return ONLY valid JSON (no markdown, no backticks):
{
  "executive_summary": "2-3 sentence executive summary of readiness posture, mentioning specific strengths and gaps",
  "investor_verdict": "2-3 sentence verdict from an investor perspective — would they take a meeting? What stands out?",
  "top_priorities": ["Priority 1 with expected impact", "Priority 2 with expected impact", "Priority 3 with expected impact"]
}`;

  try {
    if (isGeminiEnabled()) {
      const raw = await geminiAnalyze(prompt, { temperature: 0.4 });
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    }

    if (isAIEnabled()) {
      let full = '';
      for await (const chunk of streamChat(
        [{ role: 'system', content: 'You are a startup readiness analyst. Return only valid JSON.' }, { role: 'user', content: prompt }],
        { model: 'gpt-4.1-mini', temperature: 0.4 }
      )) {
        full += chunk;
      }
      const cleaned = full.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    }
  } catch (e) {
    console.warn('[share/insights] AI generation failed:', e);
  }

  // Fallback
  const strengths = categories.filter((c) => c.score >= 86).map((c) => c.name);
  const gaps = categories.filter((c) => c.score < 80).map((c) => c.name);
  return {
    executive_summary: `This startup has an overall readiness score of ${overallScore}%, with ${strengths.length} strong categories${strengths.length > 0 ? ` (${strengths.slice(0, 2).join(', ')})` : ''} and ${gaps.length} areas needing attention${gaps.length > 0 ? ` (${gaps.slice(0, 2).join(', ')})` : ''}. ${completedTasks} of ${totalTasks} improvement tasks have been completed.`,
    investor_verdict: overallScore >= 80
      ? `At ${overallScore}%, this startup shows strong readiness fundamentals. An investor would likely take a first meeting to explore further.`
      : `At ${overallScore}%, this startup has meaningful gaps to address before most institutional investors would engage. Focused effort on top priorities could significantly improve perception.`,
    top_priorities: gaps.slice(0, 3).map((g) => `Improve ${g} category to close the readiness gap`),
  };
}

export function ReadinessShareButton({
  overallScore,
  categories,
  completedTasks,
  totalTasks,
  delta,
}: ReadinessShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expiresHours, setExpiresHours] = useState(168);

  const handleCreateLink = useCallback(async () => {
    if (isCreating) return;
    setIsCreating(true);
    setShareUrl(null);

    try {
      if (!supabase) throw new Error('Not authenticated');
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const { tasks, taskGroups } = useTaskStore.getState();
      const { scoreHistory } = useReadinessStore.getState();

      // Generate AI insights
      const aiInsights = await generateShareInsights(overallScore, categories, completedTasks, totalTasks);

      // Build rich category data with rubric items
      const richCategories = categories.map((c) => ({
        name: c.name,
        key: c.key,
        score: c.score,
        weight: c.weight,
        maximumPoint: c.maximumPoint,
        itemCount: c.items.length,
        missingCount: c.items.filter((i) => ((i.Points as number) ?? 0) === 0).length,
        items: c.items.map((item) => ({
          question: item.Question || item.Subtopic_Name || '',
          answer: item.Answer || item.Value || null,
          points: (item.Points as number) ?? 0,
          maxPoints: (item.maximum_points as number) ?? 0,
          reasoning: item.Reasoning || null,
        })),
      }));

      // Tasks grouped by category
      const tasksByCategory: Record<string, { title: string; priority: string; points: number; status: string; description: string }[]> = {};
      for (const task of tasks) {
        const group = taskGroups.find((g) => g.id === task.task_group_id);
        const cat = group?.category ?? 'Other';
        if (!tasksByCategory[cat]) tasksByCategory[cat] = [];
        tasksByCategory[cat].push({
          title: task.title,
          priority: task.priority,
          points: task.potential_points ?? 0,
          status: task.status,
          description: task.description || '',
        });
      }

      const snapshot = {
        score: overallScore,
        delta,
        completedTasks,
        totalTasks,
        categories: richCategories,
        tasks: tasksByCategory,
        scoreHistory: scoreHistory.slice(-20).map((h) => ({
          score: h.score,
          date: h.updated_at,
        })),
        aiInsights,
      };

      const res = await fetch('/api/share/readiness', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expires_hours: expiresHours,
          readiness_snapshot: snapshot,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create share link');
      }

      const result = await res.json();
      if (result.url) {
        setShareUrl(result.url);
        toast.success('Share link created with AI insights');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create share link');
    } finally {
      setIsCreating(false);
    }
  }, [overallScore, categories, completedTasks, totalTasks, delta, expiresHours, isCreating]);

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenPDF = () => {
    if (shareUrl) {
      window.open(shareUrl, '_blank');
      toast.success('Share page opened — use Download PDF there');
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/15 transition-colors border border-primary/20"
      >
        <Share2 className="w-3.5 h-3.5" />
        Share Report
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[340px] z-50 glass-card p-4 shadow-xl border border-border"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground">Share Readiness Report</h4>
              <button onClick={() => setIsOpen(false)} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground mb-3">
              Generate a comprehensive report with AI insights, category breakdown, rubric details, tasks, and company profile.
            </p>

            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-[11px] text-muted-foreground">Expires:</span>
              <div className="flex gap-1 flex-1">
                {EXPIRY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setExpiresHours(opt.value)}
                    className={cn(
                      'px-2 py-1 rounded text-[10px] font-semibold transition-colors',
                      expiresHours === opt.value ? 'bg-primary/15 text-primary' : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {shareUrl ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border text-[10px] font-mono text-foreground truncate">
                    <Link2 className="w-3 h-3 shrink-0 text-primary" />
                    <span className="truncate">{shareUrl}</span>
                  </div>
                  <button onClick={handleCopy} className="shrink-0 p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/15 transition-colors">
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleCopy} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    <Copy className="w-3 h-3" /> Copy Link
                  </button>
                  <button onClick={handleOpenPDF} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold bg-muted/50 border border-border text-foreground hover:bg-muted transition-colors">
                    <Download className="w-3 h-3" /> Open & PDF
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleCreateLink}
                disabled={isCreating}
                className={cn(
                  'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors',
                  isCreating ? 'bg-primary/50 text-primary-foreground cursor-not-allowed' : 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                {isCreating ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating with AI...</>
                ) : (
                  <><Share2 className="w-3.5 h-3.5" /> Generate Share Link</>
                )}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
