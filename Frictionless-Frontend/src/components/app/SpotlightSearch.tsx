'use client';

import { useEffect, useCallback, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Gauge,
  Handshake,
  Bot,
  CheckSquare,
  FolderOpen,
  TrendingUp,
  Users,
  Settings,
  MessageSquare,
  FileText,
  Building2,
  Clock,
  Send,
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

const RECENT_PAGES_KEY = 'frictionless-recent-pages';
const MAX_RECENT = 5;

interface SearchItem {
  label: string;
  icon: React.ElementType;
  href: string;
  description?: string;
}

const PAGE_REGISTRY: Record<string, SearchItem> = {
  '/dashboard': { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  '/startup/company-profile': { label: 'Company Profile', icon: Building2, href: '/startup/company-profile' },
  '/startup/readiness': { label: 'Frictionless', icon: Gauge, href: '/startup/readiness', description: 'Score + Tasks + Simulator' },
  '/startup/investors': { label: 'Investors', icon: Handshake, href: '/startup/investors' },
  '/startup/chat': { label: 'AI Chat', icon: Bot, href: '/startup/chat' },
  '/startup/data-room': { label: 'Data Room', icon: FolderOpen, href: '/startup/data-room' },
  '/capital/deal-flow': { label: 'Deal Flow', icon: TrendingUp, href: '/capital/deal-flow' },
  '/capital/team': { label: 'Team', icon: Users, href: '/capital/team' },
  '/messages': { label: 'Messages', icon: MessageSquare, href: '/messages' },
  '/settings': { label: 'Settings', icon: Settings, href: '/settings' },
  '/startup/deal-memo': { label: 'Deal Memo', icon: FileText, href: '/startup/deal-memo' },
  '/startup/diligence-copilot': { label: 'Diligence Copilot', icon: FileText, href: '/startup/diligence-copilot' },
  '/startup/outreach-studio': { label: 'Outreach Studio', icon: Send, href: '/startup/outreach-studio' },
  '/startup/growth-hub': { label: 'Growth Hub', icon: TrendingUp, href: '/startup/growth-hub' },
  '/startup/insights-lab': { label: 'Insights Lab', icon: Building2, href: '/startup/insights-lab' },
  '/startup/risk-monitor': { label: 'Risk Monitor', icon: Building2, href: '/startup/risk-monitor' },
  '/startup/investor-outreach': { label: 'Investor Outreach', icon: Send, href: '/startup/investor-outreach' },
};

const pageItems = Object.values(PAGE_REGISTRY);

function getRecentFromStorage(): SearchItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_PAGES_KEY);
    if (!raw) return [];
    const hrefs = JSON.parse(raw) as string[];
    return hrefs
      .slice(0, MAX_RECENT)
      .map((href) => PAGE_REGISTRY[href])
      .filter(Boolean) as SearchItem[];
  } catch {
    return [];
  }
}

function pushRecent(href: string) {
  if (typeof window === 'undefined' || !href || !PAGE_REGISTRY[href]) return;
  try {
    const raw = localStorage.getItem(RECENT_PAGES_KEY);
    const current: string[] = raw ? JSON.parse(raw) : [];
    const next = [href, ...current.filter((h) => h !== href)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_PAGES_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

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
  { label: 'Update pitch deck financials', icon: CheckSquare, href: '/startup/readiness?tab=tasks', description: 'Due in 3 days' },
  { label: 'Add competitive analysis', icon: FileText, href: '/startup/readiness?tab=tasks', description: 'Due in 7 days' },
  { label: 'Upload cap table', icon: FolderOpen, href: '/startup/readiness?tab=tasks', description: 'Overdue' },
];

export function SpotlightSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const { searchOpen, toggleSearch } = useUIStore();
  const [recentItems, setRecentItems] = useState<SearchItem[]>([]);

  useEffect(() => {
    setRecentItems(getRecentFromStorage());
  }, [searchOpen]);

  useEffect(() => {
    if (pathname && PAGE_REGISTRY[pathname]) pushRecent(pathname);
  }, [pathname]);

  const recentHrefs = useMemo(() => new Set(recentItems.map((r) => r.href)), [recentItems]);
  const pageItemsDeduped = useMemo(
    () => pageItems.filter((p) => !recentHrefs.has(p.href)),
    [recentHrefs]
  );

  const handleSelect = useCallback(
    (href: string) => {
      toggleSearch();
      pushRecent(href);
      setRecentItems(getRecentFromStorage());
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

        {recentItems.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recentItems.map((item) => (
                <CommandItem
                  key={`recent-${item.href}`}
                  onSelect={() => handleSelect(item.href)}
                  className="cursor-pointer"
                >
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Pages">
          {pageItemsDeduped.map((item) => {
            const ItemIcon = item.icon;
            return (
              <CommandItem
                key={`page-${item.href}`}
                onSelect={() => handleSelect(item.href)}
                className="cursor-pointer"
              >
                <ItemIcon className="mr-2 h-4 w-4 text-muted-foreground" />
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
                <Icon className="mr-2 h-4 w-4 text-primary" />
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
                <Icon className="mr-2 h-4 w-4 text-accent" />
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
                <Icon className="mr-2 h-4 w-4 text-chart-5" />
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
