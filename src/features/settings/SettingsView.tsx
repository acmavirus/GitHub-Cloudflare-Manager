import React from 'react'
import {
  Settings,
  Shield,
  Trash2,
  Cpu,
  Monitor,
  HardDrive,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import { openUrl } from '@tauri-apps/plugin-opener'
import { useAppStore } from '../../lib/useAppStore'
import { isTauri } from '../../lib/http'
import { appStorage } from '../../lib/store'

export const SettingsView: React.FC = () => {
  const { theme, setTheme, addToast, showConfirm } = useAppStore()

  const handleOpenDocs = async (url: string) => {
    try {
      if (isTauri()) {
        await openUrl(url)
      } else {
        window.open(url, '_blank')
      }
    } catch {
      window.open(url, '_blank')
    }
  }

  const handleClearCache = () => {
    showConfirm({
      title: 'Khôi phục cài đặt gốc?',
      message: 'Toàn bộ tài khoản Cloudflare, token GitHub và công việc Kanban sẽ bị dọn dẹp sạch.',
      confirmText: 'Xóa toàn bộ',
      isDestructive: true,
      onConfirm: async () => {
        await appStorage.remove('github_token')
        await appStorage.remove('cf_accounts')
        await appStorage.remove('ga_properties')
        await appStorage.remove('indexnow_keys')
        await appStorage.remove('indexnow_history')
        await appStorage.remove('kanban_tasks')
        window.location.reload()
      },
    })
  }

  return (
    <div className="flex-1 h-full p-6 overflow-y-auto space-y-6 animate-fade-in select-none">
      {/* Top Banner */}
      <div className="p-4 rounded-xl glass-card border-l-4 border-slate-500 flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Settings size={16} className="text-[var(--text-secondary)]" />
            <span>Cài đặt hệ thống & Cấu hình Runtime</span>
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Quản lý giao diện, bộ nhớ lưu trữ bền vững và trạng thái động cơ native.
          </p>
        </div>
      </div>

      <div className="max-w-2xl space-y-4">
        {/* Runtime info */}
        <div className="p-4 rounded-2xl glass-card space-y-3">
          <h3 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Cpu size={15} className="text-indigo-400" />
            <span>Môi trường thực thi (Engine Runtime)</span>
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] space-y-1">
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-mono">
                Kiến trúc
              </span>
              <div className="font-semibold text-[var(--text-primary)] font-mono flex items-center gap-2">
                <span>{isTauri() ? 'Tauri 2.0 (Rust Native)' : 'Web Browser Dev'}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] space-y-1">
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-mono">
                Cơ chế Bypass CORS
              </span>
              <div className="font-semibold text-emerald-400 font-mono">
                Direct Native Socket
              </div>
            </div>
          </div>
        </div>

        {/* Theme preferences */}
        <div className="p-4 rounded-2xl glass-card space-y-3">
          <h3 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Monitor size={15} className="text-indigo-400" />
            <span>Giao diện & Chủ đề (Theme)</span>
          </h3>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                theme === 'dark'
                  ? 'bg-indigo-600/15 border-indigo-500/30 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                  : 'bg-[var(--bg-base)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <div className="font-semibold">Cyber Dark (Khuyên dùng)</div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Tông màu tối mờ ảo neon bảo vệ mắt</div>
            </button>

            <button
              onClick={() => setTheme('light')}
              className={`flex-1 p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                theme === 'light'
                  ? 'bg-indigo-600/15 border-indigo-500/30 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                  : 'bg-[var(--bg-base)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <div className="font-semibold">Light Workspace</div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Tông màu sáng thanh lịch, rõ ràng</div>
            </button>
          </div>
        </div>

        {/* Storage Reset */}
        <div className="p-4 rounded-2xl glass-card space-y-3 border border-rose-500/20">
          <h3 className="text-xs font-semibold text-rose-400 flex items-center gap-2">
            <Trash2 size={15} />
            <span>Vùng an toàn & Dữ liệu</span>
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Xóa bỏ toàn bộ dữ liệu cấu hình lưu trữ cục bộ trên máy và đặt lại ứng dụng về trạng thái ban đầu.
          </p>
          <button
            onClick={handleClearCache}
            className="px-3.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-400 text-xs font-medium transition-colors"
          >
            Dọn sạch bộ nhớ ứng dụng
          </button>
        </div>
      </div>
    </div>
  )
}
