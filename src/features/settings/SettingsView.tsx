import React from 'react'
import { Settings, Trash2, Monitor, Database, Moon, Sun } from 'lucide-react'
import { useAppStore } from '../../lib/useAppStore'
import { appStorage } from '../../lib/store'
import { Card, Button } from '../../components/ui'

export const SettingsView: React.FC = () => {
  const { theme, setTheme, showConfirm } = useAppStore()

  const handleClearCache = () => {
    showConfirm({
      title: 'Khôi phục cài đặt gốc?',
      message: 'Toàn bộ dữ liệu kết nối, tài khoản và công việc lưu trữ cục bộ sẽ bị xóa.',
      confirmText: 'Xác nhận xóa toàn bộ',
      isDestructive: true,
      onConfirm: async () => {
        await appStorage.remove('github_token')
        await appStorage.remove('cf_accounts')
        await appStorage.remove('ga_properties')
        await appStorage.remove('gsc_accounts')
        await appStorage.remove('gsc_properties')
        await appStorage.remove('bing_accounts')
        await appStorage.remove('yandex_accounts')
        await appStorage.remove('baidu_properties')
        await appStorage.remove('indexnow_keys')
        await appStorage.remove('indexnow_history')
        await appStorage.remove('kanban_tasks')
        window.location.reload()
      },
    })
  }

  return (
    <div className="flex-1 h-full p-6 overflow-y-auto space-y-6 animate-fade-in select-none">
      <div className="max-w-2xl space-y-5">
        {/* Theme preferences */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Monitor size={15} className="text-indigo-400" />
            <h3 className="text-xs font-semibold text-[var(--text-primary)]">
              Chủ đề giao diện
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTheme('dark')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                theme === 'dark'
                  ? 'bg-indigo-600/15 border-indigo-500/30 text-indigo-400 shadow-sm'
                  : 'bg-[var(--bg-base)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-xs mb-1">
                <Moon size={14} />
                <span>Giao diện Tối</span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                Tông màu tối dịu mắt, phù hợp làm việc đêm
              </div>
            </button>

            <button
              onClick={() => setTheme('light')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                theme === 'light'
                  ? 'bg-indigo-600/15 border-indigo-500/30 text-indigo-400 shadow-sm'
                  : 'bg-[var(--bg-base)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-xs mb-1">
                <Sun size={14} />
                <span>Giao diện Sáng</span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                Tông màu sáng rõ ràng, độ tương phản cao
              </div>
            </button>
          </div>
        </Card>

        {/* System info */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Database size={15} className="text-indigo-400" />
            <h3 className="text-xs font-semibold text-[var(--text-primary)]">
              Thông tin phiên bản
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] space-y-0.5">
              <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase">Phiên bản ứng dụng</span>
              <div className="font-semibold text-[var(--text-primary)] font-mono">v2.2.0</div>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] space-y-0.5">
              <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase">Trạng thái lưu trữ</span>
              <div className="font-semibold text-emerald-400 font-mono">Hoạt động bình thường</div>
            </div>
          </div>
        </Card>

        {/* Data Reset */}
        <Card className="p-5 space-y-3 border-rose-500/20">
          <div className="flex items-center gap-2 text-rose-400">
            <Trash2 size={15} />
            <h3 className="text-xs font-semibold">Khôi phục cài đặt gốc</h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Dọn sạch toàn bộ dữ liệu cấu hình, tài khoản đã kết nối và các thẻ công việc lưu trữ trên máy tính này.
          </p>
          <Button variant="destructive" size="sm" onClick={handleClearCache}>
            Dọn sạch dữ liệu ứng dụng
          </Button>
        </Card>
      </div>
    </div>
  )
}
