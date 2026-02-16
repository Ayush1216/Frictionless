'use client';

import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { DeltaArrow } from '@/components/matches/DeltaArrow';
import {
  Lightbulb,
  ArrowRight,
  Mic,
  Users,
  Cpu,
  Settings,
  BarChart3,
  Megaphone,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Category {
  name: string;
  score: number;
  delta: number;
  weight: number;
}

interface MissingItem {
  item: string;
  severity: 'high' | 'medium' | 'low';
}

/** Rubric item from scored_rubric (startup_readiness_results) */
interface RubricItem {
  Question?: string;
  Answer?: string | null;
  Points?: number;
  Value?: string | null;
  Reasoning?: string | null;
  maximum_points?: number;
  Subtopic_Name?: string;
  [k: string]: unknown;
}

/** Parsed category from scored_rubric */
interface ParsedRubricCategory {
  key: string;
  name: string;
  score: number;
  weight: number;
  maximumPoint: number;
  items: RubricItem[];
}

function formatCategoryKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseScoredRubric(rubric: Record<string, unknown>): ParsedRubricCategory[] {
  const METADATA_KEYS = ['weight', 'Category_Name', 'maximum_point'];
  const result: ParsedRubricCategory[] = [];

  const SKIP_KEYS = ['totals', '_overall'];
  for (const [catKey, catVal] of Object.entries(rubric)) {
    if (SKIP_KEYS.includes(catKey.toLowerCase())) continue;
    if (!catVal || typeof catVal !== 'object' || Array.isArray(catVal)) continue;

    const meta = catVal as Record<string, unknown>;
    const categoryName = (meta.Category_Name as string) || formatCategoryKey(catKey);
    const weight = (meta.weight as number) ?? 0;
    const maximumPoint = (meta.maximum_point as number) ?? 100;

    const items: RubricItem[] = [];
    for (const [subKey, subVal] of Object.entries(meta)) {
      if (METADATA_KEYS.includes(subKey)) continue;
      if (!Array.isArray(subVal)) continue;
      for (const item of subVal) {
        if (item && typeof item === 'object' && 'options' in item) {
          items.push(item as RubricItem);
        }
      }
    }

    const totalPoints = items.reduce((sum, i) => sum + ((i.Points as number) ?? 0), 0);
    const totalMax = items.reduce((sum, i) => sum + ((i.maximum_points as number) ?? 0), 0);
    const score = totalMax > 0 ? Math.round((totalPoints / totalMax) * 100) : 0;

    result.push({
      key: catKey,
      name: categoryName,
      score,
      weight,
      maximumPoint,
      items,
    });
  }

  return result;
}

interface CategoryAccordionProps {
  categories: Category[];
  missingData: MissingItem[];
  /** When present, use scored_rubric from startup_readiness_results for detailed table view */
  scoredRubric?: Record<string, unknown> | null;
}

function getCategoryIcon(name: string): React.ReactNode {
  const icons: Record<string, React.ReactNode> = {
    'Storytelling & Pitch': <Mic className="w-4 h-4" />,
    'Founder & Team': <Users className="w-4 h-4" />,
    'Founder Team': <Users className="w-4 h-4" />,
    'Product & Technology': <Cpu className="w-4 h-4" />,
    'Foundational Setup': <Settings className="w-4 h-4" />,
    'Metrics & Financials': <BarChart3 className="w-4 h-4" />,
    'Go-To-Market Strategy': <Megaphone className="w-4 h-4" />,
    'Traction & Validation': <TrendingUp className="w-4 h-4" />,
  };
  return icons[name] ?? <BarChart3 className="w-4 h-4" />;
}

const CATEGORY_TIPS: Record<string, string[]> = {
  'Storytelling & Pitch': [
    'Refine your elevator pitch to 30 seconds',
    'Add a compelling origin story',
    'Include specific metrics in your deck',
  ],
  'Founder & Team': [
    'Complete all team bios with achievements',
    'Highlight domain expertise',
    'Show advisory board credentials',
  ],
  'Product & Technology': [
    'Document your technical architecture',
    'Highlight patents or IP moat',
    'Show product roadmap with milestones',
  ],
  'Foundational Setup': [
    'Ensure legal docs are up to date',
    'Complete cap table documentation',
    'Set up proper data room',
  ],
  'Metrics & Financials': [
    'Update financial projections quarterly',
    'Show clear unit economics',
    'Document burn rate and runway',
  ],
  'Go-To-Market Strategy': [
    'Define clear ICP and buyer personas',
    'Document your sales process',
    'Show marketing ROI metrics',
  ],
  'Traction & Validation': [
    'Add customer testimonials',
    'Show month-over-month growth',
    'Include NPS or satisfaction scores',
  ],
};

function getScoreColor(score: number) {
  if (score >= 80) return 'bg-score-excellent';
  if (score >= 60) return 'bg-score-good';
  if (score >= 40) return 'bg-score-fair';
  return 'bg-score-poor';
}

function getScoreTextColor(score: number) {
  if (score >= 80) return 'text-score-excellent';
  if (score >= 60) return 'text-score-good';
  if (score >= 40) return 'text-score-fair';
  return 'text-score-poor';
}

export function CategoryAccordion({ categories, missingData, scoredRubric }: CategoryAccordionProps) {
  const parsedRubric = scoredRubric && typeof scoredRubric === 'object'
    ? parseScoredRubric(scoredRubric as Record<string, unknown>)
    : null;
  const useRubric = parsedRubric && parsedRubric.length > 0;
  const displayCategories = useRubric
    ? parsedRubric.map((p) => ({ name: p.name, score: p.score, delta: 0, weight: p.weight }))
    : categories;

  // Map missing items to categories
  const getMissingForCategory = (categoryName: string): MissingItem[] => {
    // Simple heuristic mapping
    const mapping: Record<string, string[]> = {
      'Storytelling & Pitch': ['Pitch deck', 'Pitch deck update'],
      'Founder & Team': ['Team bios'],
      'Product & Technology': ['Technical specs'],
      'Foundational Setup': ['Updated cap table'],
      'Metrics & Financials': ['Financial model', 'Financial projections', 'Updated financials', 'Unit economics detail', 'Churn analysis'],
      'Go-To-Market Strategy': ['Competitive analysis', 'Competitive landscape', 'Market sizing'],
      'Traction & Validation': ['Reference customers'],
    };

    const relevantItems = mapping[categoryName] ?? [];
    return missingData.filter((m) => relevantItems.includes(m.item));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-card overflow-hidden"
    >
      <div className="p-4 lg:p-6 border-b border-obsidian-600/50">
        <h2 className="text-lg font-display font-semibold text-foreground">
          Category Breakdown
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Detailed scores across 7 assessment dimensions
        </p>
      </div>

      <Accordion type="multiple" className="divide-y divide-obsidian-600/30">
        {displayCategories.map((cat, idx) => {
          const missing = getMissingForCategory(cat.name);
          const tips = CATEGORY_TIPS[cat.name] ?? [];
          const rubricCategory = useRubric ? parsedRubric[idx] : null;

          return (
            <AccordionItem key={cat.name} value={cat.name} className="border-none">
              <AccordionTrigger className="px-4 lg:px-6 hover:no-underline hover:bg-obsidian-700/30 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                  {/* Icon */}
                  <div className="w-8 h-8 rounded-lg bg-obsidian-700/60 flex items-center justify-center text-muted-foreground shrink-0">
                    {getCategoryIcon(cat.name)}
                  </div>

                  {/* Name + Bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-foreground truncate">
                        {cat.name}
                      </span>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <span className={cn('text-sm font-bold tabular-nums', getScoreTextColor(cat.score))}>
                          {cat.score}
                        </span>
                        <DeltaArrow delta={cat.delta} size="sm" />
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-obsidian-700 rounded-full overflow-hidden">
                      <motion.div
                        className={cn('h-full rounded-full', getScoreColor(cat.score))}
                        initial={{ width: 0 }}
                        animate={{ width: `${cat.score}%` }}
                        transition={{ duration: 0.8, delay: 0.1 * idx, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-4 lg:px-6">
                <div className="pl-11 space-y-4 pb-2">
                  {/* Rubric table from scored_rubric */}
                  {rubricCategory && rubricCategory.items.length > 0 && (
                    <div className="overflow-x-auto -mx-2">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-obsidian-600/50">
                            <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Question</th>
                            <th className="text-left py-2 px-2 font-semibold text-muted-foreground w-24">Answer</th>
                            <th className="text-left py-2 px-2 font-semibold text-muted-foreground w-16">Points</th>
                            <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Value / Reasoning</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rubricCategory.items.map((item, i) => (
                            <tr key={i} className="border-b border-obsidian-600/20">
                              <td className="py-2.5 px-2 text-foreground">{item.Question ?? '—'}</td>
                              <td className="py-2.5 px-2 text-obsidian-300">{String(item.Answer ?? '—')}</td>
                              <td className="py-2.5 px-2 tabular-nums">
                                <span className={cn(
                                  'font-medium',
                                  (item.Points ?? 0) >= (item.maximum_points ?? 0) * 0.8 ? 'text-score-excellent' :
                                  (item.Points ?? 0) >= (item.maximum_points ?? 0) * 0.5 ? 'text-score-good' :
                                  (item.Points ?? 0) > 0 ? 'text-score-fair' : 'text-score-poor',
                                )}>
                                  {(item.Points ?? 0)}/{(item.maximum_points ?? 0)}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 text-obsidian-300">
                                {item.Value && <span className="block text-xs mb-1">{item.Value}</span>}
                                {item.Reasoning && (
                                  <span className="block text-xs italic text-muted-foreground">{item.Reasoning}</span>
                                )}
                                {!item.Value && !item.Reasoning && '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Fallback: Tips when no rubric data */}
                  {(!useRubric || !rubricCategory?.items?.length) && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Improvement Tips
                      </h4>
                      <ul className="space-y-1.5">
                        {tips.map((tip) => (
                          <li key={tip} className="flex items-start gap-2 text-sm text-obsidian-300">
                            <Lightbulb className="w-3.5 h-3.5 text-score-fair mt-0.5 shrink-0" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Missing data items for this category */}
                  {missing.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-score-poor uppercase tracking-wider mb-2">
                        Missing Data
                      </h4>
                      <ul className="space-y-1.5">
                        {missing.map((m) => (
                          <li key={m.item} className="flex items-center gap-2 text-sm text-score-poor">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            {m.item}
                            <span className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase',
                              m.severity === 'high' && 'bg-score-poor/20 text-score-poor',
                              m.severity === 'medium' && 'bg-score-fair/20 text-score-fair',
                              m.severity === 'low' && 'bg-obsidian-600 text-obsidian-300',
                            )}>
                              {m.severity}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10 gap-1.5"
                  >
                    Improve This
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </motion.div>
  );
}
