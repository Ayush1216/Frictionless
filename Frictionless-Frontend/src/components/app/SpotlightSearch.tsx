'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Gauge,
  Handshake,
  Bot,
  CheckSquare,
  FolderOpen,
  BarChart3,
  TrendingUp,
  Users,
  Settings,
  MessageSquare,
  FileText,
  Building2,
  Clock,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';

interface SearchItem {
  label: string;
  icon: React.ElementType;
  href: string;
  description?: string;
}

const recentItems: SearchItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Readiness Score', icon: Gauge, href: '/startup/readiness' },
  { label: 'AI Chat', icon: Bot, href: '/startup/chat' },
];

const pageItems: SearchItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Readiness Score', icon: Gauge, href: '/startup/readiness' },
  { label: 'Investor Matches', icon: Handshake, href: '/startup/matches' },
  { label: 'AI Chat', icon: Bot, href: '/startup/chat' },
  { label: 'Tasks', icon: CheckSquare, href: '/startup/tasks' },
  { label: 'Data Room', icon: FolderOpen, href: '/startup/data-room' },
  { label: 'Analytics', icon: BarChart3, href: '/startup/analytics' },
  { label: 'Deal Flow', icon: TrendingUp, href: '/capital/deal-flow' },
  { label: 'Team', icon: Users, href: '/capital/team' },
  { label: 'Messages', icon: MessageSquare, href: '/messages' },
  { label: 'Settings', icon: Settings, href: '/settings' },
];

const startupItems: SearchItem[] = [
  { label: 'NeuralPay', icon: Building2, href: '/startup/neuralpay', description: 'Fintech - Score 82' },
  { label: 'DataFlow AI', icon: Building2, href: '/startup/dataflow', description: 'AI/ML - Score 75' },
  { label: 'GreenGrid', icon: Building2, href: '/startup/greengrid', description: 'CleanTech - Score 68' },
];

const investorItems: SearchItem[] = [
  { label: 'General Catalyst', icon: TrendingUp, href: '/matches/gc', description: '89 match score' },
  { label: 'Andreessen Horowitz', icon: TrendingUp, href: '/matches/a16z', description: '87 match score' },
  { label: 'Sequoia Capital', icon: TrendingUp, href: '/matches/sequoia', description: '86 match score' },
];

const taskItems: SearchItem[] = [
  { label: 'Update pitch deck financials', icon: CheckSquare, href: '/startup/tasks', description: 'Due in 3 days' },
  { label: 'Add competitive analysis', icon: FileText, href: '/startup/tasks', description: 'Due in 7 days' },
  { label: 'Upload cap table', icon: FolderOpen, href: '/startup/tasks', description: 'Overdue' },
];

export function SpotlightSearch() {
  const router = useRouter();
  const { searchOpen, toggleSearch } = useUIStore();

  const handleSelect = useCallback(
    (href: string) => {
      toggleSearch();
      router.push(href);
    },
    [router, toggleSearch]
  );

  // Cmd+K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleSearch();
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [toggleSearch]);

  return (
    <CommandDialog open={searchOpen} onOpenChange={toggleSearch}>
      <CommandInput placeholder="Search pages, startups, investors, tasks..." />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Recent">
          {recentItems.map((item) => {
            return (
              <CommandItem
                key={`recent-${item.href}`}
                onSelect={() => handleSelect(item.href)}
                className="cursor-pointer"
              >
                <Clock className="mr-2 h-4 w-4 text-obsidian-400" />
                <span>{item.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Pages">
          {pageItems.map((item) => {
            const ItemIcon = item.icon;
            return (
              <CommandItem
                key={`page-${item.href}`}
                onSelect={() => handleSelect(item.href)}
                className="cursor-pointer"
              >
                <ItemIcon className="mr-2 h-4 w-4 text-obsidian-400" />
                <span>{item.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Startups">
          {startupItems.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={`startup-${item.href}`}
                onSelect={() => handleSelect(item.href)}
                className="cursor-pointer"
              >
                <Icon className="mr-2 h-4 w-4 text-electric-blue" />
                <span>{item.label}</span>
                {item.description && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {item.description}
                  </span>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Investors">
          {investorItems.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={`investor-${item.href}`}
                onSelect={() => handleSelect(item.href)}
                className="cursor-pointer"
              >
                <Icon className="mr-2 h-4 w-4 text-electric-purple" />
                <span>{item.label}</span>
                {item.description && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {item.description}
                  </span>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Tasks">
          {taskItems.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={`task-${item.label}`}
                onSelect={() => handleSelect(item.href)}
                className="cursor-pointer"
              >
                <Icon className="mr-2 h-4 w-4 text-electric-cyan" />
                <span>{item.label}</span>
                {item.description && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {item.description}
                  </span>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
