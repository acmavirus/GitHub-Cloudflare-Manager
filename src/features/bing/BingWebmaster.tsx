import React, { useState, useEffect } from 'react'
import {
  Plus,
  KeyRound,
  RotateCw,
  Send,
  CheckCircle2,
  TrendingUp,
  Globe,
} from 'lucide-react'
import { useAppStore } from '../../lib/useAppStore'
import { bingApi } from './api'
import { BingAccount, BingSite, BingQueryStat, BingQuota } from '../../types'
import { Button, Input, Textarea, Modal, Badge, EmptyState } from '../../components/ui'

export const BingWebmaster: React.FC = () => {
  const { bingAccounts, addBingAccount, addToast } = useAppStore()

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

  const handleSelectSite = async (site: BingSite) => {
    setSelectedSite(site)
    setLoadingStats(true)

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
        name: accountName.trim() || 'Bing Webmaster',
        apiKey: apiKey.trim(),
        createdAt: new Date().toISOString(),
      }

      addBingAccount(newAcc)
      setShowAddModal(false)
      setAccountName('')
      setApiKey('')

      addToast({
        type: 'success',
        title: 'Kết nối thành công',
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
        const q = await bingApi.getQuota(bingAccounts[0].apiKey, selectedSite.url)
        setQuota(q)
      } else {
        addToast({ type: 'error', title: 'Thất bại', message: res.message })
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
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Bing Webmaster Tools
          </h2>
          <Badge variant="info">{sites.length} Tên miền</Badge>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus size={13} />}
          onClick={() => setShowAddModal(true)}
        >
          Thêm Bing API Key
        </Button>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden mt-4">
        {/* Left Col: Sites */}
        <div className="lg:col-span-5 flex flex-col rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Danh sách Websites ({sites.length})
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={loadAllSites}
              disabled={loadingSites}
              className="h-6 w-6"
            >
              <RotateCw size={12} className={loadingSites ? 'animate-spin' : ''} />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-1">
            {bingAccounts.length === 0 ? (
              <EmptyState
                icon={Globe}
                title="Chưa kết nối Bing"
                description="Thêm API Key từ Bing Webmaster Tools để đồng bộ website."
                actionLabel="Thêm API Key"
                onAction={() => setShowAddModal(true)}
              />
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
                        ? 'bg-cyan-600/15 border-cyan-500/30 shadow-sm'
                        : 'bg-[var(--bg-base)] border-[var(--border-subtle)] hover:border-[var(--border-mid)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-[var(--text-primary)] truncate flex-1">
                        {site.url}
                      </span>
                      {site.isVerified && (
                        <Badge variant="success" size="sm">
                          Đã xác minh
                        </Badge>
                      )}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono mt-1">
                      Quyền: {site.role}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Col: Details, Quota & Submit */}
        <div className="lg:col-span-7 flex flex-col rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 overflow-hidden">
          {selectedSite ? (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <div>
                  <h3 className="text-xs font-semibold text-[var(--text-primary)]">{selectedSite.url}</h3>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono">
                    Hạn mức gửi: {quota ? `${quota.dailyQuota} URLs/ngày` : 'Đang tải...'}
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Send size={12} />}
                  onClick={() => setShowSubmitModal(true)}
                >
                  Gửi URL tới Bing
                </Button>
              </div>

              {/* Query Stats */}
              <div className="flex-1 overflow-y-auto mt-3 space-y-3 pr-1">
                <h4 className="text-[11px] font-semibold text-cyan-400 flex items-center gap-1">
                  <TrendingUp size={13} />
                  <span>Hiệu suất tìm kiếm từ khóa trên Bing</span>
                </h4>

                {queryStats.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[var(--bg-base)] text-center text-[11px] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                    Chưa có số liệu từ khóa trên Bing cho website này.
                  </div>
                ) : (
                  <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden text-xs">
                    <table className="w-full text-left font-mono">
                      <thead className="bg-[var(--bg-elevated)] text-[10px] text-[var(--text-muted)] uppercase">
                        <tr>
                          <th className="p-2">Từ khóa</th>
                          <th className="p-2 text-right">Clicks</th>
                          <th className="p-2 text-right">Hiển thị</th>
                          <th className="p-2 text-right">Vị trí</th>
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
            <EmptyState
              icon={Globe}
              title="Chưa chọn website"
              description="Chọn một website từ danh sách bên trái để quản lý và gửi URL lên Bing."
            />
          )}
        </div>
      </div>

      {/* Modal Add API Key */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Thêm Bing Webmaster API Key"
        description="Lấy API Key tại mục Cài đặt (Settings) trên Bing Webmaster Tools."
        icon={<KeyRound size={18} className="text-cyan-400" />}
      >
        <form onSubmit={handleAddAccount} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] text-[var(--text-secondary)]">Tên tài khoản (Tùy chọn)</label>
            <Input
              placeholder="Ví dụ: Tài khoản Bing"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-[var(--text-secondary)]">API Key</label>
            <Input
              type="password"
              placeholder="32 ký tự hex"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
            <Button variant="ghost" size="sm" type="button" onClick={() => setShowAddModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={connecting}>
              Lưu kết nối
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Submit URLs to Bing */}
      <Modal
        isOpen={showSubmitModal && !!selectedSite}
        onClose={() => setShowSubmitModal(false)}
        title="Gửi URL lập chỉ mục tới Bing"
        description={selectedSite?.url}
        icon={<Send size={18} className="text-cyan-400" />}
      >
        <form onSubmit={handleSubmitUrls} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] text-[var(--text-secondary)]">Danh sách URLs (mỗi URL một dòng)</label>
            <Textarea
              rows={5}
              placeholder={`${selectedSite?.url}bai-viet-1&#10;${selectedSite?.url}bai-viet-2`}
              value={urlsInput}
              onChange={(e) => setUrlsInput(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
            <Button variant="ghost" size="sm" type="button" onClick={() => setShowSubmitModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submitting}>
              Gửi ngay
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
