import { LazyStore } from '@tauri-apps/plugin-store'
import { isTauri } from './http'

let tauriStore: LazyStore | null = null

if (isTauri()) {
  try {
    tauriStore = new LazyStore('gitcore-settings.json')
  } catch (err) {
    console.warn('Tauri store init warning, falling back to localStorage:', err)
  }
}

export const appStorage = {
  async get<T>(key: string, defaultValue: T): Promise<T> {
    if (tauriStore) {
      try {
        const val = await tauriStore.get<T>(key)
        return val !== null && val !== undefined ? val : defaultValue
      } catch (e) {
        console.error('Error reading from Tauri store:', e)
      }
    }
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) return defaultValue
      return JSON.parse(raw) as T
    } catch {
      return (localStorage.getItem(key) as unknown as T) || defaultValue
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    if (tauriStore) {
      try {
        await tauriStore.set(key, value)
        await tauriStore.save()
      } catch (e) {
        console.error('Error writing to Tauri store:', e)
      }
    }
    try {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
    } catch (e) {
      console.error('Error writing to localStorage:', e)
    }
  },

  async remove(key: string): Promise<void> {
    if (tauriStore) {
      try {
        await tauriStore.delete(key)
        await tauriStore.save()
      } catch (e) {
        console.error('Error removing from Tauri store:', e)
      }
    }
    localStorage.removeItem(key)
  },
}
