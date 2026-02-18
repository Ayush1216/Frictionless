'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, Loader2, AlertTriangle, CheckCircle2, ShieldCheck, TrendingUp, TrendingDown, Info, X } from 'lucide-react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { geminiStream, isGeminiEnabled } from '@/lib/ai/gemini-client';
import { getPrompt } from '@/lib/ai/prompts';
import { getCachedAnalysis, setCachedAnalysis, buildScoreHash } from '@/lib/ai/analysis-cache';
import { useUIStore } from '@/stores/ui-store';
import type { ParsedRubricCategory } from '@/lib/readiness-rubric';

interface InvestorLensPreviewProps {
  overallScore: number;
  categories: ParsedRubricCategory[];
  companyName?: string;
  className?: string;
}

function getDemoMemo(companyName: string): string {
  return `## First Impression
${companyName} presents an intriguing profile. The team composition looks promising, but the data room has significant gaps that would slow down any diligence process.

## Strengths Worth Highlighting
- **Founding team** has relevant domain experience and complementary skill sets
- **Product development** shows clear direction with early market validation signals
- **Legal and structural foundations** are clean, reducing downstream friction

## Red Flags / Concerns
- **Financial documentation** is incomplete — no audited statements or projections
- **Go-to-market strategy** lacks specificity around unit economics and CAC/LTV
- **Limited third-party validation** — need more customer testimonials

## Verdict
Would I take a meeting with ${companyName}? **Yes, conditionally.** The team is compelling enough for a conversation, but I'd want financial projections and a clearer GTM strategy before advancing to full diligence.`;
}

export function InvestorLensPreview({
  overallScore,
  categories,
  companyName,
  className,
}: InvestorLensPreviewProps) {
  const [memo, setMemo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const theme = useUIStore((s) => s.theme);
  const name = companyName || 'your startup';

  const scoreHash = buildScoreHash(overallScore, categories);

  const investorMetrics = useMemo(() => {
    const sorted = [...categories].sort((a, b) => b.score - a.score);
    const strengths = sorted.filter((c) => c.score >= 86);
    const concerns = sorted.filter((c) => c.score < 80);
    const meetingReady = overallScore >= 80;
    const diligenceReady = overallScore >= 86;

    return { strengths, concerns, meetingReady, diligenceReady };
  }, [categories, overallScore]);

  const generate = useCallback(async () => {
    if (isLoading) return;
    const cached = getCachedAnalysis<string>('investor-lens', scoreHash);
    if (cached) { setMemo(cached); setHasGenerated(true); return; }

    setIsLoading(true);
    setMemo(null);

    const prompt = getPrompt('INVESTOR_LENS');
    const categoryData = categories
      .map((c) => {
        const missing = c.items.filter((i) => ((i.Points as number) ?? 0) === 0);
        return `${c.name}: ${c.score}% (${missing.length} gaps)`;
      })
      .join('\n');

    const userMessage = `Company: ${name}\nOverall readiness: ${overallScore}%\nStage: Seed\n\nCategories:\n${categoryData}`;

    let fullContent = '';
    try {
      if (isGeminiEnabled()) {
        for await (const chunk of geminiStream(`${prompt}\n\n${userMessage}`, { temperature: 0.5 })) {
          fullContent += chunk;
          setMemo(fullContent);
        }
      } else {
        const demoContent = getDemoMemo(name);
        for (const char of demoContent) {
          fullContent += char;
          if (fullContent.length % 8 === 0) {
            setMemo(fullContent);
            await new Promise((r) => setTimeout(r, 2));
          }
        }
        fullContent = demoContent;
        setMemo(fullContent);
      }
      setCachedAnalysis('investor-lens', scoreHash, fullContent);
      setHasGenerated(true);
    } catch {
      setMemo('Unable to generate investor analysis. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [overallScore, categories, scoreHash, isLoading]);

  // Auto-generate on mount
  useEffect(() => {
    if (!hasGenerated && !isLoading && !memo) {
      generate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('glass-card flex flex-col overflow-hidden relative', className)}
    >
      {/* Gold accent border */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400/60 via-amber-500/40 to-amber-400/60" />

      {/* Header + readiness gates — compact */}
      <div className="p-4 pb-3 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Eye className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-display font-semibold text-foreground">Investor Lens</h3>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="What is Investor Lens?"
          >
            {showInfo ? <X className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
          </button>
          <span className="text-[10px] text-muted-foreground ml-auto">VC Analyst View</span>
        </div>
        {showInfo ? (
          <div className="text-[11px] text-muted-foreground mb-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10 leading-relaxed">
            <strong className="text-foreground">How this helps you:</strong> Investor Lens shows how a VC analyst would evaluate {name} based on your readiness data. It highlights what excites investors, what concerns them, and whether they&apos;d take a meeting — so you can fix gaps <em>before</em> pitching.
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground mb-2">{name}&apos;s profile through investor eyes</p>
        )}

        {/* Readiness gates + quick stats in one row */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold border',
            investorMetrics.meetingReady
              ? 'bg-score-excellent/8 text-score-excellent border-score-excellent/20'
              : 'bg-score-poor/8 text-score-poor border-score-poor/20'
          )}>
            {investorMetrics.meetingReady ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
            Meeting Ready
          </div>
          <div className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold border',
            investorMetrics.diligenceReady
              ? 'bg-score-excellent/8 text-score-excellent border-score-excellent/20'
              : 'bg-muted text-muted-foreground border-border'
          )}>
            <ShieldCheck className="w-3 h-3" />
            Diligence Ready
          </div>
          <div className="flex items-center gap-3 ml-auto text-[10px]">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-score-excellent" />
              <span className="font-semibold text-score-excellent">{investorMetrics.strengths.length}</span>
              <span className="text-muted-foreground">strengths</span>
            </span>
            <span className="flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-score-poor" />
              <span className="font-semibold text-score-poor">{investorMetrics.concerns.length}</span>
              <span className="text-muted-foreground">concerns</span>
            </span>
          </div>
        </div>
      </div>

      {/* Memo content */}
      <div className="flex-1 overflow-y-auto border-t border-border/30 max-h-[400px]">
        {isLoading && !memo && (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            <span className="text-xs text-muted-foreground">Generating analyst memo...</span>
          </div>
        )}

        {memo && (
          <div className={cn(
            'p-4 prose prose-sm max-w-none text-foreground',
            '[&>h2]:text-xs [&>h2]:font-display [&>h2]:font-semibold [&>h2]:mt-3 [&>h2]:mb-1 [&>h2]:text-amber-600 [&>h2]:dark:text-amber-400 [&>h2]:uppercase [&>h2]:tracking-wider',
            '[&>ul]:space-y-0.5 [&>p]:text-xs [&>p]:text-muted-foreground [&>p]:leading-relaxed',
            '[&>ul>li]:text-xs [&>ul>li]:text-muted-foreground',
            '[&_strong]:text-foreground [&_strong]:font-medium',
            theme === 'dark' ? 'prose-invert' : ''
          )}>
            <ReactMarkdown>{memo}</ReactMarkdown>
            {isLoading && <span className="inline-block w-0.5 h-3 bg-amber-500 animate-pulse ml-0.5" />}
          </div>
        )}
      </div>

      {!isLoading && hasGenerated && (
        <div className="px-4 py-2 border-t border-border/30 shrink-0">
          <button
            onClick={generate}
            className="text-[10px] text-amber-500 font-medium hover:underline"
          >
            Regenerate memo
          </button>
        </div>
      )}
    </motion.div>
  );
}
