'use client';

import { useEffect } from 'react';
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
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { useNotificationStore } from '@/stores/notification-store';
import { useIsMobile } from '@/lib/hooks/useMediaQuery';
import { dummyNotifications } from '@/lib/dummy-data/notifications';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { Notification } from '@/types/database';

const typeIcons: Record<string, React.ElementType> = {
  score_change: TrendingUp,
  new_match: Handshake,
  task_due: CheckSquare,
  message: MessageSquare,
  system: Info,
};

const typeColors: Record<string, string> = {
  score_change: 'text-score-excellent bg-score-excellent/10',
  new_match: 'text-primary bg-primary/10',
  task_due: 'text-score-fair bg-score-fair/10',
  message: 'text-accent bg-accent/10',
  system: 'text-muted-foreground bg-muted',
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 172800) return 'yesterday';
  return `${Math.floor(seconds / 86400)}d ago`;
}

function groupNotifications(notifications: Notification[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  const groups: { label: string; items: Notification[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Earlier', items: [] },
  ];

  notifications.forEach((n) => {
    const date = new Date(n.created_at);
    if (date >= today) groups[0].items.push(n);
    else if (date >= yesterday) groups[1].items.push(n);
    else groups[2].items.push(n);
  });

  return groups.filter((g) => g.items.length > 0);
}

export function NotificationCenter() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { notificationsOpen, toggleNotifications } = useUIStore();
  const {
    notifications,
    unreadCount,
    setNotifications,
    markRead,
    markAllRead,
  } = useNotificationStore();

  // Load dummy data on mount
  useEffect(() => {
    if (notifications.length === 0) {
      setNotifications(dummyNotifications as Notification[]);
    }
  }, [notifications.length, setNotifications]);

  const groups = groupNotifications(notifications);

  const handleNotificationClick = (notification: Notification) => {
    markRead(notification.id);
    if (notification.link) {
      toggleNotifications();
      router.push(notification.link);
    }
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-foreground" />
          <h2 className="text-base font-display font-semibold text-foreground">
            Notifications
          </h2>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              className="text-xs text-muted-foreground hover:text-foreground h-8"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Mark all read
            </Button>
          )}
          {!isMobile && (
            <button
              onClick={toggleNotifications}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Notification list */}
      <ScrollArea className="flex-1">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="py-2">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-4 py-2">
                  {group.label}
                </p>
                {group.items.map((notification) => {
                  const Icon = typeIcons[notification.type] || Info;
                  const colorClass = typeColors[notification.type] || typeColors.system;
                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted',
                        !notification.read && 'bg-muted/30'
                      )}
                    >
                      <div
                        className={cn(
                          'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5',
                          colorClass
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={cn(
                              'text-sm truncate',
                              !notification.read
                                ? 'font-semibold text-foreground'
                                : 'font-medium text-foreground'
                            )}
                          >
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.description}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {timeAgo(notification.created_at)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  // Mobile: full-screen slide-over sheet
  if (isMobile) {
    return (
      <Sheet open={notificationsOpen} onOpenChange={toggleNotifications}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 bg-background border-border">
          <SheetHeader className="sr-only">
            <SheetTitle>Notifications</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: dropdown panel
  if (!notificationsOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={toggleNotifications}
      />
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="fixed top-4 right-4 z-50 w-96 max-h-[80vh] rounded-xl glass-card overflow-hidden shadow-2xl"
      >
        {content}
      </motion.div>
    </>
  );
}
