'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  LayoutDashboard,
  Gauge,
  Handshake,
  MessageSquare,
  Bot,
  CheckSquare,
  FolderOpen,
  BarChart3,
  TrendingUp,
  Briefcase,
  Users,
  FileText,
  BookOpen,
  GraduationCap,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { useNotificationStore } from '@/stores/notification-store';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const startupNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Readiness Score', href: '/startup/readiness', icon: Gauge },
  { label: 'Matches', href: '/startup/matches', icon: Handshake },
  { label: 'AI Chat', href: '/startup/chat', icon: Bot },
  { label: 'Tasks', href: '/startup/tasks', icon: CheckSquare, badge: 5 },
  { label: 'Data Room', href: '/startup/data-room', icon: FolderOpen },
  { label: 'Analytics', href: '/startup/analytics', icon: BarChart3 },
];

const capitalNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Deal Flow', href: '/capital/deal-flow', icon: TrendingUp },
  { label: 'Funds', href: '/capital/funds', icon: Briefcase },
  { label: 'Team', href: '/capital/team', icon: Users },
  { label: 'Thesis', href: '/capital/thesis', icon: FileText },
  { label: 'Portfolio', href: '/capital/portfolio', icon: BarChart3 },
];

const acceleratorNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Programs', href: '/accelerator/programs', icon: BookOpen },
  { label: 'Mentors', href: '/accelerator/mentors', icon: GraduationCap },
];

const commonNav: NavItem[] = [
  { label: 'Messages', href: '/messages', icon: MessageSquare, badge: 3 },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Settings', href: '/settings', icon: Settings },
];

function getNavForOrgType(orgType: string): NavItem[] {
  switch (orgType) {
    case 'startup':
      return startupNav;
    case 'capital_provider':
      return capitalNav;
    case 'accelerator':
      return acceleratorNav;
    default:
      return startupNav;
  }
}

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { sidebarCollapsed, collapseSidebar, toggleSearch, toggleNotifications } =
    useUIStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const orgType = user?.org_type ?? 'startup';
  const primaryNav = getNavForOrgType(orgType);
  const initials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() ?? 'U';

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 72 : 260 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="relative flex flex-col h-full border-r border-border glass bg-card/80 backdrop-blur-xl z-30"
      >
        <ScrollArea className="flex-1">
          <div className="flex flex-col h-full min-h-screen p-3">
            {/* Logo */}
            <div className="flex items-center gap-3 px-2 py-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-neon-gradient flex items-center justify-center shadow-glow flex-shrink-0">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="text-base font-display font-bold text-white whitespace-nowrap overflow-hidden"
                  >
                    Frictionless
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* User info */}
            <div
              className={cn(
                'flex items-center gap-3 px-2 py-3 mb-4 rounded-xl bg-obsidian-800/50',
                sidebarCollapsed && 'justify-center px-0'
              )}
            >
              <Avatar className="h-9 w-9 flex-shrink-0">
                <AvatarImage src={user?.avatar_url ?? undefined} alt={user?.full_name} />
                <AvatarFallback className="bg-electric-blue/20 text-electric-blue text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="min-w-0 overflow-hidden"
                  >
                    <p className="text-sm font-medium text-foreground truncate">
                      {user?.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.org_name}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quick actions */}
            <div className={cn('flex gap-1 mb-4', sidebarCollapsed ? 'flex-col items-center' : 'px-1')}>
              <ThemeToggle size="sm" className={sidebarCollapsed ? 'w-full' : ''} />
              <SidebarIconButton
                icon={Search}
                label="Search"
                collapsed={sidebarCollapsed}
                onClick={toggleSearch}
                shortcut="K"
              />
              <SidebarIconButton
                icon={Bell}
                label="Notifications"
                collapsed={sidebarCollapsed}
                onClick={toggleNotifications}
                badge={unreadCount}
              />
            </div>

            <Separator className="mb-4 bg-border" />

            {/* Primary nav */}
            <div className="space-y-1 mb-4">
              {!sidebarCollapsed && (
                <p className="text-[10px] uppercase tracking-widest text-obsidian-500 font-semibold px-3 mb-2">
                  {orgType === 'startup'
                    ? 'Startup'
                    : orgType === 'capital_provider'
                    ? 'Capital'
                    : 'Accelerator'}
                </p>
              )}
              {primaryNav.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  isActive={isActive(item.href)}
                  collapsed={sidebarCollapsed}
                />
              ))}
            </div>

            <Separator className="mb-4 bg-border" />

            {/* Common nav */}
            <div className="space-y-1 mb-4">
              {!sidebarCollapsed && (
                <p className="text-[10px] uppercase tracking-widest text-obsidian-500 font-semibold px-3 mb-2">
                  General
                </p>
              )}
              {commonNav.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  isActive={isActive(item.href)}
                  collapsed={sidebarCollapsed}
                />
              ))}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Upgrade CTA */}
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 overflow-hidden"
                >
                  <div className="p-4 rounded-xl bg-neon-gradient/10 border border-electric-blue/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-electric-blue" />
                      <span className="text-sm font-semibold text-foreground">
                        Upgrade to Pro
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Unlock AI matching, unlimited assessments, and more.
                    </p>
                    <button className="w-full px-3 py-1.5 rounded-lg bg-electric-blue text-white text-xs font-medium hover:bg-electric-blue/90 transition-colors">
                      Learn more
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Logout */}
            <NavLink
              item={{ label: 'Log out', href: '#', icon: LogOut }}
              isActive={false}
              collapsed={sidebarCollapsed}
              onClick={async () => {
                await logout();
                window.location.href = '/login';
              }}
            />

            {/* Collapse toggle */}
            <button
              onClick={collapseSidebar}
              className="mt-3 flex items-center justify-center w-full h-9 rounded-lg text-obsidian-400 hover:text-foreground hover:bg-obsidian-800/50 transition-colors"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>
        </ScrollArea>
      </motion.aside>
    </TooltipProvider>
  );
}

function NavLink({
  item,
  isActive,
  collapsed,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;

  const content = (
    <motion.div
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 group relative touch-target',
        isActive
          ? 'bg-electric-blue/15 text-electric-blue'
          : 'text-obsidian-300 hover:text-foreground hover:bg-obsidian-800/50',
        collapsed && 'justify-center px-2'
      )}
      whileHover={{ x: collapsed ? 0 : 2 }}
      whileTap={{ scale: 0.98 }}
    >
      {isActive && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-electric-blue"
          transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
        />
      )}
      <Icon className="w-5 h-5 flex-shrink-0" />
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className="text-sm font-medium whitespace-nowrap overflow-hidden"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
      {item.badge && !collapsed && (
        <Badge className="ml-auto h-5 min-w-5 flex items-center justify-center bg-electric-blue/20 text-electric-blue border-0 text-[10px] font-bold">
          {item.badge}
        </Badge>
      )}
      {item.badge && collapsed && (
        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-electric-blue" />
      )}
    </motion.div>
  );

  if (onClick) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div onClick={onClick}>{content}</div>
        </TooltipTrigger>
        {collapsed && (
          <TooltipContent side="right" sideOffset={8}>
            {item.label}
          </TooltipContent>
        )}
      </Tooltip>
    );
  }

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={item.href}>{content}</Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          <div className="flex items-center gap-2">
            {item.label}
            {item.badge && (
              <Badge className="h-4 min-w-4 flex items-center justify-center bg-electric-blue/20 text-electric-blue border-0 text-[10px] font-bold">
                {item.badge}
              </Badge>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return <Link href={item.href}>{content}</Link>;
}

function SidebarIconButton({
  icon: Icon,
  label,
  collapsed,
  onClick,
  badge,
  shortcut,
}: {
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  onClick: () => void;
  badge?: number;
  shortcut?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'relative flex items-center gap-2 rounded-lg text-obsidian-400 hover:text-foreground hover:bg-obsidian-800/50 transition-colors touch-target',
            collapsed ? 'justify-center w-full h-10' : 'flex-1 justify-center h-9'
          )}
        >
          <Icon className="w-4 h-4" />
          {!collapsed && (
            <span className="text-xs">{label}</span>
          )}
          {shortcut && !collapsed && (
            <kbd className="ml-auto text-[10px] text-obsidian-500 font-mono bg-obsidian-800 px-1.5 py-0.5 rounded">
              {'\u2318'}{shortcut}
            </kbd>
          )}
          {badge && badge > 0 && (
            <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-electric-blue text-white text-[9px] font-bold flex items-center justify-center">
              {badge}
            </span>
          )}
        </button>
      </TooltipTrigger>
      {collapsed && (
        <TooltipContent side="right" sideOffset={8}>
          {label}
          {shortcut && (
            <kbd className="ml-2 text-[10px] font-mono bg-obsidian-700 px-1 py-0.5 rounded">
              {'\u2318'}{shortcut}
            </kbd>
          )}
        </TooltipContent>
      )}
    </Tooltip>
  );
}
