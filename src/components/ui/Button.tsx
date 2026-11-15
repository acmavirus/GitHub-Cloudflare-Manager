import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'accent'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]'

    const variants = {
      primary:
        'bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm shadow-indigo-950 border border-indigo-500/30',
      secondary:
        'bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-card)] border border-[var(--border-mid)] shadow-sm',
      destructive:
        'bg-rose-600 text-white hover:bg-rose-500 shadow-sm shadow-rose-950 border border-rose-500/30',
      outline:
        'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-mid)] hover:bg-[var(--bg-card)]',
      ghost:
        'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-transparent',
      accent:
        'bg-orange-600 text-white hover:bg-orange-500 shadow-sm shadow-orange-950 border border-orange-500/30',
    }

    const sizes = {
      sm: 'text-[11px] px-2.5 py-1 rounded-lg gap-1.5 h-7',
      md: 'text-xs px-3.5 py-1.5 rounded-lg gap-2 h-8',
      lg: 'text-xs px-4 py-2 rounded-xl gap-2 h-9',
      icon: 'p-1.5 rounded-lg h-8 w-8',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 size={size === 'sm' ? 12 : 14} className="animate-spin text-current shrink-0" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'
