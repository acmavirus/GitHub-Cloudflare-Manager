import React from 'react'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useAppStore } from '../../lib/useAppStore'

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useAppStore()

  if (toasts.length === 0) return null

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
      case 'error':
        return <AlertCircle size={16} className="text-rose-400 shrink-0" />
      case 'warning':
        return <AlertTriangle size={16} className="text-amber-400 shrink-0" />
      default:
        return <Info size={16} className="text-sky-400 shrink-0" />
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-mid)] shadow-lg shadow-black/50 animate-fade-in backdrop-blur-md"
        >
          {getIcon(toast.type)}
          <div className="flex-1 text-xs">
            {toast.title && (
              <div className="font-semibold text-[var(--text-primary)] mb-0.5">
                {toast.title}
              </div>
            )}
            <div className="text-[var(--text-secondary)] leading-relaxed">
              {toast.message}
            </div>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-0.5"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
