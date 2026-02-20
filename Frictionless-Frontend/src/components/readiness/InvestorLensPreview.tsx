'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, Loader2, AlertTriangle, CheckCircle2, ShieldCheck, TrendingUp, TrendingDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { TooltipInfo } from '@/components/ui/TooltipInfo';
import { geminiStream, isGeminiEnabled } from '@/lib/ai/gemini-client';
import { getPrompt } from '@/lib/ai/prompts';
import { getCachedAnalysis, setCachedAnalysis, clearCachedAnalysis, buildScoreHash } from '@/lib/ai/analysis-cache';
import { useUIStore } from '@/stores/ui-store';
import type { ParsedRubricCategory } from '@/lib/readiness-rubric';

interface InvestorLensPreviewProps {
  overallScore: number;
  categories: ParsedRubricCategory[];
  companyName?: string;
  className?: string;
}

const STRENGTH_TEMPLATES: Record<string, string> = {
  'Founder Team': 'The founding team has strong credentials with all key information documented, signalling transparency and credibility to investors.',
  'GTM Strategy': 'Go-to-market positioning is well-articulated, showing the team understands their target market and how to reach customers.',
  'Storytelling Comms': 'Consistent messaging across materials demonstrates a clear, compelling narrative that would hold up in an investor meeting.',
  'Product Maturity': 'Product development shows meaningful traction with validated milestones, reducing technical risk for potential investors.',
  'Financials': 'Financial documentation is thorough with clear projections and unit economics, providing the transparency investors need for diligence.',
  'Foundational Setup': 'Corporate structure and legal foundations are clean, reducing friction and downstream risk in any deal process.',
  'Traction Validation': 'Third-party validation metrics are solid — retention, engagement, or revenue signals give investors confidence in product-market fit.',
};

const CONCERN_TEMPLATES: Record<string, (score: number, gapName: string) => string> = {
  'Traction Validation': (s, g) => `At ${s}%, traction validation is weak. Key metrics like ${g} are missing, which investors rely on to gauge product-market fit.`,
  'Foundational Setup': (s, g) => `Scoring only ${s}% on structural Frictionless raises due diligence concerns. Items like ${g} are expected before any serious investor conversation.`,
  'Financials': (s, g) => `Financial Frictionless at ${s}% is a red flag. Without ${g}, investors cannot model returns or assess burn sustainability.`,
  'GTM Strategy': (s, g) => `Go-to-market strategy at ${s}% lacks depth. Missing clarity on ${g} makes it hard for investors to evaluate scalability.`,
  'Product Maturity': (s, g) => `Product maturity at ${s}% suggests early stage risk. ${g} would help demonstrate the product is beyond proof-of-concept.`,
  'Storytelling Comms': (s, g) => `At ${s}%, messaging consistency is weak. Investors cross-reference materials, and gaps like ${g} erode confidence.`,
  'Founder Team': (s, g) => `Team documentation at ${s}% is unusually low. Gaps like ${g} make it difficult for investors to evaluate the founding team.`,
};

function buildDemoMemo(
  overallScore: number,
  cats: ParsedRubricCategory[],
): string {
  const sorted = [...cats].sort((a, b) => b.score - a.score);
  const top = sorted.slice(0, 3);
  const bottom = sorted.filter((c) => c.score < 60).slice(0, 3);

  const strengthBullets = top.map((c) => {
    const template = STRENGTH_TEMPLATES[c.name];
    if (template) return `- **${c.name}** (${c.score}%) — ${template}`;
    const completedCount = c.items.filter((i) => ((i.Points as number) ?? 0) > 0).length;
    return `- **${c.name}** (${c.score}%) — ${completedCount} of ${c.items.length} rubric items completed, placing this category well above the meeting-ready threshold.`;
  });

  const concernBullets = bottom.length > 0
    ? bottom.map((c) => {
        const worst = c.items
          .filter((i) => ((i.Points as number) ?? 0) === 0)
          .sort((a, b) => ((b.maximum_points as number) ?? 0) - ((a.maximum_points as number) ?? 0))[0];
        const gapName = worst?.Subtopic_Name ?? worst?.Question ?? 'key documentation';
        const templateFn = CONCERN_TEMPLATES[c.name];
        if (templateFn) return `- ${templateFn(c.score, gapName)}`;
        const missingCount = c.items.filter((i) => ((i.Points as number) ?? 0) === 0).length;
        return `- **${c.name}** (${c.score}%) — ${missingCount} critical items remain incomplete, including ${gapName}. This would slow down any diligence process.`;
      })
    : ['- No critical gaps identified at this time.'];

  const verdict = overallScore >= 85
    ? `Would I take a meeting? **Yes, enthusiastically.** At ${overallScore}%, this startup is well-prepared for diligence. Minor gaps remain, but nothing that would slow down a serious investor conversation.`
    : overallScore >= 70
      ? `Would I take a meeting? **Yes, conditionally.** At ${overallScore}%, the profile is compelling enough for a conversation, but I'd want the weaker categories addressed before advancing to full diligence.`
      : overallScore >= 50
        ? `Would I take a meeting? **Not yet.** At ${overallScore}%, there are too many open gaps for a productive investor conversation. The red flags above need to be resolved first.`
        : `Would I take a meeting? **No.** At ${overallScore}%, the Frictionless profile has fundamental gaps across multiple categories. Significant groundwork is needed before this would warrant investor time.`;

  return `## First Impression
At ${overallScore}% overall Frictionless across ${cats.length} categories, the profile shows ${top[0] ? `clear strength in **${top[0].name}** (${top[0].score}%)` : 'early-stage progress'} but ${bottom.length > 0 ? `notable weakness in ${bottom.map((c) => `**${c.name}** (${c.score}%)`).join(' and ')}` : 'room for improvement across the board'}. ${overallScore >= 80 ? 'The overall score clears the meeting-ready bar, though gaps remain.' : 'The overall score falls short of the 80% meeting-ready threshold.'}

## Strengths Worth Highlighting
${strengthBullets.join('\n')}

## Red Flags / Concerns
${concernBullets.join('\n')}

## Verdict
${verdict}`;
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
  const [lensMode, setLensMode] = useState<'meeting' | 'diligence'>('meeting');
  const theme = useUIStore((s) => s.theme);
  const name = companyName || 'your startup';

  const scoreHash = buildScoreHash(overallScore, categories);

  const investorMetrics = useMemo(() => {
    const sorted = [...categories].sort((a, b) => b.score - a.score);
    const strengths = sorted.filter((c) => c.score >= 80);
    const concerns = sorted.filter((c) => c.score < 60);
    const meetingReady = overallScore >= 60;
    const diligenceReady = overallScore >= 80;
    return { strengths, concerns, meetingReady, diligenceReady };
  }, [categories, overallScore]);

  const generate = useCallback(async (force = false) => {
    if (isLoading) return;
    if (!force) {
      const cached = getCachedAnalysis<string>('investor-lens', scoreHash);
      if (cached) { setMemo(cached); setHasGenerated(true); return; }
    }
    clearCachedAnalysis('investor-lens');

    setIsLoading(true);
    setMemo(null);

    const prompt = getPrompt('INVESTOR_LENS');

    const formatItem = (i: typeof categories[0]['items'][0], prefix: string) => {
      const label = i.Subtopic_Name || i.Question || 'Unknown';
      const pts = `${i.Points ?? 0}/${i.maximum_points ?? '?'} pts`;
      const reasoning = i.Reasoning ? ` | Reasoning: ${i.Reasoning}` : '';
      const answer = i.Answer ? ` | Answer: ${i.Answer}` : '';
      return `    ${prefix} ${label} (${pts})${reasoning}${answer}`;
    };

    const categoryData = categories
      .map((c) => {
        const strong = c.items
          .filter((i) => ((i.Points as number) ?? 0) > 0)
          .sort((a, b) => ((b.Points as number) ?? 0) - ((a.Points as number) ?? 0))
          .slice(0, 3)
          .map((i) => formatItem(i, '[+]'));
        const gaps = c.items
          .filter((i) => ((i.Points as number) ?? 0) === 0 && ((i.maximum_points as number) ?? 0) > 0)
          .sort((a, b) => ((b.maximum_points as number) ?? 0) - ((a.maximum_points as number) ?? 0))
          .slice(0, 3)
          .map((i) => formatItem(i, '[-] MISSING:'));
        const partial = c.items
          .filter((i) => {
            const pts = (i.Points as number) ?? 0;
            const max = (i.maximum_points as number) ?? 0;
            return pts > 0 && max > 0 && pts < max;
          })
          .slice(0, 2)
          .map((i) => formatItem(i, '[~] PARTIAL:'));

        const lines = [`  ${c.name}: ${c.score}% (${c.items.length} rubric items)`];
        if (strong.length) lines.push('    Strengths:', ...strong);
        if (gaps.length) lines.push('    Gaps:', ...gaps);
        if (partial.length) lines.push('    Partial:', ...partial);
        return lines.join('\n');
      })
      .join('\n\n');

    const meetingReady = overallScore >= 70 ? 'Yes' : 'No';
    const diligenceReady = overallScore >= 85 ? 'Yes' : 'No';

    const userMessage = [
      `Overall Frictionless: ${overallScore}%`,
      `Meeting-ready threshold (70%): ${meetingReady}`,
      `Diligence-ready threshold (85%): ${diligenceReady}`,
      `Total categories: ${categories.length}`,
      '',
      'Detailed category breakdown:',
      categoryData,
    ].join('\n');

    let fullContent = '';
    try {
      if (isGeminiEnabled()) {
        for await (const chunk of geminiStream(`${prompt}\n\n${userMessage}`, { temperature: 0.5 })) {
          fullContent += chunk;
          setMemo(fullContent);
        }
      } else {
        const demoContent = buildDemoMemo(overallScore, categories);
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
      className={`glass-card overflow-hidden relative ${className ?? ''}`}
    >
      {/* Gold accent border */}
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(to right, rgba(245,158,11,0.6), rgba(245,158,11,0.3), rgba(245,158,11,0.6))' }} />

      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <Eye className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-display font-semibold text-foreground">Investor Lens</h3>
            <TooltipInfo text={`Investor Lens shows how a VC analyst would evaluate ${name}. It highlights what excites investors, what concerns them, and whether they'd take a meeting.`} />
          </div>
          <span className="text-xs text-muted-foreground">VC Analyst View</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3 ml-[30px]">Your profile through investor eyes</p>

        {/* Frictionless gates + quick stats */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Meeting / Diligence toggles */}
          <div className="flex rounded-lg p-0.5 bg-muted/40">
            {(['meeting', 'diligence'] as const).map((mode) => {
              const isActive = lensMode === mode;
              const label = mode === 'meeting' ? 'Meeting Ready' : 'Diligence Ready';
              const ready = mode === 'meeting' ? investorMetrics.meetingReady : investorMetrics.diligenceReady;
              return (
                <button
                  key={mode}
                  onClick={() => setLensMode(mode)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    isActive
                      ? `bg-card ${ready ? 'text-score-excellent' : 'text-score-poor'}`
                      : 'text-muted-foreground'
                  }`}
                >
                  {ready ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 ml-auto text-xs">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-score-excellent" />
              <span className="font-semibold text-score-excellent">{investorMetrics.strengths.length}</span>
              <span className="text-muted-foreground">strengths</span>
            </span>
            <span className="flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-score-poor" />
              <span className="font-semibold text-score-poor">{investorMetrics.concerns.length}</span>
              <span className="text-muted-foreground">concerns</span>
            </span>
          </div>
        </div>
      </div>

      {/* Memo content */}
      <div className="overflow-y-auto border-t border-border/30 max-h-[420px]">
        {isLoading && !memo && (
          <div className="flex items-center justify-center gap-2 py-10">
            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            <span className="text-sm text-muted-foreground">Generating analyst memo...</span>
          </div>
        )}

        {memo && (
          <div className={`px-5 py-4 prose prose-sm max-w-none text-foreground
            [&>h2]:text-[13px] [&>h2]:font-display [&>h2]:font-semibold [&>h2]:mt-5 [&>h2]:mb-1.5 [&>h2]:text-amber-600 [&>h2]:dark:text-amber-400 [&>h2]:uppercase [&>h2]:tracking-wider
            [&>h2:first-child]:mt-0
            [&>ul]:space-y-1 [&>ul]:mt-1.5 [&>ul]:mb-2
            [&>p]:text-[13px] [&>p]:text-muted-foreground [&>p]:leading-relaxed [&>p]:my-1.5
            [&>ul>li]:text-[13px] [&>ul>li]:text-muted-foreground [&>ul>li]:leading-relaxed
            [&_strong]:text-foreground [&_strong]:font-semibold
            ${theme === 'dark' ? 'prose-invert' : ''}`}>
            <ReactMarkdown>{memo}</ReactMarkdown>
            {isLoading && <span className="inline-block w-0.5 h-3.5 bg-amber-500 animate-pulse ml-0.5" />}
          </div>
        )}
      </div>

      {!isLoading && hasGenerated && (
        <div className="px-5 py-3 border-t border-border/30">
          <button
            onClick={() => generate(true)}
            className="text-sm text-amber-500 font-medium hover:underline"
          >
            Regenerate memo
          </button>
        </div>
      )}
    </motion.div>
  );
}
