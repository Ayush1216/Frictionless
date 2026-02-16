import { create } from 'zustand';
import type { Org, StartupProfile, CapitalProvider } from '@/types/database';

interface OrgStore {
  currentOrg: Org | null;
  startupProfile: StartupProfile | null;
  capitalProfile: CapitalProvider | null;
  setOrg: (org: Org | null) => void;
  setStartupProfile: (profile: StartupProfile | null) => void;
  setCapitalProfile: (profile: CapitalProvider | null) => void;
  updateStartupScore: (score: number, delta?: number) => void;
}

export const useOrgStore = create<OrgStore>((set) => ({
  currentOrg: null,
  startupProfile: null,
  capitalProfile: null,
  setOrg: (currentOrg) => set({ currentOrg }),
  setStartupProfile: (startupProfile) => set({ startupProfile }),
  setCapitalProfile: (capitalProfile) => set({ capitalProfile }),
  updateStartupScore: (current_readiness_score, score_delta) =>
    set((state) => {
      if (!state.startupProfile) return state;
      return {
        startupProfile: {
          ...state.startupProfile,
          current_readiness_score,
          score_delta: score_delta ?? state.startupProfile.score_delta,
        },
      };
    }),
}));
