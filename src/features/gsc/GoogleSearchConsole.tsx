import React, { useState } from 'react'
import {
  Search,
  Plus,
  RotateCw,
  TrendingUp,
  MousePointerClick,
  Eye,
  Percent,
  BarChart2,
  FileJson,
  ExternalLink,
  Globe,
  ShieldCheck,
} from 'lucide-react'
import { useAppStore } from '../../lib/useAppStore'
import { gscApi } from './api'
import { GSCAccount, GSCProperty } from '../../types'
import { Button, Input, Textarea, Modal, StatCard, Badge, EmptyState } from '../../components/ui'

export const GoogleSearchConsole: React.FC = () => {
  const { gscAccounts, addGscAccount, gscProperties, upsertGscProperty, addToast } = useAppStore()

  // Account modal
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [accName, setAccName] = useState('')
  const [accType, setAccType] = useState<'service_account' | 'token'>('service_account')
  const [jsonKeyText, setJsonKeyText] = useState('')
  const [oauthTokenText, setOauthTokenText] = useState('')
  const [connecting, setConnecting] = useState(false)

  // Selected property for deep analytics
  const [selectedProp, setSelectedProp] = useState<GSCProperty | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Handle Add Account
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setConnecting(true)

    try {
      if (accType === 'service_account') {
        const parsed = JSON.parse(jsonKeyText.trim())
        const clientEmail = parsed.client_email
        const privateKey = parsed.private_key
        if (!clientEmail || !privateKey) {
          throw new Error('File JSON không chứa client_email hoặc private_key hợp lệ.')
        }

        const token = await gscApi.getAccessTokenFromServiceAccount(clientEmail, privateKey)
        const sites = await gscApi.getSites(token)

        const newAcc: GSCAccount = {
          id: Math.random().toString(36).substring(2, 9),
          name: accName.trim() || clientEmail.split('@')[0],
          type: 'service_account',
          clientEmail,
          privateKey,
          createdAt: new Date().toISOString(),
        }

        addGscAccount(newAcc)

        for (const s of sites) {
          const domain = s.siteUrl.replace(/^https?:\/\//, '').replace(/^sc-domain:/, '').replace(/\/$/, '')
          upsertGscProperty({
            id: Math.random().toString(36).substring(2, 9),
            accountId: newAcc.id,
            siteUrl: s.siteUrl,
            domain,
            permissionLevel: s.permissionLevel || 'siteFullUser',
            clicks: 0,
            impressions: 0,
            ctr: 0,
            position: 0,
          })
        }

        addToast({
          type: 'success',
          title: 'Kết nối thành công',
          message: `Đã tìm thấy ${sites.length} website trong Google Search Console.`,
        })
      } else {
        const sites = await gscApi.getSites(oauthTokenText.trim())
        const newAcc: GSCAccount = {
          id: Math.random().toString(36).substring(2, 9),
          name: accName.trim() || 'Google Account',
          type: 'token',
          token: oauthTokenText.trim(),
          createdAt: new Date().toISOString(),
        }
        addGscAccount(newAcc)

        for (const s of sites) {
          const domain = s.siteUrl.replace(/^https?:\/\//, '').replace(/^sc-domain:/, '').replace(/\/$/, '')
          upsertGscProperty({
            id: Math.random().toString(36).substring(2, 9),
            accountId: newAcc.id,
            siteUrl: s.siteUrl,
            domain,
            permissionLevel: s.permissionLevel || 'siteFullUser',
            clicks: 0,
            impressions: 0,
            ctr: 0,
            position: 0,
          })
        }

        addToast({
          type: 'success',
          title: 'Kết nối thành công',
          message: `Đã đồng bộ ${sites.length} website từ OAuth token.`,
        })
      }

      setShowAccountModal(false)
      setAccName('')
      setJsonKeyText('')
      setOauthTokenText('')
    } catch (err: any) {
      addToast({ type: 'error', title: 'Lỗi kết nối', message: err.message })
    } finally {
      setConnecting(false)
    }
  }

  // Handle Sync Single Property
  const handleSyncProperty = async (prop: GSCProperty) => {
    const acc = gscAccounts.find((a) => a.id === prop.accountId)
    if (!acc) return

    setSyncingId(prop.id)
    try {
      let token = acc.token || ''
      if (acc.type === 'service_account' && acc.clientEmail && acc.privateKey) {
        token = await gscApi.getAccessTokenFromServiceAccount(acc.clientEmail, acc.privateKey)
      }

      const perf = await gscApi.getPerformance(token, prop.siteUrl, 28)

      const updatedProp: GSCProperty = {
        ...prop,
        clicks: perf.clicks,
        impressions: perf.impressions,
        ctr: perf.ctr,
        position: perf.position,
        dailyMetrics: perf.dailyMetrics,
        queryMetrics: perf.queryMetrics,
        pageMetrics: perf.pageMetrics,
        lastSyncAt: new Date().toISOString(),
      }

      upsertGscProperty(updatedProp)
      if (selectedProp?.id === prop.id) {
        setSelectedProp(updatedProp)
      }

      addToast({
        type: 'success',
        title: 'Đồng bộ hoàn tất',
        message: `${prop.domain}: ${perf.clicks.toLocaleString()} clicks trong 28 ngày qua.`,
      })
    } catch (err: any) {
      addToast({ type: 'error', title: 'Lỗi đồng bộ', message: err.message })
    } finally {
      setSyncingId(null)
    }
  }

  const filteredProps = gscProperties.filter((p) =>
    p.domain.toLowerCase().includes(search.toLowerCase()) || p.siteUrl.toLowerCase().includes(search.toLowerCase())
  )

  const totalClicks = gscProperties.reduce((sum, p) => sum + p.clicks, 0)
  const totalImpressions = gscProperties.reduce((sum, p) => sum + p.impressions, 0)
  const avgCtr =
    totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0'

  return (
    <div className="flex-1 h-full flex flex-col p-6 overflow-hidden animate-fade-in select-none">
      {/* Top Controls */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Google Search Console
          </h2>
          <Badge variant="info">{gscProperties.length} Websites</Badge>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus size={13} />}
          onClick={() => setShowAccountModal(true)}
        >
          Thêm tài khoản Google
        </Button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4 shrink-0">
        <StatCard
          label="Tổng Clicks (28 ngày)"
          value={totalClicks.toLocaleString()}
          icon={<MousePointerClick size={14} className="text-blue-400" />}
        />
        <StatCard
          label="Tổng Lượt Hiển thị"
          value={totalImpressions.toLocaleString()}
          icon={<Eye size={14} className="text-indigo-400" />}
        />
        <StatCard
          label="CTR Trung bình"
          value={`${avgCtr}%`}
          icon={<Percent size={14} className="text-emerald-400" />}
        />
        <StatCard
          label="Tài khoản kết nối"
          value={`${gscAccounts.length} Tài khoản`}
          icon={<ShieldCheck size={14} className="text-amber-400" />}
        />
      </div>

      {/* Main Grid: Sites list on Left, Deep details on Right */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        {/* Left Col: Properties List */}
        <div className="lg:col-span-5 flex flex-col rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 overflow-hidden">
          <div className="pb-3 border-b border-[var(--border-subtle)]">
            <Input
              placeholder="Tìm tên miền..."
              leftIcon={<Search size={13} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-1">
            {gscProperties.length === 0 ? (
              <EmptyState
                icon={Globe}
                title="Chưa có website nào"
                description="Kết nối tài khoản Google Search Console để bắt đầu theo dõi hiệu suất tìm kiếm."
                actionLabel="Thêm tài khoản ngay"
                onAction={() => setShowAccountModal(true)}
              />
            ) : filteredProps.length === 0 ? (
              <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                Không tìm thấy website nào khớp với từ khóa tìm kiếm.
              </div>
            ) : (
              filteredProps.map((prop) => {
                const isSelected = selectedProp?.id === prop.id
                const isSyncing = syncingId === prop.id

                return (
                  <div
                    key={prop.id}
                    onClick={() => setSelectedProp(prop)}
                    className={`p-3 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500/30 shadow-sm'
                        : 'bg-[var(--bg-base)] border-[var(--border-subtle)] hover:border-[var(--border-mid)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-[var(--text-primary)] truncate flex-1">
                        {prop.domain}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSyncProperty(prop)
                        }}
                        disabled={isSyncing}
                        title="Đồng bộ số liệu"
                        className="h-6 w-6"
                      >
                        <RotateCw size={12} className={isSyncing ? 'animate-spin text-blue-400' : ''} />
                      </Button>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-[var(--border-subtle)] font-mono text-[10px]">
                      <div>
                        <div className="text-[var(--text-muted)]">Clicks</div>
                        <div className="font-bold text-blue-400">{prop.clicks.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[var(--text-muted)]">Hiển thị</div>
                        <div className="font-bold text-[var(--text-primary)]">{prop.impressions.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[var(--text-muted)]">CTR</div>
                        <div className="font-bold text-emerald-400">{prop.ctr}%</div>
                      </div>
                      <div>
                        <div className="text-[var(--text-muted)]">Vị trí</div>
                        <div className="font-bold text-amber-400">{prop.position || '-'}</div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Col: Deep Details */}
        <div className="lg:col-span-7 flex flex-col rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 overflow-hidden">
          {selectedProp ? (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <div>
                  <h3 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <span>{selectedProp.domain}</span>
                    <a
                      href={`https://search.google.com/search-console/performance/search-analytics?resource_id=${encodeURIComponent(
                        selectedProp.siteUrl
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </h3>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono">
                    {selectedProp.siteUrl}
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<RotateCw size={12} className={syncingId === selectedProp.id ? 'animate-spin' : ''} />}
                  onClick={() => handleSyncProperty(selectedProp)}
                  disabled={syncingId === selectedProp.id}
                >
                  Đồng bộ 28 ngày
                </Button>
              </div>

              {/* Subtables */}
              <div className="flex-1 overflow-y-auto mt-3 space-y-4 pr-1">
                {/* Top Queries */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-semibold text-blue-400 flex items-center gap-1">
                    <TrendingUp size={13} />
                    <span>Top Từ khóa Tìm kiếm</span>
                  </h4>

                  {!selectedProp.queryMetrics || selectedProp.queryMetrics.length === 0 ? (
                    <div className="p-4 rounded-xl bg-[var(--bg-base)] text-center text-[11px] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                      Chưa có dữ liệu từ khóa. Hãy bấm "Đồng bộ 28 ngày" ở trên.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden text-xs">
                      <table className="w-full text-left font-mono">
                        <thead className="bg-[var(--bg-elevated)] text-[10px] text-[var(--text-muted)] uppercase">
                          <tr>
                            <th className="p-2">Từ khóa</th>
                            <th className="p-2 text-right">Clicks</th>
                            <th className="p-2 text-right">Hiển thị</th>
                            <th className="p-2 text-right">CTR</th>
                            <th className="p-2 text-right">Vị trí</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--bg-base)] text-[11px]">
                          {selectedProp.queryMetrics.slice(0, 15).map((q, i) => (
                            <tr key={i} className="hover:bg-[var(--bg-card)]">
                              <td className="p-2 text-[var(--text-primary)] font-sans truncate max-w-xs">{q.query}</td>
                              <td className="p-2 text-right font-bold text-blue-400">{q.clicks}</td>
                              <td className="p-2 text-right text-[var(--text-secondary)]">{q.impressions}</td>
                              <td className="p-2 text-right text-emerald-400">{q.ctr}%</td>
                              <td className="p-2 text-right text-amber-400">{q.position}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Top Pages */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-semibold text-indigo-400 flex items-center gap-1">
                    <BarChart2 size={13} />
                    <span>Top Trang Đích</span>
                  </h4>

                  {!selectedProp.pageMetrics || selectedProp.pageMetrics.length === 0 ? (
                    <div className="p-4 rounded-xl bg-[var(--bg-base)] text-center text-[11px] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                      Chưa có dữ liệu trang đích.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden text-xs">
                      <table className="w-full text-left font-mono">
                        <thead className="bg-[var(--bg-elevated)] text-[10px] text-[var(--text-muted)] uppercase">
                          <tr>
                            <th className="p-2">Đường dẫn</th>
                            <th className="p-2 text-right">Clicks</th>
                            <th className="p-2 text-right">Hiển thị</th>
                            <th className="p-2 text-right">CTR</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--bg-base)] text-[11px]">
                          {selectedProp.pageMetrics.slice(0, 15).map((p, i) => (
                            <tr key={i} className="hover:bg-[var(--bg-card)]">
                              <td className="p-2 text-[var(--text-primary)] font-mono truncate max-w-xs">{p.page}</td>
                              <td className="p-2 text-right font-bold text-blue-400">{p.clicks}</td>
                              <td className="p-2 text-right text-[var(--text-secondary)]">{p.impressions}</td>
                              <td className="p-2 text-right text-emerald-400">{p.ctr}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              icon={Globe}
              title="Chưa chọn website"
              description="Chọn một website từ danh sách bên trái để kiểm tra chi tiết từ khóa và trang đích."
            />
          )}
        </div>
      </div>

      {/* Account Modal */}
      <Modal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        title="Thêm tài khoản Google Search Console"
        description="Kết nối tài khoản thông qua tệp Service Account JSON hoặc Access Token."
        icon={<FileJson size={18} className="text-blue-400" />}
      >
        <div className="flex rounded-lg bg-[var(--bg-base)] p-1 border border-[var(--border-subtle)] text-xs mb-3">
          <button
            type="button"
            onClick={() => setAccType('service_account')}
            className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
              accType === 'service_account' ? 'bg-blue-600 text-white font-semibold' : 'text-[var(--text-muted)]'
            }`}
          >
            Service Account JSON (Khuyên dùng)
          </button>
          <button
            type="button"
            onClick={() => setAccType('token')}
            className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
              accType === 'token' ? 'bg-blue-600 text-white font-semibold' : 'text-[var(--text-muted)]'
            }`}
          >
            OAuth Access Token
          </button>
        </div>

        <form onSubmit={handleAddAccount} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] text-[var(--text-secondary)]">Tên gợi nhớ</label>
            <Input
              placeholder="Ví dụ: Dự án chính"
              value={accName}
              onChange={(e) => setAccName(e.target.value)}
            />
          </div>

          {accType === 'service_account' ? (
            <div className="space-y-1">
              <label className="text-[11px] text-[var(--text-secondary)]">Nội dung JSON Key</label>
              <Textarea
                rows={5}
                placeholder='{"type": "service_account", "client_email": "...", "private_key": "..."}'
                value={jsonKeyText}
                onChange={(e) => setJsonKeyText(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-[11px] text-[var(--text-secondary)]">Access Token</label>
              <Input
                type="password"
                placeholder="ya29.a0Ac..."
                value={oauthTokenText}
                onChange={(e) => setOauthTokenText(e.target.value)}
                required
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
            <Button variant="ghost" size="sm" type="button" onClick={() => setShowAccountModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={connecting}>
              Kết nối ngay
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
