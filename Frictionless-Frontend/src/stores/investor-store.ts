import { create } from 'zustand';
import { getAuthHeaders } from '@/lib/api/tasks';
import type { InvestorMatchResult } from '@/types/database';

type PipelineStatus = 'idle' | 'generating' | 'matching' | 'ready' | 'error';

interface InvestorFilters {
  scoreMin: number;
  scoreMax: number;
  eligibleOnly: boolean;
  search: string;
  sortBy: 'score_desc' | 'score_asc' | 'name_asc';
}

interface InvestorStore {
  matches: InvestorMatchResult[];
  status: PipelineStatus;
  loading: boolean;
  error: string | null;
  filters: InvestorFilters;
  lastFetched: number;
  /** How many new matches arrived on the last fetch (used to trigger notifications) */
  newMatchCount: number;
  /** True when we've received all expected matches (≥ TARGET_MATCHES or pipeline is done) */
  isFinalSet: boolean;
  /** Timestamp when we first entered generating/matching state (for timeout) */
  pipelineStartedAt: number;
  setFilters: (filters: Partial<InvestorFilters>) => void;
  fetchMatches: () => Promise<void>;
  getMatchById: (investorId: string) => InvestorMatchResult | undefined;
  /** Force re-trigger the pipeline (resets timeout and status) */
  retrigger: () => Promise<void>;
  /** Add a custom investor by name + website */
  addCustomInvestor: (investorName: string, investorUrl: string) => Promise<{ ok: boolean; match?: InvestorMatchResult; error?: string }>;
}

// Prevent duplicate concurrent fetches
let fetchInFlight: Promise<void> | null = null;

// Max time to poll before giving up (3 minutes)
const PIPELINE_TIMEOUT_MS = 3 * 60 * 1000;
// Target number of matches — keep polling until we reach this
const TARGET_MATCHES = 10;

export const useInvestorStore = create<InvestorStore>((set, get) => ({
  matches: [],
  status: 'idle',
  loading: false,
  error: null,
  lastFetched: 0,
  newMatchCount: 0,
  isFinalSet: false,
  pipelineStartedAt: 0,
  filters: {
    scoreMin: 0,
    scoreMax: 100,
    eligibleOnly: false,
    search: '',
    sortBy: 'score_desc',
  },

  setFilters: (partial) =>
    set((s) => ({ filters: { ...s.filters, ...partial } })),

  /** Get a match from the already-loaded list (for stale-while-revalidate on detail page) */
  getMatchById: (investorId: string) => {
    return get().matches.find((m) => m.investor_id === investorId);
  },

  retrigger: async () => {
    set({ status: 'idle', error: null, pipelineStartedAt: 0, lastFetched: 0, isFinalSet: false, newMatchCount: 0 });
    fetchInFlight = null;
    await get().fetchMatches();
  },

  addCustomInvestor: async (investorName: string, investorUrl: string) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/investors/add-custom', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ investor_name: investorName, investor_url: investorUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to add investor' };
      }
      // Re-fetch matches to include the new custom investor
      await get().fetchMatches();
      return { ok: true, match: data.match };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  },

  fetchMatches: async () => {
    // Dedupe: if a fetch is already in-flight, wait for it
    if (fetchInFlight) {
      await fetchInFlight;
      return;
    }

    const now = Date.now();
    const state = get();

    // Already have the full final set — only re-fetch if stale (8s)
    if (state.isFinalSet && now - state.lastFetched < 8_000) {
      return;
    }
    // Have partial results but fetched very recently — throttle to 3s
    if (state.status === 'ready' && state.matches.length > 0 && !state.isFinalSet && now - state.lastFetched < 3_000) {
      return;
    }

    // Check polling timeout: if we've been in generating/matching for too long, give up
    if (
      (state.status === 'generating' || state.status === 'matching') &&
      state.pipelineStartedAt > 0 &&
      now - state.pipelineStartedAt > PIPELINE_TIMEOUT_MS
    ) {
      set({
        status: 'error',
        loading: false,
        error: 'Investor matching timed out after 3 minutes. The backend may have crashed or is not running. Please check your backend terminal and try again.',
      });
      return;
    }

    set({ loading: true, error: null });

    const doFetch = async () => {
      try {
        const headers = await getAuthHeaders();
        // Fast-path: if we already know the pipeline is running, pass known_status
        // so the API route skips the slow backend status check and just checks Supabase
        const currentStatus = get().status;
        const statusParam = (currentStatus === 'generating' || currentStatus === 'matching')
          ? `?known_status=${currentStatus}` : '';
        const res = await fetch(`/api/startup/investors${statusParam}`, { headers, cache: 'no-store' });
        const data = await res.json();

        if (!res.ok) {
          set({ status: 'error', loading: false, error: data.error || 'Failed to fetch' });
          return;
        }

        if (data.status === 'generating' || data.status === 'matching') {
          const current = get();
          const pipelineStartedAt = (current.status === 'generating' || current.status === 'matching')
            ? current.pipelineStartedAt || Date.now()
            : Date.now();
          // Even in generating/matching state, surface any partial matches that were written progressively
          const incomingMatches: InvestorMatchResult[] = data.matches || [];
          const prev = current.matches;
          const newCount = incomingMatches.length - prev.length;
          set({
            status: data.status,
            matches: incomingMatches.length > 0 ? incomingMatches : prev,
            loading: false,
            pipelineStartedAt,
            newMatchCount: newCount > 0 ? newCount : 0,
          });
          return;
        }

        if (data.status === 'error') {
          set({ status: 'error', loading: false, error: data.error || 'Something went wrong', matches: [], pipelineStartedAt: 0 });
          return;
        }

        if (data.status === 'no_profile') {
          const current = get();
          const pipelineStartedAt = current.pipelineStartedAt || Date.now();
          set({ status: 'generating', loading: false, matches: [], pipelineStartedAt });
          return;
        }

        // status === 'ready' — we have matches
        const incomingMatches: InvestorMatchResult[] = data.matches || [];
        const prev = get().matches;
        const newCount = incomingMatches.length - prev.length;
        const isFinalSet = incomingMatches.length >= TARGET_MATCHES;

        set({
          status: 'ready',
          loading: false,
          matches: incomingMatches,
          error: null,
          lastFetched: Date.now(),
          pipelineStartedAt: 0,
          newMatchCount: newCount > 0 ? newCount : 0,
          isFinalSet,
        });
      } catch (err) {
        set({
          status: 'error',
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
          pipelineStartedAt: 0,
        });
      } finally {
        fetchInFlight = null;
      }
    };

    fetchInFlight = doFetch();
    await fetchInFlight;
  },
}));
