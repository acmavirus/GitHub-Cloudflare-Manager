import React, { useState } from 'react'
import { Send, Zap, KeyRound, Globe, Trash2, CheckCircle2 } from 'lucide-react'
import { useAppStore } from '../../lib/useAppStore'
import { http } from '../../lib/http'
import { baiduApi } from '../baidu/api'
import { IndexNowHistoryItem } from '../../types'
import { Button, Input, Textarea, Badge, EmptyState } from '../../components/ui'

export const FastIndexingHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'indexnow' | 'baidu'>('indexnow')

  // --- IndexNow State ---
  const { indexnowKeys, setDomainKey, indexnowHistory, addIndexnowHistory, clearIndexnowHistory, addToast } =
    useAppStore()
  const [indexnowDomain, setIndexnowDomain] = useState('')
  const [indexnowKey, setIndexnowKey] = useState('')
  const [indexnowUrls, setIndexnowUrls] = useState('')
  const [submittingIndexNow, setSubmittingIndexNow] = useState(false)
  const [verifyingKey, setVerifyingKey] = useState(false)
  const [verifyStatus, setVerifyStatus] = useState<'success' | 'failed' | null>(null)

  // --- Baidu State ---
  const { baiduProperties, upsertBaiduProperty, removeBaiduProperty } = useAppStore()
  const [baiduSiteUrl, setBaiduSiteUrl] = useState('')
  const [baiduToken, setBaiduToken] = useState('')
  const [baiduUrls, setBaiduUrls] = useState('')
  const [pushingBaidu, setPushingBaidu] = useState(false)

  const handleDomainChange = (val: string) => {
    setIndexnowDomain(val)
    setVerifyStatus(null)
    const clean = val.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0]
    if (indexnowKeys[clean]) {
      setIndexnowKey(indexnowKeys[clean])
    }
  }

  const verifyKeyFile = async () => {
    const clean = indexnowDomain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0]
    if (!clean || !indexnowKey.trim()) return

    setVerifyingKey(true)
    setVerifyStatus(null)
    const keyUrl = `https://${clean}/${indexnowKey.trim()}.txt`

    try {
      const res = await http.get(keyUrl)
      if (res.ok) {
        const text = await res.text()
        if (text.trim() === indexnowKey.trim()) {
          setVerifyStatus('success')
          setDomainKey(clean, indexnowKey.trim())
          addToast({ type: 'success', title: 'Khóa hợp lệ', message: `Tệp ${keyUrl} phản hồi chính xác!` })
        } else {
          setVerifyStatus('failed')
          addToast({ type: 'warning', title: 'Khóa không khớp', message: 'Nội dung tệp không khớp với API Key.' })
        }
      } else {
        setVerifyStatus('failed')
        addToast({ type: 'error', message: `HTTP ${res.status}: Không tìm thấy ${keyUrl}` })
      }
    } catch (err: any) {
      setVerifyStatus('failed')
      addToast({ type: 'error', message: err.message })
    } finally {
      setVerifyingKey(false)
    }
  }

  const handleSubmitIndexNow = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = indexnowDomain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0]
    if (!clean || !indexnowKey.trim() || !indexnowUrls.trim()) return

    const list = indexnowUrls
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.startsWith('http://') || u.startsWith('https://'))

    if (list.length === 0) {
      addToast({ type: 'warning', message: 'Vui lòng nhập ít nhất một URL hợp lệ' })
      return
    }

    setSubmittingIndexNow(true)
    setDomainKey(clean, indexnowKey.trim())

    try {
      const payload = {
        host: clean,
        key: indexnowKey.trim(),
        keyLocation: `https://${clean}/${indexnowKey.trim()}.txt`,
        urlList: list,
      }

      const res = await http.post('https://api.indexnow.org/indexnow', payload)

      const historyItem: IndexNowHistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        domain: clean,
        key: indexnowKey.trim(),
        urls: list,
        timestamp: new Date().toISOString(),
        status: res.ok || res.status === 200 || res.status === 202 ? 'success' : 'failed',
        mode: 'batch',
        responseCode: res.status,
        message: res.status === 200 ? 'OK' : res.status === 202 ? 'Accepted' : `HTTP ${res.status}`,
      }

      addIndexnowHistory(historyItem)

      if (historyItem.status === 'success') {
        addToast({
          type: 'success',
          title: 'Gửi thành công',
          message: `Đã gửi ${list.length} URLs tới các công cụ tìm kiếm.`,
        })
        setIndexnowUrls('')
      } else {
        addToast({ type: 'error', title: 'Thất bại', message: `Mã lỗi HTTP ${res.status}` })
      }
    } catch (err: any) {
      addToast({ type: 'error', message: err.message })
    } finally {
      setSubmittingIndexNow(false)
    }
  }

  const handlePushBaidu = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!baiduSiteUrl.trim() || !baiduToken.trim() || !baiduUrls.trim()) return

    const list = baiduUrls
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.startsWith('http://') || u.startsWith('https://'))

    if (list.length === 0) {
      addToast({ type: 'warning', message: 'Vui lòng nhập ít nhất một URL hợp lệ' })
      return
    }

    setPushingBaidu(true)
    try {
      const res = await baiduApi.pushUrls(baiduSiteUrl.trim(), baiduToken.trim(), list)

      if (res.success) {
        const domain = baiduSiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
        upsertBaiduProperty({
          id: Math.random().toString(36).substring(2, 9),
          siteUrl: baiduSiteUrl.trim(),
          domain,
          token: baiduToken.trim(),
          dailyRemain: res.remain ?? 0,
          pushedCount: res.pushedCount ?? list.length,
          lastPushAt: new Date().toISOString(),
        })

        addToast({ type: 'success', title: 'Đẩy link thành công', message: res.message })
        setBaiduUrls('')
      } else {
        addToast({ type: 'error', title: 'Thất bại', message: res.message })
      }
    } catch (err: any) {
      addToast({ type: 'error', message: err.message })
    } finally {
      setPushingBaidu(false)
    }
  }

  return (
    <div className="flex-1 h-full flex flex-col p-6 overflow-hidden animate-fade-in select-none">
      {/* Top Controls */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Lập chỉ mục nhanh (Fast Indexing)
          </h2>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-lg bg-[var(--bg-card)] p-1 border border-[var(--border-subtle)] text-xs">
          <button
            onClick={() => setActiveTab('indexnow')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'indexnow'
                ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            IndexNow (Bing, Yandex, Seznam)
          </button>
          <button
            onClick={() => setActiveTab('baidu')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'baidu'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Baidu Spider Push
          </button>
        </div>
      </div>

      {activeTab === 'indexnow' ? (
        /* TAB 1: INDEXNOW */
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden mt-4">
          <div className="lg:col-span-7 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-4 overflow-y-auto">
            <h3 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <Zap size={14} className="text-emerald-400" />
              <span>Gửi URL lập chỉ mục qua IndexNow</span>
            </h3>

            <form onSubmit={handleSubmitIndexNow} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[var(--text-secondary)]">Tên miền (Host)</label>
                  <Input
                    placeholder="example.com"
                    value={indexnowDomain}
                    onChange={(e) => handleDomainChange(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[var(--text-secondary)]">IndexNow API Key</label>
                  <Input
                    placeholder="32 ký tự hex"
                    value={indexnowKey}
                    onChange={(e) => {
                      setIndexnowKey(e.target.value)
                      setVerifyStatus(null)
                    }}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[11px]">
                <span className="font-mono text-[var(--text-muted)] truncate">
                  Tệp: https://{indexnowDomain || 'domain'}/{indexnowKey || 'key'}.txt
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={verifyKeyFile}
                  isLoading={verifyingKey}
                  disabled={!indexnowDomain || !indexnowKey}
                >
                  Xác minh
                </Button>
              </div>

              {verifyStatus === 'success' && (
                <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={13} />
                  <span>Tệp khóa đã được xác thực chính xác trên hosting.</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] text-[var(--text-secondary)]">Danh sách URLs (mỗi URL một dòng)</label>
                <Textarea
                  rows={5}
                  placeholder={`https://${indexnowDomain || 'example.com'}/url-1&#10;https://${indexnowDomain || 'example.com'}/url-2`}
                  value={indexnowUrls}
                  onChange={(e) => setIndexnowUrls(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950 border-emerald-500/30"
                leftIcon={<Send size={13} />}
                isLoading={submittingIndexNow}
              >
                Gửi URL tới IndexNow
              </Button>
            </form>
          </div>

          <div className="lg:col-span-5 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">Lịch sử gửi IndexNow</h3>
              {indexnowHistory.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearIndexnowHistory} className="text-rose-400 h-6">
                  Xóa
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-1">
              {indexnowHistory.length === 0 ? (
                <EmptyState
                  title="Chưa có lịch sử"
                  description="Các lượt gửi URL qua IndexNow sẽ được lưu lại tại đây."
                />
              ) : (
                indexnowHistory.map((item) => (
                  <div key={item.id} className="p-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[var(--text-primary)] font-mono text-[11px]">{item.domain}</span>
                      <Badge variant="success" size="sm">
                        {item.message || 'Thành công'}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">
                      {item.urls.length} URLs • {new Date(item.timestamp).toLocaleTimeString('vi-VN')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* TAB 2: BAIDU PUSH */
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden mt-4">
          <div className="lg:col-span-7 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-4 overflow-y-auto">
            <h3 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <Zap size={14} className="text-blue-400" />
              <span>Gửi URL qua Baidu Ziyuan Link Submission API</span>
            </h3>

            <form onSubmit={handlePushBaidu} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[var(--text-secondary)]">Website URL đã xác minh Baidu</label>
                  <Input
                    placeholder="https://example.com"
                    value={baiduSiteUrl}
                    onChange={(e) => setBaiduSiteUrl(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[var(--text-secondary)]">Baidu Site Push Token</label>
                  <Input
                    type="password"
                    placeholder="Token 16 ký tự"
                    value={baiduToken}
                    onChange={(e) => setBaiduToken(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[var(--text-secondary)]">Danh sách URLs (mỗi URL một dòng)</label>
                <Textarea
                  rows={5}
                  placeholder={`https://example.com/bai-viet-1&#10;https://example.com/bai-viet-2`}
                  value={baiduUrls}
                  onChange={(e) => setBaiduUrls(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full bg-blue-600 hover:bg-blue-500 shadow-blue-950 border-blue-500/30"
                leftIcon={<Send size={13} />}
                isLoading={pushingBaidu}
              >
                Đẩy URL tới Baidu Spider
              </Button>
            </form>
          </div>

          <div className="lg:col-span-5 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col overflow-hidden">
            <div className="pb-3 border-b border-[var(--border-subtle)]">
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                Websites Baidu đã lưu ({baiduProperties.length})
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-1">
              {baiduProperties.length === 0 ? (
                <EmptyState
                  title="Chưa có website Baidu nào"
                  description="Thêm URL và Token ở form bên cạnh để bắt đầu đẩy link."
                />
              ) : (
                baiduProperties.map((p) => (
                  <div key={p.id} className="p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[var(--text-primary)] font-mono text-[11px]">{p.domain}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBaiduProperty(p.id)}
                        className="h-6 w-6 text-[var(--text-muted)] hover:text-rose-400"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono pt-1">
                      <span>Đã gửi: {p.pushedCount} URLs</span>
                      <span className="text-blue-400 font-bold">Còn lại: {p.dailyRemain} lượt/ngày</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
