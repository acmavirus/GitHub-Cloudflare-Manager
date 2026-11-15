import React from 'react'
import { cn } from '../../lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent' | 'purple'
  size?: 'sm' | 'md'
  leftDot?: boolean
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  size = 'md',
  leftDot = false,
  children,
  ...props
}) => {
  const variants = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    info: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    neutral: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
    accent: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    purple: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  }

  const dotColors = {
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-rose-400',
    info: 'bg-sky-400',
    neutral: 'bg-[var(--text-muted)]',
    accent: 'bg-orange-400',
    purple: 'bg-indigo-400',
  }

  const sizes = {
    sm: 'text-[9px] px-1.5 py-0.5 font-mono',
    md: 'text-[10px] px-2 py-0.5 font-mono',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md font-medium border uppercase tracking-wider select-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {leftDot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />}
      {children}
    </span>
  )
}
