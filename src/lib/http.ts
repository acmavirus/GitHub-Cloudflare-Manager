import { fetch as tauriFetch } from '@tauri-apps/plugin-http'

export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/**
 * Universal fetch function:
 * - Uses Tauri's native Rust HTTP client when running as Desktop App (100% bypasses CORS).
 * - Falls back to standard browser fetch when running in normal browser dev mode.
 */
export async function universalFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  if (isTauri()) {
    return tauriFetch(input as any, init as any)
  }
  return window.fetch(input, init)
}

export const http = {
  get: async (url: string, headers: Record<string, string> = {}) => {
    return universalFetch(url, {
      method: 'GET',
      headers,
    })
  },

  post: async (url: string, body?: any, headers: Record<string, string> = {}) => {
    const isJson = body && typeof body === 'object' && !(body instanceof FormData)
    return universalFetch(url, {
      method: 'POST',
      headers: {
        ...(isJson ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: isJson ? JSON.stringify(body) : body,
    })
  },

  put: async (url: string, body?: any, headers: Record<string, string> = {}) => {
    const isJson = body && typeof body === 'object' && !(body instanceof FormData)
    return universalFetch(url, {
      method: 'PUT',
      headers: {
        ...(isJson ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: isJson ? JSON.stringify(body) : body,
    })
  },

  patch: async (url: string, body?: any, headers: Record<string, string> = {}) => {
    const isJson = body && typeof body === 'object' && !(body instanceof FormData)
    return universalFetch(url, {
      method: 'PATCH',
      headers: {
        ...(isJson ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: isJson ? JSON.stringify(body) : body,
    })
  },

  delete: async (url: string, body?: any, headers: Record<string, string> = {}) => {
    const isJson = body && typeof body === 'object' && !(body instanceof FormData)
    return universalFetch(url, {
      method: 'DELETE',
      headers: {
        ...(isJson ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: isJson ? JSON.stringify(body) : body,
    })
  },
}
