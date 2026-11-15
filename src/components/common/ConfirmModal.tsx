import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { useAppStore } from '../../lib/useAppStore'

export const ConfirmModal: React.FC = () => {
  const { confirmDialog, closeConfirm } = useAppStore()

  if (!confirmDialog.isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-mid)] shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {confirmDialog.title}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
              {confirmDialog.message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
          <button
            onClick={closeConfirm}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] border border-[var(--border-subtle)] transition-colors"
          >
            {confirmDialog.cancelText || 'Hủy bỏ'}
          </button>
          <button
            onClick={async () => {
              await confirmDialog.onConfirm()
              closeConfirm()
            }}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-950 transition-colors"
          >
            {confirmDialog.confirmText || 'Xác nhận xóa'}
          </button>
        </div>
      </div>
    </div>
  )
}
