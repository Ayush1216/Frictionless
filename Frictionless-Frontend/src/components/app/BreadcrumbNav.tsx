'use client';

import { Fragment } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

const segmentLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  startup: 'Startup',
  capital: 'Capital',
  accelerator: 'Accelerator',
  readiness: 'Readiness',
  investors: 'Investors',
  chat: 'AI Chat',
  tasks: 'Tasks',
  'data-room': 'Data Room',
  analytics: 'Analytics',
  'deal-flow': 'Deal Flow',
  funds: 'Funds',
  team: 'Team',
  thesis: 'Thesis',
  portfolio: 'Portfolio',
  programs: 'Programs',
  mentors: 'Mentors',
  messages: 'Messages',
  settings: 'Settings',
  'company-profile': 'Company Profile',
  'investor-outreach': 'Investor Outreach',
  'outreach-studio': 'Outreach Studio',
  matches: 'Matches',
};

/** Detect UUID-like segments (e.g. "a9d718b2-a7d3-466f-8dcc-a83464ae2e70") */
function isUuidLike(segment: string): boolean {
  return /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(segment)
    || /^[0-9a-f]{20,}$/i.test(segment);
}

/** Get a human-readable label for a dynamic route segment based on its parent */
function getDynamicLabel(segment: string, parentSegment?: string): string {
  if (!isUuidLike(segment)) {
    return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
  }

  // Map parent → friendly name for the child UUID
  switch (parentSegment) {
    case 'investors': return 'Investor Profile';
    case 'matches': return 'Match Details';
    case 'tasks': return 'Task Details';
    case 'chat': return 'Conversation';
    case 'team': return 'Member';
    default: return 'Details';
  }
}

export function BreadcrumbNav() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const breadcrumbs = segments.map((segment, idx) => {
    const href = '/' + segments.slice(0, idx + 1).join('/');
    const parentSegment = idx > 0 ? segments[idx - 1] : undefined;
    const label = segmentLabels[segment] || getDynamicLabel(segment, parentSegment);
    const isLast = idx === segments.length - 1;
    return { label, href, isLast };
  });

  return (
    <nav className="hidden lg:flex items-center gap-1 text-sm">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>

      {breadcrumbs.map((crumb) => (
        <Fragment key={crumb.href}>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          {crumb.isLast ? (
            <span className="text-foreground font-medium">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
