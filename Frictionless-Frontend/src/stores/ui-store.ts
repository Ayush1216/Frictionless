import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light';

interface UIStore {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  theme: Theme;
  activeModal: string | null;
  isMobile: boolean;
  searchOpen: boolean;
  notificationsOpen: boolean;
  commandPaletteOpen: boolean;
  aiHelperOpen: boolean;
  intelligenceOpen: boolean;
  intelligencePrompt: string | null;
  toggleSidebar: () => void;
  collapseSidebar: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  setMobile: (isMobile: boolean) => void;
  toggleSearch: () => void;
  toggleNotifications: () => void;
  toggleCommandPalette: () => void;
  toggleAIHelper: () => void;
  toggleIntelligence: () => void;
  setIntelligenceOpen: (open: boolean) => void;
  openIntelligenceWithPrompt: (prompt: string) => void;
  clearIntelligencePrompt: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
  sidebarOpen: true,
  sidebarCollapsed: false,
  theme: 'light',
  activeModal: null,
  isMobile: false,
  searchOpen: false,
  notificationsOpen: false,
  commandPaletteOpen: false,
  aiHelperOpen: false,
  intelligenceOpen: false,
  intelligencePrompt: null,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  collapseSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),
  setMobile: (isMobile) => set({ isMobile }),
  toggleSearch: () => set((state) => ({ searchOpen: !state.searchOpen })),
  toggleNotifications: () => set((state) => ({ notificationsOpen: !state.notificationsOpen })),
  toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  toggleAIHelper: () => set((state) => ({ aiHelperOpen: !state.aiHelperOpen })),
  toggleIntelligence: () => set((state) => ({ intelligenceOpen: !state.intelligenceOpen })),
  setIntelligenceOpen: (open) => set({ intelligenceOpen: open }),
  openIntelligenceWithPrompt: (prompt) => set({ intelligenceOpen: true, intelligencePrompt: prompt }),
  clearIntelligencePrompt: () => set({ intelligencePrompt: null }),
}),
    { name: 'ui-store', partialize: (state) => ({ theme: state.theme }) }
  )
);
