import React, { useState } from 'react'
import {
  Settings,
  Globe2,
  Search,
  Compass,
  Award,
  Monitor,
  Trash2,
  Plus,
  KeyRound,
  Mail,
  User,
  CheckCircle2,
  FileJson,
  Moon,
  Sun,
  Database,
  SlidersHorizontal,
} from 'lucide-react'
import { useAppStore } from '../../lib/useAppStore'
import { appStorage } from '../../lib/store'
import { cfApi } from '../cloudflare/api'
import { gscApi } from '../gsc/api'
import { bingApi } from '../bing/api'
import { yandexApi } from '../yandex/api'
import { CloudflareAccount, GSCAccount, BingAccount, YandexAccount } from '../../types'
import { Button, Input, Textarea, Card, Badge, EmptyState } from '../../components/ui'

export const SettingsView: React.FC = () => {
  const {
    theme,
    setTheme,
    showConfirm,
    addToast,
    // Cloudflare
    cfAccounts,
    addCfAccount,
    removeCfAccount,
    // Google
    gscAccounts,
    addGscAccount,
    removeGscAccount,
    upsertGscProperty,
    // Bing
    bingAccounts,
    addBingAccount,
    removeBingAccount,
    // Yandex
    yandexAccounts,
    addYandexAccount,
    removeYandexAccount,
  } = useAppStore()

  // Active Configuration Tab
  const [activeTab, setActiveTab] = useState<'cloudflare' | 'google' | 'search-engines' | 'system'>('cloudflare')

  // --- Cloudflare Form State ---
  const [cfName, setCfName] = useState('')
  const [cfEmail, setCfEmail] = useState('')
  const [cfApiKey, setCfApiKey] = useState('')
  const [cfTesting, setCfTesting] = useState(false)

  // --- Google Form State ---
  const [gscName, setGscName] = useState('')
  const [gscType, setGscType] = useState<'service_account' | 'token'>('service_account')
  const [gscJsonKey, setGscJsonKey] = useState('')
  const [gscToken, setGscToken] = useState('')
  const [gscConnecting, setGscConnecting] = useState(false)

  // --- Bing & Yandex Form State ---
  const [bingName, setBingName] = useState('')
  const [bingApiKey, setBingApiKey] = useState('')
  const [bingConnecting, setBingConnecting] = useState(false)

  const [yandexName, setYandexName] = useState('')
  const [yandexToken, setYandexToken] = useState('')
  const [yandexConnecting, setYandexConnecting] = useState(false)

  // Handle Cloudflare Add
  const handleAddCloudflare = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cfName.trim() || !cfEmail.trim() || !cfApiKey.trim()) return

    setCfTesting(true)
    const newAcc: CloudflareAccount = {
      id: Math.random().toString(36).substring(2, 9),
      name: cfName.trim(),
      email: cfEmail.trim(),
      apiKey: cfApiKey.trim(),
    }

    try {
      await cfApi.getZones(newAcc)
      addCfAccount(newAcc)
      setCfName('')
      setCfEmail('')
      setCfApiKey('')
      addToast({
        type: 'success',
        title: 'Thành công',
        message: `Đã kết nối tài khoản Cloudflare "${newAcc.name}".`,
      })
    } catch (err: any) {
      addToast({ type: 'error', title: 'Lỗi xác thực', message: err.message || 'API Key không hợp lệ' })
    } finally {
      setCfTesting(false)
    }
  }

  // Handle Google Add
  const handleAddGoogle = async (e: React.FormEvent) => {
    e.preventDefault()
    setGscConnecting(true)

    try {
      if (gscType === 'service_account') {
        const parsed = JSON.parse(gscJsonKey.trim())
        const clientEmail = parsed.client_email
        const privateKey = parsed.private_key
        if (!clientEmail || !privateKey) {
          throw new Error('File JSON không chứa client_email hoặc private_key hợp lệ.')
        }

        const token = await gscApi.getAccessTokenFromServiceAccount(clientEmail, privateKey)
        const sites = await gscApi.getSites(token)

        const newAcc: GSCAccount = {
          id: Math.random().toString(36).substring(2, 9),
          name: gscName.trim() || clientEmail.split('@')[0],
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
        const sites = await gscApi.getSites(gscToken.trim())
        const newAcc: GSCAccount = {
          id: Math.random().toString(36).substring(2, 9),
          name: gscName.trim() || 'Google Account',
          type: 'token',
          token: gscToken.trim(),
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
          message: `Đã kết nối tài khoản Google và nạp ${sites.length} website.`,
        })
      }

      setGscName('')
      setGscJsonKey('')
      setGscToken('')
    } catch (err: any) {
      addToast({ type: 'error', title: 'Lỗi kết nối', message: err.message })
    } finally {
      setGscConnecting(false)
    }
  }

  // Handle Bing Add
  const handleAddBing = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bingApiKey.trim()) return

    setBingConnecting(true)
    try {
      const fetched = await bingApi.getUserSites(bingApiKey.trim())
      const newAcc: BingAccount = {
        id: Math.random().toString(36).substring(2, 9),
        name: bingName.trim() || 'Bing Account',
        apiKey: bingApiKey.trim(),
        createdAt: new Date().toISOString(),
      }

      addBingAccount(newAcc)
      setBingName('')
      setBingApiKey('')

      addToast({
        type: 'success',
        title: 'Kết nối thành công',
        message: `Đã tìm thấy ${fetched.length} websites trên Bing.`,
      })
    } catch (err: any) {
      addToast({ type: 'error', title: 'Lỗi kết nối', message: err.message })
    } finally {
      setBingConnecting(false)
    }
  }

  // Handle Yandex Add
  const handleAddYandex = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!yandexToken.trim()) return

    setYandexConnecting(true)
    try {
      const userId = await yandexApi.getUserId(yandexToken.trim())
      const fetched = await yandexApi.getHosts(yandexToken.trim(), userId)

      const newAcc: YandexAccount = {
        id: Math.random().toString(36).substring(2, 9),
        name: yandexName.trim() || 'Yandex Webmaster',
        oauthToken: yandexToken.trim(),
        userId,
        createdAt: new Date().toISOString(),
      }

      addYandexAccount(newAcc)
      setYandexName('')
      setYandexToken('')

      addToast({
        type: 'success',
        title: 'Kết nối thành công',
        message: `Đã tìm thấy ${fetched.length} website trên Yandex.`,
      })
    } catch (err: any) {
      addToast({ type: 'error', title: 'Lỗi OAuth Token', message: err.message })
    } finally {
      setYandexConnecting(false)
    }
  }

  // Clear all data
  const handleClearCache = () => {
    showConfirm({
      title: 'Khôi phục cài đặt gốc?',
      message: 'Toàn bộ dữ liệu kết nối tài khoản và thiết lập sẽ bị xóa sạch khỏi ứng dụng.',
      confirmText: 'Xác nhận xóa toàn bộ',
      isDestructive: true,
      onConfirm: async () => {
        await appStorage.remove('github_token')
        await appStorage.remove('cf_accounts')
        await appStorage.remove('ga_properties')
        await appStorage.remove('gsc_accounts')
        await appStorage.remove('gsc_properties')
        await appStorage.remove('bing_accounts')
        await appStorage.remove('yandex_accounts')
        await appStorage.remove('baidu_properties')
        await appStorage.remove('indexnow_keys')
        await appStorage.remove('indexnow_history')
        await appStorage.remove('kanban_tasks')
        window.location.reload()
      },
    })
  }

  return (
    <div className="flex-1 h-full flex flex-col p-6 overflow-hidden animate-fade-in select-none">
      {/* Top Controls: Tabs */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-indigo-400" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Cài đặt & Kết nối tài khoản
          </h2>
        </div>

        {/* Configuration Tabs */}
        <div className="flex rounded-lg bg-[var(--bg-card)] p-1 border border-[var(--border-subtle)] text-xs">
          <button
            onClick={() => setActiveTab('cloudflare')}
            className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'cloudflare'
                ? 'bg-orange-600 text-white font-semibold shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Globe2 size={13} />
            <span>Cloudflare ({cfAccounts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('google')}
            className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'google'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Search size={13} />
            <span>Google ({gscAccounts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('search-engines')}
            className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'search-engines'
                ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Compass size={13} />
            <span>Bing & Yandex ({bingAccounts.length + yandexAccounts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'system'
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold shadow-sm border border-[var(--border-mid)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Settings size={13} />
            <span>Hệ thống</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto mt-4 pr-1">
        {/* ================= TAB 1: CLOUDFLARE ================= */}
        {activeTab === 'cloudflare' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form thêm Cloudflare */}
            <div className="lg:col-span-5 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-4 h-fit">
              <h3 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Plus size={14} className="text-orange-400" />
                <span>Thêm tài khoản Cloudflare mới</span>
              </h3>

              <form onSubmit={handleAddCloudflare} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] text-[var(--text-secondary)]">Tên gợi nhớ</label>
                  <Input
                    placeholder="Ví dụ: Tài khoản Công ty"
                    leftIcon={<User size={13} />}
                    value={cfName}
                    onChange={(e) => setCfName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[var(--text-secondary)]">Email tài khoản Cloudflare</label>
                  <Input
                    type="email"
                    placeholder="admin@domain.com"
                    leftIcon={<Mail size={13} />}
                    value={cfEmail}
                    onChange={(e) => setCfEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[var(--text-secondary)]">Global API Key</label>
                  <Input
                    type="password"
                    placeholder="••••••••••••••••••••••••"
                    leftIcon={<KeyRound size={13} />}
                    value={cfApiKey}
                    onChange={(e) => setCfApiKey(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  variant="accent"
                  className="w-full"
                  isLoading={cfTesting}
                >
                  Xác thực & Lưu tài khoản
                </Button>
              </form>
            </div>

            {/* Danh sách Cloudflare Accounts */}
            <div className="lg:col-span-7 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col">
              <div className="pb-3 border-b border-[var(--border-subtle)]">
                <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                  Tài khoản Cloudflare đang kết nối ({cfAccounts.length})
                </h3>
              </div>

              <div className="mt-3 space-y-2">
                {cfAccounts.length === 0 ? (
                  <EmptyState
                    icon={Globe2}
                    title="Chưa có tài khoản Cloudflare"
                    description="Thêm tài khoản bằng form bên cạnh để bắt đầu quản lý tên miền và DNS."
                  />
                ) : (
                  cfAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)]"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[var(--text-primary)]">{account.name}</span>
                          <Badge variant="success" size="sm">Đã kết nối</Badge>
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] font-mono">
                          {account.email} • API Key: ••••••••••••
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCfAccount(account.id)}
                        className="text-[var(--text-muted)] hover:text-rose-400"
                        title="Gỡ tài khoản"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: GOOGLE (GSC) ================= */}
        {activeTab === 'google' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form thêm Google Account */}
            <div className="lg:col-span-5 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-4 h-fit">
              <h3 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Plus size={14} className="text-blue-400" />
                <span>Thêm tài khoản Google Search Console</span>
              </h3>

              <div className="flex rounded-lg bg-[var(--bg-base)] p-1 border border-[var(--border-subtle)] text-xs">
                <button
                  type="button"
                  onClick={() => setGscType('service_account')}
                  className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
                    gscType === 'service_account' ? 'bg-blue-600 text-white font-semibold' : 'text-[var(--text-muted)]'
                  }`}
                >
                  Service Account JSON
                </button>
                <button
                  type="button"
                  onClick={() => setGscType('token')}
                  className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
                    gscType === 'token' ? 'bg-blue-600 text-white font-semibold' : 'text-[var(--text-muted)]'
                  }`}
                >
                  OAuth Token
                </button>
              </div>

              <form onSubmit={handleAddGoogle} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] text-[var(--text-secondary)]">Tên gợi nhớ</label>
                  <Input
                    placeholder="Ví dụ: Dự án Google A"
                    value={gscName}
                    onChange={(e) => setGscName(e.target.value)}
                  />
                </div>

                {gscType === 'service_account' ? (
                  <div className="space-y-1">
                    <label className="text-[11px] text-[var(--text-secondary)]">Nội dung JSON Key</label>
                    <Textarea
                      rows={6}
                      placeholder='{"type": "service_account", "client_email": "...", "private_key": "..."}'
                      value={gscJsonKey}
                      onChange={(e) => setGscJsonKey(e.target.value)}
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[11px] text-[var(--text-secondary)]">Access Token</label>
                    <Input
                      type="password"
                      placeholder="ya29.a0Ac..."
                      value={gscToken}
                      onChange={(e) => setGscToken(e.target.value)}
                      required
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full bg-blue-600 hover:bg-blue-500 shadow-blue-950 border-blue-500/30"
                  isLoading={gscConnecting}
                >
                  Xác thực & Kết nối Google
                </Button>
              </form>
            </div>

            {/* Danh sách Google Accounts */}
            <div className="lg:col-span-7 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col">
              <div className="pb-3 border-b border-[var(--border-subtle)]">
                <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                  Tài khoản Google đang kết nối ({gscAccounts.length})
                </h3>
              </div>

              <div className="mt-3 space-y-2">
                {gscAccounts.length === 0 ? (
                  <EmptyState
                    icon={FileJson}
                    title="Chưa kết nối tài khoản Google"
                    description="Thêm Service Account JSON Key để tự động theo dõi thứ hạng tìm kiếm và từ khóa."
                  />
                ) : (
                  gscAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)]"
                    >
                      <div className="space-y-1 min-w-0 flex-1 mr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[var(--text-primary)] truncate">{account.name}</span>
                          <Badge variant="info" size="sm">
                            {account.type === 'service_account' ? 'Service Account' : 'OAuth'}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] font-mono truncate">
                          {account.clientEmail || 'Access Token'}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeGscAccount(account.id)}
                        className="text-[var(--text-muted)] hover:text-rose-400 shrink-0"
                        title="Gỡ tài khoản"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: BING & YANDEX ================= */}
        {activeTab === 'search-engines' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bing Webmaster Section */}
            <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <Compass size={15} className="text-cyan-400" />
                  <h3 className="text-xs font-semibold text-[var(--text-primary)]">Bing Webmaster Tools</h3>
                </div>
                <Badge variant="info" size="sm">{bingAccounts.length} Key</Badge>
              </div>

              <form onSubmit={handleAddBing} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[var(--text-secondary)]">Tên tài khoản (Tùy chọn)</label>
                  <Input
                    placeholder="Ví dụ: Bing Cá Nhân"
                    value={bingName}
                    onChange={(e) => setBingName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[var(--text-secondary)]">Bing API Key</label>
                  <Input
                    type="password"
                    placeholder="32 ký tự hex"
                    value={bingApiKey}
                    onChange={(e) => setBingApiKey(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full bg-cyan-600 hover:bg-cyan-500 shadow-cyan-950 border-cyan-500/30"
                  isLoading={bingConnecting}
                >
                  Lưu Bing API Key
                </Button>
              </form>

              <div className="pt-2 space-y-2 border-t border-[var(--border-subtle)]">
                <div className="text-[11px] font-semibold text-[var(--text-muted)]">Danh sách Key Bing:</div>
                {bingAccounts.length === 0 ? (
                  <div className="text-[11px] text-[var(--text-muted)] text-center py-4">Chưa có API Key Bing nào.</div>
                ) : (
                  bingAccounts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-base)] text-xs border border-[var(--border-subtle)]">
                      <div>
                        <div className="font-semibold text-[var(--text-primary)]">{a.name}</div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono">Key: ••••••••••••</div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeBingAccount(a.id)} className="h-6 w-6 text-[var(--text-muted)] hover:text-rose-400">
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Yandex Webmaster Section */}
            <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <Award size={15} className="text-rose-400" />
                  <h3 className="text-xs font-semibold text-[var(--text-primary)]">Yandex Webmaster</h3>
                </div>
                <Badge variant="danger" size="sm">{yandexAccounts.length} Token</Badge>
              </div>

              <form onSubmit={handleAddYandex} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[var(--text-secondary)]">Tên tài khoản (Tùy chọn)</label>
                  <Input
                    placeholder="Ví dụ: Yandex Tài Khoản 1"
                    value={yandexName}
                    onChange={(e) => setYandexName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[var(--text-secondary)]">Yandex OAuth Token</label>
                  <Input
                    type="password"
                    placeholder="y0_AgAAAA..."
                    value={yandexToken}
                    onChange={(e) => setYandexToken(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  variant="destructive"
                  className="w-full"
                  isLoading={yandexConnecting}
                >
                  Lưu Yandex OAuth Token
                </Button>
              </form>

              <div className="pt-2 space-y-2 border-t border-[var(--border-subtle)]">
                <div className="text-[11px] font-semibold text-[var(--text-muted)]">Danh sách Token Yandex:</div>
                {yandexAccounts.length === 0 ? (
                  <div className="text-[11px] text-[var(--text-muted)] text-center py-4">Chưa có OAuth Token Yandex nào.</div>
                ) : (
                  yandexAccounts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-base)] text-xs border border-[var(--border-subtle)]">
                      <div>
                        <div className="font-semibold text-[var(--text-primary)]">{a.name}</div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono">User ID: {a.userId || 'N/A'}</div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeYandexAccount(a.id)} className="h-6 w-6 text-[var(--text-muted)] hover:text-rose-400">
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: SYSTEM ================= */}
        {activeTab === 'system' && (
          <div className="max-w-2xl space-y-5">
            {/* Theme preferences */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Monitor size={15} className="text-indigo-400" />
                <h3 className="text-xs font-semibold text-[var(--text-primary)]">Chủ đề giao diện</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    theme === 'dark'
                      ? 'bg-indigo-600/15 border-indigo-500/30 text-indigo-400 shadow-sm'
                      : 'bg-[var(--bg-base)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-xs mb-1">
                    <Moon size={14} />
                    <span>Giao diện Tối</span>
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">Tông màu tối dịu mắt, phù hợp làm việc đêm</div>
                </button>

                <button
                  onClick={() => setTheme('light')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    theme === 'light'
                      ? 'bg-indigo-600/15 border-indigo-500/30 text-indigo-400 shadow-sm'
                      : 'bg-[var(--bg-base)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-xs mb-1">
                    <Sun size={14} />
                    <span>Giao diện Sáng</span>
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">Tông màu sáng rõ ràng, độ tương phản cao</div>
                </button>
              </div>
            </Card>

            {/* Version info */}
            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Database size={15} className="text-indigo-400" />
                <h3 className="text-xs font-semibold text-[var(--text-primary)]">Thông tin phiên bản</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] space-y-0.5">
                  <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase">Phiên bản ứng dụng</span>
                  <div className="font-semibold text-[var(--text-primary)] font-mono">v2.2.0</div>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] space-y-0.5">
                  <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase">Trạng thái lưu trữ</span>
                  <div className="font-semibold text-emerald-400 font-mono">Hoạt động bình thường</div>
                </div>
              </div>
            </Card>

            {/* Reset Data */}
            <Card className="p-5 space-y-3 border-rose-500/20">
              <div className="flex items-center gap-2 text-rose-400">
                <Trash2 size={15} />
                <h3 className="text-xs font-semibold">Khôi phục cài đặt gốc</h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Dọn sạch toàn bộ dữ liệu cấu hình, tài khoản đã kết nối và các thẻ công việc lưu trữ trên máy tính này.
              </p>
              <Button variant="destructive" size="sm" onClick={handleClearCache}>
                Dọn sạch dữ liệu ứng dụng
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
