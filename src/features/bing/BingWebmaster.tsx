import React, { useState, useEffect } from 'react'
import {
  Plus,
  Trash2,
  KeyRound,
  RotateCw,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingUp,
  Globe,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react'
import { useAppStore } from '../../lib/useAppStore'
import { bingApi } from './api'
import { BingAccount, BingSite, BingQueryStat, BingQuota } from '../../types'

export const BingWebmaster: React.FC = () => {
  const { bingAccounts, addBingAccount, removeBingAccount, addToast, showConfirm } = useAppStore()

  const [showAddModal, setShowAddModal] = useState(false)
  const [accountName, setAccountName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [connecting, setConnecting] = useState(false)

  // Sites list
  const [sites, setSites] = useState<BingSite[]>([])
  const [loadingSites, setLoadingSites] = useState(false)
  const [selectedSite, setSelectedSite] = useState<BingSite | null>(null)

  // Stats & Quota for selected site
  const [quota, setQuota] = useState<BingQuota | null>(null)
  const [queryStats, setQueryStats] = useState<BingQueryStat[]>([])
  const [loadingStats, setLoadingStats] = useState(false)

  // Submit URLs modal
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [urlsInput, setUrlsInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadAllSites = async () => {
    if (bingAccounts.length === 0) {
      setSites([])
      return
    }

    setLoadingSites(true)
    let all: BingSite[] = []
    for (const acc of bingAccounts) {
      try {
        const accSites = await bingApi.getUserSites(acc.apiKey)
        all = [...all, ...accSites]
      } catch (e: any) {
        console.error(e)
      }
    }
    setSites(all)
    setLoadingSites(false)
  }

  useEffect(() => {
    loadAllSites()
  }, [bingAccounts])

  // Select site to view stats
  const handleSelectSite = async (site: BingSite) => {
    setSelectedSite(site)
    setLoadingStats(true)

    // find apiKey
    const acc = bingAccounts[0]
    if (acc) {
      const [q, stats] = await Promise.all([
        bingApi.getQuota(acc.apiKey, site.url),
        bingApi.getQueryStats(acc.apiKey, site.url),
      ])
      setQuota(q)
      setQueryStats(stats)
    }

    setLoadingStats(false)
  }

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!apiKey.trim()) return

    setConnecting(true)
    try {
      const fetchedSites = await bingApi.getUserSites(apiKey.trim())

      const newAcc: BingAccount = {
        id: Math.random().toString(36).substring(2, 9),
        name: accountName.trim() || 'Bing Account',
        apiKey: apiKey.trim(),
        createdAt: new Date().toISOString(),
      }

      addBingAccount(newAcc)
      setShowAddModal(false)
      setAccountName('')
      setApiKey('')

      addToast({
        type: 'success',
        title: 'Kết nối Bing thành công',
        message: `Đã tìm thấy ${fetchedSites.length} websites trên Bing Webmaster Tools.`,
      })
    } catch (err: any) {
      addToast({ type: 'error', title: 'Lỗi API Key', message: err.message })
    } finally {
      setConnecting(false)
    }
  }

  const handleSubmitUrls = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSite || !urlsInput.trim() || bingAccounts.length === 0) return

    const list = urlsInput
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.startsWith('http://') || u.startsWith('https://'))

    if (list.length === 0) {
      addToast({ type: 'warning', message: 'Vui lòng nhập danh sách URLs hợp lệ' })
      return
    }

    setSubmitting(true)
    try {
      const res = await bingApi.submitUrls(bingAccounts[0].apiKey, selectedSite.url, list)
      if (res.success) {
        addToast({ type: 'success', title: 'Submit hoàn tất', message: res.message })
        setUrlsInput('')
        setShowSubmitModal(false)
        // reload quota
        const q = await bingApi.getQuota(bingAccounts[0].apiKey, selectedSite.url)
        setQuota(q)
      } else {
        addToast({ type: 'error', title: 'Submit thất bại', message: res.message })
      }
    } catch (err: any) {
      addToast({ type: 'error', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex-1 h-full flex flex-col p-6 overflow-hidden animate-fade-in select-none">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse"></span>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Bing Webmaster Tools Manager
            </h2>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            {sites.length} Sites
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-cyan-950 transition-colors"
          >
            <Plus size={14} />
            <span>Thêm Bing API Key</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden mt-4">
        {/* Left Col: Sites */}
        <div className="lg:col-span-5 flex flex-col rounded-2xl glass-card p-4 overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Danh sách Websites trên Bing ({sites.length})
            </span>
            <button
              onClick={loadAllSites}
              disabled={loadingSites}
              className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-cyan-400"
            >
              <RotateCw size={13} className={loadingSites ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-1">
            {bingAccounts.length === 0 ? (
              <div className="py-16 text-center text-xs text-[var(--text-muted)] space-y-2">
                <Globe size={28} className="mx-auto text-[var(--text-dim)]" />
                <div>Chưa có API Key Bing Webmaster nào.</div>
                <button onClick={() => setShowAddModal(true)} className="text-xs text-cyan-400 hover:underline">
                  Thêm API Key tại đây
                </button>
              </div>
            ) : sites.length === 0 ? (
              <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                Không tìm thấy website nào trong tài khoản Bing này.
              </div>
            ) : (
              sites.map((site, i) => {
                const isSelected = selectedSite?.url === site.url
                return (
                  <div
                    key={i}
                    onClick={() => handleSelectSite(site)}
                    className={`p-3 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-cyan-600/15 border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                        : 'bg-[var(--bg-base)] border-[var(--border-subtle)] hover:border-[var(--border-mid)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-[var(--text-primary)] truncate flex-1">
                        {site.url}
                      </span>
                      {site.isVerified && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">
                          <CheckCircle2 size={10} />
                          <span>Verified</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono mt-1">
                      Vai trò: {site.role}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Col: Details, Quota & Submit */}
        <div className="lg:col-span-7 flex flex-col rounded-2xl glass-card p-4 overflow-hidden">
          {selectedSite ? (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <div>
                  <h3 className="text-xs font-semibold text-[var(--text-primary)]">{selectedSite.url}</h3>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono">
                    Hạn mức Submit: {quota ? `${quota.dailyQuota} URLs/ngày` : 'Đang tải...'}
                  </div>
                </div>

                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-cyan-950 transition-colors"
                >
                  <Send size={12} />
                  <span>Submit URLs Bing</span>
                </button>
              </div>

              {/* Query Stats */}
              <div className="flex-1 overflow-y-auto mt-3 space-y-3 pr-1">
                <h4 className="text-[11px] font-semibold text-cyan-400 flex items-center gap-1">
                  <TrendingUp size={13} />
                  <span>Hiệu suất Từ khóa trên Bing (Query Stats)</span>
                </h4>

                {loadingStats ? (
                  <div className="py-12 flex justify-center text-xs text-[var(--text-muted)]">
                    <Loader2 size={18} className="animate-spin text-cyan-400" />
                  </div>
                ) : queryStats.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[var(--bg-base)] text-center text-[11px] text-[var(--text-muted)]">
                    Chưa có số liệu tìm kiếm từ khóa trên Bing cho website này.
                  </div>
                ) : (
                  <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden text-xs">
                    <table className="w-full text-left font-mono">
                      <thead className="bg-[var(--bg-elevated)] text-[10px] text-[var(--text-muted)] uppercase">
                        <tr>
                          <th className="p-2">Từ khóa (Query)</th>
                          <th className="p-2 text-right">Clicks</th>
                          <th className="p-2 text-right">Hiển thị</th>
                          <th className="p-2 text-right">Vị trí TB</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--bg-base)] text-[11px]">
                        {queryStats.slice(0, 20).map((q, idx) => (
                          <tr key={idx} className="hover:bg-[var(--bg-card)]">
                            <td className="p-2 text-[var(--text-primary)] font-sans truncate max-w-xs">{q.query}</td>
                            <td className="p-2 text-right font-bold text-cyan-400">{q.clicks}</td>
                            <td className="p-2 text-right text-[var(--text-secondary)]">{q.impressions}</td>
                            <td className="p-2 text-right text-amber-400">{q.avgClickPosition || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-xs text-[var(--text-muted)]">
              <Globe size={32} className="text-[var(--text-dim)] mb-2" />
              <span>Chọn một website từ danh sách bên trái để quản lý và submit URL lên Bing.</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal Add API Key */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-mid)] shadow-2xl space-y-4">
            <h3 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <KeyRound size={16} className="text-cyan-400" />
              <span>Thêm Bing Webmaster API Key</span>
            </h3>

            <form onSubmit={handleAddAccount} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] text-[var(--text-secondary)]">Tên tài khoản (Tùy chọn)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Bing Cá Nhân"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[var(--text-secondary)]">Bing Webmaster API Key</label>
                <input
                  type="password"
                  placeholder="32 ký tự hex key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)] outline-none"
                  required
                />
                <p className="text-[10px] text-[var(--text-muted)]">
                  Lấy API key tại: Bing Webmaster Tools → Cài đặt (Settings) → Quản lý truy cập API (API Access).
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={connecting}
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-cyan-950"
                >
                  {connecting ? <Loader2 size={13} className="animate-spin" /> : null}
                  <span>Lưu & Kết nối</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Submit URLs to Bing */}
      {showSubmitModal && selectedSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-mid)] shadow-2xl space-y-4">
            <h3 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Send size={16} className="text-cyan-400" />
              <span>Gửi URL lập chỉ mục tức thì tới Bing Bot</span>
            </h3>

            <div className="text-[11px] text-[var(--text-muted)] font-mono">
              Website: <span className="text-cyan-400">{selectedSite.url}</span>
            </div>

            <form onSubmit={handleSubmitUrls} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] text-[var(--text-secondary)]">
                  Danh sách URLs (mỗi URL một dòng)
                </label>
                <textarea
                  rows={6}
                  placeholder={`${selectedSite.url}bai-viet-1&#10;${selectedSite.url}bai-viet-2`}
                  value={urlsInput}
                  onChange={(e) => setUrlsInput(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)] outline-none resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-cyan-950"
                >
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : null}
                  <span>Submit Ngay</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
