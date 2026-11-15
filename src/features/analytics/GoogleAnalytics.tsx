import React, { useState } from 'react'
import { BarChart3, Plus, Trash2, Copy, Check, ExternalLink, Activity } from 'lucide-react'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { useAppStore } from '../../lib/useAppStore'
import { isTauri } from '../../lib/http'
import { GAProperty } from '../../types'

export const GoogleAnalyticsManager: React.FC = () => {
  const { gaProperties, addGaProperty, removeGaProperty, toggleGaPropertyActive, addToast, showConfirm } =
    useAppStore()

  const [name, setName] = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [measurementId, setMeasurementId] = useState('')

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !measurementId.trim()) return

    const newProp: GAProperty = {
      id: Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      propertyId: propertyId.trim() || 'N/A',
      measurementId: measurementId.trim().toUpperCase(),
      active: gaProperties.length === 0,
    }

    addGaProperty(newProp)
    setName('')
    setPropertyId('')
    setMeasurementId('')
    addToast({
      type: 'success',
      title: 'Đã thêm GA4 Property',
      message: `Tài sản "${newProp.name}" (${newProp.measurementId}) đã được lưu.`,
    })
  }

  const copyGtag = async (prop: GAProperty) => {
    const code = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${prop.measurementId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${prop.measurementId}');
</script>`

    try {
      if (isTauri()) {
        await writeText(code)
      } else {
        await navigator.clipboard.writeText(code)
      }
      addToast({
        type: 'success',
        title: 'Đã sao chép mã theo dõi',
        message: `Đã copy script gtag.js cho ${prop.measurementId} vào clipboard.`,
      })
    } catch {
      addToast({ type: 'error', message: 'Không thể truy cập clipboard' })
    }
  }

  const handleDelete = (prop: GAProperty) => {
    showConfirm({
      title: `Xóa GA4 Property "${prop.name}"?`,
      message: 'Thông tin tài sản này sẽ bị xóa khỏi danh sách quản lý của bạn.',
      confirmText: 'Xóa tài sản',
      isDestructive: true,
      onConfirm: () => {
        removeGaProperty(prop.id)
        addToast({ type: 'info', message: `Đã gỡ ${prop.name}` })
      },
    })
  }

  return (
    <div className="flex-1 h-full p-6 overflow-y-auto space-y-6 animate-fade-in select-none">
      {/* Top Banner */}
      <div className="p-4 rounded-xl glass-card border-l-4 border-sky-500 flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <BarChart3 size={16} className="text-sky-400" />
            <span>Google Analytics 4 (GA4) Property Hub</span>
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Quản lý tập trung các thuộc tính đo lường GA4 và lấy nhanh mã nhúng <code className="text-sky-400 font-mono">gtag.js</code>.
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-mono">
          {gaProperties.length} Properties
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form thêm Property */}
        <div className="lg:col-span-1 p-5 rounded-2xl glass-card space-y-4 h-fit">
          <h3 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Plus size={15} className="text-sky-400" />
            <span>Thêm Property GA4 mới</span>
          </h3>

          <form onSubmit={handleAdd} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--text-secondary)]">Tên website / Property</label>
              <input
                type="text"
                placeholder="Ví dụ: My Portfolio, Shop Online..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] focus:border-sky-500 text-xs text-[var(--text-primary)] outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--text-secondary)]">Measurement ID (G-XXXXXXX)</label>
              <input
                type="text"
                placeholder="G-ABC123XYZ"
                value={measurementId}
                onChange={(e) => setMeasurementId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] focus:border-sky-500 text-xs font-mono text-[var(--text-primary)] outline-none uppercase"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--text-secondary)]">Property ID (Tùy chọn)</label>
              <input
                type="text"
                placeholder="Số ID trên Google Admin (VD: 345678901)"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] focus:border-sky-500 text-xs font-mono text-[var(--text-primary)] outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs shadow-md shadow-sky-950 transition-colors"
            >
              Lưu Property GA4
            </button>
          </form>
        </div>

        {/* Danh sách Properties */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-xs font-semibold text-[var(--text-primary)]">
            Tài sản đang quản lý ({gaProperties.length})
          </h3>

          {gaProperties.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-[var(--border-subtle)] text-center text-xs text-[var(--text-muted)]">
              Chưa có tài sản GA4 nào được thêm.
            </div>
          ) : (
            gaProperties.map((prop) => (
              <div
                key={prop.id}
                className="flex items-center justify-between p-4 rounded-xl glass-card"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {prop.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20">
                      {prop.measurementId}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] font-mono">
                    Property ID: {prop.propertyId}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <button
                    onClick={() => copyGtag(prop)}
                    className="px-2.5 py-1.5 rounded-lg bg-sky-600/15 border border-sky-500/30 text-sky-400 hover:bg-sky-600/25 text-xs font-medium flex items-center gap-1 transition-all"
                  >
                    <Copy size={12} />
                    <span>Copy gtag.js</span>
                  </button>

                  <button
                    onClick={() => handleDelete(prop)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/15 text-[var(--text-muted)] hover:text-rose-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
