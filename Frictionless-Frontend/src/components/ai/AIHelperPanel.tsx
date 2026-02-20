'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Send,
  Loader2,
  ArrowRight,
  LayoutDashboard,
  Building2,
  Gauge,
  Handshake,
  Bot,
  FolderOpen,
  CheckSquare,
  TrendingUp,
  Settings,
  BarChart3,
  FileText,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { geminiAnalyze, geminiStream, isGeminiEnabled } from '@/lib/ai/gemini-client';

// ---------------------------------------------------------------------------
// Page registry for intelligent navigation
// ---------------------------------------------------------------------------
interface PageEntry {
  label: string;
  href: string;
  icon: React.ElementType;
  keywords: string[];
  description: string;
}

const PAGE_REGISTRY: PageEntry[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, keywords: ['home', 'overview', 'summary', 'start'], description: 'Overview of Frictionless, tasks, and activity' },
  { label: 'Company Profile', href: '/startup/company-profile', icon: Building2, keywords: ['profile', 'company', 'startup', 'about', 'pitch', 'overview', 'team', 'founders', 'financials', 'charts', 'kpi'], description: 'Company data, team, financials, and charts' },
  { label: 'Frictionless', href: '/startup/readiness', icon: Gauge, keywords: ['Frictionless', 'score', 'assessment', 'rubric', 'improvement', 'gaps'], description: 'Investment Frictionless score and simulator' },
  { label: 'Tasks', href: '/startup/tasks', icon: CheckSquare, keywords: ['tasks', 'todo', 'action', 'checklist', 'pending', 'complete'], description: 'Task list and completion tracking' },
  { label: 'Investors', href: '/startup/investors', icon: Handshake, keywords: ['investors', 'match', 'matching', 'fund', 'vc', 'angel', 'capital', 'thesis'], description: 'AI-matched investors based on your thesis' },
  { label: 'AI Chat', href: '/startup/chat', icon: Bot, keywords: ['chat', 'ai', 'assistant', 'ask', 'question', 'help', 'frictionless'], description: 'Full AI conversation with Frictionless Intelligence' },
  { label: 'Analytics', href: '/startup/analytics', icon: BarChart3, keywords: ['analytics', 'metrics', 'charts', 'data', 'trends', 'growth', 'revenue'], description: 'Charts, metrics, and growth analytics' },
  { label: 'Data Room', href: '/startup/data-room', icon: FolderOpen, keywords: ['data room', 'documents', 'files', 'upload', 'pitch deck', 'cap table'], description: 'Document storage and management' },
  { label: 'Outreach Studio', href: '/startup/outreach-studio', icon: Send, keywords: ['outreach', 'email', 'investor outreach', 'cold email', 'template', 'campaign'], description: 'Investor outreach email campaigns' },
  { label: 'Deal Memo', href: '/startup/deal-memo', icon: FileText, keywords: ['deal memo', 'memo', 'investment memo', 'summary'], description: 'Auto-generated deal memo' },
  { label: 'Growth Hub', href: '/startup/growth-hub', icon: TrendingUp, keywords: ['growth', 'strategy', 'plan', 'roadmap'], description: 'Growth strategies and resources' },
  { label: 'Team Settings', href: '/settings/team', icon: Users, keywords: ['team', 'members', 'invite', 'roles'], description: 'Team management and invites' },
  { label: 'Settings', href: '/settings', icon: Settings, keywords: ['settings', 'preferences', 'account', 'profile', 'theme'], description: 'Account preferences and settings' },
];

// ---------------------------------------------------------------------------
// Quick actions (contextual)
// ---------------------------------------------------------------------------
interface QuickAction {
  label: string;
  description: string;
  icon: React.ElementType;
  action: 'navigate' | 'ai-query';
  href?: string;
  prompt?: string;
}

function getContextualActions(pathname: string): QuickAction[] {
  const base: QuickAction[] = [
    { label: 'Summarize my Frictionless', description: 'AI analysis of your current score and gaps', icon: Gauge, action: 'ai-query', prompt: 'Give me a brief summary of my startup Frictionless status. What are my top 3 strengths and top 3 gaps? Be concise and actionable.' },
    { label: 'Draft investor email', description: 'Generate a personalized outreach email', icon: Send, action: 'ai-query', prompt: 'Help me draft a concise, compelling cold outreach email to a potential investor. Include our key traction metrics and value proposition. Keep it under 150 words.' },
    { label: 'What should I focus on?', description: 'AI-powered priority recommendation', icon: Zap, action: 'ai-query', prompt: 'Based on my startup profile, what are the top 3 most impactful things I should focus on this week to improve my fundraising Frictionless? Be specific and actionable.' },
  ];

  if (pathname.includes('company-profile')) {
    base.unshift({ label: 'Analyze my profile completeness', description: 'Check what\'s missing', icon: Building2, action: 'ai-query', prompt: 'Analyze my company profile and tell me what sections are incomplete or weak. Suggest specific improvements for each section.' });
  }
  if (pathname.includes('investors')) {
    base.unshift({ label: 'Refine my investor strategy', description: 'Optimize your matching criteria', icon: Handshake, action: 'ai-query', prompt: 'Review my investor matching results. Suggest how I can improve my thesis profile to get better matches. What investor types should I target?' });
  }
  if (pathname.includes('tasks') || pathname.includes('Frictionless')) {
    base.unshift({ label: 'Prioritize my tasks', description: 'Smart task ordering', icon: CheckSquare, action: 'ai-query', prompt: 'Look at my current tasks and help me prioritize them by impact on my Frictionless score. Which 3 tasks will give me the biggest score improvement?' });
  }

  return base.slice(0, 4);
}

// ---------------------------------------------------------------------------
// Navigation intent detection
// ---------------------------------------------------------------------------
const NAV_INTENT_PATTERNS = [
  /^(?:take\s+me\s+to|go\s+to|open|show|navigate\s+to|bring\s+me\s+to|switch\s+to|visit|load)\s+/i,
  /\bpage$/i,
  /\bsection$/i,
];

function isNavigationIntent(query: string): boolean {
  return NAV_INTENT_PATTERNS.some((p) => p.test(query.trim()));
}

/** Strip nav-intent words to get the core search term */
function extractNavTarget(query: string): string {
  return query
    .replace(/^(?:take\s+me\s+to|go\s+to|open|show|navigate\s+to|bring\s+me\s+to|switch\s+to|visit|load)\s+/i, '')
    .replace(/\s*(?:page|section|screen|tab)$/i, '')
    .replace(/^(?:the|my)\s+/i, '')
    .trim();
}

// ---------------------------------------------------------------------------
// Search matching
// ---------------------------------------------------------------------------
function searchPages(query: string): PageEntry[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();

  const searchTerm = isNavigationIntent(q) ? extractNavTarget(q) : q;
  if (!searchTerm) return [];

  const words = searchTerm.split(/\s+/);

  return PAGE_REGISTRY
    .map((page) => {
      let score = 0;
      const haystack = [page.label, page.description, ...page.keywords].join(' ').toLowerCase();
      for (const word of words) {
        if (page.label.toLowerCase().includes(word)) score += 10;
        if (page.keywords.some((k) => k.includes(word))) score += 5;
        if (page.description.toLowerCase().includes(word)) score += 2;
        if (haystack.includes(word)) score += 1;
      }
      return { page, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.page)
    .slice(0, 5);
}

// ---------------------------------------------------------------------------
// Main Panel
// ---------------------------------------------------------------------------
interface AIHelperPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AIHelperPanel({ open, onClose }: AIHelperPanelProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [mode, setMode] = useState<'search' | 'ai'>('search');
  const inputRef = useRef<HTMLInputElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setAiResponse('');
      setMode('search');
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  // Auto-scroll AI response
  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [aiResponse]);

  const matchedPages = searchPages(query);
  const contextualActions = getContextualActions(pathname || '');
  const hasNavIntent = isNavigationIntent(query);
  const isAIQuery = query.trim().length > 2 && matchedPages.length === 0 && !hasNavIntent;

  const handleNavigate = useCallback((href: string) => {
    onClose();
    router.push(href);
  }, [onClose, router]);

  const handleAIQuery = useCallback(async (prompt: string) => {
    setMode('ai');
    setAiLoading(true);
    setAiResponse('');

    const contextStr = `Current page: ${pathname}\nUser query: ${prompt}`;
    const systemPrompt = `You are "Frictionless Intelligence" — the AI assistant for the Frictionless platform. You are an expert in startup fundraising, investor Frictionless, and pitch strategy. The user is on the "${pathname}" page.

Respond concisely (3-5 sentences max for simple questions, up to a short paragraph for complex ones). Be specific, actionable, and use bullet points when listing items. Reference specific features of the Frictionless platform when relevant (Frictionless Score, Investor Matching, Data Room, Tasks, etc.).

If the user asks about navigation, tell them which page to visit.`;

    try {
      if (isGeminiEnabled()) {
        const stream = geminiStream(`${systemPrompt}\n\n${contextStr}`, { temperature: 0.5, maxTokens: 1024 });
        for await (const chunk of stream) {
          setAiResponse((prev) => prev + chunk);
        }
      } else {
        // Fallback: try OpenAI via API route
        const res = await fetch('/api/ai/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: contextStr,
            systemPrompt,
          }),
        });
        const data = await res.json().catch(() => ({}));
        setAiResponse(data.summary || data.text || 'AI response unavailable. Please check your API configuration.');
      }
    } catch (err) {
      setAiResponse('Sorry, I encountered an error. Please try again.');
    }
    setAiLoading(false);
  }, [pathname]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (matchedPages.length > 0 && isNavigationIntent(query)) {
      handleNavigate(matchedPages[0].href);
      return;
    }

    if (matchedPages.length > 0 && query.trim().length <= 25) {
      handleNavigate(matchedPages[0].href);
      return;
    }

    handleAIQuery(query.trim());
  }, [query, matchedPages, handleNavigate, handleAIQuery]);

  const handleQuickAction = useCallback((action: QuickAction) => {
    if (action.action === 'navigate' && action.href) {
      handleNavigate(action.href);
    } else if (action.action === 'ai-query' && action.prompt) {
      setQuery(action.label);
      handleAIQuery(action.prompt);
    }
  }, [handleNavigate, handleAIQuery]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.8 }}
            className={cn(
              'fixed z-50',
              'sm:right-8 sm:bottom-28 sm:w-[420px] sm:max-h-[70vh]',
              'max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:max-h-[85vh]',
              'rounded-2xl max-sm:rounded-b-none shadow-2xl',
              'flex flex-col overflow-hidden',
            )}
            style={{
              background: 'var(--fi-bg-card)',
              border: '1px solid var(--fi-border)',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-4 pb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden p-0">
                <Image src="/ai-logo.png" alt="Frictionless" width={36} height={36} className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <h2
                  className="text-base font-semibold"
                  style={{ color: 'var(--fi-text-primary)' }}
                >
                  Frictionless Intelligence
                </h2>
                <p
                  className="text-[11px] truncate"
                  style={{ color: 'var(--fi-text-muted)' }}
                >
                  AI-Powered Assistant &middot; {pathname?.split('/').pop() || 'Dashboard'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--fi-text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search / Query input */}
            <form onSubmit={handleSubmit} className="px-5 pb-3">
              <div className="relative">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--fi-text-muted)', opacity: 0.5 }}
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (mode === 'ai') setMode('search');
                  }}
                  placeholder="Search pages, ask anything..."
                  className="w-full pl-10 pr-12 py-3 rounded-xl text-sm focus:outline-none transition-all"
                  style={{
                    background: 'var(--fi-bg-secondary)',
                    border: '1px solid var(--fi-border)',
                    color: 'var(--fi-text-primary)',
                  }}
                />
                <button
                  type="submit"
                  disabled={!query.trim() || aiLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={{
                    background: query.trim() ? 'var(--fi-primary)' : 'var(--fi-bg-secondary)',
                    color: query.trim() ? '#fff' : 'var(--fi-text-muted)',
                  }}
                >
                  {aiLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </form>

            {/* Content area */}
            <div ref={responseRef} className="flex-1 overflow-y-auto px-5 pb-5">
              {/* AI Response */}
              {mode === 'ai' && (aiResponse || aiLoading) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4"
                >
                  <div
                    className="rounded-xl p-4"
                    style={{
                      background: 'rgba(16,185,129,0.04)',
                      border: '1px solid rgba(16,185,129,0.12)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--fi-primary)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--fi-primary)' }}>AI Response</span>
                      {aiLoading && <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--fi-primary)' }} />}
                    </div>
                    <div
                      className="text-sm leading-relaxed whitespace-pre-wrap"
                      style={{ color: 'var(--fi-text-primary)' }}
                    >
                      {aiResponse || (
                        <span style={{ color: 'var(--fi-text-muted)', fontStyle: 'italic' }}>Thinking...</span>
                      )}
                    </div>
                  </div>

                  {/* Back to search */}
                  {!aiLoading && aiResponse && (
                    <button
                      onClick={() => { setMode('search'); setQuery(''); setAiResponse(''); }}
                      className="mt-2 text-xs flex items-center gap-1 transition-colors"
                      style={{ color: 'var(--fi-text-muted)' }}
                    >
                      <ArrowRight className="w-3 h-3 rotate-180" />
                      Back to search
                    </button>
                  )}
                </motion.div>
              )}

              {/* Search results */}
              {mode === 'search' && matchedPages.length > 0 && (
                <div className="mb-4">
                  <p
                    className="text-[11px] font-semibold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--fi-text-muted)' }}
                  >
                    Pages
                  </p>
                  <div className="space-y-1">
                    {matchedPages.map((page) => {
                      const Icon = page.icon;
                      return (
                        <button
                          key={page.href}
                          onClick={() => handleNavigate(page.href)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left group"
                          style={{ background: 'transparent' }}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(16,185,129,0.08)' }}
                          >
                            <Icon className="w-4 h-4" style={{ color: 'var(--fi-primary)' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" style={{ color: 'var(--fi-text-primary)' }}>{page.label}</p>
                            <p className="text-xs truncate" style={{ color: 'var(--fi-text-muted)' }}>{page.description}</p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 shrink-0 transition-all" style={{ color: 'var(--fi-text-muted)', opacity: 0.4 }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* AI suggestion when query doesn't match pages */}
              {mode === 'search' && isAIQuery && !aiLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4"
                >
                  <button
                    onClick={() => handleAIQuery(query)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group text-left"
                    style={{
                      background: 'rgba(16,185,129,0.04)',
                      border: '1px solid rgba(16,185,129,0.12)',
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'var(--fi-primary)' }}
                    >
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--fi-text-primary)' }}>
                        Ask: &ldquo;{query}&rdquo;
                      </p>
                      <p className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>
                        Get an AI-powered answer from Frictionless
                      </p>
                    </div>
                    <Send className="w-4 h-4 shrink-0" style={{ color: 'var(--fi-primary)', opacity: 0.5 }} />
                  </button>
                </motion.div>
              )}

              {/* Quick actions (when no query) */}
              {mode === 'search' && !query.trim() && (
                <>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--fi-text-muted)' }}
                  >
                    Quick actions
                  </p>
                  <div className="space-y-1 mb-4">
                    {contextualActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.label}
                          onClick={() => handleQuickAction(action)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left group"
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(16,185,129,0.08)' }}
                          >
                            <Icon className="w-4 h-4" style={{ color: 'var(--fi-primary)' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" style={{ color: 'var(--fi-text-primary)' }}>{action.label}</p>
                            <p className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>{action.description}</p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 shrink-0 transition-all" style={{ color: 'var(--fi-text-muted)', opacity: 0.4 }} />
                        </button>
                      );
                    })}
                  </div>

                  {/* Full chat link */}
                  <Link
                    href="/startup/chat"
                    onClick={onClose}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{
                      border: '1px solid var(--fi-border)',
                      color: 'var(--fi-text-muted)',
                    }}
                  >
                    <Bot className="w-4 h-4" />
                    Open full AI chat
                  </Link>
                </>
              )}
            </div>

            {/* Footer with keyboard shortcut hint */}
            <div
              className="px-5 py-2.5 flex items-center justify-between"
              style={{
                borderTop: '1px solid var(--fi-border)',
                background: 'var(--fi-bg-secondary)',
              }}
            >
              <span className="text-[10px]" style={{ color: 'var(--fi-text-muted)' }}>
                Frictionless Intelligence
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px]" style={{ color: 'var(--fi-text-muted)' }}>Press</span>
                <kbd
                  className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                  style={{
                    background: 'var(--fi-bg)',
                    border: '1px solid var(--fi-border)',
                    color: 'var(--fi-text-muted)',
                  }}
                >
                  Enter
                </kbd>
                <span className="text-[10px]" style={{ color: 'var(--fi-text-muted)' }}>to send</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
