import React, { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAppStore } from './lib/useAppStore'
import { Header } from './components/common/Header'
import { Sidebar } from './components/common/Sidebar'
import { ToastContainer } from './components/common/ToastContainer'
import { ConfirmModal } from './components/common/ConfirmModal'

// Features
import { GitHubAuth } from './features/github/GitHubAuth'
import { GitHubManager } from './features/github/GitHubManager'
import { CloudflareDomains } from './features/cloudflare/CloudflareDomains'
import { GoogleAnalyticsManager } from './features/analytics/GoogleAnalytics'
import { GoogleSearchConsole } from './features/gsc/GoogleSearchConsole'
import { BingWebmaster } from './features/bing/BingWebmaster'
import { YandexWebmaster } from './features/yandex/YandexWebmaster'
import { FastIndexingHub } from './features/indexing/FastIndexingHub'
import { DomainAuditor } from './features/auditor/DomainAuditor'
import { KanbanBoard } from './features/kanban/KanbanBoard'
import { SettingsView } from './features/settings/SettingsView'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export const AppContent: React.FC = () => {
  const { activeView, githubToken, isInitialized, initApp } = useAppStore()

  useEffect(() => {
    initApp()
  }, [])

  if (!isInitialized) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[var(--bg-void)] text-xs text-[var(--text-muted)] font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
          <span>Đang tải dữ liệu...</span>
        </div>
      </div>
    )
  }

  const renderActiveView = () => {
    switch (activeView) {
      case 'github':
        return githubToken ? <GitHubManager /> : <GitHubAuth />
      case 'kanban':
        return <KanbanBoard />
      case 'cf-domains':
        return <CloudflareDomains />
      case 'gsc':
        return <GoogleSearchConsole />
      case 'bing':
        return <BingWebmaster />
      case 'yandex':
        return <YandexWebmaster />
      case 'indexing-hub':
        return <FastIndexingHub />
      case 'ga-manager':
        return <GoogleAnalyticsManager />
      case 'auditor':
        return <DomainAuditor />
      case 'settings':
        return <SettingsView />
      default:
        return <GitHubManager />
    }
  }

  return (
    <div className="w-screen h-screen flex bg-[var(--bg-void)] text-[var(--text-primary)] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-hidden relative flex flex-col">
          {renderActiveView()}
        </main>
      </div>

      <ToastContainer />
      <ConfirmModal />
    </div>
  )
}

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

export default App
