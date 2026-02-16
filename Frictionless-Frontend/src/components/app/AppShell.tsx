'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { TopBar } from './TopBar';
import { SpotlightSearch } from './SpotlightSearch';
import { NotificationCenter } from './NotificationCenter';
import { BreadcrumbNav } from './BreadcrumbNav';
import { useUIStore } from '@/stores/ui-store';
import { useIsMobile } from '@/lib/hooks/useMediaQuery';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const setMobile = useUIStore((s) => s.setMobile);
  const isOnboardingChat = pathname === '/onboarding/chat';

  useEffect(() => {
    setMobile(isMobile);
  }, [isMobile, setMobile]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar — hidden on onboarding chat so user cannot exit */}
      {!isMobile && !isOnboardingChat && <Sidebar />}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile TopBar — hidden on onboarding chat */}
        {isMobile && !isOnboardingChat && <TopBar />}

        {/* Desktop breadcrumb — onboarding chat gets static "home > onboarding > chat" with no links */}
        {!isMobile && !isOnboardingChat && (
          <div className="px-6 pt-4">
            <BreadcrumbNav />
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
        </>
      )}
    </div>
  );
}
