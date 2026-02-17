import { create } from 'zustand';
import type { User } from '@/types/database';
import { signOutSupabase } from '@/lib/supabase/auth';
import { useReadinessStore } from '@/stores/readiness-store';
import { useTaskStore } from '@/stores/task-store';

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  /** Clear auth state without calling Supabase (e.g. when session expired or signed out elsewhere). */
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  // Start as loading so we don't redirect to login before session is restored from storage (reload)
  isLoading: true,
  login: (user) => set({ user, isAuthenticated: true, isLoading: false }),
  logout: async () => {
    try {
      await signOutSupabase();
    } catch {
      // Supabase not configured (e.g. demo mode); still clear local state
    }
    useReadinessStore.getState().clearBootstrap();
    useTaskStore.getState().setTasks([]);
    useTaskStore.getState().setTaskGroups([]);
    useTaskStore.getState().setTasksLoaded(false);
    useTaskStore.getState().selectTask(null);
    set({ user: null, isAuthenticated: false });
  },
  clearAuth: () => {
    useReadinessStore.getState().clearBootstrap();
    useTaskStore.getState().setTasks([]);
    useTaskStore.getState().setTaskGroups([]);
    useTaskStore.getState().setTasksLoaded(false);
    useTaskStore.getState().selectTask(null);
    set({ user: null, isAuthenticated: false });
  },
  setLoading: (isLoading) => set({ isLoading }),
}));
