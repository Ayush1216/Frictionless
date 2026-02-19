'use client';

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { getScoreColor, getScoreLabel, formatDelta } from '@/lib/scores';

interface ScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  showDelta?: boolean;
  delta?: number;
  animated?: boolean;
  thickness?: number;
  /** 'circle' (default full ring) or 'semicircle' (bottom half-arc) */
  variant?: 'circle' | 'semicircle';
  /** Append '%' after the score number */
  showPercent?: boolean;
  /** Override the auto score-based color with a fixed color */
  color?: string;
  className?: string;
}

const sizeConfig = {
  sm:  { diameter: 80,  fontSize: 14, labelSize: 0,  defaultThickness: 10 },
  md:  { diameter: 120, fontSize: 22, labelSize: 12, defaultThickness: 12 },
  lg:  { diameter: 160, fontSize: 28, labelSize: 14, defaultThickness: 16 },
  xl:  { diameter: 200, fontSize: 36, labelSize: 16, defaultThickness: 18 },
};

export function ScoreGauge({
  score,
  size = 'md',
  showLabel = true,
  showDelta = false,
  delta,
  animated = true,
  thickness,
  variant = 'circle',
  showPercent = false,
  color,
  className,
}: ScoreGaugeProps) {
  const config = sizeConfig[size];
  const ringThickness = thickness ?? config.defaultThickness;
  const radius = (config.diameter - ringThickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = config.diameter / 2;
  const isSemi = variant === 'semicircle';

  // For semicircle, the total arc is half the circumference
  const halfCircumference = Math.PI * radius;
  const totalArc = isSemi ? halfCircumference : circumference;

  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);
  const [strokeOffset, setStrokeOffset] = useState(animated ? totalArc : totalArc * (1 - score / 100));
  const [progressArc, setProgressArc] = useState(animated ? 0 : halfCircumference * score / 100);
  const animationRan = useRef(false);

  useEffect(() => {
    if (!animated || animationRan.current) {
      setDisplayScore(Math.round(score));
      setStrokeOffset(totalArc * (1 - score / 100));
      setProgressArc(halfCircumference * score / 100);
      return;
    }

    animationRan.current = true;

    // Animate the stroke
    requestAnimationFrame(() => {
      setStrokeOffset(totalArc * (1 - score / 100));
      setProgressArc(halfCircumference * score / 100);
    });

    // Animate the counter
    const duration = 800;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [score, animated, totalArc]);

  const scoreColor = color ?? getScoreColor(score);
  const scoreLabel = getScoreLabel(score);
  const deltaInfo = delta !== undefined ? formatDelta(delta) : null;

  const gradientId = `gauge-grad-${size}-${score}`;

  // For semicircle: clip to bottom half + small padding
  const semiHeight = center + ringThickness + 4;
  // strokeDasharray: for semicircle show half arc then gap; for circle full ring
  const dashArray = isSemi ? `${halfCircumference} ${circumference}` : `${circumference}`;

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div
        className="relative fi-gauge-glow"
        style={{
          width: config.diameter,
          height: isSemi ? semiHeight : config.diameter,
          overflow: isSemi ? 'hidden' : undefined,
          ['--fi-gauge-color' as string]: `${scoreColor}40`,
        }}
      >
        <svg
          width={config.diameter}
          height={config.diameter}
          viewBox={`0 0 ${config.diameter} ${config.diameter}`}
          style={{
            transform: isSemi ? 'rotate(180deg)' : 'rotate(-90deg)',
            ...(isSemi ? { position: 'absolute' as const, top: 0 } : {}),
          }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={scoreColor} stopOpacity={1} />
              <stop offset="100%" stopColor={scoreColor} stopOpacity={0.6} />
            </linearGradient>
          </defs>
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--fi-bg-tertiary)"
            strokeWidth={ringThickness + 2}
            strokeLinecap="round"
            strokeDasharray={dashArray}
            opacity={0.5}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--fi-border)"
            strokeWidth={ringThickness}
            strokeLinecap="round"
            strokeDasharray={dashArray}
          />
          {/* Progress ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={ringThickness}
            strokeLinecap="round"
            strokeDasharray={isSemi ? `${progressArc} ${circumference}` : dashArray}
            strokeDashoffset={isSemi ? 0 : strokeOffset}
            style={{
              transition: animated
                ? `${isSemi ? 'stroke-dasharray' : 'stroke-dashoffset'} 800ms cubic-bezier(0.33, 1, 0.68, 1)`
                : 'none',
            }}
          />
        </svg>
        {/* Center text */}
        <div
          className="absolute flex flex-col items-center justify-center"
          style={
            isSemi
              ? { left: 0, right: 0, bottom: 0, height: ringThickness + config.fontSize + 8 }
              : { inset: 0 }
          }
        >
          <span
            className="font-bold leading-none tracking-tight"
            style={{
              fontSize: config.fontSize,
              color: scoreColor,
              letterSpacing: '-0.02em',
            }}
          >
            {displayScore}{showPercent ? '%' : ''}
          </span>
        </div>
      </div>

      {/* Label */}
      {showLabel && size !== 'sm' && (
        <span
          className="font-semibold"
          style={{
            fontSize: config.labelSize,
            color: scoreColor,
            marginTop: isSemi ? -4 : undefined,
          }}
        >
          {scoreLabel}
        </span>
      )}

      {/* Delta */}
      {showDelta && deltaInfo && (
        <span
          className="text-xs font-medium"
          style={{
            color: deltaInfo.positive ? 'var(--fi-score-excellent)' : 'var(--fi-score-need-improvement)',
          }}
        >
          {deltaInfo.text}
        </span>
      )}
    </div>
  );
}
