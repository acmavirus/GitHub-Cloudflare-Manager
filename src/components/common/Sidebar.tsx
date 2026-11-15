import React from 'react'
import {
  FolderGit2,
  Globe2,
  KeyRound,
  BarChart3,
  Send,
  SearchCode,
  KanbanSquare,
  Settings,
} from 'lucide-react'
import { useAppStore } from '../../lib/useAppStore'
import { ActiveView } from '../../types'

interface NavItem {
  id: ActiveView
  label: string
  icon: React.ElementType
  badge?: number | string
}

export const Sidebar: React.FC = () => {
  const { activeView, setActiveView, cfAccounts, kanbanTasks } = useAppStore()

  const navItems: NavItem[] = [
    {
      id: 'github',
      label: 'GitHub Repos',
      icon: FolderGit2,
    },
    {
      id: 'cf-domains',
      label: 'Cloudflare Domains',
      icon: Globe2,
    },
    {
      id: 'cf-accounts',
      label: 'Cloudflare Accounts',
      icon: KeyRound,
      badge: cfAccounts.length > 0 ? cfAccounts.length : undefined,
    },
    {
      id: 'ga-manager',
      label: 'Google Analytics 4',
      icon: BarChart3,
    },
    {
      id: 'indexnow',
      label: 'IndexNow Submitter',
      icon: Send,
    },
    {
      id: 'auditor',
      label: 'Domain Auditor',
      icon: SearchCode,
    },
    {
      id: 'kanban',
      label: 'Kanban Tasks',
      icon: KanbanSquare,
      badge: kanbanTasks.length > 0 ? kanbanTasks.length : undefined,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
    },
  ]

  return (
    <aside className="w-64 h-full bg-[var(--bg-base)] border-r border-[var(--border-subtle)] flex flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-[var(--border-subtle)]">
        <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm tracking-wider shadow-[0_0_15px_rgba(99,102,241,0.2)]">
          GC
        </div>
        <div>
          <div className="font-semibold text-sm tracking-tight text-[var(--text-primary)]">
            GITCORE
          </div>
          <div className="text-[11px] text-[var(--text-muted)] font-mono">
            v2.0 • Desktop Hub
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-semibold tracking-wider text-[var(--text-muted)] uppercase px-3 py-2">
          Management
        </div>

        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id

          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={16} className={isActive ? 'text-indigo-400' : 'text-[var(--text-muted)]'} />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] font-mono border border-[var(--border-subtle)]">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] font-mono flex items-center justify-between">
        <span>Tauri Native Engine</span>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
      </div>
    </aside>
  )
}
