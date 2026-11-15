import React, { useState, useEffect, useMemo } from 'react'
import {
  Globe,
  Search,
  RotateCw,
  Plus,
  Trash2,
  Edit2,
  Server,
  ArrowRight,
  Shield,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react'
import { useAppStore } from '../../lib/useAppStore'
import { cfApi } from './api'
import { CloudflareZone, CloudflareDnsRecord, CloudflareAccount } from '../../types'
import { EmptyState } from '../../components/ui'

export const CloudflareDomains: React.FC = () => {
  const { cfAccounts, addToast, showConfirm, setActiveView } = useAppStore()

  const [zones, setZones] = useState<CloudflareZone[]>([])
  const [loadingZones, setLoadingZones] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all')

  // Selected Zone for DNS management
  const [activeZone, setActiveZone] = useState<CloudflareZone | null>(null)
  const [dnsRecords, setDnsRecords] = useState<CloudflareDnsRecord[]>([])
  const [loadingDns, setLoadingDns] = useState(false)

  // DNS Record Form Modal
  const [showDnsModal, setShowDnsModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<CloudflareDnsRecord | null>(null)
  const [recordType, setRecordType] = useState('A')
  const [recordName, setRecordName] = useState('')
  const [recordContent, setRecordContent] = useState('')
  const [recordProxied, setRecordProxied] = useState(true)

  // Bulk IP Replacement Modal
  const [showBulkIpModal, setShowBulkIpModal] = useState(false)
  const [oldIp, setOldIp] = useState('')
  const [newIp, setNewIp] = useState('')
  const [bulkReplacing, setBulkReplacing] = useState(false)
  const [bulkResults, setBulkResults] = useState<{ zone: string; status: string }[]>([])

  // Load zones from all accounts
  const loadAllZones = async () => {
    if (cfAccounts.length === 0) return
    setLoadingZones(true)
    let all: CloudflareZone[] = []

    for (const acc of cfAccounts) {
      try {
        const accZones = await cfApi.getZones(acc)
        all = [...all, ...accZones]
      } catch (err: any) {
        console.error(err)
      }
    }

    setZones(all)
    setLoadingZones(false)
  }

  useEffect(() => {
    loadAllZones()
  }, [cfAccounts])

  // Filtered Zones
  const filteredZones = useMemo(() => {
    return zones.filter((z) => {
      if (selectedAccountId !== 'all' && z.account.id !== selectedAccountId) {
        return false
      }
      if (search && !z.name.toLowerCase().includes(search.toLowerCase())) {
        return false
      }
      return true
    })
  }, [zones, selectedAccountId, search])

  // Load DNS records for active zone
  const loadDns = async (zone: CloudflareZone) => {
    setActiveZone(zone)
    setLoadingDns(true)
    const acc = cfAccounts.find((a) => a.id === zone.account.id)
    if (!acc) return

    try {
      const records = await cfApi.getDnsRecords(acc, zone.id)
      setDnsRecords(records)
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Lỗi tải DNS records' })
    } finally {
      setLoadingDns(false)
    }
  }

  // Handle Save Record
  const handleSaveDns = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeZone) return
    const acc = cfAccounts.find((a) => a.id === activeZone.account.id)
    if (!acc) return

    try {
      if (editingRecord) {
        await cfApi.updateDnsRecord(acc, activeZone.id, editingRecord.id, {
          type: recordType,
          name: recordName.trim(),
          content: recordContent.trim(),
          ttl: 1,
          proxied: recordProxied,
        })
        addToast({ type: 'success', message: `Đã cập nhật record ${recordName}` })
      } else {
        await cfApi.createDnsRecord(acc, activeZone.id, {
          type: recordType,
          name: recordName.trim(),
          content: recordContent.trim(),
          ttl: 1,
          proxied: recordProxied,
        })
        addToast({ type: 'success', message: `Đã tạo mới record ${recordName}` })
      }

      setShowDnsModal(false)
      loadDns(activeZone)
    } catch (err: any) {
      addToast({ type: 'error', message: err.message })
    }
  }

  // Handle Delete Record
  const handleDeleteDns = (record: CloudflareDnsRecord) => {
    if (!activeZone) return
    const acc = cfAccounts.find((a) => a.id === activeZone.account.id)
    if (!acc) return

    showConfirm({
      title: `Xóa DNS Record "${record.name}"?`,
      message: `Hành động này sẽ xóa bản ghi ${record.type} trỏ về ${record.content}.`,
      confirmText: 'Xóa bản ghi',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await cfApi.deleteDnsRecord(acc, activeZone.id, record.id)
          setDnsRecords((prev) => prev.filter((r) => r.id !== record.id))
          addToast({ type: 'info', message: 'Đã xóa bản ghi DNS' })
        } catch (err: any) {
          addToast({ type: 'error', message: err.message })
        }
      },
    })
  }

  // Handle Bulk IP Replacement
  const handleBulkIpReplace = async () => {
    if (!oldIp.trim() || !newIp.trim()) return
    setBulkReplacing(true)
    setBulkResults([])

    const results: { zone: string; status: string }[] = []

    for (const z of filteredZones) {
      const acc = cfAccounts.find((a) => a.id === z.account.id)
      if (!acc) continue

      try {
        const records = await cfApi.getDnsRecords(acc, z.id)
        const matched = records.filter((r) => r.type === 'A' && r.content.trim() === oldIp.trim())

        if (matched.length > 0) {
          for (const m of matched) {
            await cfApi.updateDnsRecord(acc, z.id, m.id, {
              type: 'A',
              name: m.name,
              content: newIp.trim(),
              ttl: 1,
              proxied: m.proxied,
            })
          }
          results.push({ zone: z.name, status: `Đã cập nhật ${matched.length} A records` })
        } else {
          results.push({ zone: z.name, status: 'Không có IP khớp' })
        }
      } catch (err: any) {
        results.push({ zone: z.name, status: `Lỗi: ${err.message}` })
      }
    }

    setBulkResults(results)
    setBulkReplacing(false)
    addToast({
      type: 'success',
      title: 'Hoàn tất thay thế IP',
      message: `Đã quét và thay thế IP qua ${filteredZones.length} tên miền.`,
    })
  }

  return (
    <div className="flex-1 h-full flex flex-col p-6 overflow-hidden animate-fade-in select-none">
      {/* Top Controls */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Tìm kiếm domain (zone)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] focus:border-orange-500 text-xs text-[var(--text-primary)] outline-none"
            />
          </div>

          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] outline-none"
          >
            <option value="all">Tất cả tài khoản ({cfAccounts.length})</option>
            {cfAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.email})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulkIpModal(true)}
            className="px-3 py-1.5 rounded-lg bg-orange-600/15 border border-orange-500/30 text-orange-400 hover:bg-orange-600/25 text-xs font-medium flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(249,115,22,0.15)]"
          >
            <Server size={14} />
            <span>Bulk Replace IP</span>
          </button>

          <button
            onClick={loadAllZones}
            disabled={loadingZones}
            className="p-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <RotateCw size={14} className={loadingZones ? 'animate-spin text-orange-400' : ''} />
          </button>
        </div>
      </div>

      {/* Main Grid: Zones List on Left, DNS Records on Right */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-hidden mt-4">
        {/* Left Col: Domains */}
        <div className="md:col-span-5 flex flex-col overflow-hidden glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Danh sách Tên miền ({filteredZones.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto mt-2 space-y-1.5 pr-1">
            {loadingZones ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                <Loader2 size={20} className="animate-spin text-orange-400" />
                <span>Đang tải danh sách zones...</span>
              </div>
            ) : cfAccounts.length === 0 ? (
              <div className="py-8 px-4">
                <EmptyState
                  icon={Globe}
                  title="Chưa kết nối Cloudflare"
                  description="Bạn chưa cấu hình tài khoản Cloudflare nào trong hệ thống."
                  actionLabel="Mở Cài đặt & Tài khoản"
                  onAction={() => setActiveView('settings')}
                />
              </div>
            ) : filteredZones.length === 0 ? (
              <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                Chưa có tên miền nào hoặc không tìm thấy kết quả phù hợp.
              </div>
            ) : (
              filteredZones.map((z) => {
                const isActive = activeZone?.id === z.id
                return (
                  <button
                    key={z.id}
                    onClick={() => loadDns(z)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                      isActive
                        ? 'bg-orange-500/15 border border-orange-500/30 text-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.15)]'
                        : 'hover:bg-[var(--bg-elevated)] border border-transparent text-[var(--text-secondary)]'
                    }`}
                  >
                    <div className="space-y-0.5 truncate">
                      <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                        {z.name}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono">
                        {z.account.name}
                      </div>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                      {z.status}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right Col: DNS Records */}
        <div className="md:col-span-7 flex flex-col overflow-hidden glass-card rounded-2xl p-4">
          {activeZone ? (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <div>
                  <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                    DNS Records: <span className="text-orange-400">{activeZone.name}</span>
                  </h3>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono">
                    Zone ID: {activeZone.id}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setEditingRecord(null)
                    setRecordName('@')
                    setRecordContent('')
                    setRecordType('A')
                    setShowDnsModal(true)
                  }}
                  className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-medium text-[11px] flex items-center gap-1 shadow-md shadow-orange-950"
                >
                  <Plus size={12} />
                  <span>Thêm Record</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto mt-2 space-y-1.5 pr-1">
                {loadingDns ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                    <Loader2 size={20} className="animate-spin text-orange-400" />
                    <span>Đang tải DNS records...</span>
                  </div>
                ) : dnsRecords.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                    Không có DNS record nào trong zone này.
                  </div>
                ) : (
                  dnsRecords.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="w-12 text-center py-0.5 rounded bg-[var(--bg-elevated)] text-orange-400 font-mono font-bold text-[10px] border border-[var(--border-subtle)]">
                          {r.type}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-[var(--text-primary)] truncate font-mono text-[11px]">
                            {r.name}
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)] truncate font-mono">
                            {r.content}
                          </div>
                        </div>
                        {r.proxied && (
                          <span className="text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded font-mono">
                            Proxied
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => {
                            setEditingRecord(r)
                            setRecordType(r.type)
                            setRecordName(r.name)
                            setRecordContent(r.content)
                            setRecordProxied(r.proxied)
                            setShowDnsModal(true)
                          }}
                          className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-amber-400"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteDns(r)}
                          className="p-1 rounded hover:bg-rose-500/15 text-[var(--text-muted)] hover:text-rose-400"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-xs text-[var(--text-muted)]">
              <Globe size={32} className="text-[var(--text-dim)] mb-2" />
              <span>Chọn một tên miền từ danh sách bên trái để quản lý bản ghi DNS.</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal DNS Record */}
      {showDnsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-mid)] shadow-2xl space-y-4">
            <h3 className="text-xs font-semibold text-[var(--text-primary)]">
              {editingRecord ? 'Chỉnh sửa DNS Record' : 'Thêm mới DNS Record'}
            </h3>

            <form onSubmit={handleSaveDns} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-[var(--text-muted)]">Loại</label>
                  <select
                    value={recordType}
                    onChange={(e) => setRecordType(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
                  >
                    {['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS'].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[11px] text-[var(--text-muted)]">Tên (Name)</label>
                  <input
                    type="text"
                    value={recordName}
                    onChange={(e) => setRecordName(e.target.value)}
                    placeholder="@ hoặc subdomain"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[var(--text-muted)]">Nội dung (IP / Target)</label>
                <input
                  type="text"
                  value={recordContent}
                  onChange={(e) => setRecordContent(e.target.value)}
                  placeholder="1.2.3.4 hoặc target.domain.com"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)]"
                  required
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={recordProxied}
                  onChange={(e) => setRecordProxied(e.target.checked)}
                  className="rounded"
                />
                <span>Bật Cloudflare Proxy (Đám mây cam)</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setShowDnsModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-medium text-xs shadow-md shadow-orange-950"
                >
                  Lưu Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Bulk IP Replacement */}
      {showBulkIpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-mid)] shadow-2xl space-y-4">
            <h3 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Server size={16} className="text-orange-400" />
              <span>Bulk IP Replacement (Thay thế IP hàng loạt)</span>
            </h3>

            <p className="text-xs text-[var(--text-muted)]">
              Quét tất cả các bản ghi <b>A Record</b> của các tên miền đang hiển thị và đổi địa chỉ IP cũ sang địa chỉ IP mới.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-[var(--text-muted)]">Địa chỉ IP CŨ (cần thay thế)</label>
                <input
                  type="text"
                  placeholder="VD: 103.1.2.3"
                  value={oldIp}
                  onChange={(e) => setOldIp(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[var(--text-muted)]">Địa chỉ IP MỚI</label>
                <input
                  type="text"
                  placeholder="VD: 45.1.2.3"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)]"
                />
              </div>
            </div>

            {bulkResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto p-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] space-y-1 font-mono text-[10px]">
                {bulkResults.map((res, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-[var(--text-primary)]">{res.zone}</span>
                    <span className="text-orange-400">{res.status}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setShowBulkIpModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Đóng
              </button>
              <button
                onClick={handleBulkIpReplace}
                disabled={bulkReplacing || !oldIp || !newIp}
                className="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-orange-950"
              >
                {bulkReplacing ? <Loader2 size={13} className="animate-spin" /> : null}
                <span>Bắt đầu thay thế ({filteredZones.length} domains)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
