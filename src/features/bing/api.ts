import { http } from '../../lib/http'
import { BingSite, BingQueryStat, BingQuota } from '../../types'

const BING_BASE = 'https://ssl.bing.com/webmaster/api.svc/json'

export const bingApi = {
  getUserSites: async (apiKey: string): Promise<BingSite[]> => {
    const url = `${BING_BASE}/GetUserSites?apikey=${encodeURIComponent(apiKey.trim())}`
    const res = await http.get(url)
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Bing API lỗi (${res.status}): ${err || 'API Key không hợp lệ'}`)
    }
    const data = await res.json()
    const list = data?.d || []
    return list.map((s: any) => ({
      url: s.Url,
      isVerified: s.IsVerified || false,
      role: s.Role || 'Administrator',
    }))
  },

  getQueryStats: async (apiKey: string, siteUrl: string): Promise<BingQueryStat[]> => {
    const url = `${BING_BASE}/GetQueryStats?siteUrl=${encodeURIComponent(siteUrl)}&apikey=${encodeURIComponent(apiKey.trim())}`
    const res = await http.get(url)
    if (!res.ok) return []
    const data = await res.json()
    const list = data?.d || []
    return list.map((q: any) => ({
      query: q.Query,
      clicks: q.Clicks || 0,
      impressions: q.Impressions || 0,
      avgClickPosition: q.AvgClickPosition || 0,
      avgImpressionPosition: q.AvgImpressionPosition || 0,
      date: q.Date,
    }))
  },

  getQuota: async (apiKey: string, siteUrl: string): Promise<BingQuota | null> => {
    try {
      const url = `${BING_BASE}/GetUrlSubmissionQuota?siteUrl=${encodeURIComponent(siteUrl)}&apikey=${encodeURIComponent(apiKey.trim())}`
      const res = await http.get(url)
      if (!res.ok) return null
      const data = await res.json()
      if (data?.d) {
        return {
          dailyQuota: data.d.DailyQuota || 0,
          monthlyQuota: data.d.MonthlyQuota || 0,
        }
      }
      return null
    } catch {
      return null
    }
  },

  submitUrls: async (apiKey: string, siteUrl: string, urls: string[]): Promise<{ success: boolean; message: string }> => {
    const cleanList = urls.map((u) => u.trim()).filter((u) => u.length > 0)
    if (cleanList.length === 0) {
      return { success: false, message: 'Danh sách URL trống' }
    }

    if (cleanList.length === 1) {
      const url = `${BING_BASE}/SubmitUrl?apikey=${encodeURIComponent(apiKey.trim())}`
      const res = await http.post(url, {
        siteUrl,
        url: cleanList[0],
      })
      if (!res.ok) {
        const text = await res.text()
        return { success: false, message: `Bing API lỗi (${res.status}): ${text}` }
      }
      return { success: true, message: `Đã submit 1 URL tới Bing Bot thành công!` }
    } else {
      const url = `${BING_BASE}/SubmitUrlBatch?apikey=${encodeURIComponent(apiKey.trim())}`
      const res = await http.post(url, {
        siteUrl,
        urlList: cleanList,
      })
      if (!res.ok) {
        const text = await res.text()
        return { success: false, message: `Bing API lỗi (${res.status}): ${text}` }
      }
      return { success: true, message: `Đã submit hàng loạt ${cleanList.length} URLs tới Bing Bot thành công!` }
    }
  },
}
