import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  maxWidth = 'md',
  className,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const widths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="fixed inset-0 -z-10"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          'w-full p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-mid)] shadow-2xl shadow-black/60 space-y-4 animate-fade-in relative',
          widths[maxWidth],
          className
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
            <div className="space-y-0.5">
              {title && (
                <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="pt-1">{children}</div>
      </div>
    </div>
  )
}
