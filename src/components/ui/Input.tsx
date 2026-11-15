import React from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  error?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftIcon, rightIcon, error, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-colors duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20',
            leftIcon ? 'pl-9' : 'pl-3',
            rightIcon ? 'pr-9' : 'pr-3',
            error ? 'border-rose-500/50 focus:border-rose-500' : '',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            {rightIcon}
          </div>
        )}
        {error && <p className="text-[10px] text-rose-400 mt-1">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          className={cn(
            'w-full p-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-colors duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 resize-none font-mono',
            error ? 'border-rose-500/50 focus:border-rose-500' : '',
            className
          )}
          {...props}
        />
        {error && <p className="text-[10px] text-rose-400 mt-1">{error}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
