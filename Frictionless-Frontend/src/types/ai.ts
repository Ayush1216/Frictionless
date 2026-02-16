/**
 * AI-specific types for the Frictionless Intelligence platform.
 * Used for chat, extraction, analysis, and scoring workflows.
 */

// ---------------------------------------------------------------------------
// Chat & Messaging
// ---------------------------------------------------------------------------

export type AIMessageRole = 'user' | 'assistant' | 'system';

export interface AIMessage {
  id: string;
  role: AIMessageRole;
  content: string;
  created_at: string;
  attachments?: string[];
}

// ---------------------------------------------------------------------------
// Streaming
// ---------------------------------------------------------------------------

export type AIStreamPhase = 'start' | 'chunk' | 'end' | 'error';

export interface AIStreamState {
  phase: AIStreamPhase;
  content?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Extraction & Analysis
// ---------------------------------------------------------------------------

export interface AIExtractionResult {
  field: string;
  value: string | number | boolean | null;
  confidence: number;
  source?: string;
}

export interface TaskAIResult {
  task_id: string;
  extractions: AIExtractionResult[];
  summary?: string;
  completed: boolean;
  requires_rescore: boolean;
}

export interface FileAnalysisResult {
  file_id: string;
  file_name: string;
  category: string;
  extractions: AIExtractionResult[];
  summary: string | null;
  confidence_overall: number;
  warnings?: string[];
}

// ---------------------------------------------------------------------------
// Match & Scoring
// ---------------------------------------------------------------------------

export interface MatchExplanation {
  summary: string;
  strengths: string[];
  considerations: string[];
  suggested_actions?: string[];
}

export interface ScoreImprovement {
  current_score: number;
  potential_score: number;
  delta: number;
  recommendations: string[];
  high_impact_tasks?: string[];
}
