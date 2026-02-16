'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MessageSquare, Loader2, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskFileUpload } from './TaskFileUpload';
import { AIExtractionCard } from '@/components/ai/AIExtractionCard';
import { useTaskStore } from '@/stores/task-store';
import type { AIExtraction } from '@/types/database';

// Demo AI extraction results
const demoExtractions: AIExtraction[] = [
  { field: 'Company Name', value: 'NeuralPay Inc.', confidence: 0.97 },
  { field: 'Incorporation Date', value: '2023-03-15', confidence: 0.92 },
  { field: 'State of Incorporation', value: 'Delaware', confidence: 0.95 },
  { field: 'Registered Agent', value: 'Corporation Service Company', confidence: 0.88 },
  { field: 'Share Classes', value: 'Common + Series Seed Preferred', confidence: 0.78 },
];

type CompletionStep = 'idle' | 'file-selected' | 'analyzing' | 'results' | 'accepted';

interface TaskAICompletionProps {
  taskId: string;
  className?: string;
}

export function TaskAICompletion({ taskId, className }: TaskAICompletionProps) {
  const [step, setStep] = useState<CompletionStep>('idle');
  const [showConfetti, setShowConfetti] = useState(false);
  const completeTaskWithAI = useTaskStore((s) => s.completeTaskWithAI);

  const handleFileSelect = useCallback(() => {
    setStep('file-selected');
    // Auto-start analysis after a brief delay
    setTimeout(() => {
      setStep('analyzing');
      setTimeout(() => setStep('results'), 2500);
    }, 800);
  }, []);

  const handleAccept = useCallback(() => {
    completeTaskWithAI(taskId, demoExtractions, 'ai_file_upload');
    setStep('accepted');
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  }, [taskId, completeTaskWithAI]);

  const handleReject = useCallback(() => {
    setStep('idle');
  }, []);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-electric-purple" />
        <h4 className="text-sm font-semibold text-foreground">Complete with AI</h4>
      </div>

      <AnimatePresence mode="wait">
        {/* Confetti overlay */}
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-3 bg-obsidian-800/90 backdrop-blur-xl border border-score-excellent/30 rounded-2xl p-8 shadow-xl"
            >
              <PartyPopper className="w-12 h-12 text-score-excellent" />
              <p className="text-lg font-display font-bold text-foreground">Task Complete!</p>
              <p className="text-sm text-muted-foreground">Score rescore queued</p>
            </motion.div>
          </motion.div>
        )}

        {/* Idle: upload or chat */}
        {step === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <TaskFileUpload onFileSelect={handleFileSelect} />
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-obsidian-700/50" />
              <span className="text-xs text-obsidian-500 font-medium">or</span>
              <div className="flex-1 h-px bg-obsidian-700/50" />
            </div>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-obsidian-800/50 border border-obsidian-700/50 text-sm font-medium text-foreground hover:bg-obsidian-700/50 hover:border-electric-blue/20 transition-all">
              <MessageSquare className="w-4 h-4 text-electric-blue" />
              Chat with AI
            </button>
          </motion.div>
        )}

        {/* File selected / Analyzing */}
        {(step === 'file-selected' || step === 'analyzing') && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-8"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            >
              <Loader2 className="w-8 h-8 text-electric-blue" />
            </motion.div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">AI is analyzing your document...</p>
              <p className="text-xs text-muted-foreground mt-1">Extracting fields and validating data</p>
            </div>
            {/* Fake progress steps */}
            <div className="space-y-2 w-full max-w-xs">
              {['Reading document', 'Extracting fields', 'Validating data'].map((label, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.6 }}
                  className="flex items-center gap-2 text-xs"
                >
                  <motion.div
                    className="w-4 h-4 rounded-full border-2 border-electric-blue flex items-center justify-center"
                    animate={step === 'analyzing' && i <= 1 ? { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.2)' } : {}}
                    transition={{ delay: i * 0.6 }}
                  >
                    {step === 'analyzing' && i <= 1 && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-2 h-2 rounded-full bg-score-excellent" />
                    )}
                  </motion.div>
                  <span className="text-muted-foreground">{label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Results */}
        {step === 'results' && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AIExtractionCard
              extractions={demoExtractions}
              onAcceptAll={handleAccept}
              onReject={handleReject}
              onEdit={() => {}}
            />
          </motion.div>
        )}

        {/* Accepted */}
        {step === 'accepted' && (
          <motion.div
            key="accepted"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 py-6 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-score-excellent/20 flex items-center justify-center">
              <PartyPopper className="w-6 h-6 text-score-excellent" />
            </div>
            <p className="text-sm font-semibold text-foreground">Data accepted!</p>
            <p className="text-xs text-muted-foreground">Task marked as complete. Score rescore queued.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
