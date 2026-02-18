'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Bell, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { useNotificationStore } from '@/stores/notification-store';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const pathTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/startup/readiness': 'Readiness Score',
  '/startup/matches': 'Matches',
  '/startup/chat': 'AI Chat',
  '/startup/tasks': 'Tasks',
  '/startup/data-room': 'Data Room',
  '/startup/analytics': 'Analytics',
  '/capital/deal-flow': 'Deal Flow',
  '/capital/funds': 'Funds',
  '/capital/team': 'Team',
  '/capital/thesis': 'Thesis',
  '/capital/portfolio': 'Portfolio',
  '/accelerator/programs': 'Programs',
  '/accelerator/mentors': 'Mentors',
  '/messages': 'Messages',
  '/settings': 'Settings',
};

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { toggleSearch, toggleNotifications } = useUIStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const [scrolled, setScrolled] = useState(false);

  const title = pathTitles[pathname] || 'Frictionless';
  const isDeepPage = pathname.split('/').filter(Boolean).length > 1;
  const initials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() ?? 'U';

  useEffect(() => {
    const handleScroll = () => {
      const mainEl = document.querySelector('main');
      if (mainEl) {
        setScrolled(mainEl.scrollTop > 10);
      }
    };

    const mainEl = document.querySelector('main');
    mainEl?.addEventListener('scroll', handleScroll);
    return () => mainEl?.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.header
      className={cn(
        'sticky top-0 z-40 flex items-center justify-between h-14 px-4 transition-all duration-200 lg:hidden',
        scrolled
          ? 'bg-background/95 backdrop-blur-xl border-b border-border'
          : 'bg-transparent'
      )}
    >
      {/* Left: back button or spacer */}
      <div className="flex items-center w-10">
        {isDeepPage && (
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-10 h-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors touch-target"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Center: title */}
      <h1 className="text-base font-display font-semibold text-foreground truncate px-4">
        {title}
      </h1>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        <ThemeToggle size="sm" />
        <button
          onClick={toggleSearch}
          className="flex items-center justify-center w-10 h-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors touch-target"
        >
          <Search className="w-5 h-5" />
        </button>

        <button
          onClick={toggleNotifications}
          className="relative flex items-center justify-center w-10 h-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors touch-target"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="touch-target">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar_url ?? undefined} alt={user?.full_name} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.full_name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await logout();
                window.location.href = '/login';
              }}
              className="text-destructive"
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.header>
  );
}
