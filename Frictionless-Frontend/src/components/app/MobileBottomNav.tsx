'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Gauge,
  Bot,
  CheckSquare,
  MoreHorizontal,
  TrendingUp,
  Briefcase,
  Users,
  Handshake,
  MessageSquare,
  FolderOpen,
  BarChart3,
  FileText,
  BookOpen,
  GraduationCap,
  Settings,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const startupBottomNav: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Readiness', href: '/startup/readiness', icon: Gauge },
  { label: 'AI', href: '/startup/chat', icon: Bot },
  { label: 'Investors', href: '/startup/investors', icon: Handshake },
];

const startupMoreNav: NavItem[] = [
  { label: 'Company Profile', href: '/startup/company-profile', icon: Building2 },
  { label: 'Investors', href: '/startup/investors', icon: Handshake },
  { label: 'Data Room', href: '/startup/data-room', icon: FolderOpen },
  { label: 'Analytics', href: '/startup/analytics', icon: BarChart3 },
  { label: 'Messages', href: '/messages', icon: MessageSquare },
  { label: 'Settings', href: '/settings', icon: Settings },
];

const capitalBottomNav: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Deals', href: '/capital/deal-flow', icon: TrendingUp },
  { label: 'Funds', href: '/capital/funds', icon: Briefcase },
  { label: 'Team', href: '/capital/team', icon: Users },
];

const capitalMoreNav: NavItem[] = [
  { label: 'Thesis', href: '/capital/thesis', icon: FileText },
  { label: 'Portfolio', href: '/capital/portfolio', icon: BarChart3 },
  { label: 'Messages', href: '/messages', icon: MessageSquare },
  { label: 'Settings', href: '/settings', icon: Settings },
];

const acceleratorBottomNav: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Programs', href: '/accelerator/programs', icon: BookOpen },
  { label: 'Mentors', href: '/accelerator/mentors', icon: GraduationCap },
  { label: 'Messages', href: '/messages', icon: MessageSquare },
];

const acceleratorMoreNav: NavItem[] = [
  { label: 'Settings', href: '/settings', icon: Settings },
];

function getBottomNav(orgType: string): { main: NavItem[]; more: NavItem[] } {
  switch (orgType) {
    case 'capital_provider':
      return { main: capitalBottomNav, more: capitalMoreNav };
    case 'accelerator':
      return { main: acceleratorBottomNav, more: acceleratorMoreNav };
    default:
      return { main: startupBottomNav, more: startupMoreNav };
  }
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const [moreOpen, setMoreOpen] = useState(false);

  const orgType = user?.org_type ?? 'startup';
  const { main, more } = getBottomNav(orgType);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const moreIsActive = more.some((item) => isActive(item.href));

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border bg-background/95 backdrop-blur-xl safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {main.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center justify-center gap-1 touch-target flex-1"
              >
                <motion.div
                  className={cn(
                    'flex items-center justify-center w-10 h-7 rounded-full transition-colors',
                    active && 'bg-primary/15'
                  )}
                  whileTap={{ scale: 0.9 }}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 transition-colors',
                      active ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                </motion.div>
                <span
                  className={cn(
                    'text-[10px] font-medium transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {item.label}
                </span>
                {active && (
                  <motion.div
                    layoutId="bottom-nav-active"
                    className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary"
                    transition={{ type: 'spring', bounce: 0.25, duration: 0.4 }}
                  />
                )}
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className="relative flex flex-col items-center justify-center gap-1 touch-target flex-1"
          >
            <motion.div
              className={cn(
                'flex items-center justify-center w-10 h-7 rounded-full transition-colors',
                moreIsActive && 'bg-primary/15'
              )}
              whileTap={{ scale: 0.9 }}
            >
              <MoreHorizontal
                className={cn(
                  'w-5 h-5 transition-colors',
                  moreIsActive ? 'text-primary' : 'text-muted-foreground'
                )}
              />
            </motion.div>
            <span
              className={cn(
                'text-[10px] font-medium transition-colors',
                moreIsActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              More
            </span>
          </button>
        </div>
      </nav>

      {/* More sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="glass bg-background/95 backdrop-blur-xl rounded-t-2xl px-4 pb-8 pt-4 safe-area-bottom">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-foreground font-display">More</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3">
            {more.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl transition-colors touch-target',
                    active
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted text-muted-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Spacer so content isn't hidden behind bottom nav */}
      <div className="h-16 safe-area-bottom" />
    </>
  );
}
