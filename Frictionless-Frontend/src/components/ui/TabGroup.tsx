'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface TabGroupProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'underline' | 'pill' | 'button';
  size?: 'sm' | 'md';
  className?: string;
}

export function TabGroup({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  size = 'md',
  className,
}: TabGroupProps) {
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const padding = size === 'sm' ? 'px-3 py-1.5' : 'px-4 py-2';

  return (
    <div
      className={cn(
        'flex',
        variant === 'underline' && 'border-b',
        variant === 'pill' && 'gap-1 p-1 rounded-lg',
        variant === 'button' && 'gap-1',
        className
      )}
      style={{
        borderColor: variant === 'underline' ? 'var(--fi-border)' : undefined,
        background: variant === 'pill' ? 'var(--fi-bg-secondary)' : undefined,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;

        if (variant === 'underline') {
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                'relative flex items-center gap-1.5 font-medium transition-colors duration-200',
                padding,
                textSize,
                isActive ? '' : 'hover:opacity-80'
              )}
              style={{
                color: isActive ? 'var(--fi-primary)' : 'var(--fi-text-muted)',
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: isActive ? 'var(--fi-primary)' : 'var(--fi-bg-tertiary)',
                    color: isActive ? 'white' : 'var(--fi-text-muted)',
                    fontSize: 10,
                  }}
                >
                  {tab.count}
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: 'var(--fi-primary)' }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
            </button>
          );
        }

        if (variant === 'pill') {
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                'relative flex items-center gap-1.5 rounded-md font-medium transition-colors duration-200',
                padding,
                textSize
              )}
              style={{
                background: isActive ? 'var(--fi-primary-light)' : 'transparent',
                color: isActive ? 'var(--fi-primary-dark)' : 'var(--fi-text-muted)',
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: isActive ? 'var(--fi-primary)' : 'var(--fi-bg-tertiary)',
                    color: isActive ? 'white' : 'var(--fi-text-muted)',
                    fontSize: 10,
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        }

        // button variant
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg font-medium transition-all duration-200',
              padding,
              textSize
            )}
            style={{
              background: isActive ? 'var(--fi-primary)' : 'transparent',
              color: isActive ? 'white' : 'var(--fi-text-muted)',
              border: isActive ? 'none' : '1px solid var(--fi-border)',
            }}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--fi-bg-tertiary)',
                  color: isActive ? 'white' : 'var(--fi-text-muted)',
                  fontSize: 10,
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
