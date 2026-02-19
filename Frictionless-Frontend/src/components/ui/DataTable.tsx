'use client';

import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  className,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div
        className={cn('rounded-xl border overflow-hidden', className)}
        style={{ borderColor: 'var(--fi-border)', background: 'var(--fi-bg-card)' }}
      >
        {/* Skeleton header */}
        <div
          className="flex gap-4 px-4 py-3 border-b"
          style={{ background: 'var(--fi-bg-secondary)', borderColor: 'var(--fi-border)' }}
        >
          {columns.map((col) => (
            <div key={col.key} className="flex-1" style={{ width: col.width }}>
              <div className="fi-skeleton h-3.5 w-3/4 rounded" />
            </div>
          ))}
        </div>
        {/* Skeleton rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 px-4 py-3 border-b last:border-0"
            style={{ borderColor: 'var(--fi-border)' }}
          >
            {columns.map((col) => (
              <div key={col.key} className="flex-1" style={{ width: col.width }}>
                <div className="fi-skeleton h-3.5 rounded" style={{ width: `${60 + (i * 7) % 30}%` }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className={cn('rounded-xl border py-12 text-center', className)}
        style={{ borderColor: 'var(--fi-border)', background: 'var(--fi-bg-card)' }}
      >
        <p className="text-sm" style={{ color: 'var(--fi-text-muted)' }}>
          {emptyMessage}
        </p>
      </div>
    );
  }

  const alignClass = (align?: string) => {
    if (align === 'center') return 'text-center';
    if (align === 'right') return 'text-right';
    return 'text-left';
  };

  return (
    <div
      className={cn('rounded-xl border overflow-hidden', className)}
      style={{ borderColor: 'var(--fi-border)', background: 'var(--fi-bg-card)' }}
    >
      <table className="w-full">
        <thead>
          <tr style={{ background: 'var(--fi-bg-secondary)' }}>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 font-semibold',
                  alignClass(col.align)
                )}
                style={{
                  fontSize: 13,
                  color: 'var(--fi-text-secondary)',
                  borderBottom: '1px solid var(--fi-border)',
                  width: col.width,
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, rowIdx) => (
            <tr
              key={rowIdx}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
              className={cn(
                'transition-colors duration-150',
                onRowClick && 'cursor-pointer'
              )}
              style={{
                borderBottom: rowIdx < data.length - 1 ? '1px solid var(--fi-border)' : undefined,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--fi-bg-card-hover)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = '';
              }}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn('px-4 py-3', alignClass(col.align))}
                  style={{ fontSize: 14, color: 'var(--fi-text-primary)' }}
                >
                  {col.render
                    ? col.render(item)
                    : String(item[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
