'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ScoreSparklineProps {
  history: { score: number; updated_at: string }[];
  width?: number;
  height?: number;
  className?: string;
}

export function ScoreSparkline({
  history,
  width = 200,
  height = 40,
  className,
}: ScoreSparklineProps) {
  const { points, currentPoint, polyline } = useMemo(() => {
    if (!history.length) return { points: [], currentPoint: null, polyline: '' };

    const sorted = [...history].sort(
      (a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    );

    const pad = 6;
    const w = width - pad * 2;
    const h = height - pad * 2;

    if (sorted.length === 1) {
      const x = width / 2;
      const y = height / 2;
      return {
        points: [{ x, y, score: sorted[0].score }],
        currentPoint: { x, y, score: sorted[0].score },
        polyline: `${x},${y}`,
      };
    }

    const minScore = Math.min(...sorted.map((s) => s.score));
    const maxScore = Math.max(...sorted.map((s) => s.score));
    const range = maxScore - minScore || 1;

    const pts = sorted.map((s, i) => ({
      x: pad + (i / (sorted.length - 1)) * w,
      y: pad + h - ((s.score - minScore) / range) * h,
      score: s.score,
    }));

    return {
      points: pts,
      currentPoint: pts[pts.length - 1],
      polyline: pts.map((p) => `${p.x},${p.y}`).join(' '),
    };
  }, [history, width, height]);

  if (!history.length) return null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn('shrink-0', className)}
      aria-label="Score trend sparkline"
    >
      <defs>
        <linearGradient id="sparkline-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(217 91% 60%)" />
          <stop offset="100%" stopColor="hsl(187 85% 43%)" />
        </linearGradient>
        <linearGradient id="sparkline-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      {points.length > 1 && (
        <polygon
          points={`${points[0].x},${height} ${polyline} ${points[points.length - 1].x},${height}`}
          fill="url(#sparkline-fill)"
        />
      )}

      {/* Line */}
      {points.length > 1 && (
        <polyline
          points={polyline}
          fill="none"
          stroke="url(#sparkline-stroke)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Data point dots */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === points.length - 1 ? 3.5 : 2}
          fill={i === points.length - 1 ? 'hsl(187 85% 43%)' : 'hsl(217 91% 60%)'}
          opacity={i === points.length - 1 ? 1 : 0.6}
        />
      ))}

      {/* Current score highlight ring */}
      {currentPoint && (
        <circle
          cx={currentPoint.x}
          cy={currentPoint.y}
          r={6}
          fill="none"
          stroke="hsl(187 85% 43%)"
          strokeWidth={1.5}
          opacity={0.4}
        />
      )}
    </svg>
  );
}
