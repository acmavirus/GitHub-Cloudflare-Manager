import React, { useState } from 'react'
import {
  SearchCode,
  Play,
  RotateCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react'
import { http } from '../../lib/http'
import { useAppStore } from '../../lib/useAppStore'
import { AuditResult } from '../../types'
import { formatBytes } from '../../lib/utils'

export const DomainAuditor: React.FC = () => {
  const { addToast } = useAppStore()

  const [sitemapUrl, setSitemapUrl] = useState('')
  const [urlsInput, setUrlsInput] = useState('')
  const [loadingSitemap, setLoadingSitemap] = useState(false)
  const [auditing, setAuditing] = useState(false)
  const [results, setResults] = useState<AuditResult[]>([])
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  // Extract URLs from XML Sitemap
  const handleFetchSitemap = async () => {
    let url = sitemapUrl.trim()
    if (!url) return
    if (!url.startsWith('http')) url = 'https://' + url

    setLoadingSitemap(true)
    try {
      const res = await http.get(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}: Không thể tải sitemap`)

      const text = await res.text()
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(text, 'text/xml')
      const locTags = xmlDoc.getElementsByTagName('loc')

      const extracted: string[] = []
      for (let i = 0; i < locTags.length; i++) {
        const itemUrl = locTags[i].textContent?.trim()
        if (itemUrl) extracted.push(itemUrl)
      }

      if (extracted.length === 0) {
        addToast({ type: 'warning', message: 'Không tìm thấy thẻ <loc> nào trong tệp Sitemap này.' })
      } else {
        setUrlsInput(extracted.join('\n'))
        addToast({
          type: 'success',
          title: 'Đã trích xuất Sitemap',
          message: `Tìm thấy ${extracted.length} URLs từ sitemap.`,
        })
      }
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Lỗi phân tích sitemap XML' })
    } finally {
      setLoadingSitemap(false)
    }
  }

  // Run multi-threaded URL Audit
  const handleStartAudit = async () => {
    const list = urlsInput
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.startsWith('http://') || u.startsWith('https://'))

    if (list.length === 0) {
      addToast({ type: 'warning', message: 'Vui lòng nhập danh sách URLs cần kiểm tra' })
      return
    }

    setAuditing(true)
    setResults([])
    setProgress({ current: 0, total: list.length })

    const auditResults: AuditResult[] = []

    for (let i = 0; i < list.length; i++) {
      const targetUrl = list[i]
      const startTime = performance.now()

      try {
        const res = await http.get(targetUrl)
        const duration = Math.round(performance.now() - startTime)
        const text = await res.text()

        // Extract title tag
        let pageTitle = ''
        const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i)
        if (titleMatch && titleMatch[1]) {
          pageTitle = titleMatch[1].trim()
        }

        const size = new Blob([text]).size

        const item: AuditResult = {
          url: targetUrl,
          status: res.status,
          time: duration,
          size,
          title: pageTitle || 'N/A',
        }
        auditResults.push(item)
        setResults([...auditResults])
      } catch (err: any) {
        const duration = Math.round(performance.now() - startTime)
        auditResults.push({
          url: targetUrl,
          status: 0,
          time: duration,
          size: 0,
          title: 'Error',
          error: err.message || 'Network Timeout',
        })
        setResults([...auditResults])
      }

      setProgress({ current: i + 1, total: list.length })
    }

    setAuditing(false)
    addToast({
      type: 'success',
      title: 'Hoàn tất kiểm toán',
      message: `Đã kiểm tra xong ${list.length} URLs.`,
    })
  }

  // Export to CSV
  const exportCSV = () => {
    if (results.length === 0) return

    const headers = ['URL', 'Status Code', 'Response Time (ms)', 'Size (Bytes)', 'Page Title', 'Error']
    const rows = results.map((r) => [
      `"${r.url}"`,
      r.status,
      r.time,
      r.size,
      `"${(r.title || '').replace(/"/g, '""')}"`,
      `"${r.error || ''}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `domain_audit_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    addToast({ type: 'success', message: 'Đã xuất file báo cáo CSV thành công' })
  }

  return (
    <div className="flex-1 h-full p-6 overflow-hidden flex flex-col space-y-4 animate-fade-in select-none">
      {/* Top Banner */}
      <div className="p-4 rounded-xl glass-card border-l-4 border-indigo-500 flex items-center justify-between shrink-0">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <SearchCode size={16} className="text-indigo-400" />
            <span>Domain Auditor & URL Health Checker</span>
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Kiểm tra mã trạng thái HTTP, thời gian phản hồi, kích thước trang và tiêu đề SEO từ danh sách URL hoặc Sitemap XML.
          </p>
        </div>

        {results.length > 0 && (
          <button
            onClick={exportCSV}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-colors"
          >
            <Download size={13} />
            <span>Xuất CSV</span>
          </button>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        {/* Left Col: Inputs */}
        <div className="lg:col-span-5 p-5 rounded-2xl glass-card flex flex-col space-y-4 overflow-y-auto">
          {/* Sitemap Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[var(--text-secondary)]">
              Nhập liên kết Sitemap XML
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="https://example.com/sitemap.xml"
                value={sitemapUrl}
                onChange={(e) => setSitemapUrl(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] focus:border-indigo-500 text-xs font-mono text-[var(--text-primary)] outline-none"
              />
              <button
                onClick={handleFetchSitemap}
                disabled={loadingSitemap || !sitemapUrl}
                className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] border border-[var(--border-mid)] text-xs text-[var(--text-primary)] flex items-center gap-1 transition-colors"
              >
                {loadingSitemap ? <Loader2 size={13} className="animate-spin text-indigo-400" /> : null}
                <span>Lấy URLs</span>
              </button>
            </div>
          </div>

          {/* URLs Text Area */}
          <div className="space-y-1.5 flex-1 flex flex-col">
            <label className="text-[11px] font-medium text-[var(--text-secondary)]">
              Danh sách URLs cần Audit (mỗi URL một dòng)
            </label>
            <textarea
              rows={8}
              placeholder="https://example.com/&#10;https://example.com/about&#10;https://example.com/blog"
              value={urlsInput}
              onChange={(e) => setUrlsInput(e.target.value)}
              className="flex-1 w-full p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] focus:border-indigo-500 text-xs font-mono text-[var(--text-primary)] outline-none resize-none"
            />
          </div>

          <button
            onClick={handleStartAudit}
            disabled={auditing || !urlsInput.trim()}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-950 transition-colors shrink-0"
          >
            {auditing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Đang quét ({progress.current}/{progress.total})...</span>
              </>
            ) : (
              <>
                <Play size={14} />
                <span>Bắt đầu kiểm toán</span>
              </>
            )}
          </button>
        </div>

        {/* Right Col: Results Table */}
        <div className="lg:col-span-7 p-5 rounded-2xl glass-card flex flex-col overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <h3 className="text-xs font-semibold text-[var(--text-primary)]">
              Kết quả kiểm toán ({results.length})
            </h3>
            {progress.total > 0 && (
              <span className="text-[11px] font-mono text-indigo-400">
                Tiến độ: {progress.current} / {progress.total}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-1">
            {results.length === 0 ? (
              <div className="py-20 text-center text-xs text-[var(--text-muted)]">
                Chưa có kết quả kiểm toán. Hãy nhập URLs và bấm "Bắt đầu kiểm toán".
              </div>
            ) : (
              results.map((r, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--text-primary)] font-mono text-[11px] truncate flex-1 mr-2">
                      {r.url}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        r.status >= 200 && r.status < 300
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : r.status >= 300 && r.status < 400
                          ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {r.status === 0 ? 'FAIL' : r.status}
                    </span>
                  </div>

                  <div className="text-[11px] text-[var(--text-secondary)] truncate">
                    Title: {r.title}
                  </div>

                  <div className="flex items-center gap-4 text-[10px] text-[var(--text-muted)] font-mono">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      <span>{r.time} ms</span>
                    </span>
                    <span>{formatBytes(r.size)}</span>
                    {r.error && <span className="text-rose-400">{r.error}</span>}
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
