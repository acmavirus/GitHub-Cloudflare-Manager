import React, { useState, useEffect, useMemo } from 'react'
import {
  Search,
  RotateCw,
  GitFork,
  Star,
  Eye,
  GitBranch,
  Copy,
  Trash2,
  Edit2,
  ExternalLink,
  Flame,
  Check,
  Loader2,
  CheckSquare,
  Square,
  Lock,
  Globe,
} from 'lucide-react'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { githubApi } from './api'
import { GitHubRepo, RepoStats } from '../../types'
import { useAppStore } from '../../lib/useAppStore'
import { isTauri } from '../../lib/http'
import { formatDate } from '../../lib/utils'

export const GitHubManager: React.FC = () => {
  const { githubToken, addToast, showConfirm } = useAppStore()

  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'public' | 'private' | 'forks'>('all')
  const [sortBy, setSortBy] = useState<'updated' | 'stars' | 'name'>('updated')

  // Selected for bulk actions
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Inline rename state
  const [renamingRepo, setRenamingRepo] = useState<string | null>(null)
  const [newName, setNewName] = useState('')

  // Stats cache
  const [repoStats, setRepoStats] = useState<Record<number, RepoStats>>({})

  // Trending tab
  const [showTrending, setShowTrending] = useState(false)
  const [trendingTimeframe, setTrendingTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [trendingRepos, setTrendingRepos] = useState<any[]>([])
  const [loadingTrending, setLoadingTrending] = useState(false)

  const fetchRepos = async () => {
    if (!githubToken) return
    setLoading(true)
    try {
      const data = await githubApi.getRepos(githubToken)
      setRepos(data)
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Lỗi tải repositories',
        message: err.message || 'Không thể lấy danh sách repos',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRepos()
  }, [githubToken])

  // Load trending when toggled
  useEffect(() => {
    if (showTrending) {
      loadTrending()
    }
  }, [showTrending, trendingTimeframe])

  const loadTrending = async () => {
    setLoadingTrending(true)
    try {
      const items = await githubApi.getTrending(trendingTimeframe)
      setTrendingRepos(items)
    } catch {
      // ignore
    } finally {
      setLoadingTrending(false)
    }
  }

  // Filter & Sort
  const filteredRepos = useMemo(() => {
    return repos
      .filter((r) => {
        if (search) {
          const q = search.toLowerCase()
          const matchName = r.name.toLowerCase().includes(q)
          const matchDesc = r.description?.toLowerCase().includes(q)
          if (!matchName && !matchDesc) return false
        }

        if (filterType === 'public') return !r.private
        if (filterType === 'private') return r.private
        if (filterType === 'forks') return r.fork
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'stars') return b.stargazers_count - a.stargazers_count
        if (sortBy === 'name') return a.name.localeCompare(b.name)
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      })
  }, [repos, search, filterType, sortBy])

  // Copy Clone Command
  const copyCloneCmd = async (cloneUrl: string) => {
    const cmd = `git clone ${cloneUrl}`
    try {
      if (isTauri()) {
        await writeText(cmd)
      } else {
        await navigator.clipboard.writeText(cmd)
      }
      addToast({
        type: 'success',
        title: 'Đã sao chép',
        message: `Đã copy: ${cmd}`,
      })
    } catch {
      addToast({ type: 'error', message: 'Không thể truy cập clipboard' })
    }
  }

  // Rename action
  const handleRename = async (repo: GitHubRepo) => {
    if (!githubToken || !newName.trim() || newName.trim() === repo.name) {
      setRenamingRepo(null)
      return
    }

    try {
      await githubApi.renameRepo(githubToken, repo.owner.login, repo.name, newName.trim())
      setRepos((prev) =>
        prev.map((r) =>
          r.id === repo.id
            ? { ...r, name: newName.trim(), full_name: `${repo.owner.login}/${newName.trim()}` }
            : r
        )
      )
      addToast({
        type: 'success',
        title: 'Đổi tên thành công',
        message: `Repository đã được đổi thành ${newName.trim()}`,
      })
    } catch (err: any) {
      addToast({ type: 'error', title: 'Lỗi đổi tên', message: err.message })
    } finally {
      setRenamingRepo(null)
    }
  }

  // Single Delete
  const handleDeleteSingle = (repo: GitHubRepo) => {
    showConfirm({
      title: `Xác nhận xóa "${repo.full_name}"?`,
      message: 'Hành động này sẽ xóa vĩnh viễn repository trên GitHub. Bạn không thể hoàn tác!',
      confirmText: 'Xóa vĩnh viễn',
      isDestructive: true,
      onConfirm: async () => {
        if (!githubToken) return
        try {
          await githubApi.deleteRepo(githubToken, repo.owner.login, repo.name)
          setRepos((prev) => prev.filter((r) => r.id !== repo.id))
          addToast({
            type: 'success',
            title: 'Đã xóa repository',
            message: `Repo ${repo.full_name} đã được dọn sạch.`,
          })
        } catch (err: any) {
          addToast({ type: 'error', title: 'Lỗi xóa repo', message: err.message })
        }
      },
    })
  }

  // Bulk Delete
  const handleBulkDelete = () => {
    if (selected.size === 0) return

    showConfirm({
      title: `Xóa ${selected.size} repositories đã chọn?`,
      message: `Bạn đang chuẩn bị xóa ${selected.size} repositories cùng một lúc. Mọi dữ liệu sẽ biến mất vĩnh viễn!`,
      confirmText: `Xóa tất cả (${selected.size})`,
      isDestructive: true,
      onConfirm: async () => {
        if (!githubToken) return
        let count = 0
        for (const fullName of Array.from(selected)) {
          const [owner, name] = fullName.split('/')
          try {
            await githubApi.deleteRepo(githubToken, owner, name)
            count++
          } catch (e) {
            console.error(e)
          }
        }
        setSelected(new Set())
        fetchRepos()
        addToast({
          type: 'success',
          title: 'Hoàn tất xóa hàng loạt',
          message: `Đã xóa thành công ${count} repositories.`,
        })
      },
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === filteredRepos.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filteredRepos.map((r) => r.full_name)))
    }
  }

  const toggleSelect = (fullName: string) => {
    const next = new Set(selected)
    if (next.has(fullName)) {
      next.delete(fullName)
    } else {
      next.add(fullName)
    }
    setSelected(next)
  }

  return (
    <div className="flex-1 h-full flex flex-col p-6 overflow-hidden animate-fade-in select-none">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Tìm kiếm repository theo tên, mô tả..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] focus:border-indigo-500 text-xs text-[var(--text-primary)] outline-none transition-colors"
            />
          </div>

          <div className="flex items-center rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] p-0.5 text-xs text-[var(--text-secondary)]">
            {(['all', 'public', 'private', 'forks'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-colors ${
                  filterType === t
                    ? 'bg-indigo-600/20 text-indigo-400 font-semibold'
                    : 'hover:text-[var(--text-primary)]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTrending(!showTrending)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all ${
              showTrending
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Flame size={14} />
            <span>Trending Repos</span>
          </button>

          <button
            onClick={fetchRepos}
            disabled={loading}
            title="Làm mới danh sách"
            className="p-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-mid)] transition-colors"
          >
            <RotateCw size={14} className={loading ? 'animate-spin text-indigo-400' : ''} />
          </button>
        </div>
      </div>

      {/* Bulk Action Bar if selected */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2 mt-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs animate-fade-in">
          <div className="flex items-center gap-2 text-rose-400 font-medium">
            <span>Đã chọn {selected.size} repositories</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="px-2.5 py-1 rounded-md text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Bỏ chọn
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-medium text-[11px] flex items-center gap-1.5 transition-colors shadow-md shadow-rose-950"
            >
              <Trash2 size={12} />
              <span>Xóa ({selected.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto mt-4 space-y-2 pr-1">
        {showTrending ? (
          /* Trending Explore View */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Flame size={14} className="text-amber-400" />
                <span>GitHub Trending Repositories</span>
              </h2>
              <div className="flex items-center gap-1 bg-[var(--bg-card)] p-0.5 rounded-lg border border-[var(--border-subtle)] text-[11px]">
                {(['daily', 'weekly', 'monthly'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTrendingTimeframe(tf)}
                    className={`px-2 py-0.5 rounded capitalize ${
                      trendingTimeframe === tf ? 'bg-amber-500/20 text-amber-400 font-semibold' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {loadingTrending ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                <Loader2 size={20} className="animate-spin text-amber-400" />
                <span>Đang tải danh sách trending...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {trendingRepos.map((item) => (
                  <div key={item.id} className="p-3.5 rounded-xl glass-card space-y-2">
                    <div className="flex items-center justify-between">
                      <a
                        href={item.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <span>{item.full_name}</span>
                        <ExternalLink size={11} />
                      </a>
                      <div className="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                        <Star size={11} />
                        <span>{item.stargazers_count}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2">
                      {item.description || 'Không có mô tả'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
            <span>Đang tải danh sách repositories từ GitHub...</span>
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--text-muted)]">
            Không tìm thấy repository nào phù hợp với bộ lọc.
          </div>
        ) : (
          /* Repositories List */
          filteredRepos.map((repo) => {
            const isSelected = selected.has(repo.full_name)
            const isRenaming = renamingRepo === repo.full_name

            return (
              <div
                key={repo.id}
                className={`flex items-center justify-between p-3.5 rounded-xl glass-card transition-all ${
                  isSelected ? 'border-rose-500/40 bg-rose-500/5' : ''
                }`}
              >
                {/* Checkbox & Details */}
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <button
                    onClick={() => toggleSelect(repo.full_name)}
                    className="text-[var(--text-muted)] hover:text-indigo-400 transition-colors"
                  >
                    {isSelected ? (
                      <CheckSquare size={16} className="text-rose-400" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {isRenaming ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="px-2 py-0.5 rounded bg-[var(--bg-base)] border border-indigo-500 text-xs font-mono text-[var(--text-primary)] outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRename(repo)
                              if (e.key === 'Escape') setRenamingRepo(null)
                            }}
                          />
                          <button
                            onClick={() => handleRename(repo)}
                            className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-500"
                          >
                            <Check size={12} />
                          </button>
                        </div>
                      ) : (
                        <a
                          href={repo.html_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-[var(--text-primary)] hover:text-indigo-400 transition-colors truncate"
                        >
                          {repo.full_name}
                        </a>
                      )}

                      {/* Visibility badge */}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 ${
                          repo.private
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {repo.private ? <Lock size={9} /> : <Globe size={9} />}
                        <span>{repo.private ? 'Private' : 'Public'}</span>
                      </span>

                      {repo.fork && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-1">
                          <GitFork size={9} />
                          <span>Fork</span>
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-[var(--text-secondary)] truncate">
                      {repo.description || 'Không có mô tả'}
                    </p>

                    <div className="flex items-center gap-4 text-[10px] text-[var(--text-muted)] font-mono">
                      {repo.language && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                          <span>{repo.language}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Star size={10} />
                        <span>{repo.stargazers_count}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <GitFork size={10} />
                        <span>{repo.forks_count}</span>
                      </span>
                      <span>Cập nhật: {formatDate(repo.updated_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0 ml-4">
                  <button
                    onClick={() => copyCloneCmd(repo.clone_url)}
                    title="Copy lệnh git clone"
                    className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-indigo-400 transition-colors"
                  >
                    <Copy size={13} />
                  </button>

                  <button
                    onClick={() => {
                      setRenamingRepo(repo.full_name)
                      setNewName(repo.name)
                    }}
                    title="Đổi tên repository"
                    className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-amber-400 transition-colors"
                  >
                    <Edit2 size={13} />
                  </button>

                  <button
                    onClick={() => handleDeleteSingle(repo)}
                    title="Xóa repository vĩnh viễn"
                    className="p-1.5 rounded-lg hover:bg-rose-500/15 text-[var(--text-muted)] hover:text-rose-400 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
