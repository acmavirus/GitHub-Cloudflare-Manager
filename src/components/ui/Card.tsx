import React from 'react'
import { cn } from '../../lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean
  hoverable?: boolean
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, elevated = false, hoverable = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl border transition-all duration-200',
          elevated
            ? 'bg-[var(--bg-elevated)] border-[var(--border-mid)] shadow-lg shadow-black/40'
            : 'bg-[var(--bg-card)] border-[var(--border-subtle)] shadow-sm shadow-black/20',
          hoverable ? 'hover:border-[var(--border-mid)] hover:-translate-y-0.5' : '',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  trend?: string
  trendType?: 'up' | 'down' | 'neutral'
  className?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  trend,
  trendType = 'neutral',
  className,
}) => {
  return (
    <Card className={cn('p-3.5 space-y-1', className)}>
      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
        <span className="font-medium truncate">{label}</span>
        {icon && <span className="shrink-0">{icon}</span>}
      </div>
      <div className="text-xl font-bold font-mono text-[var(--text-primary)] tracking-tight">
        {value}
      </div>
      {trend && (
        <div
          className={cn(
            'text-[10px] font-mono',
            trendType === 'up'
              ? 'text-emerald-400'
              : trendType === 'down'
              ? 'text-rose-400'
              : 'text-[var(--text-muted)]'
          )}
        >
          {trend}
        </div>
      )}
    </Card>
  )
}
