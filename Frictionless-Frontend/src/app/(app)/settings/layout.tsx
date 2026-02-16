'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { User, Users, CreditCard, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/lib/hooks/useMediaQuery';

const settingsNav = [
  { label: 'General', href: '/settings', icon: User },
  { label: 'Team', href: '/settings/team', icon: Users },
  { label: 'Billing', href: '/settings/billing', icon: CreditCard },
  { label: 'Security', href: '/settings/security', icon: Shield },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const isActive = (href: string) => {
    if (href === '/settings') return pathname === '/settings';
    return pathname.startsWith(href);
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1200px] mx-auto">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Sidebar nav - desktop */}
        <motion.aside
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="hidden lg:block shrink-0"
        >
          <nav className="w-56 space-y-1">
            {settingsNav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors',
                      active
                        ? 'bg-electric-blue/15 text-electric-blue'
                        : 'text-obsidian-300 hover:bg-obsidian-800/50 hover:text-foreground'
                    )}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="font-medium">{item.label}</span>
                    {active && (
                      <motion.div
                        layoutId="settings-nav-active"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-electric-blue"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                      />
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </nav>
        </motion.aside>

        {/* Mobile tab bar */}
        {isMobile && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden -mx-4 overflow-x-auto no-scrollbar"
          >
            <div className="flex gap-2 px-4 pb-2">
              {settingsNav.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <motion.div
                      className={cn(
                        'flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-colors',
                        active
                          ? 'bg-electric-blue/15 text-electric-blue'
                          : 'bg-obsidian-800/80 text-obsidian-300'
                      )}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Content */}
        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1 min-w-0"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
