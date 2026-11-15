import React from 'react'
import {
  FolderGit2,
  KanbanSquare,
  Globe2,
  KeyRound,
  Search,
  Compass,
  Award,
  Zap,
  BarChart3,
  SearchCode,
  Settings,
} from 'lucide-react'
import { useAppStore } from '../../lib/useAppStore'
import { ActiveView } from '../../types'
import { Badge } from '../ui'

interface NavSection {
  title: string
  items: {
    id: ActiveView
    label: string
    icon: React.ElementType
    badge?: number | string
  }[]
}

export const Sidebar: React.FC = () => {
  const { activeView, setActiveView, cfAccounts, kanbanTasks, gscProperties, bingAccounts, yandexAccounts } =
    useAppStore()

  const sections: NavSection[] = [
    {
      title: 'Quản lý dự án',
      items: [
        {
          id: 'github',
          label: 'GitHub Repositories',
          icon: FolderGit2,
        },
        {
          id: 'kanban',
          label: 'Công việc Kanban',
          icon: KanbanSquare,
          badge: kanbanTasks.length > 0 ? kanbanTasks.length : undefined,
        },
      ],
    },
    {
      title: 'Tên miền & DNS',
      items: [
        {
          id: 'cf-domains',
          label: 'Cloudflare DNS',
          icon: Globe2,
        },
        {
          id: 'cf-accounts',
          label: 'Tài khoản Cloudflare',
          icon: KeyRound,
          badge: cfAccounts.length > 0 ? cfAccounts.length : undefined,
        },
      ],
    },
    {
      title: 'Công cụ tìm kiếm & SEO',
      items: [
        {
          id: 'gsc',
          label: 'Google Search Console',
          icon: Search,
          badge: gscProperties.length > 0 ? gscProperties.length : undefined,
        },
        {
          id: 'bing',
          label: 'Bing Webmaster',
          icon: Compass,
          badge: bingAccounts.length > 0 ? bingAccounts.length : undefined,
        },
        {
          id: 'yandex',
          label: 'Yandex Webmaster',
          icon: Award,
          badge: yandexAccounts.length > 0 ? yandexAccounts.length : undefined,
        },
        {
          id: 'indexing-hub',
          label: 'Lập chỉ mục nhanh',
          icon: Zap,
        },
        {
          id: 'ga-manager',
          label: 'Google Analytics 4',
          icon: BarChart3,
        },
      ],
    },
    {
      title: 'Tiện ích hệ thống',
      items: [
        {
          id: 'auditor',
          label: 'Kiểm toán tên miền',
          icon: SearchCode,
        },
        {
          id: 'settings',
          label: 'Cài đặt',
          icon: Settings,
        },
      ],
    },
  ]

  return (
    <aside className="w-64 h-full bg-[var(--bg-base)] border-r border-[var(--border-subtle)] flex flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-[var(--border-subtle)]">
        <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs tracking-wider shadow-sm">
          GC
        </div>
        <div>
          <div className="font-semibold text-xs tracking-tight text-[var(--text-primary)]">
            GITCORE
          </div>
          <div className="text-[10px] text-[var(--text-muted)] font-mono">
            Bảng điều khiển v2.2
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {sections.map((sec, idx) => (
          <div key={idx} className="space-y-0.5">
            <div className="text-[10px] font-semibold tracking-wider text-[var(--text-muted)] uppercase px-3 py-1">
              {sec.title}
            </div>

            {sec.items.map((item) => {
              const Icon = item.icon
              const isActive = activeView === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon size={14} className={isActive ? 'text-indigo-400' : 'text-[var(--text-muted)]'} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <Badge size="sm" variant={isActive ? 'purple' : 'neutral'}>
                      {item.badge}
                    </Badge>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] flex items-center justify-between">
        <span>Bản quyền © 2026</span>
        <span className="font-mono text-[10px]">v2.2.0</span>
      </div>
    </aside>
  )
}
