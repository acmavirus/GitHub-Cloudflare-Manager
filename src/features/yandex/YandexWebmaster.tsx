import React, { useState, useEffect } from 'react'
import {
  Plus,
  Trash2,
  KeyRound,
  RotateCw,
  Send,
  Loader2,
  Globe,
  ExternalLink,
  Award,
  RefreshCcw,
  CheckCircle2,
} from 'lucide-react'
import { useAppStore } from '../../lib/useAppStore'
import { yandexApi } from './api'
import { YandexAccount, YandexHost } from '../../types'

export const YandexWebmaster: React.FC = () => {
  const { yandexAccounts, addYandexAccount, removeYandexAccount, addToast, showConfirm } = useAppStore()

  const [showAddModal, setShowAddModal] = useState(false)
  const [accountName, setAccountName] = useState('')
  const [oauthToken, setOauthToken] = useState('')
  const [connecting, setConnecting] = useState(false)

  // Hosts list
  const [hosts, setHosts] = useState<YandexHost[]>([])
  const [loadingHosts, setLoadingHosts] = useState(false)
  const [selectedHost, setSelectedHost] = useState<YandexHost | null>(null)

  // Re-crawl modal
  const [showRecrawlModal, setShowRecrawlModal] = useState(false)
  const [recrawlUrl, setRecrawlUrl] = useState('')
  const [recrawling, setRecrawling] = useState(false)

  const loadAllHosts = async () => {
    if (yandexAccounts.length === 0) {
      setHosts([])
      return
    }

    setLoadingHosts(true)
    let all: YandexHost[] = []

    for (const acc of yandexAccounts) {
      try {
        const userId = acc.userId || (await yandexApi.getUserId(acc.oauthToken))
        const fetchedHosts = await yandexApi.getHosts(acc.oauthToken, userId)

        // Enrich with summary (SQI and index count)
        for (const h of fetchedHosts) {
          const summary = await yandexApi.getHostSummary(acc.oauthToken, userId, h.hostId)
          if (summary) {
            h.sqi = summary.sqi
            h.indexedPagesCount = summary.indexedPagesCount
          }
        }

        all = [...all, ...fetchedHosts]
      } catch (err: any) {
        console.error(err)
      }
    }

    setHosts(all)
    setLoadingHosts(false)
  }

  useEffect(() => {
    loadAllHosts()
  }, [yandexAccounts])

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!oauthToken.trim()) return

    setConnecting(true)
    try {
      const userId = await yandexApi.getUserId(oauthToken.trim())
      const fetched = await yandexApi.getHosts(oauthToken.trim(), userId)

      const newAcc: YandexAccount = {
        id: Math.random().toString(36).substring(2, 9),
        name: accountName.trim() || 'Yandex Webmaster',
        oauthToken: oauthToken.trim(),
        userId,
        createdAt: new Date().toISOString(),
      }

      addYandexAccount(newAcc)
      setShowAddModal(false)
      setAccountName('')
      setOauthToken('')

      addToast({
        type: 'success',
        title: 'Kết nối Yandex thành công',
        message: `Đã tìm thấy ${fetched.length} websites trên Yandex Webmaster.`,
      })
    } catch (err: any) {
      addToast({ type: 'error', title: 'Lỗi OAuth Token', message: err.message })
    } finally {
      setConnecting(false)
    }
  }

  const handleRecrawl = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedHost || !recrawlUrl.trim() || yandexAccounts.length === 0) return

    setRecrawling(true)
    const acc = yandexAccounts[0]
    try {
      const userId = acc.userId || (await yandexApi.getUserId(acc.oauthToken))
      await yandexApi.recrawlUrl(acc.oauthToken, userId, selectedHost.hostId, recrawlUrl.trim())

      addToast({
        type: 'success',
        title: 'Đã gửi yêu cầu Re-crawl',
        message: `Yandex Bot đã xếp hàng quét lại: ${recrawlUrl.trim()}`,
      })
      setRecrawlUrl('')
      setShowRecrawlModal(false)
    } catch (err: any) {
      addToast({ type: 'error', message: err.message })
    } finally {
      setRecrawling(false)
    }
  }

  return (
    <div className="flex-1 h-full flex flex-col p-6 overflow-hidden animate-fade-in select-none">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Yandex Webmaster Tools Hub
            </h2>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
            {hosts.length} Sites
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-rose-950 transition-colors"
          >
            <Plus size={14} />
            <span>Thêm Yandex OAuth Token</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden mt-4">
        {/* Left Col: Hosts */}
        <div className="lg:col-span-5 flex flex-col rounded-2xl glass-card p-4 overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Websites trên Yandex ({hosts.length})
            </span>
            <button
              onClick={loadAllHosts}
              disabled={loadingHosts}
              className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-rose-400"
            >
              <RotateCw size={13} className={loadingHosts ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-1">
            {yandexAccounts.length === 0 ? (
              <div className="py-16 text-center text-xs text-[var(--text-muted)] space-y-2">
                <Globe size={28} className="mx-auto text-[var(--text-dim)]" />
                <div>Chưa có OAuth Token Yandex nào.</div>
                <button onClick={() => setShowAddModal(true)} className="text-xs text-rose-400 hover:underline">
                  Thêm Token tại đây
                </button>
              </div>
            ) : hosts.length === 0 ? (
              <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                Không tìm thấy website nào trong tài khoản Yandex này.
              </div>
            ) : (
              hosts.map((host, i) => {
                const isSelected = selectedHost?.hostId === host.hostId
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedHost(host)}
                    className={`p-3 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-rose-600/15 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
                        : 'bg-[var(--bg-base)] border-[var(--border-subtle)] hover:border-[var(--border-mid)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-[var(--text-primary)] truncate flex-1">
                        {host.asciiHostUrl}
                      </span>
                      {host.verified && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">
                          <CheckCircle2 size={10} />
                          <span>Verified</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-[10px] text-[var(--text-muted)] font-mono mt-2 pt-2 border-t border-[var(--border-subtle)]">
                      <span className="flex items-center gap-1 text-amber-400">
                        <Award size={11} />
                        <span>SQI: {host.sqi || 0}</span>
                      </span>
                      <span>Đã Index: {host.indexedPagesCount.toLocaleString()} trang</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Col: Details & Re-crawl */}
        <div className="lg:col-span-7 flex flex-col rounded-2xl glass-card p-4 overflow-hidden">
          {selectedHost ? (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <div>
                  <h3 className="text-xs font-semibold text-[var(--text-primary)]">{selectedHost.asciiHostUrl}</h3>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono">Host ID: {selectedHost.hostId}</div>
                </div>

                <button
                  onClick={() => {
                    setRecrawlUrl(selectedHost.asciiHostUrl)
                    setShowRecrawlModal(true)
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-rose-950 transition-colors"
                >
                  <RefreshCcw size={12} />
                  <span>Yêu cầu Re-crawl</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="p-4 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] space-y-1">
                  <div className="text-[11px] text-[var(--text-muted)]">Chỉ số chất lượng SQI (ИКС)</div>
                  <div className="text-2xl font-bold font-mono text-amber-400">{selectedHost.sqi || 0}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Site Quality Index đo lường bởi Yandex</div>
                </div>

                <div className="p-4 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] space-y-1">
                  <div className="text-[11px] text-[var(--text-muted)]">Số trang đã lập chỉ mục</div>
                  <div className="text-2xl font-bold font-mono text-rose-400">
                    {selectedHost.indexedPagesCount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">Trang đã lưu trong cơ sở dữ liệu Yandex</div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-xs text-[var(--text-muted)]">
              <Globe size={32} className="text-[var(--text-dim)] mb-2" />
              <span>Chọn một website từ danh sách bên trái để xem chỉ số SQI và gửi yêu cầu Re-crawl tới Yandex.</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal Add OAuth Token */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-mid)] shadow-2xl space-y-4">
            <h3 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <KeyRound size={16} className="text-rose-400" />
              <span>Thêm Yandex OAuth Token</span>
            </h3>

            <form onSubmit={handleAddAccount} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] text-[var(--text-secondary)]">Tên tài khoản (Tùy chọn)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Yandex Nga"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[var(--text-secondary)]">OAuth Token Yandex</label>
                <input
                  type="password"
                  placeholder="y0_AgAAAA..."
                  value={oauthToken}
                  onChange={(e) => setOauthToken(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)] outline-none"
                  required
                />
                <p className="text-[10px] text-[var(--text-muted)]">
                  Lấy OAuth token từ trang Yandex OAuth App với quyền <code>webmaster:api</code>.
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
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-rose-950"
                >
                  {connecting ? <Loader2 size={13} className="animate-spin" /> : null}
                  <span>Lưu & Kết nối</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Re-crawl */}
      {showRecrawlModal && selectedHost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-mid)] shadow-2xl space-y-4">
            <h3 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <RefreshCcw size={16} className="text-rose-400" />
              <span>Yêu cầu Yandex Bot quét lại đường dẫn</span>
            </h3>

            <form onSubmit={handleRecrawl} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] text-[var(--text-secondary)]">URL cần Re-crawl</label>
                <input
                  type="text"
                  placeholder="https://example.com/bai-viet"
                  value={recrawlUrl}
                  onChange={(e) => setRecrawlUrl(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)] outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setShowRecrawlModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={recrawling}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-rose-950"
                >
                  {recrawling ? <Loader2 size={13} className="animate-spin" /> : null}
                  <span>Gửi yêu cầu</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
