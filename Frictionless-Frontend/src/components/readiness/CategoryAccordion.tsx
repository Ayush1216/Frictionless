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

interface CategoryAccordionProps {
  categories: Category[];
  missingData: MissingItem[];
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Storytelling & Pitch': <Mic className="w-4 h-4" />,
  'Founder & Team': <Users className="w-4 h-4" />,
  'Product & Technology': <Cpu className="w-4 h-4" />,
  'Foundational Setup': <Settings className="w-4 h-4" />,
  'Metrics & Financials': <BarChart3 className="w-4 h-4" />,
  'Go-To-Market Strategy': <Megaphone className="w-4 h-4" />,
  'Traction & Validation': <TrendingUp className="w-4 h-4" />,
};

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

export function CategoryAccordion({ categories, missingData }: CategoryAccordionProps) {
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
        {categories.map((cat, idx) => {
          const missing = getMissingForCategory(cat.name);
          const tips = CATEGORY_TIPS[cat.name] ?? [];

          return (
            <AccordionItem key={cat.name} value={cat.name} className="border-none">
              <AccordionTrigger className="px-4 lg:px-6 hover:no-underline hover:bg-obsidian-700/30 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                  {/* Icon */}
                  <div className="w-8 h-8 rounded-lg bg-obsidian-700/60 flex items-center justify-center text-muted-foreground shrink-0">
                    {CATEGORY_ICONS[cat.name]}
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
                  {/* Tips */}
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
