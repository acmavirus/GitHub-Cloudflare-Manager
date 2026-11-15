import React, { useState } from 'react'
import { Send, CheckCircle2, XCircle, AlertCircle, Loader2, KeyRound, Globe, Trash2, RotateCw } from 'lucide-react'
import { http } from '../../lib/http'
import { useAppStore } from '../../lib/useAppStore'
import { IndexNowHistoryItem } from '../../types'

export const IndexNowSubmitter: React.FC = () => {
  const { indexnowKeys, setDomainKey, indexnowHistory, addIndexnowHistory, clearIndexnowHistory, addToast } =
    useAppStore()

  const [domain, setDomain] = useState('')
  const [key, setKey] = useState('')
  const [urlsText, setUrlsText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyStatus, setVerifyStatus] = useState<'success' | 'failed' | null>(null)

  // Auto populate key if domain already saved
  const handleDomainChange = (val: string) => {
    setDomain(val)
    setVerifyStatus(null)
    const cleanDomain = val.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0]
    if (indexnowKeys[cleanDomain]) {
      setKey(indexnowKeys[cleanDomain])
    }
  }

  // Verify key on domain
  const verifyKeyFile = async () => {
    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0]
    if (!cleanDomain || !key.trim()) return

    setVerifying(true)
    setVerifyStatus(null)

    const keyUrl = `https://${cleanDomain}/${key.trim()}.txt`
    try {
      const res = await http.get(keyUrl)
      if (res.ok) {
        const text = await res.text()
        if (text.trim() === key.trim()) {
          setVerifyStatus('success')
          setDomainKey(cleanDomain, key.trim())
          addToast({
            type: 'success',
            title: 'Khóa hợp lệ',
            message: `Tệp xác minh ${keyUrl} phản hồi chính xác!`,
          })
        } else {
          setVerifyStatus('failed')
          addToast({
            type: 'warning',
            title: 'Nội dung khóa không khớp',
            message: `Tệp ${keyUrl} không chứa đúng giá trị khóa IndexNow.`,
          })
        }
      } else {
        setVerifyStatus('failed')
        addToast({
          type: 'error',
          title: 'Không tìm thấy tệp khóa',
          message: `HTTP ${res.status}: Không thể truy cập ${keyUrl}`,
        })
      }
    } catch (err: any) {
      setVerifyStatus('failed')
      addToast({ type: 'error', message: err.message || 'Lỗi khi kiểm tra tệp khóa' })
    } finally {
      setVerifying(false)
    }
  }

  // Submit URLs to IndexNow
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0]
    if (!cleanDomain || !key.trim() || !urlsText.trim()) return

    const urlList = urlsText
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0 && (u.startsWith('http://') || u.startsWith('https://')))

    if (urlList.length === 0) {
      addToast({ type: 'warning', message: 'Vui lòng nhập ít nhất một URL hợp lệ (bắt đầu bằng http:// hoặc https://)' })
      return
    }

    setSubmitting(true)
    // Save domain key mapping
    setDomainKey(cleanDomain, key.trim())

    try {
      const payload = {
        host: cleanDomain,
        key: key.trim(),
        keyLocation: `https://${cleanDomain}/${key.trim()}.txt`,
        urlList,
      }

      const res = await http.post('https://api.indexnow.org/indexnow', payload)

      const historyItem: IndexNowHistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        domain: cleanDomain,
        key: key.trim(),
        urls: urlList,
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
          title: 'Submit IndexNow thành công',
          message: `Đã gửi ${urlList.length} URLs tới các công cụ tìm kiếm (Bing, Yandex...)`,
        })
        setUrlsText('')
      } else {
        addToast({
          type: 'error',
          title: 'Submit thất bại',
          message: `Máy chủ phản hồi mã ${res.status}`,
        })
      }
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Lỗi kết nối tới api.indexnow.org' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex-1 h-full p-6 overflow-y-auto space-y-6 animate-fade-in select-none">
      {/* Top Banner */}
      <div className="p-4 rounded-xl glass-card border-l-4 border-emerald-500 flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Send size={16} className="text-emerald-400" />
            <span>IndexNow Instant Search Engine Indexing</span>
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Thông báo các công cụ tìm kiếm (Bing, Yandex, Seznam) lập chỉ mục tức thì khi bạn xuất bản hoặc cập nhật nội dung.
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          {indexnowHistory.length} Lịch sử submit
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Submit */}
        <div className="lg:col-span-7 p-5 rounded-2xl glass-card space-y-4">
          <h3 className="text-xs font-semibold text-[var(--text-primary)]">
            Gửi yêu cầu lập chỉ mục
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[var(--text-secondary)]">Tên miền (Host)</label>
                <div className="relative">
                  <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="example.com"
                    value={domain}
                    onChange={(e) => handleDomainChange(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] focus:border-emerald-500 text-xs text-[var(--text-primary)] font-mono outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[var(--text-secondary)]">IndexNow API Key</label>
                <div className="relative">
                  <KeyRound size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="32-char hex string"
                    value={key}
                    onChange={(e) => {
                      setKey(e.target.value)
                      setVerifyStatus(null)
                    }}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] focus:border-emerald-500 text-xs text-[var(--text-primary)] font-mono outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Key Verify Button */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)]">
              <div className="text-[11px] text-[var(--text-muted)] font-mono truncate">
                Tệp xác minh: https://{domain || 'domain'}/{key || 'key'}.txt
              </div>

              <button
                type="button"
                onClick={verifyKeyFile}
                disabled={verifying || !domain || !key}
                className="px-2.5 py-1 rounded bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] border border-[var(--border-mid)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors shrink-0"
              >
                {verifying ? <Loader2 size={12} className="animate-spin text-emerald-400" /> : null}
                <span>Kiểm tra tệp khóa</span>
              </button>
            </div>

            {verifyStatus === 'success' && (
              <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                <span>Khóa IndexNow đã được xác minh thành công trên tên miền!</span>
              </div>
            )}

            {verifyStatus === 'failed' && (
              <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-1.5">
                <XCircle size={14} />
                <span>Không thể xác minh tệp khóa trên tên miền. Hãy tải file lên thư mục gốc hosting.</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--text-secondary)]">
                Danh sách URLs cần Submit (Mỗi URL một dòng)
              </label>
              <textarea
                rows={5}
                placeholder={`https://${domain || 'example.com'}/bai-viet-1&#10;https://${domain || 'example.com'}/bai-viet-2`}
                value={urlsText}
                onChange={(e) => setUrlsText(e.target.value)}
                className="w-full p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] focus:border-emerald-500 text-xs font-mono text-[var(--text-primary)] outline-none resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-950 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Đang gửi tới IndexNow...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Gửi URL Index Ngay</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Lịch sử Submission */}
        <div className="lg:col-span-5 p-5 rounded-2xl glass-card flex flex-col overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <h3 className="text-xs font-semibold text-[var(--text-primary)]">
              Lịch sử Submission
            </h3>
            {indexnowHistory.length > 0 && (
              <button
                onClick={clearIndexnowHistory}
                className="text-[11px] text-[var(--text-muted)] hover:text-rose-400 flex items-center gap-1 transition-colors"
              >
                <Trash2 size={11} />
                <span>Xóa lịch sử</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1">
            {indexnowHistory.length === 0 ? (
              <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                Chưa có lịch sử submission nào.
              </div>
            ) : (
              indexnowHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--text-primary)] font-mono text-[11px]">
                      {item.domain}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                        item.status === 'success'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {item.message || item.status}
                    </span>
                  </div>

                  <div className="text-[10px] text-[var(--text-muted)]">
                    Đã gửi {item.urls.length} URLs • {new Date(item.timestamp).toLocaleTimeString('vi-VN')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
