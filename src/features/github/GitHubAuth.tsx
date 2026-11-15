import React, { useState } from 'react'
import { KeyRound, ExternalLink, Loader2, ShieldCheck } from 'lucide-react'
import { GitHubIcon } from '../../components/common/Icons'
import { githubApi } from './api'
import { useAppStore } from '../../lib/useAppStore'

export const GitHubAuth: React.FC = () => {
  const [tokenInput, setTokenInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setGithubToken, setGithubUser, addToast } = useAppStore()

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokenInput.trim()) return

    setLoading(true)
    setError(null)

    try {
      const user = await githubApi.getProfile(tokenInput.trim())
      setGithubUser(user)
      setGithubToken(tokenInput.trim())
      addToast({
        type: 'success',
        title: 'Đăng nhập thành công',
        message: `Chào mừng ${user.name || user.login} trở lại!`,
      })
    } catch (err: any) {
      setError(err.message || 'Không thể kết nối tới GitHub')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 h-full flex items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-md p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <GitHubIcon size={26} />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Kết nối GitHub Account
          </h2>
          <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
            Nhập Personal Access Token (classic hoặc fine-grained) để quản lý repositories trực tiếp.
          </p>
        </div>

        <form onSubmit={handleConnect} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center justify-between">
              <span>Personal Access Token</span>
              <a
                href="https://github.com/settings/tokens/new?scopes=repo,delete_repo"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Tạo Token</span>
                <ExternalLink size={11} />
              </a>
            </label>
            <div className="relative">
              <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] focus:border-indigo-500 text-xs text-[var(--text-primary)] font-mono outline-none transition-colors"
                required
              />
            </div>
            <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 mt-1">
              <ShieldCheck size={12} className="text-emerald-400" />
              <span>Yêu cầu quyền: <code className="text-indigo-400">repo</code> và <code className="text-indigo-400">delete_repo</code></span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-950"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Đang kết nối...</span>
              </>
            ) : (
              <span>Xác thực và Truy cập</span>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
