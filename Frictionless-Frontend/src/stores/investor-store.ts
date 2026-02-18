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
  /** Timestamp when we first entered generating/matching state (for timeout) */
  pipelineStartedAt: number;
  setFilters: (filters: Partial<InvestorFilters>) => void;
  fetchMatches: () => Promise<void>;
  getMatchById: (investorId: string) => InvestorMatchResult | undefined;
  /** Force re-trigger the pipeline (resets timeout and status) */
  retrigger: () => Promise<void>;
}

// Prevent duplicate concurrent fetches
let fetchInFlight: Promise<void> | null = null;

// Max time to poll before giving up (3 minutes)
const PIPELINE_TIMEOUT_MS = 3 * 60 * 1000;

export const useInvestorStore = create<InvestorStore>((set, get) => ({
  matches: [],
  status: 'idle',
  loading: false,
  error: null,
  lastFetched: 0,
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
    // Reset state so we can poll fresh
    set({ status: 'idle', error: null, pipelineStartedAt: 0, lastFetched: 0 });
    fetchInFlight = null;
    await get().fetchMatches();
  },

  fetchMatches: async () => {
    // Dedupe: if a fetch is already in-flight, wait for it
    if (fetchInFlight) {
      await fetchInFlight;
      return;
    }

    // Stale-while-revalidate: skip if fetched < 15s ago and already ready
    const now = Date.now();
    const state = get();
    if (state.status === 'ready' && state.matches.length > 0 && now - state.lastFetched < 15_000) {
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
        const res = await fetch('/api/startup/investors', { headers, cache: 'no-store' });
        const data = await res.json();

        if (!res.ok) {
          set({ status: 'error', loading: false, error: data.error || 'Failed to fetch' });
          return;
        }

        if (data.status === 'generating' || data.status === 'matching') {
          // Track when we first entered pipeline state (for timeout)
          const current = get();
          const pipelineStartedAt = (current.status === 'generating' || current.status === 'matching')
            ? current.pipelineStartedAt || Date.now()
            : Date.now();
          set({ status: data.status, matches: data.matches || [], loading: false, pipelineStartedAt });
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

        set({
          status: 'ready',
          loading: false,
          matches: data.matches || [],
          error: null,
          lastFetched: Date.now(),
          pipelineStartedAt: 0,
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
