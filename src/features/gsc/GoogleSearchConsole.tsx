import React, { useState } from 'react'
import {
  Search,
  Plus,
  Trash2,
  RotateCw,
  TrendingUp,
  MousePointerClick,
  Eye,
  Percent,
  BarChart2,
  FileJson,
  KeyRound,
  ExternalLink,
  Loader2,
  Globe,
  ChevronRight,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react'
import { useAppStore } from '../../lib/useAppStore'
import { gscApi } from './api'
import { GSCAccount, GSCProperty } from '../../types'

export const GoogleSearchConsole: React.FC = () => {
  const { gscAccounts, addGscAccount, removeGscAccount, gscProperties, upsertGscProperty, addToast, showConfirm } =
    useAppStore()

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
      let clientEmail = ''
      let privateKey = ''

      if (accType === 'service_account') {
        const parsed = JSON.parse(jsonKeyText.trim())
        clientEmail = parsed.client_email
        privateKey = parsed.private_key
        if (!clientEmail || !privateKey) {
          throw new Error('File JSON không chứa client_email hoặc private_key hợp lệ.')
        }

        // Test sign & get token
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

        // Add discovered sites
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
          title: 'Kết nối GSC thành công',
          message: `Đã tìm thấy ${sites.length} website thuộc Service Account này.`,
        })
      } else {
        const sites = await gscApi.getSites(oauthTokenText.trim())
        const newAcc: GSCAccount = {
          id: Math.random().toString(36).substring(2, 9),
          name: accName.trim() || 'Google Account (OAuth)',
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
          title: 'Kết nối GSC thành công',
          message: `Đã đồng bộ ${sites.length} website từ OAuth token.`,
        })
      }

      setShowAccountModal(false)
      setAccName('')
      setJsonKeyText('')
      setOauthTokenText('')
    } catch (err: any) {
      addToast({ type: 'error', title: 'Kết nối thất bại', message: err.message })
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
        title: 'Đồng bộ GSC hoàn tất',
        message: `${prop.domain}: ${perf.clicks.toLocaleString()} clicks trong 28 ngày qua.`,
      })
    } catch (err: any) {
      addToast({ type: 'error', title: 'Đồng bộ thất bại', message: err.message })
    } finally {
      setSyncingId(null)
    }
  }

  const filteredProps = gscProperties.filter((p) =>
    p.domain.toLowerCase().includes(search.toLowerCase()) || p.siteUrl.toLowerCase().includes(search.toLowerCase())
  )

  // Overall totals
  const totalClicks = gscProperties.reduce((sum, p) => sum + p.clicks, 0)
  const totalImpressions = gscProperties.reduce((sum, p) => sum + p.impressions, 0)
  const avgCtr =
    totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0'

  return (
    <div className="flex-1 h-full flex flex-col p-6 overflow-hidden animate-fade-in select-none">
      {/* Top Controls */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Google Search Console Central Hub
            </h2>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {gscProperties.length} Websites
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAccountModal(true)}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-blue-950 transition-colors"
          >
            <Plus size={14} />
            <span>Thêm Google Service Account</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4 shrink-0">
        <div className="p-3.5 rounded-xl glass-card space-y-1">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span>Tổng Clicks (28 ngày)</span>
            <MousePointerClick size={14} className="text-blue-400" />
          </div>
          <div className="text-lg font-bold font-mono text-[var(--text-primary)]">
            {totalClicks.toLocaleString()}
          </div>
        </div>

        <div className="p-3.5 rounded-xl glass-card space-y-1">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span>Tổng Lượt Hiển thị</span>
            <Eye size={14} className="text-indigo-400" />
          </div>
          <div className="text-lg font-bold font-mono text-[var(--text-primary)]">
            {totalImpressions.toLocaleString()}
          </div>
        </div>

        <div className="p-3.5 rounded-xl glass-card space-y-1">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span>CTR Trung bình</span>
            <Percent size={14} className="text-emerald-400" />
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400">
            {avgCtr}%
          </div>
        </div>

        <div className="p-3.5 rounded-xl glass-card space-y-1">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span>Tài khoản kết nối</span>
            <ShieldCheck size={14} className="text-amber-400" />
          </div>
          <div className="text-lg font-bold font-mono text-[var(--text-primary)]">
            {gscAccounts.length} Accounts
          </div>
        </div>
      </div>

      {/* Main Grid: Sites list on Left, Deep details on Right */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        {/* Left Col: Properties List */}
        <div className="lg:col-span-5 flex flex-col rounded-2xl glass-card p-4 overflow-hidden">
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-subtle)]">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Tìm tên miền..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-1">
            {gscProperties.length === 0 ? (
              <div className="py-16 text-center text-xs text-[var(--text-muted)] space-y-2">
                <Globe size={28} className="mx-auto text-[var(--text-dim)]" />
                <div>Chưa kết nối tài khoản Google Search Console nào.</div>
                <button
                  onClick={() => setShowAccountModal(true)}
                  className="text-xs text-blue-400 hover:underline"
                >
                  Bấm vào đây để tải JSON Key Service Account
                </button>
              </div>
            ) : filteredProps.length === 0 ? (
              <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                Không tìm thấy website khớp với từ khóa tìm kiếm.
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
                        ? 'bg-blue-600/15 border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                        : 'bg-[var(--bg-base)] border-[var(--border-subtle)] hover:border-[var(--border-mid)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-[var(--text-primary)] truncate flex-1">
                        {prop.domain}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSyncProperty(prop)
                        }}
                        disabled={isSyncing}
                        title="Đồng bộ số liệu GSC"
                        className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-blue-400"
                      >
                        <RotateCw size={13} className={isSyncing ? 'animate-spin text-blue-400' : ''} />
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-[var(--border-subtle)] font-mono text-[10px]">
                      <div>
                        <div className="text-[var(--text-muted)]">Clicks</div>
                        <div className="font-bold text-blue-400">{prop.clicks.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[var(--text-muted)]">Impr</div>
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

        {/* Right Col: Deep Details (Top Queries & Pages) */}
        <div className="lg:col-span-7 flex flex-col rounded-2xl glass-card p-4 overflow-hidden">
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
                    URL: {selectedProp.siteUrl}
                  </div>
                </div>

                <button
                  onClick={() => handleSyncProperty(selectedProp)}
                  disabled={syncingId === selectedProp.id}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-blue-950"
                >
                  <RotateCw size={12} className={syncingId === selectedProp.id ? 'animate-spin' : ''} />
                  <span>Đồng bộ 28 ngày</span>
                </button>
              </div>

              {/* Subtabs: Top Queries vs Top Pages */}
              <div className="flex-1 overflow-y-auto mt-3 space-y-4 pr-1">
                {/* Top Queries Table */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-semibold text-blue-400 flex items-center gap-1">
                    <TrendingUp size={13} />
                    <span>Top Từ Khóa Tìm Kiếm (Top Queries)</span>
                  </h4>

                  {!selectedProp.queryMetrics || selectedProp.queryMetrics.length === 0 ? (
                    <div className="p-4 rounded-xl bg-[var(--bg-base)] text-center text-[11px] text-[var(--text-muted)]">
                      Chưa có dữ liệu từ khóa. Hãy bấm "Đồng bộ 28 ngày" ở trên.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden text-xs">
                      <table className="w-full text-left font-mono">
                        <thead className="bg-[var(--bg-elevated)] text-[10px] text-[var(--text-muted)] uppercase">
                          <tr>
                            <th className="p-2">Từ khóa (Query)</th>
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

                {/* Top Pages Table */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-semibold text-indigo-400 flex items-center gap-1">
                    <BarChart2 size={13} />
                    <span>Top Trang Đích (Top Landing Pages)</span>
                  </h4>

                  {!selectedProp.pageMetrics || selectedProp.pageMetrics.length === 0 ? (
                    <div className="p-4 rounded-xl bg-[var(--bg-base)] text-center text-[11px] text-[var(--text-muted)]">
                      Chưa có dữ liệu trang đích.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden text-xs">
                      <table className="w-full text-left font-mono">
                        <thead className="bg-[var(--bg-elevated)] text-[10px] text-[var(--text-muted)] uppercase">
                          <tr>
                            <th className="p-2">Đường dẫn trang</th>
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
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-xs text-[var(--text-muted)]">
              <Globe size={32} className="text-[var(--text-dim)] mb-2" />
              <span>Chọn một website từ danh sách bên trái để xem chi tiết từ khóa & trang đích.</span>
            </div>
          )}
        </div>
      </div>

      {/* Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-mid)] shadow-2xl space-y-4">
            <h3 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <FileJson size={16} className="text-blue-400" />
              <span>Kết nối Google Search Console qua Service Account</span>
            </h3>

            <div className="flex rounded-lg bg-[var(--bg-base)] p-1 border border-[var(--border-subtle)] text-xs">
              <button
                type="button"
                onClick={() => setAccType('service_account')}
                className={`flex-1 py-1 rounded text-center font-medium ${
                  accType === 'service_account' ? 'bg-blue-600 text-white font-semibold' : 'text-[var(--text-muted)]'
                }`}
              >
                Service Account JSON (Khuyên dùng)
              </button>
              <button
                type="button"
                onClick={() => setAccType('token')}
                className={`flex-1 py-1 rounded text-center font-medium ${
                  accType === 'token' ? 'bg-blue-600 text-white font-semibold' : 'text-[var(--text-muted)]'
                }`}
              >
                OAuth Access Token
              </button>
            </div>

            <form onSubmit={handleAddAccount} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] text-[var(--text-secondary)]">Tên gợi nhớ (Tùy chọn)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Google Cloud Project A"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] outline-none"
                />
              </div>

              {accType === 'service_account' ? (
                <div className="space-y-1">
                  <label className="text-[11px] text-[var(--text-secondary)]">
                    Nội dung tệp JSON Key của Service Account
                  </label>
                  <textarea
                    rows={6}
                    placeholder='{"type": "service_account", "project_id": "...", "private_key": "...", "client_email": "..."}'
                    value={jsonKeyText}
                    onChange={(e) => setJsonKeyText(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] focus:border-blue-500 text-xs font-mono text-[var(--text-primary)] outline-none resize-none"
                    required
                  />
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Lưu ý: Bạn phải thêm email của Service Account này vào mục "Users and permissions" trên Google Search Console với quyền <b>Viewer</b>.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[11px] text-[var(--text-secondary)]">Google OAuth Access Token</label>
                  <input
                    type="password"
                    placeholder="ya29.a0Ac..."
                    value={oauthTokenText}
                    onChange={(e) => setOauthTokenText(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)] outline-none"
                    required
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={connecting}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-blue-950"
                >
                  {connecting ? <Loader2 size={13} className="animate-spin" /> : null}
                  <span>Xác thực & Kết nối Ngay</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
