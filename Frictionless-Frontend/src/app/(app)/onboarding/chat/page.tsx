'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, User, Send, Paperclip, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase/client';
import { validateWebsite } from '@/lib/website-validation';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { QUESTIONNAIRE } from '@/lib/onboarding-questionnaire';

const QUESTION_ORDER = ['primary_sector', 'product_status', 'funding_stage', 'round_target', 'entity_type', 'revenue_model'] as const;

type Step = 'website' | 'pitch_deck' | 'waiting_extraction' | 'questionnaire' | 'calculating' | 'thesis_document' | 'done';

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  at: Date;
}

const STARTUP_INITIAL =
  "Welcome! To get you set up, we'll need two things: your startup's website and your pitch deck (PDF). First, please paste your startup's website URL below.";

const LOOKING_UP =
  "Looking up your company… This may take a few seconds.";
const AFTER_WEBSITE =
  "Thanks! Now please upload your pitch deck (PDF). Use the attachment button below to upload the file.";

const AFTER_PITCH_DECK =
  "We've saved your pitch deck. Almost done! I'll ask you 6 quick questions so we can calculate your readiness score.";

const INVESTOR_INITIAL =
  "Welcome! To get you set up, we'll need your firm's website and your thesis fit document (PDF). First, please paste your website URL below.";

const AFTER_WEBSITE_INVESTOR =
  "Thanks! Now please upload your thesis fit document (PDF). This can be your investment thesis, focus areas, or criteria—whatever best describes what you look for. Use the attachment button below to upload.";

const AFTER_THESIS = "We've saved your thesis document. Redirecting you to your dashboard…";

export default function OnboardingChatPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isInvestor = user?.org_type === 'capital_provider';
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [step, setStep] = useState<Step>('website');
  const [input, setInput] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState(''); // kept in state until both steps done; not saved to backend until file upload
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [questionnaire, setQuestionnaire] = useState({
    primary_sector: '',
    product_status: '',
    funding_stage: '',
    round_target: '',
    entity_type: '',
    revenue_model: '',
  });
  const [questionnaireOther, setQuestionnaireOther] = useState({
    primary_sector: '',
    round_target: '',
    entity_type: '',
  });
  const [questionnaireIndex, setQuestionnaireIndex] = useState(0);
  const [pendingOtherFor, setPendingOtherFor] = useState<keyof typeof questionnaireOther | null>(null);
  const [otherInputValue, setOtherInputValue] = useState('');
  const [submittingQuestionnaire, setSubmittingQuestionnaire] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    if (user.org_type !== 'startup' && user.org_type !== 'capital_provider') {
      router.replace('/dashboard');
      return;
    }
    if (messages.length === 0) {
      const content = user.org_type === 'capital_provider' ? INVESTOR_INITIAL : STARTUP_INITIAL;
      setMessages([{ id: '1', role: 'assistant', content, at: new Date() }]);
      setStep('website');
    }
  }, [user, router, messages.length]);

  // On mount: redirect if completed; clear partial if needed; resume at correct step
  useEffect(() => {
    if (!user || (user.org_type !== 'startup' && user.org_type !== 'capital_provider')) return;
    let cancelled = false;
    (async () => {
      const token = await getAccessToken();
      if (!token || cancelled) return;
      const statusRes = await fetch('/api/onboarding/status', { headers: { Authorization: `Bearer ${token}` } });
      const statusJson = await statusRes.json().catch(() => ({}));
      if (cancelled) return;
      if (statusJson.completed) {
        router.replace('/dashboard');
        return;
      }
      await fetch('/api/onboarding/clear-partial', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      // Resume at correct step for startups (e.g. returned after pitch deck, need questionnaire)
      if (!cancelled && user.org_type === 'startup' && statusJson.step === 'questionnaire') {
        const extRes = await fetch('/api/extraction/data', { headers: { Authorization: `Bearer ${token}` } });
        const extJson = await extRes.json().catch(() => ({}));
        const extractionReady = extJson.status === 'ready' && extJson.extraction_data?.ocr_storage_path;
        if (cancelled) return;
        if (extractionReady) {
          setStep('questionnaire');
          const firstQ = QUESTIONNAIRE[QUESTION_ORDER[0]];
          setMessages([
            { id: '1', role: 'assistant', content: STARTUP_INITIAL, at: new Date() },
            { id: '2', role: 'assistant', content: AFTER_PITCH_DECK, at: new Date() },
            { id: '3', role: 'assistant', content: firstQ.question, at: new Date() },
          ]);
          setQuestionnaireIndex(0);
        } else {
          // Extraction not ready (user left during extraction): reset to start so they re-enter website + pitch deck
          await fetch('/api/onboarding/reset-to-start', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (cancelled) return;
          setStep('website');
          setMessages([{ id: '1', role: 'assistant', content: STARTUP_INITIAL, at: new Date() }]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user, router]);

  const showThesisStep = step === 'thesis_document';
  const showPitchDeckStep = step === 'pitch_deck';
  const showWaitingExtractionStep = step === 'waiting_extraction';
  const showQuestionnaireStep = step === 'questionnaire';
  const showCalculatingStep = step === 'calculating';

  const pollExtractionUntilReady = async (token: string) => {
    const poll = async (): Promise<void> => {
      const res = await fetch('/api/extraction/data', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      const extractionReady = data.status === 'ready' && data.extraction_data?.ocr_storage_path;
      if (extractionReady) {
        addMessage('assistant', AFTER_PITCH_DECK);
        const firstQ = QUESTIONNAIRE[QUESTION_ORDER[0]];
        addMessage('assistant', firstQ.question);
        setStep('questionnaire');
        setQuestionnaireIndex(0);
        return;
      }
      setTimeout(poll, 3500);
    };
    setTimeout(poll, 3000);
  };

  const pollReadinessAndRedirect = async (token: string) => {
    const poll = async (): Promise<void> => {
      const res = await fetch('/api/readiness/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (data.status === 'ready') {
        setStep('done');
        router.replace('/dashboard');
        return;
      }
      setTimeout(poll, 2500);
    };
    setTimeout(poll, 2000);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const getAccessToken = async (): Promise<string | null> => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ?? null;
  };

  const addMessage = (role: 'assistant' | 'user', content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: String(prev.length + 1), role, content, at: new Date() },
    ]);
  };

  const sendWebsite = async () => {
    const raw = input.trim();
    if (!raw) return;
    const validation = validateWebsite(raw);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }
    const url = validation.sanitized;
    setWebsiteUrl(url);
    addMessage('user', url);
    setInput('');
    setSending(true);
    if (!isInvestor) {
      addMessage('assistant', LOOKING_UP);
    }
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Session expired. Please sign in again.');
        setSending(false);
        return;
      }
      const res = await fetch('/api/onboarding/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ website: url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || 'Failed to save website');
        setSending(false);
        return;
      }
      // Only after Apollo enrichment succeeds (for startups) or website save (for investors)
      if (isInvestor) {
        addMessage('assistant', AFTER_WEBSITE_INVESTOR);
        setStep('thesis_document');
      } else {
        addMessage('assistant', AFTER_WEBSITE);
        setStep('pitch_deck');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    }
    setSending(false);
  };

  const uploadPitchDeck = async (file: File) => {
    const token = await getAccessToken();
    if (!token) {
      toast.error('Session expired. Please sign in again.');
      return;
    }
    if (!websiteUrl.trim()) {
      toast.error('Please enter your website URL first.');
      return;
    }
    setUploading(true);
    addMessage('user', `Uploaded: ${file.name}`);
    try {
      const websiteRes = await fetch('/api/onboarding/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ website: websiteUrl.trim() }),
      });
      const websiteData = await websiteRes.json().catch(() => ({}));
      if (!websiteRes.ok) {
        toast.error(websiteData?.error || 'Failed to save website');
        setUploading(false);
        return;
      }
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/onboarding/pitch-deck', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || 'Failed to upload pitch deck');
        setUploading(false);
        return;
      }
      setStep('waiting_extraction');
      pollExtractionUntilReady(token);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    }
    setUploading(false);
  };

  const uploadThesisDocument = async (file: File) => {
    const token = await getAccessToken();
    if (!token) {
      toast.error('Session expired. Please sign in again.');
      return;
    }
    if (!websiteUrl.trim()) {
      toast.error('Please enter your website URL first.');
      return;
    }
    setUploading(true);
    addMessage('user', `Uploaded: ${file.name}`);
    try {
      const websiteRes = await fetch('/api/onboarding/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ website: websiteUrl.trim() }),
      });
      const websiteData = await websiteRes.json().catch(() => ({}));
      if (!websiteRes.ok) {
        toast.error(websiteData?.error || 'Failed to save website');
        setUploading(false);
        return;
      }
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/onboarding/thesis-document', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || 'Failed to upload thesis document');
        setUploading(false);
        return;
      }
      addMessage('assistant', AFTER_THESIS);
      setStep('done');
      setTimeout(() => router.replace('/dashboard'), 1500);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    }
    setUploading(false);
  };

  const submitQuestionnaire = async (
    override?: Partial<typeof questionnaire>,
    otherOverride?: Partial<typeof questionnaireOther>
  ) => {
    const data = { ...questionnaire, ...override };
    const otherData = { ...questionnaireOther, ...otherOverride };
    const { primary_sector, product_status, funding_stage, round_target, entity_type, revenue_model } = data;
    if (!primary_sector || !product_status || !funding_stage || !round_target || !entity_type || !revenue_model) {
      toast.error('Please answer all 6 questions.');
      return;
    }
    if (primary_sector === 'other' && !(otherData.primary_sector || '').trim()) {
      toast.error('Please specify your primary sector when you selected Other.');
      return;
    }
    if (round_target === 'other' && !(otherData.round_target || '').trim()) {
      toast.error('Please specify your round target when you selected Other.');
      return;
    }
    if (entity_type === 'other' && !(otherData.entity_type || '').trim()) {
      toast.error('Please specify your entity type when you selected Other.');
      return;
    }
    setSubmittingQuestionnaire(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Session expired. Please sign in again.');
        setSubmittingQuestionnaire(false);
        return;
      }
      const res = await fetch('/api/onboarding/questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          primary_sector,
          product_status,
          funding_stage,
          round_target,
          entity_type,
          revenue_model,
          ...(primary_sector === 'other' && { primary_sector_other: (otherData.primary_sector || '').trim() }),
          ...(round_target === 'other' && { round_target_other: (otherData.round_target || '').trim() }),
          ...(entity_type === 'other' && { entity_type_other: (otherData.entity_type || '').trim() }),
        } as Record<string, string>),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || 'Failed to save answers');
        setSubmittingQuestionnaire(false);
        return;
      }
      addMessage('assistant', "Thanks! We've saved your answers. Calculating your readiness score…");
      setStep('calculating');
      pollReadinessAndRedirect(token);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    }
    setSubmittingQuestionnaire(false);
  };

  const selectOption = (key: (typeof QUESTION_ORDER)[number], value: string, label: string) => {
    if (value === 'other') {
      if (key === 'primary_sector' || key === 'round_target' || key === 'entity_type') {
        setPendingOtherFor(key);
      }
      setOtherInputValue('');
      return;
    }
    applyOption(key, value, label);
  };

  const applyOption = (key: (typeof QUESTION_ORDER)[number], value: string, label: string) => {
    const idx = QUESTION_ORDER.indexOf(key);
    const updated = { ...questionnaire, [key]: value };
    setQuestionnaire(updated);
    addMessage('user', label);
    setPendingOtherFor(null);
    setOtherInputValue('');
    setQuestionnaireIndex(idx + 1);
    if (idx >= 5) {
      submitQuestionnaire({ [key]: value });
      return;
    }
    const nextKey = QUESTION_ORDER[idx + 1];
    const nextQ = QUESTIONNAIRE[nextKey];
    addMessage('assistant', nextQ.question);
  };

  const submitOtherInput = () => {
    if (!pendingOtherFor || !otherInputValue.trim()) return;
    const val = otherInputValue.trim();
    const key = pendingOtherFor;
    const idx = QUESTION_ORDER.indexOf(key);
    if (pendingOtherFor === 'primary_sector') {
      setQuestionnaireOther((p) => ({ ...p, primary_sector: val }));
      setQuestionnaire((p) => ({ ...p, primary_sector: 'other' }));
    } else if (pendingOtherFor === 'round_target') {
      setQuestionnaireOther((p) => ({ ...p, round_target: val }));
      setQuestionnaire((p) => ({ ...p, round_target: 'other' }));
    } else {
      setQuestionnaireOther((p) => ({ ...p, entity_type: val }));
      setQuestionnaire((p) => ({ ...p, entity_type: 'other' }));
    }
    addMessage('user', val);
    setPendingOtherFor(null);
    setOtherInputValue('');
    setQuestionnaireIndex(idx + 1);
    if (idx >= 5) {
      submitQuestionnaire({ [key]: 'other' }, { [key]: val });
      return;
    }
    const nextKey = QUESTION_ORDER[idx + 1];
    const nextQ = QUESTIONNAIRE[nextKey];
    addMessage('assistant', nextQ.question);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a PDF file.');
      return;
    }
    if (step === 'pitch_deck') {
      uploadPitchDeck(file);
    } else if (step === 'thesis_document') {
      uploadThesisDocument(file);
    }
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'website') sendWebsite();
  };

  if (!user || (user.org_type !== 'startup' && user.org_type !== 'capital_provider')) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-electric-blue" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-obsidian-900">
      <div className="border-b border-obsidian-700/50 px-4 py-3">
        <h1 className="text-lg font-display font-bold text-foreground">Onboarding</h1>
        <p className="text-sm text-muted-foreground">
          {isInvestor ? 'Upload your thesis fit document to get started.' : 'Share your website and pitch deck to get started.'}
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                m.role === 'assistant' ? 'bg-electric-blue/20 text-electric-blue' : 'bg-obsidian-600 text-foreground'
              }`}
            >
              {m.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div
              className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
                m.role === 'assistant'
                  ? 'bg-obsidian-800 text-foreground'
                  : 'bg-electric-blue/20 text-foreground border border-electric-blue/30'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              <p className="text-xs text-muted-foreground mt-1">{format(m.at, 'h:mm a')}</p>
            </div>
          </div>
        ))}

        {showWaitingExtractionStep && (
          <div className="flex justify-end">
            <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 bg-obsidian-800/50 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Processing…</span>
            </div>
          </div>
        )}
        {showCalculatingStep && (
          <div className="flex justify-end">
            <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 bg-obsidian-800/50 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Calculating readiness score…</span>
            </div>
          </div>
        )}
        {showQuestionnaireStep && !submittingQuestionnaire && (
          <div className="space-y-3">
            {pendingOtherFor ? (
              <div className="flex flex-row-reverse gap-3">
                <div className="max-w-[85%] space-y-2">
                  <p className="text-xs text-muted-foreground text-right mb-1">Your response</p>
                  <div className="flex gap-2 justify-end">
                    <Input
                      placeholder="Type your answer…"
                      value={otherInputValue}
                      onChange={(e) => setOtherInputValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submitOtherInput()}
                      className="bg-electric-blue/10 border-electric-blue/30 flex-1 max-w-[200px]"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={submitOtherInput}
                      disabled={!otherInputValue.trim()}
                      className="bg-electric-blue hover:bg-electric-blue/90 shrink-0"
                    >
                      Send
                    </Button>
                  </div>
                </div>
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-obsidian-600 text-foreground">
                  <User className="w-4 h-4" />
                </div>
              </div>
            ) : (
              <div className="flex flex-row-reverse gap-3">
                <div className="max-w-[85%]">
                  <p className="text-xs text-muted-foreground text-right mb-2">Choose one:</p>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {QUESTIONNAIRE[QUESTION_ORDER[questionnaireIndex]].options.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => selectOption(QUESTION_ORDER[questionnaireIndex], o.value, o.label)}
                        className="px-3 py-2 rounded-xl text-sm font-medium bg-electric-blue/20 hover:bg-electric-blue/30 border border-electric-blue/40 text-foreground transition-colors"
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-obsidian-600 text-foreground">
                  <User className="w-4 h-4" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className={`border-t border-obsidian-700/50 p-4 ${showQuestionnaireStep || showCalculatingStep || showWaitingExtractionStep ? 'hidden' : ''}`}>
        <div className="flex gap-2 items-end">
          {(showPitchDeckStep || showThesisStep) && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 flex-shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              </Button>
            </>
          )}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              step === 'website'
                ? 'Paste your website URL...'
                : showThesisStep
                  ? 'Upload your thesis document using the attachment button →'
                  : 'Or type a message...'
            }
            className="flex-1 h-11 rounded-lg bg-obsidian-800 border border-obsidian-600 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-electric-blue/50"
            disabled={step === 'done' || sending || uploading}
          />
          {step === 'website' && (
            <Button type="submit" className="h-11 px-4 bg-electric-blue hover:bg-electric-blue/90" disabled={sending || !input.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          )}
        </div>
        {showPitchDeckStep && (
          <p className="text-xs text-muted-foreground mt-2">Upload a PDF pitch deck using the attachment button.</p>
        )}
        {showThesisStep && (
          <p className="text-xs text-muted-foreground mt-2">Upload your thesis fit document (PDF) using the attachment button.</p>
        )}
      </form>
    </div>
  );
}
