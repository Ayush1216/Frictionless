import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md", className)}
      style={{ background: 'var(--fi-bg-tertiary)' }}
      {...props}
    />
  )
}

export { Skeleton }
