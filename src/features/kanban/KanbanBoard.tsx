import React, { useState } from 'react'
import {
  KanbanSquare,
  Plus,
  Trash2,
  FolderGit2,
  AlertCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react'
import { useAppStore } from '../../lib/useAppStore'
import { KanbanTask, KanbanStatus, KanbanPriority } from '../../types'

const COLUMNS: { id: KanbanStatus; title: string; color: string }[] = [
  { id: 'todo', title: 'To Do (Cần làm)', color: 'text-sky-400' },
  { id: 'in_progress', title: 'In Progress (Đang thực hiện)', color: 'text-amber-400' },
  { id: 'review', title: 'Review (Kiểm duyệt)', color: 'text-indigo-400' },
  { id: 'done', title: 'Done (Hoàn thành)', color: 'text-emerald-400' },
]

export const KanbanBoard: React.FC = () => {
  const { kanbanTasks, addKanbanTask, updateKanbanTask, deleteKanbanTask, addToast } = useAppStore()

  const [showAddModal, setShowAddModal] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskPriority, setTaskPriority] = useState<KanbanPriority>('medium')
  const [taskRepo, setTaskRepo] = useState('')

  const [filterPriority, setFilterPriority] = useState<string>('all')

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskTitle.trim()) return

    const newTask: KanbanTask = {
      id: Math.random().toString(36).substring(2, 9),
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      status: 'todo',
      priority: taskPriority,
      repo: taskRepo.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    addKanbanTask(newTask)
    setTaskTitle('')
    setTaskDesc('')
    setTaskPriority('medium')
    setTaskRepo('')
    setShowAddModal(false)

    addToast({
      type: 'success',
      title: 'Đã tạo công việc',
      message: `Task "${newTask.title}" đã được thêm vào cột To Do.`,
    })
  }

  const moveTask = (taskId: string, currentStatus: KanbanStatus, direction: 'prev' | 'next') => {
    const statusOrder: KanbanStatus[] = ['todo', 'in_progress', 'review', 'done']
    const currentIndex = statusOrder.indexOf(currentStatus)
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1

    if (nextIndex >= 0 && nextIndex < statusOrder.length) {
      updateKanbanTask(taskId, { status: statusOrder[nextIndex] })
    }
  }

  const filteredTasks = kanbanTasks.filter((t) => {
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    return true
  })

  return (
    <div className="flex-1 h-full p-6 overflow-hidden flex flex-col space-y-4 animate-fade-in select-none">
      {/* Top Controls */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <KanbanSquare size={16} className="text-indigo-400" />
            <span>Kanban Development Board</span>
          </h2>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] outline-none"
          >
            <option value="all">Tất cả độ ưu tiên</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-indigo-950 transition-colors"
        >
          <Plus size={14} />
          <span>Tạo Task mới</span>
        </button>
      </div>

      {/* 4 Columns Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-hidden">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.id)

          return (
            <div
              key={col.id}
              className="flex flex-col rounded-2xl glass-card p-3 overflow-hidden bg-[var(--bg-base)]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-subtle)]">
                <span className={`text-xs font-semibold ${col.color}`}>{col.title}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] font-mono">
                  {colTasks.length}
                </span>
              </div>

              {/* Task Cards List */}
              <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-1">
                {colTasks.length === 0 ? (
                  <div className="py-12 text-center text-[11px] text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-xl m-1">
                    Trống
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs space-y-2 hover:border-[var(--border-mid)] transition-all shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-[var(--text-primary)] leading-tight">
                          {task.title}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 uppercase ${
                            task.priority === 'high'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : task.priority === 'medium'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {task.priority}
                        </span>
                      </div>

                      {task.description && (
                        <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {task.repo && (
                        <div className="flex items-center gap-1 text-[10px] text-indigo-400 font-mono">
                          <FolderGit2 size={11} />
                          <span className="truncate">{task.repo}</span>
                        </div>
                      )}

                      {/* Card Action Controls */}
                      <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)] text-[11px]">
                        <div className="flex items-center gap-1">
                          {col.id !== 'todo' && (
                            <button
                              onClick={() => moveTask(task.id, task.status, 'prev')}
                              title="Chuyển về cột trước"
                              className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            >
                              <ArrowLeft size={12} />
                            </button>
                          )}
                          {col.id !== 'done' && (
                            <button
                              onClick={() => moveTask(task.id, task.status, 'next')}
                              title="Chuyển sang cột tiếp theo"
                              className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-emerald-400"
                            >
                              <ArrowRight size={12} />
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => deleteKanbanTask(task.id)}
                          title="Xóa công việc"
                          className="p-1 rounded hover:bg-rose-500/15 text-[var(--text-muted)] hover:text-rose-400 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-mid)] shadow-2xl space-y-4">
            <h3 className="text-xs font-semibold text-[var(--text-primary)]">
              Tạo công việc (Kanban Task) mới
            </h3>

            <form onSubmit={handleCreateTask} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] text-[var(--text-secondary)]">Tiêu đề công việc</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Cập nhật DNS cho server mới..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] focus:border-indigo-500 text-xs text-[var(--text-primary)] outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[var(--text-secondary)]">Mô tả chi tiết</label>
                <textarea
                  rows={3}
                  placeholder="Ghi chú thêm về task..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] focus:border-indigo-500 text-xs text-[var(--text-primary)] outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[var(--text-secondary)]">Mức độ ưu tiên</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as KanbanPriority)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] outline-none"
                  >
                    <option value="low">Low (Thấp)</option>
                    <option value="medium">Medium (Bình thường)</option>
                    <option value="high">High (Khẩn cấp)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[var(--text-secondary)]">Gắn Repo liên kết</label>
                  <input
                    type="text"
                    placeholder="user/repo-name"
                    value={taskRepo}
                    onChange={(e) => setTaskRepo(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)] outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-950 transition-colors"
                >
                  Tạo Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
