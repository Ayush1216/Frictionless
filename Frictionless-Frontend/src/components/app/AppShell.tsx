'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { TopBar } from './TopBar';
import { SpotlightSearch } from './SpotlightSearch';
import { NotificationCenter } from './NotificationCenter';
import { BreadcrumbNav } from './BreadcrumbNav';
import { AIFloatingButton } from '@/components/ai/AIFloatingButton';
import { AIHelperPanel } from '@/components/ai/AIHelperPanel';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useUIStore } from '@/stores/ui-store';
import { useIsMobile } from '@/lib/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const toggleSearch = useUIStore((s) => s.toggleSearch);
  const aiHelperOpen = useUIStore((s) => s.aiHelperOpen);
  const toggleAIHelper = useUIStore((s) => s.toggleAIHelper);
  const setMobile = useUIStore((s) => s.setMobile);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const isOnboardingChat = pathname === '/onboarding/chat';

  useEffect(() => {
    setMobile(isMobile);
  }, [isMobile, setMobile]);

  // Cmd+J / Ctrl+J opens AI helper panel
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'j' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleAIHelper();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [toggleAIHelper]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar — hidden on onboarding chat so user cannot exit */}
      {!isMobile && !isOnboardingChat && <Sidebar />}

      {/* Main content area */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 overflow-hidden",
        !isMobile && !isOnboardingChat && sidebarCollapsed && "pl-6"
      )}>
        {/* Mobile TopBar — hidden on onboarding chat */}
        {isMobile && !isOnboardingChat && <TopBar />}

        {/* Desktop breadcrumb + controls */}
        {!isMobile && !isOnboardingChat && (
          <div className="flex items-center justify-between px-6 pt-4">
            <BreadcrumbNav />
            <div className="flex items-center gap-2">
              <ThemeToggle size="sm" />
            </div>
          </div>
        )}
        {/* Page content with animated transitions */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Navigation — hidden on onboarding chat */}
        {isMobile && !isOnboardingChat && <MobileBottomNav />}
      </div>

      {/* Global overlays — hidden on onboarding chat so user cannot navigate away */}
      {!isOnboardingChat && (
        <>
          <SpotlightSearch />
          <NotificationCenter />
          <AIHelperPanel open={aiHelperOpen} onClose={() => aiHelperOpen && toggleAIHelper()} />
          <AIFloatingButton onClick={toggleAIHelper} />
        </>
      )}
    </div>
  );
}
