'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

interface AskButtonProps {
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'outline' | 'ghost';
  className?: string;
  disabled?: boolean;
  loading?: boolean;
}

const sizeConfig = {
  sm:  { height: 'h-7', text: 'text-xs', iconSize: 14, px: 'px-3', gap: 'gap-1' },
  md:  { height: 'h-9', text: 'text-sm', iconSize: 16, px: 'px-4', gap: 'gap-1.5' },
  lg:  { height: 'h-[42px]', text: 'text-base', iconSize: 18, px: 'px-5', gap: 'gap-2' },
};

export function AskButton({
  onClick,
  size = 'md',
  variant = 'primary',
  className,
  disabled = false,
  loading = false,
}: AskButtonProps) {
  const config = sizeConfig[size];

  const variantClasses = {
    primary: 'text-white hover:brightness-110',
    outline: 'border hover:brightness-110',
    ghost: 'hover:brightness-90',
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--fi-primary)' },
    outline: {
      background: 'transparent',
      borderColor: 'var(--fi-primary)',
      color: 'var(--fi-primary)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--fi-primary)',
    },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center rounded-full font-medium transition-all duration-200',
        config.height,
        config.text,
        config.px,
        config.gap,
        variantClasses[variant],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      style={variantStyles[variant]}
    >
      <span>Ask</span>
      {loading ? (
        <Loader2
          style={{ width: config.iconSize, height: config.iconSize }}
          className="animate-spin"
        />
      ) : (
        <Image
          src="/ai-logo.png"
          alt=""
          width={config.iconSize}
          height={config.iconSize}
          className="shrink-0 object-contain"
        />
      )}
    </button>
  );
}
