import React from 'react'
import { Sun, Moon, LogOut } from 'lucide-react'
import { GitHubIcon } from './Icons'
import { useAppStore } from '../../lib/useAppStore'
import { Button } from '../ui'

export const Header: React.FC = () => {
  const { theme, toggleTheme, githubUser, setGithubToken, activeView } = useAppStore()

  const getViewTitle = () => {
    switch (activeView) {
      case 'github':
        return { title: 'GitHub Repositories', desc: 'Quản lý mã nguồn, metrics và commits' }
      case 'kanban':
        return { title: 'Bảng công việc Kanban', desc: 'Theo dõi tiến độ phát triển dự án' }
      case 'cf-domains':
        return { title: 'Cloudflare Domains & DNS', desc: 'Quản lý zones và bản ghi DNS' }
      case 'gsc':
        return { title: 'Google Search Console', desc: 'Hiệu suất tìm kiếm, lượt click và thứ hạng từ khóa' }
      case 'bing':
        return { title: 'Bing Webmaster Tools', desc: 'Quản lý tên miền và số liệu tìm kiếm Bing' }
      case 'yandex':
        return { title: 'Yandex Webmaster', desc: 'Theo dõi chất lượng website và chỉ mục Yandex' }
      case 'indexing-hub':
        return { title: 'Lập chỉ mục nhanh', desc: 'Gửi URL tức thì tới công cụ tìm kiếm' }
      case 'ga-manager':
        return { title: 'Google Analytics 4', desc: 'Quản lý mã đo lường và theo dõi lưu lượng' }
      case 'auditor':
        return { title: 'Kiểm toán Tên miền', desc: 'Kiểm tra trạng thái HTTP và sitemap website' }
      case 'settings':
        return { title: 'Cài đặt & Tài khoản', desc: 'Cấu hình tài khoản Cloudflare, Google, Bing, Yandex và tùy chọn hệ thống' }
      default:
        return { title: 'Bảng điều khiển', desc: 'Trung tâm quản trị website & DevOps' }
    }
  }

  const { title, desc } = getViewTitle()

  return (
    <header className="h-16 px-6 bg-[var(--bg-base)] border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0 select-none">
      <div>
        <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">
          {title}
        </h1>
        <p className="text-[11px] text-[var(--text-muted)]">
          {desc}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* GitHub User Profile if connected */}
        {githubUser ? (
          <div className="flex items-center gap-2.5 px-3 py-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-sm">
            <img
              src={githubUser.avatar_url}
              alt={githubUser.login}
              className="w-5 h-5 rounded-full border border-indigo-500/30"
            />
            <span className="text-xs font-medium text-[var(--text-primary)]">
              {githubUser.login}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono">
              {githubUser.public_repos} repos
            </span>
            <button
              onClick={() => setGithubToken(null)}
              title="Đăng xuất"
              className="p-1 rounded-md hover:bg-rose-500/15 hover:text-rose-400 text-[var(--text-muted)] transition-colors ml-1"
            >
              <LogOut size={12} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
            <GitHubIcon size={13} />
            <span>Chưa kết nối GitHub</span>
          </div>
        )}

        {/* Trạng thái hệ thống sạch sẽ */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Sẵn sàng</span>
        </div>

        {/* Theme Toggle Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </Button>
      </div>
    </header>
  )
}
