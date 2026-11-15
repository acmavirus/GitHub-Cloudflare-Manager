// Navigation views
export type ActiveView = 
  | 'github'
  | 'cf-domains'
  | 'cf-accounts'
  | 'ga-manager'
  | 'indexnow'
  | 'auditor'
  | 'kanban'
  | 'settings'

// GitHub Types
export interface GitHubUser {
  login: string
  id: number
  avatar_url: string
  html_url: string
  name: string
  company: string | null
  blog: string
  location: string | null
  bio: string | null
  public_repos: number
  public_gists: number
  followers: number
  following: number
}

export interface GitHubRepo {
  id: number
  node_id?: string
  name: string
  full_name: string
  private: boolean
  owner: {
    login: string
    id: number
    avatar_url: string
    html_url: string
    type: string
  }
  html_url: string
  description: string | null
  fork: boolean
  url: string
  clone_url: string
  created_at: string
  updated_at: string
  pushed_at: string
  homepage: string | null
  size: number
  stargazers_count: number
  watchers_count: number
  language: string | null
  forks_count: number
  archived: boolean
  disabled: boolean
  open_issues_count: number
  default_branch: string
}

export interface RepoStats {
  branches: number
  commits: number
  loading?: boolean
}

export interface GitHubCommit {
  sha: string
  commit: {
    author: {
      name: string
      date: string
    }
    message: string
  }
  html_url: string
  repository?: {
    name: string
    full_name: string
  }
}

// Cloudflare Types
export interface CloudflareAccount {
  id: string
  name: string
  email: string
  apiKey: string
}

export interface CloudflareZone {
  id: string
  name: string
  status: string
  paused: boolean
  type: string
  development_mode: number
  name_servers: string[]
  account: {
    id: string
    name: string
  }
}

export interface CloudflareDnsRecord {
  id: string
  zone_id: string
  zone_name: string
  name: string
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'NS' | 'SRV' | string
  content: string
  proxiable: boolean
  proxied: boolean
  ttl: number
  comment?: string
  tags?: string[]
}

// Google Analytics Types
export interface GAProperty {
  id: string
  name: string
  propertyId: string
  measurementId: string
  active: boolean
}

// IndexNow Types
export interface IndexNowHistoryItem {
  id: string
  domain: string
  key: string
  urls: string[]
  timestamp: string
  status: 'success' | 'failed'
  mode: 'batch' | 'individual'
  responseCode?: number
  message?: string
}

// Domain Auditor Types
export interface AuditResult {
  url: string
  status: number
  time: number // ms
  size: number // bytes
  title: string
  error?: string
}

// Kanban Types
export type KanbanStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type KanbanPriority = 'low' | 'medium' | 'high'

export interface KanbanTask {
  id: string
  title: string
  description?: string
  status: KanbanStatus
  priority: KanbanPriority
  repo?: string
  createdAt: string
  updatedAt: string
}

// Toast Notification
export interface Toast {
  id: string
  title?: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}
