'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Loader2, Target, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { geminiStream, isGeminiEnabled } from '@/lib/ai/gemini-client';
import { getPrompt } from '@/lib/ai/prompts';
import { getCachedAnalysis, setCachedAnalysis, buildScoreHash } from '@/lib/ai/analysis-cache';
import { useUIStore } from '@/stores/ui-store';
import type { ParsedRubricCategory } from '@/lib/readiness-rubric';

interface AIScoreDeepDiveProps {
  overallScore: number;
  categories: ParsedRubricCategory[];
  className?: string;
}

const DEMO_ANALYSIS = `## Executive Summary
Your startup shows solid foundational readiness with clear strengths in team composition and product development, but significant gaps in financial documentation and go-to-market strategy are holding your score back.

## Top Strengths
1. **Team & Founders** — Strong founding team with relevant domain experience and complementary skill sets
2. **Product Development** — Clear product-market fit signals with early traction metrics
3. **Foundational Setup** — Proper legal structure, clean cap table, and incorporation documents

## Critical Gaps
1. **Financial Metrics** — Missing audited financial statements and detailed revenue projections
2. **Go-to-Market Strategy** — No documented customer acquisition strategy or unit economics
3. **Traction & Validation** — Limited third-party validation and customer testimonials

## Recommended Priority Order
1. Upload financial statements and create 3-year projections (+8-12 pts)
2. Document customer acquisition strategy with unit economics (+6-10 pts)
3. Gather customer testimonials and case studies (+4-6 pts)
4. Complete competitive analysis with defensibility thesis (+3-5 pts)

## Time Estimates
- **To reach 80 (Good)**: ~2-3 weeks focusing on financial documentation and GTM strategy
- **To reach 90 (Excellent)**: Additional 3-4 weeks for validation materials and polish`;

export function AIScoreDeepDive({
  overallScore,
  categories,
  className,
}: AIScoreDeepDiveProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const theme = useUIStore((s) => s.theme);

  const scoreHash = buildScoreHash(overallScore, categories);

  // Quick stats from categories
  const strengths = categories.filter((c) => c.score >= 86).length;
  const gaps = categories.filter((c) => c.score < 80).length;
  const topCategory = [...categories].sort((a, b) => b.score - a.score)[0];
  const weakCategory = [...categories].sort((a, b) => a.score - b.score)[0];

  const generateAnalysis = useCallback(async () => {
    const cached = getCachedAnalysis<string>('score-deep-dive', scoreHash);
    if (cached) { setAnalysis(cached); return; }

    setIsLoading(true);
    setAnalysis(null);

    const prompt = getPrompt('SCORE_DEEP_DIVE');
    const categoryData = categories
      .map((c) => {
        const missing = c.items.filter((i) => ((i.Points as number) ?? 0) === 0);
        const partial = c.items.filter((i) => {
          const pts = (i.Points as number) ?? 0;
          const max = (i.maximum_points as number) ?? 0;
          return pts > 0 && pts < max;
        });
        return `${c.name}: ${c.score}% (${missing.length} missing, ${partial.length} partial)\n  Missing: ${missing.slice(0, 3).map((i) => i.Question).join(', ') || 'None'}`;
      })
      .join('\n');

    const userMessage = `Overall readiness score: ${overallScore}%\n\nCategory breakdown:\n${categoryData}`;

    let fullContent = '';
    try {
      if (isGeminiEnabled()) {
        for await (const chunk of geminiStream(`${prompt}\n\n${userMessage}`, { temperature: 0.4 })) {
          fullContent += chunk;
          setAnalysis(fullContent);
        }
      } else {
        for (const char of DEMO_ANALYSIS) {
          fullContent += char;
          if (fullContent.length % 8 === 0) {
            setAnalysis(fullContent);
            await new Promise((r) => setTimeout(r, 2));
          }
        }
        fullContent = DEMO_ANALYSIS;
        setAnalysis(fullContent);
      }
      setCachedAnalysis('score-deep-dive', scoreHash, fullContent);
    } catch {
      setAnalysis('Unable to generate analysis. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [overallScore, categories, scoreHash]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen && !analysis && !isLoading) {
      generateAnalysis();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className={cn('glass-card overflow-hidden', className)}
    >
      {/* Header bar with Frictionless logo + quick stats */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
      >
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
          <Image src="/ai-logo.png" alt="Frictionless" width={20} height={20} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-display font-semibold text-foreground">Frictionless Intelligence</h3>
          </div>
          {/* Quick stat chips */}
          <div className="flex items-center gap-2 mt-1">
            {strengths > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-score-excellent bg-score-excellent/8 px-2 py-0.5 rounded-full">
                <TrendingUp className="w-3 h-3" />
                {strengths} strong
              </span>
            )}
            {gaps > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-score-poor bg-score-poor/8 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                {gaps} gaps
              </span>
            )}
            {topCategory && (
              <span className="text-[10px] text-muted-foreground">
                Best: {topCategory.name} ({topCategory.score}%)
              </span>
            )}
          </div>
        </div>

        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-muted-foreground shrink-0">
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/30">
              {/* AI analysis content */}
              <div className="px-4 pb-4 pt-2">
                {isLoading && !analysis && (
                  <div className="flex items-center gap-2 py-6 justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Analyzing your readiness profile...</span>
                  </div>
                )}
                {analysis && (
                  <div className={cn(
                    'pt-2 prose prose-sm max-w-none text-foreground max-h-[400px] overflow-y-auto',
                    '[&>h2]:text-[13px] [&>h2]:font-display [&>h2]:font-semibold [&>h2]:mt-4 [&>h2]:mb-1.5 [&>h2]:text-foreground [&>h2]:uppercase [&>h2]:tracking-wider',
                    '[&>ol]:space-y-0.5 [&>ul]:space-y-0.5',
                    '[&>p]:text-[13px] [&>p]:text-muted-foreground [&>p]:leading-relaxed',
                    '[&>ol>li]:text-[13px] [&>ul>li]:text-[13px]',
                    '[&_strong]:text-foreground [&_strong]:font-medium',
                    theme === 'dark' ? 'prose-invert' : ''
                  )}>
                    <ReactMarkdown>{analysis}</ReactMarkdown>
                    {isLoading && <span className="inline-block w-0.5 h-3 bg-primary animate-pulse ml-0.5" />}
                  </div>
                )}
                {!isLoading && analysis && (
                  <button
                    onClick={(e) => { e.stopPropagation(); generateAnalysis(); }}
                    className="mt-3 text-xs text-primary font-medium hover:underline"
                  >
                    Regenerate analysis
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
