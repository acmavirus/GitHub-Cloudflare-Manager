import React, { useState } from 'react'
import { Plus, Trash2, KeyRound, Mail, User, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react'
import { useAppStore } from '../../lib/useAppStore'
import { cfApi } from './api'
import { CloudflareAccount } from '../../types'

export const CloudflareAccounts: React.FC = () => {
  const { cfAccounts, addCfAccount, removeCfAccount, addToast, showConfirm } = useAppStore()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !apiKey.trim()) return

    setTesting(true)
    setError(null)

    const newAcc: CloudflareAccount = {
      id: Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      email: email.trim(),
      apiKey: apiKey.trim(),
    }

    try {
      // Test credentials by fetching zones
      await cfApi.getZones(newAcc)
      addCfAccount(newAcc)
      setName('')
      setEmail('')
      setApiKey('')
      addToast({
        type: 'success',
        title: 'Thêm tài khoản thành công',
        message: `Đã kết nối tài khoản Cloudflare "${newAcc.name}".`,
      })
    } catch (err: any) {
      setError(err.message || 'Xác thực Cloudflare API Key thất bại.')
    } finally {
      setTesting(false)
    }
  }

  const handleDelete = (account: CloudflareAccount) => {
    showConfirm({
      title: `Xóa tài khoản "${account.name}"?`,
      message: 'Thông tin xác thực của tài khoản này sẽ bị xóa khỏi ứng dụng.',
      confirmText: 'Xóa tài khoản',
      isDestructive: true,
      onConfirm: () => {
        removeCfAccount(account.id)
        addToast({
          type: 'info',
          message: `Đã gỡ tài khoản ${account.name}`,
        })
      },
    })
  }

  return (
    <div className="flex-1 h-full p-6 overflow-y-auto space-y-6 animate-fade-in select-none">
      {/* Top Banner */}
      <div className="p-4 rounded-xl glass-card border-l-4 border-orange-500 flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            <span>Cloudflare Multi-Account Engine</span>
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Thêm nhiều tài khoản Cloudflare (Global API Key) để quản lý tất cả tên miền tại một nơi tập trung.
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-mono">
          {cfAccounts.length} Tài khoản hoạt động
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form thêm tài khoản */}
        <div className="lg:col-span-1 p-5 rounded-2xl glass-card space-y-4 h-fit">
          <h3 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Plus size={15} className="text-orange-400" />
            <span>Thêm tài khoản Cloudflare mới</span>
          </h3>

          <form onSubmit={handleAdd} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--text-secondary)]">
                Tên hiển thị / Tổ chức
              </label>
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Ví dụ: Công ty A, Cá nhân..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] focus:border-orange-500 text-xs text-[var(--text-primary)] outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--text-secondary)]">
                Email tài khoản Cloudflare
              </label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="email"
                  placeholder="admin@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] focus:border-orange-500 text-xs text-[var(--text-primary)] outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--text-secondary)]">
                Global API Key
              </label>
              <div className="relative">
                <KeyRound size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="password"
                  placeholder="••••••••••••••••••••••••"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] focus:border-orange-500 text-xs text-[var(--text-primary)] font-mono outline-none"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={testing}
              className="w-full py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-orange-950"
            >
              {testing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Đang kiểm tra kết nối...</span>
                </>
              ) : (
                <span>Xác thực & Lưu tài khoản</span>
              )}
            </button>
          </form>
        </div>

        {/* Danh sách accounts */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-xs font-semibold text-[var(--text-primary)]">
            Tài khoản đã kết nối ({cfAccounts.length})
          </h3>

          {cfAccounts.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-[var(--border-subtle)] text-center text-xs text-[var(--text-muted)]">
              Chưa có tài khoản Cloudflare nào. Hãy thêm tài khoản ở form bên cạnh.
            </div>
          ) : (
            cfAccounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 rounded-xl glass-card"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      {account.name}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">
                      <CheckCircle2 size={10} />
                      <span>Đã xác thực</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[var(--text-secondary)] font-mono">
                    <span>{account.email}</span>
                    <span>•</span>
                    <span>API Key: ••••••••••••</span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(account)}
                  title="Gỡ tài khoản"
                  className="p-2 rounded-lg hover:bg-rose-500/15 text-[var(--text-muted)] hover:text-rose-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
