import { create } from 'zustand'
import {
  ActiveView,
  GitHubUser,
  CloudflareAccount,
  GAProperty,
  KanbanTask,
  IndexNowHistoryItem,
  Toast,
} from '../types'
import { appStorage } from './store'

interface ConfirmDialogState {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  onConfirm: () => void | Promise<void>
}

interface AppState {
  // Theme & Navigation
  theme: 'dark' | 'light'
  setTheme: (theme: 'dark' | 'light') => void
  toggleTheme: () => void
  activeView: ActiveView
  setActiveView: (view: ActiveView) => void

  // GitHub Credentials & State
  githubToken: string | null
  setGithubToken: (token: string | null) => void
  githubUser: GitHubUser | null
  setGithubUser: (user: GitHubUser | null) => void

  // Cloudflare Accounts
  cfAccounts: CloudflareAccount[]
  setCfAccounts: (accounts: CloudflareAccount[]) => void
  addCfAccount: (account: CloudflareAccount) => void
  removeCfAccount: (id: string) => void

  // Google Analytics
  gaProperties: GAProperty[]
  setGaProperties: (props: GAProperty[]) => void
  addGaProperty: (prop: GAProperty) => void
  removeGaProperty: (id: string) => void
  toggleGaPropertyActive: (id: string) => void

  // IndexNow
  indexnowKeys: Record<string, string> // domain -> key
  setIndexnowKeys: (keys: Record<string, string>) => void
  setDomainKey: (domain: string, key: string) => void
  indexnowHistory: IndexNowHistoryItem[]
  addIndexnowHistory: (item: IndexNowHistoryItem) => void
  clearIndexnowHistory: () => void

  // Kanban
  kanbanTasks: KanbanTask[]
  setKanbanTasks: (tasks: KanbanTask[]) => void
  addKanbanTask: (task: KanbanTask) => void
  updateKanbanTask: (id: string, updates: Partial<KanbanTask>) => void
  deleteKanbanTask: (id: string) => void

  // Toasts
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void

  // Confirm Modal
  confirmDialog: ConfirmDialogState
  showConfirm: (dialog: Omit<ConfirmDialogState, 'isOpen'>) => void
  closeConfirm: () => void

  // App Initialization
  isInitialized: boolean
  initApp: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  theme: 'dark',
  setTheme: (theme) => {
    set({ theme })
    document.documentElement.setAttribute('data-theme', theme)
    appStorage.set('theme', theme)
  },
  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark'
    get().setTheme(nextTheme)
  },

  activeView: 'github',
  setActiveView: (activeView) => set({ activeView }),

  // GitHub
  githubToken: null,
  setGithubToken: (token) => {
    set({ githubToken: token })
    if (token) {
      appStorage.set('github_token', token)
    } else {
      appStorage.remove('github_token')
      set({ githubUser: null })
    }
  },
  githubUser: null,
  setGithubUser: (user) => set({ githubUser: user }),

  // Cloudflare
  cfAccounts: [],
  setCfAccounts: (cfAccounts) => {
    set({ cfAccounts })
    appStorage.set('cf_accounts', cfAccounts)
  },
  addCfAccount: (account) => {
    const next = [...get().cfAccounts, account]
    get().setCfAccounts(next)
  },
  removeCfAccount: (id) => {
    const next = get().cfAccounts.filter((a) => a.id !== id)
    get().setCfAccounts(next)
  },

  // Google Analytics
  gaProperties: [],
  setGaProperties: (gaProperties) => {
    set({ gaProperties })
    appStorage.set('ga_properties', gaProperties)
  },
  addGaProperty: (prop) => {
    const next = [...get().gaProperties, prop]
    get().setGaProperties(next)
  },
  removeGaProperty: (id) => {
    const next = get().gaProperties.filter((p) => p.id !== id)
    get().setGaProperties(next)
  },
  toggleGaPropertyActive: (id) => {
    const next = get().gaProperties.map((p) => ({
      ...p,
      active: p.id === id ? !p.active : false,
    }))
    get().setGaProperties(next)
  },

  // IndexNow
  indexnowKeys: {},
  setIndexnowKeys: (keys) => {
    set({ indexnowKeys: keys })
    appStorage.set('indexnow_keys', keys)
  },
  setDomainKey: (domain, key) => {
    const next = { ...get().indexnowKeys, [domain.toLowerCase()]: key.trim() }
    get().setIndexnowKeys(next)
  },
  indexnowHistory: [],
  addIndexnowHistory: (item) => {
    const next = [item, ...get().indexnowHistory].slice(0, 50)
    set({ indexnowHistory: next })
    appStorage.set('indexnow_history', next)
  },
  clearIndexnowHistory: () => {
    set({ indexnowHistory: [] })
    appStorage.remove('indexnow_history')
  },

  // Kanban
  kanbanTasks: [],
  setKanbanTasks: (kanbanTasks) => {
    set({ kanbanTasks })
    appStorage.set('kanban_tasks', kanbanTasks)
  },
  addKanbanTask: (task) => {
    const next = [...get().kanbanTasks, task]
    get().setKanbanTasks(next)
  },
  updateKanbanTask: (id, updates) => {
    const next = get().kanbanTasks.map((t) =>
      t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
    )
    get().setKanbanTasks(next)
  },
  deleteKanbanTask: (id) => {
    const next = get().kanbanTasks.filter((t) => t.id !== id)
    get().setKanbanTasks(next)
  },

  // Toasts
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: Toast = { ...toast, id }
    set((s) => ({ toasts: [...s.toasts, newToast] }))
    setTimeout(() => {
      get().removeToast(id)
    }, 4000)
  },
  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },

  // Confirm Modal
  confirmDialog: {
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  },
  showConfirm: (dialog) => {
    set({ confirmDialog: { ...dialog, isOpen: true } })
  },
  closeConfirm: () => {
    set((s) => ({ confirmDialog: { ...s.confirmDialog, isOpen: false } }))
  },

  // Init
  isInitialized: false,
  initApp: async () => {
    try {
      const theme = await appStorage.get<'dark' | 'light'>('theme', 'dark')
      document.documentElement.setAttribute('data-theme', theme)

      const token = await appStorage.get<string | null>('github_token', null)
      const cfAccounts = await appStorage.get<CloudflareAccount[]>('cf_accounts', [])
      const gaProperties = await appStorage.get<GAProperty[]>('ga_properties', [])
      const indexnowKeys = await appStorage.get<Record<string, string>>('indexnow_keys', {})
      const indexnowHistory = await appStorage.get<IndexNowHistoryItem[]>('indexnow_history', [])
      const kanbanTasks = await appStorage.get<KanbanTask[]>('kanban_tasks', [])

      set({
        theme,
        githubToken: token,
        cfAccounts,
        gaProperties,
        indexnowKeys,
        indexnowHistory,
        kanbanTasks,
        isInitialized: true,
      })
    } catch (e) {
      console.error('Failed to initialize app state:', e)
      set({ isInitialized: true })
    }
  },
}))
