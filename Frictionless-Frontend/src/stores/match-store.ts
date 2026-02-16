import { create } from 'zustand';
import type { Match, MatchStatus } from '@/types/database';

export interface MatchFilters {
  stage?: string;
  sector?: string;
  scoreRange?: { min?: number; max?: number };
  status?: MatchStatus;
  [key: string]: string | number | { min?: number; max?: number } | undefined;
}

type SortBy =
  | 'score'
  | 'match_date'
  | 'status'
  | 'startup_name'
  | 'investor_name';

interface MatchStore {
  matches: Match[];
  selectedMatch: Match | null;
  filters: MatchFilters;
  sortBy: SortBy;
  setMatches: (matches: Match[]) => void;
  selectMatch: (match: Match | null) => void;
  updateMatchStatus: (matchId: string, status: MatchStatus) => void;
  setFilters: (filters: MatchFilters | ((prev: MatchFilters) => MatchFilters)) => void;
  setSortBy: (sortBy: SortBy) => void;
}

export const useMatchStore = create<MatchStore>((set) => ({
  matches: [],
  selectedMatch: null,
  filters: {},
  sortBy: 'score',
  setMatches: (matches) => set({ matches }),
  selectMatch: (selectedMatch) => set({ selectedMatch }),
  updateMatchStatus: (matchId, status) =>
    set((state) => ({
      matches: state.matches.map((m) =>
        m.id === matchId ? { ...m, status } : m
      ),
      selectedMatch:
        state.selectedMatch?.id === matchId
          ? { ...state.selectedMatch, status }
          : state.selectedMatch,
    })),
  setFilters: (filters) =>
    set((state) => ({
      filters: typeof filters === 'function' ? filters(state.filters) : filters,
    })),
  setSortBy: (sortBy) => set({ sortBy }),
}));
