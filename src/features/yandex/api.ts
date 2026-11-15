import { http } from '../../lib/http'
import { YandexHost } from '../../types'

const YANDEX_BASE = 'https://api.webmaster.yandex.net/v4'

export const yandexApi = {
  getUserId: async (oauthToken: string): Promise<string> => {
    const res = await http.get(`${YANDEX_BASE}/user`, {
      Authorization: `OAuth ${oauthToken.trim()}`,
    })
    if (!res.ok) {
      throw new Error(`Yandex OAuth lỗi (${res.status}): Token không hợp lệ hoặc đã hết hạn`)
    }
    const data = await res.json()
    return data.user_id.toString()
  },

  getHosts: async (oauthToken: string, userId: string): Promise<YandexHost[]> => {
    const res = await http.get(`${YANDEX_BASE}/user/${userId}/hosts`, {
      Authorization: `OAuth ${oauthToken.trim()}`,
    })
    if (!res.ok) {
      throw new Error(`Lỗi tải danh sách website Yandex (${res.status})`)
    }
    const data = await res.json()
    const hosts = data.hosts || []

    return hosts.map((h: any) => ({
      hostId: h.host_id,
      asciiHostUrl: h.ascii_host_url,
      domain: h.ascii_host_url.replace(/^https?:\/\//, '').replace(/:\d+$/, ''),
      sqi: h.sqi || 0,
      verified: h.verified || false,
      indexedPagesCount: 0,
    }))
  },

  getHostSummary: async (oauthToken: string, userId: string, hostId: string) => {
    try {
      const res = await http.get(`${YANDEX_BASE}/user/${userId}/hosts/${hostId}/summary`, {
        Authorization: `OAuth ${oauthToken.trim()}`,
      })
      if (!res.ok) return null
      const data = await res.json()
      return {
        sqi: data.sqi || 0,
        indexedPagesCount: data.pages_count?.indexed || 0,
      }
    } catch {
      return null
    }
  },

  recrawlUrl: async (oauthToken: string, userId: string, hostId: string, url: string) => {
    const res = await http.post(
      `${YANDEX_BASE}/user/${userId}/hosts/${hostId}/recrawl/queue`,
      { url: url.trim() },
      { Authorization: `OAuth ${oauthToken.trim()}` }
    )
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Yandex Re-crawl lỗi (${res.status}): ${text}`)
    }
    return res.json()
  },
}
