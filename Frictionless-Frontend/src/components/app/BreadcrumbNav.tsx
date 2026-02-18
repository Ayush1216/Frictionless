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
  readiness: 'Readiness Score',
  readiness: 'Readiness',
  matches: 'Matches',
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
};

export function BreadcrumbNav() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  // Build breadcrumb items
  const breadcrumbs = segments.map((segment, idx) => {
    const href = '/' + segments.slice(0, idx + 1).join('/');
    const label = segmentLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
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
