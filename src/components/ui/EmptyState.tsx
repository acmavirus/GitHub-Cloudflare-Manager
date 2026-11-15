import React from 'react'
import { LucideIcon, Inbox } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from './Button'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'py-16 px-4 flex flex-col items-center justify-center text-center space-y-3',
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] shadow-inner">
        <Icon size={24} className="stroke-[1.5]" />
      </div>

      <div className="space-y-1 max-w-sm">
        <h4 className="text-xs font-semibold text-[var(--text-primary)]">
          {title}
        </h4>
        {description && (
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actionLabel && onAction && (
        <Button size="sm" variant="outline" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
