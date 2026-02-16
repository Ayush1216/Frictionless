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
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
  sidebarOpen: true,
  sidebarCollapsed: false,
  theme: 'dark',
  activeModal: null,
  isMobile: false,
  searchOpen: false,
  notificationsOpen: false,
  commandPaletteOpen: false,
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
}),
    { name: 'ui-store', partialize: (state) => ({ theme: state.theme, sidebarCollapsed: state.sidebarCollapsed }) }
  )
);
