'use client';

import { useState, useCallback, useRef } from 'react';
import { Share2, Copy, Check, Loader2, Download, Link2, Calendar, FileText, QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { getScoreColor } from '@/lib/scores';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useTaskStore } from '@/stores/task-store';
import { useReadinessStore } from '@/stores/readiness-store';
import { streamChat, isAIEnabled } from '@/lib/ai/openai-client';
import { isGeminiEnabled, geminiAnalyze } from '@/lib/ai/gemini-client';
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

  const prompt = `You are a senior investment Frictionless analyst. Based on this startup's Frictionless data, generate insights for a shareable report.

Overall Score: ${overallScore}%
Tasks: ${completedTasks}/${totalTasks} completed
Categories:
${catSummary}

Return ONLY valid JSON (no markdown, no backticks):
{
  "executive_summary": "2-3 sentence executive summary of Frictionless posture, mentioning specific strengths and gaps",
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
        [{ role: 'system', content: 'You are a startup Frictionless analyst. Return only valid JSON.' }, { role: 'user', content: prompt }],
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
  const strengths = categories.filter((c) => c.score >= 80).map((c) => c.name);
  const gaps = categories.filter((c) => c.score < 80).map((c) => c.name);
  return {
    executive_summary: `This startup has an overall Frictionless score of ${overallScore}%, with ${strengths.length} strong categories${strengths.length > 0 ? ` (${strengths.slice(0, 2).join(', ')})` : ''} and ${gaps.length} areas needing attention${gaps.length > 0 ? ` (${gaps.slice(0, 2).join(', ')})` : ''}. ${completedTasks} of ${totalTasks} improvement tasks have been completed.`,
    investor_verdict: overallScore >= 80
      ? `At ${overallScore}%, this startup shows strong Frictionless fundamentals. An investor would likely take a first meeting to explore further.`
      : `At ${overallScore}%, this startup has meaningful gaps to address before most institutional investors would engage. Focused effort on top priorities could significantly improve perception.`,
    top_priorities: gaps.slice(0, 3).map((g) => `Improve ${g} category to close the Frictionless gap`),
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
  const [showQR, setShowQR] = useState(false);
  const qrRef = useRef<HTMLCanvasElement>(null);

  const topCategories = [...categories].sort((a, b) => b.score - a.score).slice(0, 5);
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

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
    }
  };

  const handleDownloadQR = useCallback(() => {
    const canvas = qrRef.current;
    if (!canvas || !shareUrl) return;
    const link = document.createElement('a');
    link.download = 'frictionless-report-qr.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('QR code downloaded');
  }, [shareUrl]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
          style={{
            background: 'rgba(16,185,129,0.1)',
            color: 'var(--fi-primary)',
            border: '1px solid rgba(16,185,129,0.2)',
          }}
        >
          <Share2 className="w-3.5 h-3.5" />
          Share Report
        </button>
      </DialogTrigger>

      <DialogContent
        className="sm:max-w-[520px] p-0 gap-0 overflow-hidden"
        style={{
          background: 'var(--fi-bg-card)',
          border: '1px solid var(--fi-border)',
        }}
      >
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle
            className="flex items-center gap-2 text-sm font-semibold"
            style={{ color: 'var(--fi-text-primary)' }}
          >
            <FileText className="w-4 h-4" style={{ color: 'var(--fi-primary)' }} />
            Share Frictionless Report
          </DialogTitle>
          <DialogDescription className="text-[11px]" style={{ color: 'var(--fi-text-muted)' }}>
            Generate a comprehensive report with AI insights, category breakdown, and improvement tasks.
          </DialogDescription>
        </DialogHeader>

        {/* Report preview */}
        <div className="px-5 pb-4">
          <div
            className="rounded-lg p-4"
            style={{
              background: 'var(--fi-bg-secondary)',
              border: '1px solid var(--fi-border)',
            }}
          >
            {/* Score + category preview */}
            <div className="flex items-start gap-4">
              <ScoreGauge score={overallScore} size="sm" showLabel={false} animated={false} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-bold tabular-nums" style={{ color: getScoreColor(overallScore) }}>
                    {overallScore}%
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--fi-text-muted)' }}>
                    Overall Frictionless
                  </span>
                </div>
                {/* Top categories mini bars */}
                <div className="space-y-1">
                  {topCategories.map((cat) => (
                    <div key={cat.key} className="flex items-center gap-2">
                      <span
                        className="text-[10px] w-20 truncate"
                        style={{ color: 'var(--fi-text-muted)' }}
                      >
                        {cat.name}
                      </span>
                      <div
                        className="flex-1 h-1 rounded-full overflow-hidden"
                        style={{ background: 'var(--fi-bg-tertiary)' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${cat.score}%`,
                            background: getScoreColor(cat.score),
                          }}
                        />
                      </div>
                      <span
                        className="text-[10px] tabular-nums w-7 text-right font-medium"
                        style={{ color: getScoreColor(cat.score) }}
                      >
                        {cat.score}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Task progress */}
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--fi-border)' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px]" style={{ color: 'var(--fi-text-muted)' }}>
                  Task Progress
                </span>
                <span className="text-[10px] font-semibold tabular-nums" style={{ color: 'var(--fi-text-secondary)' }}>
                  {completedTasks}/{totalTasks} ({progressPct}%)
                </span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: 'var(--fi-bg-tertiary)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${progressPct}%`,
                    background: 'var(--fi-primary)',
                  }}
                />
              </div>
            </div>

            <p className="text-[10px] mt-2" style={{ color: 'var(--fi-text-muted)' }}>
              Report includes: AI executive summary, investor verdict, category details, rubric items, and improvement tasks.
            </p>
          </div>
        </div>

        {/* Expiry options */}
        <div className="px-5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--fi-text-muted)' }} />
            <span className="text-[11px]" style={{ color: 'var(--fi-text-muted)' }}>Link expires:</span>
            <div className="flex gap-1 flex-1">
              {EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setExpiresHours(opt.value)}
                  className="px-2 py-1 rounded text-[10px] font-semibold transition-colors"
                  style={{
                    background: expiresHours === opt.value ? 'rgba(16,185,129,0.1)' : 'var(--fi-bg-secondary)',
                    color: expiresHours === opt.value ? 'var(--fi-primary)' : 'var(--fi-text-muted)',
                    border: expiresHours === opt.value ? '1px solid rgba(16,185,129,0.3)' : '1px solid transparent',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          {shareUrl ? (
            <div className="space-y-2">
              {/* URL display */}
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-mono"
                style={{
                  background: 'var(--fi-bg-secondary)',
                  border: '1px solid var(--fi-border)',
                  color: 'var(--fi-text-secondary)',
                }}
              >
                <Link2 className="w-3 h-3 shrink-0" style={{ color: 'var(--fi-primary)' }} />
                <span className="flex-1 truncate">{shareUrl}</span>
              </div>

              {/* QR Code toggle */}
              <div>
                <button
                  onClick={() => setShowQR((v) => !v)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-colors"
                  style={{
                    background: showQR ? 'rgba(16,185,129,0.06)' : 'var(--fi-bg-secondary)',
                    border: showQR ? '1px solid rgba(16,185,129,0.2)' : '1px solid var(--fi-border)',
                    color: showQR ? 'var(--fi-primary)' : 'var(--fi-text-muted)',
                  }}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  {showQR ? 'Hide QR Code' : 'Show QR Code'}
                </button>

                {showQR && (
                  <div className="mt-2 flex flex-col items-center gap-2 py-3 rounded-lg" style={{ background: 'var(--fi-bg-secondary)', border: '1px solid var(--fi-border)' }}>
                    <div className="p-2 rounded-lg bg-white">
                      <QRCodeCanvas
                        ref={qrRef}
                        value={shareUrl}
                        size={140}
                        level="M"
                        imageSettings={{
                          src: '/logo.png',
                          height: 24,
                          width: 24,
                          excavate: true,
                        }}
                      />
                    </div>
                    <p className="text-[10px]" style={{ color: 'var(--fi-text-muted)' }}>Scan to open report</p>
                    <button
                      onClick={handleDownloadQR}
                      className="flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-md transition-colors"
                      style={{ color: 'var(--fi-text-muted)', border: '1px solid var(--fi-border)' }}
                    >
                      <Download className="w-3 h-3" />
                      Download QR
                    </button>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    background: 'var(--fi-primary)',
                    color: '#fff',
                  }}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
                <button
                  onClick={handleOpenPDF}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    background: 'var(--fi-bg-secondary)',
                    color: 'var(--fi-text-primary)',
                    border: '1px solid var(--fi-border)',
                  }}
                >
                  <Download className="w-3.5 h-3.5" />
                  Open & Download PDF
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleCreateLink}
              disabled={isCreating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors"
              style={{
                background: isCreating ? 'rgba(16,185,129,0.5)' : 'var(--fi-primary)',
                color: '#fff',
                cursor: isCreating ? 'not-allowed' : 'pointer',
              }}
            >
              {isCreating ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating with AI...</>
              ) : (
                <><Share2 className="w-3.5 h-3.5" /> Generate Share Link</>
              )}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
