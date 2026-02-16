'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardList,
  Save,
  CheckCircle2,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Dummy questionnaire questions
interface Question {
  id: string;
  text: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'textarea';
  options?: string[];
  placeholder?: string;
  required?: boolean;
}

const QUESTIONNAIRE_NAME = 'Startup Readiness Assessment';

const QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: 'What is your current Monthly Recurring Revenue (MRR)?',
    type: 'number',
    placeholder: 'e.g. 50000',
    required: true,
  },
  {
    id: 'q2',
    text: 'How many full-time employees do you have?',
    type: 'number',
    placeholder: 'e.g. 15',
    required: true,
  },
  {
    id: 'q3',
    text: 'What is your total addressable market (TAM) size?',
    type: 'select',
    options: ['< $100M', '$100M - $500M', '$500M - $1B', '$1B - $10B', '$10B+'],
    required: true,
  },
  {
    id: 'q4',
    text: 'Describe your core competitive advantage in 2-3 sentences.',
    type: 'textarea',
    placeholder: 'What makes your solution uniquely positioned...',
    required: true,
  },
  {
    id: 'q5',
    text: 'What is your primary customer acquisition channel?',
    type: 'select',
    options: ['Outbound Sales', 'Inbound Marketing', 'Product-Led Growth', 'Partnerships', 'Referrals', 'Other'],
    required: true,
  },
  {
    id: 'q6',
    text: 'What is your current customer count?',
    type: 'number',
    placeholder: 'e.g. 50',
  },
  {
    id: 'q7',
    text: 'Select all funding sources you have used.',
    type: 'multiselect',
    options: ['Bootstrapped', 'Angel', 'Pre-Seed', 'Seed', 'Series A', 'Series B+', 'Grants', 'Revenue'],
  },
  {
    id: 'q8',
    text: 'What is your monthly burn rate?',
    type: 'number',
    placeholder: 'e.g. 80000',
  },
  {
    id: 'q9',
    text: 'How many months of runway do you have?',
    type: 'number',
    placeholder: 'e.g. 18',
    required: true,
  },
  {
    id: 'q10',
    text: 'Describe your go-to-market strategy.',
    type: 'textarea',
    placeholder: 'How you plan to acquire and retain customers...',
  },
  {
    id: 'q11',
    text: 'What stage best describes your product?',
    type: 'select',
    options: ['Idea / Concept', 'MVP', 'Beta', 'Launched', 'Growth', 'Scaling'],
    required: true,
  },
  {
    id: 'q12',
    text: 'What is your gross margin percentage?',
    type: 'number',
    placeholder: 'e.g. 75',
  },
];

type Answers = Record<string, string | string[]>;

export default function QuestionnairePage() {
  const [answers, setAnswers] = useState<Answers>({});
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [submitted, setSubmitted] = useState(false);

  const answeredCount = QUESTIONS.filter((q) => {
    const a = answers[q.id];
    if (Array.isArray(a)) return a.length > 0;
    return !!a;
  }).length;

  const progress = Math.round((answeredCount / QUESTIONS.length) * 100);

  // Auto-save simulation
  const triggerAutoSave = useCallback(() => {
    setAutoSaveStatus('saving');
    setTimeout(() => setAutoSaveStatus('saved'), 1000);
    setTimeout(() => setAutoSaveStatus('idle'), 3000);
  }, []);

  const updateAnswer = (id: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  // Auto-save on answer change
  useEffect(() => {
    if (answeredCount > 0) {
      const t = setTimeout(triggerAutoSave, 1500);
      return () => clearTimeout(t);
    }
  }, [answers, answeredCount, triggerAutoSave]);

  const handleSubmit = () => {
    setAutoSaveStatus('saving');
    setTimeout(() => {
      setAutoSaveStatus('saved');
      setSubmitted(true);
    }, 1500);
  };

  if (submitted) {
    return (
      <div className="p-4 lg:p-8 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12 text-center space-y-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-16 h-16 rounded-full bg-score-excellent/10 flex items-center justify-center mx-auto"
          >
            <CheckCircle2 className="w-8 h-8 text-score-excellent" />
          </motion.div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            Questionnaire Submitted!
          </h2>
          <p className="text-muted-foreground">
            Your responses have been saved. Your readiness score will be updated shortly.
          </p>
          <Button
            className="mt-4 bg-electric-blue hover:bg-electric-blue/90 gap-2"
            onClick={() => (window.location.href = '/dashboard')}
          >
            Back to Dashboard <ChevronRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-1"
      >
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <ClipboardList className="w-7 h-7 text-electric-blue" />
          {QUESTIONNAIRE_NAME}
        </h1>
        <p className="text-muted-foreground text-sm">
          Complete this questionnaire to improve your readiness score.
        </p>
      </motion.div>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="glass-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Progress</span>
            {/* Auto-save indicator */}
            <span className="flex items-center gap-1.5 text-xs">
              {autoSaveStatus === 'saving' && (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-electric-blue" />
                  <span className="text-electric-blue">Saving...</span>
                </>
              )}
              {autoSaveStatus === 'saved' && (
                <>
                  <Save className="w-3 h-3 text-score-excellent" />
                  <span className="text-score-excellent">Saved</span>
                </>
              )}
            </span>
          </div>
          <span className="text-sm font-mono text-foreground">
            {answeredCount}/{QUESTIONS.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </motion.div>

      {/* Questions */}
      <div className="space-y-4">
        {QUESTIONS.map((q, idx) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + idx * 0.04 }}
            className="glass-card p-5"
          >
            <div className="flex items-start gap-3 mb-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-obsidian-700 text-xs font-mono text-muted-foreground shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {q.text}
                  {q.required && <span className="text-red-400 ml-1">*</span>}
                </p>
              </div>
            </div>

            <div className="ml-9">
              {q.type === 'text' && (
                <Input
                  value={(answers[q.id] as string) || ''}
                  onChange={(e) => updateAnswer(q.id, e.target.value)}
                  placeholder={q.placeholder}
                  className="bg-obsidian-800 border-obsidian-600"
                />
              )}

              {q.type === 'number' && (
                <Input
                  type="number"
                  value={(answers[q.id] as string) || ''}
                  onChange={(e) => updateAnswer(q.id, e.target.value)}
                  placeholder={q.placeholder}
                  className="bg-obsidian-800 border-obsidian-600 max-w-xs"
                />
              )}

              {q.type === 'textarea' && (
                <Textarea
                  value={(answers[q.id] as string) || ''}
                  onChange={(e) => updateAnswer(q.id, e.target.value)}
                  placeholder={q.placeholder}
                  className="bg-obsidian-800 border-obsidian-600 resize-none"
                  rows={3}
                />
              )}

              {q.type === 'select' && (
                <Select
                  value={(answers[q.id] as string) || ''}
                  onValueChange={(v) => updateAnswer(q.id, v)}
                >
                  <SelectTrigger className="bg-obsidian-800 border-obsidian-600 max-w-sm">
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent className="bg-obsidian-800 border-obsidian-600">
                    {q.options?.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {q.type === 'multiselect' && (
                <div className="flex flex-wrap gap-2">
                  {q.options?.map((opt) => {
                    const selected = ((answers[q.id] as string[]) || []).includes(opt);
                    return (
                      <button
                        key={opt}
                        onClick={() => {
                          const current = (answers[q.id] as string[]) || [];
                          updateAnswer(
                            q.id,
                            selected
                              ? current.filter((v) => v !== opt)
                              : [...current, opt]
                          );
                        }}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                          selected
                            ? 'bg-electric-blue/10 text-electric-blue border-electric-blue/30'
                            : 'bg-obsidian-800 text-muted-foreground border-obsidian-600 hover:border-obsidian-500'
                        )}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Submit */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center justify-between py-4"
      >
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-obsidian-700">
            {answeredCount}/{QUESTIONS.length} answered
          </Badge>
          {answeredCount === QUESTIONS.length && (
            <Badge className="bg-score-excellent/10 text-score-excellent border-score-excellent/20">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
            </Badge>
          )}
        </div>
        <Button
          onClick={handleSubmit}
          className="gap-2 bg-electric-blue hover:bg-electric-blue/90"
        >
          Submit Questionnaire <ChevronRight className="w-4 h-4" />
        </Button>
      </motion.div>
    </div>
  );
}
