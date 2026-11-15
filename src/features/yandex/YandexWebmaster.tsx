import React, { useState, useEffect } from 'react'
import {
  Plus,
  KeyRound,
  RotateCw,
  Globe,
  Award,
  RefreshCcw,
} from 'lucide-react'
import { useAppStore } from '../../lib/useAppStore'
import { yandexApi } from './api'
import { YandexAccount, YandexHost } from '../../types'
import { Button, Input, Modal, Badge, EmptyState, StatCard } from '../../components/ui'

export const YandexWebmaster: React.FC = () => {
  const { yandexAccounts, addYandexAccount, addToast } = useAppStore()

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
        title: 'Kết nối thành công',
        message: `Đã tìm thấy ${fetched.length} website trên Yandex Webmaster.`,
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
        title: 'Đã gửi yêu cầu quét lại',
        message: `Yandex Bot đã xếp hàng xử lý: ${recrawlUrl.trim()}`,
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
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Yandex Webmaster Hub
          </h2>
          <Badge variant="danger">{hosts.length} Tên miền</Badge>
        </div>

        <Button
          variant="destructive"
          size="sm"
          leftIcon={<Plus size={13} />}
          onClick={() => setShowAddModal(true)}
        >
          Thêm Yandex OAuth Token
        </Button>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden mt-4">
        {/* Left Col: Hosts */}
        <div className="lg:col-span-5 flex flex-col rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Danh sách Websites ({hosts.length})
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={loadAllHosts}
              disabled={loadingHosts}
              className="h-6 w-6"
            >
              <RotateCw size={12} className={loadingHosts ? 'animate-spin' : ''} />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-1">
            {yandexAccounts.length === 0 ? (
              <EmptyState
                icon={Globe}
                title="Chưa kết nối Yandex"
                description="Thêm OAuth Token Yandex để quản lý chất lượng website."
                actionLabel="Thêm Token ngay"
                onAction={() => setShowAddModal(true)}
              />
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
                        ? 'bg-rose-600/15 border-rose-500/30 shadow-sm'
                        : 'bg-[var(--bg-base)] border-[var(--border-subtle)] hover:border-[var(--border-mid)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-[var(--text-primary)] truncate flex-1">
                        {host.asciiHostUrl}
                      </span>
                      {host.verified && (
                        <Badge variant="success" size="sm">
                          Đã xác thực
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-[10px] text-[var(--text-muted)] font-mono mt-2 pt-2 border-t border-[var(--border-subtle)]">
                      <span className="text-amber-400 font-bold">SQI: {host.sqi || 0}</span>
                      <span>{host.indexedPagesCount.toLocaleString()} trang đã index</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Col: Details & Re-crawl */}
        <div className="lg:col-span-7 flex flex-col rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 overflow-hidden">
          {selectedHost ? (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <div>
                  <h3 className="text-xs font-semibold text-[var(--text-primary)]">{selectedHost.asciiHostUrl}</h3>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono">{selectedHost.hostId}</div>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  leftIcon={<RefreshCcw size={12} />}
                  onClick={() => {
                    setRecrawlUrl(selectedHost.asciiHostUrl)
                    setShowRecrawlModal(true)
                  }}
                >
                  Yêu cầu quét lại (Re-crawl)
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <StatCard
                  label="Chỉ số chất lượng SQI (ИКС)"
                  value={selectedHost.sqi || 0}
                  icon={<Award size={14} className="text-amber-400" />}
                  trend="Đo lường bởi Yandex"
                />
                <StatCard
                  label="Số trang đã lập chỉ mục"
                  value={selectedHost.indexedPagesCount.toLocaleString()}
                  icon={<Globe size={14} className="text-rose-400" />}
                  trend="Trang trong cơ sở dữ liệu Yandex"
                />
              </div>
            </>
          ) : (
            <EmptyState
              icon={Globe}
              title="Chưa chọn website"
              description="Chọn một website từ danh sách bên trái để xem chỉ số SQI và yêu cầu quét lại."
            />
          )}
        </div>
      </div>

      {/* Modal Add OAuth Token */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Thêm Yandex OAuth Token"
        description="Lấy OAuth Token từ ứng dụng Yandex với quyền webmaster:api."
        icon={<KeyRound size={18} className="text-rose-400" />}
      >
        <form onSubmit={handleAddAccount} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] text-[var(--text-secondary)]">Tên tài khoản (Tùy chọn)</label>
            <Input
              placeholder="Ví dụ: Yandex Tài Khoản 1"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-[var(--text-secondary)]">OAuth Token</label>
            <Input
              type="password"
              placeholder="y0_AgAAAA..."
              value={oauthToken}
              onChange={(e) => setOauthToken(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
            <Button variant="ghost" size="sm" type="button" onClick={() => setShowAddModal(false)}>
              Hủy
            </Button>
            <Button variant="destructive" size="sm" type="submit" isLoading={connecting}>
              Lưu kết nối
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Re-crawl */}
      <Modal
        isOpen={showRecrawlModal && !!selectedHost}
        onClose={() => setShowRecrawlModal(false)}
        title="Yêu cầu quét lại đường dẫn (Re-crawl)"
        description={selectedHost?.asciiHostUrl}
        icon={<RefreshCcw size={18} className="text-rose-400" />}
      >
        <form onSubmit={handleRecrawl} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] text-[var(--text-secondary)]">URL cần quét lại</label>
            <Input
              type="text"
              placeholder="https://example.com/bai-viet"
              value={recrawlUrl}
              onChange={(e) => setRecrawlUrl(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
            <Button variant="ghost" size="sm" type="button" onClick={() => setShowRecrawlModal(false)}>
              Hủy
            </Button>
            <Button variant="destructive" size="sm" type="submit" isLoading={recrawling}>
              Gửi yêu cầu
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
