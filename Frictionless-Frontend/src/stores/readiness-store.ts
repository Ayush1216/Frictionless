import { create } from 'zustand';

export interface ReadinessState {
  score_summary?: { _overall?: { raw_percentage?: number; weighted_total?: number }; [k: string]: unknown };
  scored_rubric?: unknown;
  updated_at?: string | null;
}

interface ReadinessStore {
  readiness: ReadinessState | null;
  scoreHistory: { score: number; updated_at: string }[];
  documentCount: number;
  bootstrapLoaded: boolean;
  setBootstrap: (
    readiness: ReadinessState | null,
    scoreHistory: { score: number; updated_at: string }[],
    documentCount?: number
  ) => void;
  clearBootstrap: () => void;
}

export const useReadinessStore = create<ReadinessStore>((set) => ({
  readiness: null,
  scoreHistory: [],
  documentCount: 0,
  bootstrapLoaded: false,
  setBootstrap: (readiness, scoreHistory, documentCount = 0) =>
    set({ readiness, scoreHistory, documentCount, bootstrapLoaded: true }),
  clearBootstrap: () =>
    set({ readiness: null, scoreHistory: [], documentCount: 0, bootstrapLoaded: false }),
}));
