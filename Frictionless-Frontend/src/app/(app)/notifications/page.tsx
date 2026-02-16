'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Bell,
  TrendingUp,
  Handshake,
  CheckSquare,
  MessageSquare,
  Info,
  CheckCheck,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { dummyNotifications } from '@/lib/dummy-data/notifications';
import { useNotificationStore } from '@/stores/notification-store';
import type { Notification } from '@/types/database';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';

const typeIcons: Record<string, React.ElementType> = {
  score_change: TrendingUp,
  new_match: Handshake,
  task_due: CheckSquare,
  message: MessageSquare,
  system: Info,
};

const typeColors: Record<string, string> = {
  score_change: 'text-score-excellent bg-score-excellent/10',
  new_match: 'text-electric-blue bg-electric-blue/10',
  task_due: 'text-score-fair bg-score-fair/10',
  message: 'text-electric-purple bg-electric-purple/10',
  system: 'text-obsidian-400 bg-obsidian-700/50',
};

type FilterType = 'all' | 'unread' | 'score_change' | 'new_match' | 'task_due';

function groupNotifications(notifications: Notification[]) {
  const groups: { label: string; items: Notification[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'This Week', items: [] },
    { label: 'Earlier', items: [] },
  ];

  notifications.forEach((n) => {
    const date = new Date(n.created_at);
    if (isToday(date)) groups[0].items.push(n);
    else if (isYesterday(date)) groups[1].items.push(n);
    else if (isThisWeek(date)) groups[2].items.push(n);
    else groups[3].items.push(n);
  });

  return groups.filter((g) => g.items.length > 0);
}

const filterLabels: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'score_change', label: 'Score Changes' },
  { value: 'new_match', label: 'Matches' },
  { value: 'task_due', label: 'Tasks' },
];

export default function NotificationsPage() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    setNotifications,
    markRead,
    markAllRead,
  } = useNotificationStore();

  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (notifications.length === 0) {
      setNotifications(dummyNotifications as Notification[]);
    }
  }, [notifications.length, setNotifications]);

  const filtered = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    return n.type === filter;
  });

  const groups = groupNotifications(filtered);

  const handleNotificationClick = (notification: Notification) => {
    markRead(notification.id);
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-[900px] mx-auto">
      <PageHeader
        title="Notifications"
        subtitle="Stay up to date with score changes, matches, and tasks"
        actions={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllRead}
              className="border-obsidian-600 text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          ) : undefined
        }
      />

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-wrap gap-2 mb-6"
      >
        {filterLabels.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filter === value
                ? 'bg-electric-blue text-white'
                : 'bg-obsidian-800/80 text-obsidian-300 hover:bg-obsidian-700 hover:text-foreground border border-obsidian-600/50'
            )}
          >
            {label}
          </button>
        ))}
      </motion.div>

      {/* Notification list */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="glass-card rounded-xl overflow-hidden"
      >
        <ScrollArea className="h-[calc(100vh-20rem)]">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Bell className="w-12 h-12 text-obsidian-600 mb-4" />
              <p className="text-sm text-muted-foreground">No notifications</p>
              <p className="text-xs text-obsidian-500 mt-1">
                {filter !== 'all' ? 'Try changing the filter' : 'You\'re all caught up!'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-obsidian-600/50">
              {groups.map((group) => (
                <div key={group.label}>
                  <p className="text-[10px] uppercase tracking-widest text-obsidian-500 font-semibold px-4 py-3 bg-obsidian-900/50">
                    {group.label}
                  </p>
                  {group.items.map((notification) => {
                    const Icon = typeIcons[notification.type] || Info;
                    const colorClass = typeColors[notification.type] || typeColors.system;
                    return (
                      <motion.button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={cn(
                          'w-full flex items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-obsidian-800/50',
                          !notification.read && 'bg-obsidian-800/30'
                        )}
                        whileHover={{ backgroundColor: 'rgba(55, 65, 81, 0.5)' }}
                      >
                        <div
                          className={cn(
                            'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
                            colorClass
                          )}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className={cn(
                                'text-sm',
                                !notification.read
                                  ? 'font-semibold text-foreground'
                                  : 'font-medium text-obsidian-300'
                              )}
                            >
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <div className="w-2 h-2 rounded-full bg-electric-blue flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{notification.description}</p>
                          <p className="text-[10px] text-obsidian-500 mt-2">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {notification.link && (
                          <span className="text-[10px] text-electric-blue shrink-0">View →</span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </motion.div>
    </div>
  );
}
