import React from 'react'
import { Sun, Moon, LogOut, ShieldCheck } from 'lucide-react'
import { GitHubIcon } from './Icons'
import { useAppStore } from '../../lib/useAppStore'

export const Header: React.FC = () => {
  const { theme, toggleTheme, githubUser, setGithubToken, activeView } = useAppStore()

  const getViewTitle = () => {
    switch (activeView) {
      case 'github':
        return { title: 'GitHub Repository Manager', desc: 'Quản lý repositories, metrics và commit' }
      case 'cf-domains':
        return { title: 'Cloudflare Domains & DNS', desc: 'Quản lý zones, DNS records và Bulk IP replacement' }
      case 'cf-accounts':
        return { title: 'Cloudflare Accounts', desc: 'Quản lý danh sách API Keys kết nối Cloudflare' }
      case 'gsc':
        return { title: 'Google Search Console Central', desc: 'Theo dõi thứ hạng tìm kiếm, Clicks, Impressions và Top Queries' }
      case 'bing':
        return { title: 'Bing Webmaster Tools', desc: 'Quản lý sites, hạn mức submit và truy vấn từ khóa trên Bing' }
      case 'yandex':
        return { title: 'Yandex Webmaster Hub', desc: 'Theo dõi chỉ số SQI (ИКС) và yêu cầu Re-crawl đường dẫn' }
      case 'indexing-hub':
        return { title: 'Fast Indexing Hub', desc: 'Lập chỉ mục siêu tốc qua IndexNow (Bing/Yandex) và Baidu Push API' }
      case 'ga-manager':
        return { title: 'Google Analytics 4', desc: 'Đồng bộ và quản lý properties GA4' }
      case 'auditor':
        return { title: 'Domain Auditor', desc: 'Kiểm tra trạng thái URL, mã phản hồi và Sitemap' }
      case 'kanban':
        return { title: 'Kanban Tasks', desc: 'Bảng theo dõi tiến độ công việc gắn với Repos' }
      case 'settings':
        return { title: 'System Settings', desc: 'Cấu hình hệ thống và dữ liệu lưu trữ' }
      default:
        return { title: 'GITCORE Hub', desc: 'DevOps & Site Operations Dashboard' }
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
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]">
            <img
              src={githubUser.avatar_url}
              alt={githubUser.login}
              className="w-6 h-6 rounded-full border border-indigo-500/30"
            />
            <span className="text-xs font-medium text-[var(--text-primary)]">
              {githubUser.login}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono">
              {githubUser.public_repos} repos
            </span>
            <button
              onClick={() => setGithubToken(null)}
              title="Đăng xuất GitHub"
              className="p-1 rounded hover:bg-rose-500/15 hover:text-rose-400 text-[var(--text-muted)] transition-colors ml-1"
            >
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] font-mono">
            <GitHubIcon size={13} />
            <span>Chưa đăng nhập</span>
          </div>
        )}

        {/* Security Badge */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
          <ShieldCheck size={13} />
          <span>Native IPC</span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Chuyển sang Giao diện sáng' : 'Chuyển sang Giao diện tối'}
          className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-mid)] transition-colors"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  )
}
