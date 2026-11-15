import * as jose from 'jose'
import { http } from '../../lib/http'
import { GSCAccount, GSCProperty, GSCDailyMetric, GSCQueryMetric, GSCPageMetric } from '../../types'

export const gscApi = {
  /**
   * Sinh OAuth2 Access Token từ Google Service Account JSON Key bằng Web Crypto (jose)
   */
  getAccessTokenFromServiceAccount: async (clientEmail: string, privateKeyPem: string): Promise<string> => {
    try {
      // Clean up PEM key formatting
      const cleanKey = privateKeyPem
        .replace(/\\n/g, '\n')
        .replace(/-----BEGIN PRIVATE KEY-----/, '')
        .replace(/-----END PRIVATE KEY-----/, '')
        .replace(/\s+/g, '')

      const binaryDerString = atob(cleanKey)
      const binaryDer = new Uint8Array(binaryDerString.length)
      for (let i = 0; i < binaryDerString.length; i++) {
        binaryDer[i] = binaryDerString.charCodeAt(i)
      }

      const importedKey = await crypto.subtle.importKey(
        'pkcs8',
        binaryDer.buffer,
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: 'SHA-256',
        },
        false,
        ['sign']
      )

      const now = Math.floor(Date.now() / 1000)
      const jwt = await new jose.SignJWT({
        scope: 'https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/webmasters',
      })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
        .setIssuer(clientEmail)
        .setAudience('https://oauth2.googleapis.com/token')
        .setIssuedAt(now)
        .setExpirationTime(now + 3600)
        .sign(importedKey)

      const res = await http.post(
        'https://oauth2.googleapis.com/token',
        new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
        { 'Content-Type': 'application/x-www-form-urlencoded' }
      )

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error_description || `Google OAuth lỗi (${res.status})`)
      }

      const data = await res.json()
      return data.access_token
    } catch (e: any) {
      throw new Error(`Xác thực Service Account thất bại: ${e.message}`)
    }
  },

  /**
   * Lấy danh sách website thuộc quyền quản lý trong GSC
   */
  getSites: async (accessToken: string) => {
    const res = await http.get('https://www.googleapis.com/webmasters/v3/sites', {
      Authorization: `Bearer ${accessToken}`,
    })

    if (!res.ok) {
      throw new Error(`GSC Sites API lỗi (${res.status})`)
    }

    const data = await res.json()
    return data.siteEntry || []
  },

  /**
   * Truy vấn số liệu thống kê (Clicks, Impressions, CTR, Position, Top Queries, Top Pages)
   */
  getPerformance: async (accessToken: string, siteUrl: string, days = 28) => {
    const end = new Date()
    end.setDate(end.getDate() - 2) // GSC lag 2-3 ngày
    const start = new Date()
    start.setDate(start.getDate() - (days + 2))

    const startDate = start.toISOString().split('T')[0]
    const endDate = end.toISOString().split('T')[0]

    const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`

    const [dailyRes, queriesRes, pagesRes] = await Promise.all([
      // 1. Daily Trend
      http.post(
        endpoint,
        {
          startDate,
          endDate,
          dimensions: ['date'],
          rowLimit: 1000,
        },
        { Authorization: `Bearer ${accessToken}` }
      ),
      // 2. Top Queries
      http.post(
        endpoint,
        {
          startDate,
          endDate,
          dimensions: ['query'],
          rowLimit: 50,
        },
        { Authorization: `Bearer ${accessToken}` }
      ),
      // 3. Top Pages
      http.post(
        endpoint,
        {
          startDate,
          endDate,
          dimensions: ['page'],
          rowLimit: 50,
        },
        { Authorization: `Bearer ${accessToken}` }
      ),
    ])

    const dailyData = await dailyRes.json().catch(() => ({}))
    const queryData = await queriesRes.json().catch(() => ({}))
    const pageData = await pagesRes.json().catch(() => ({}))

    const dailyMetrics: GSCDailyMetric[] = (dailyData.rows || []).map((r: any) => ({
      date: r.keys?.[0] || '',
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr ? parseFloat((r.ctr * 100).toFixed(2)) : 0,
      position: r.position ? parseFloat(r.position.toFixed(1)) : 0,
    }))

    const queryMetrics: GSCQueryMetric[] = (queryData.rows || []).map((r: any) => ({
      query: r.keys?.[0] || '',
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr ? parseFloat((r.ctr * 100).toFixed(2)) : 0,
      position: r.position ? parseFloat(r.position.toFixed(1)) : 0,
    }))

    const pageMetrics: GSCPageMetric[] = (pageData.rows || []).map((r: any) => ({
      page: r.keys?.[0] || '',
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr ? parseFloat((r.ctr * 100).toFixed(2)) : 0,
      position: r.position ? parseFloat(r.position.toFixed(1)) : 0,
    }))

    // Tổng hợp tổng thể
    const totalClicks = dailyMetrics.reduce((sum, d) => sum + d.clicks, 0)
    const totalImpressions = dailyMetrics.reduce((sum, d) => sum + d.impressions, 0)
    const avgCtr = totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0
    const avgPosition =
      dailyMetrics.length > 0
        ? parseFloat((dailyMetrics.reduce((sum, d) => sum + d.position, 0) / dailyMetrics.length).toFixed(1))
        : 0

    return {
      clicks: totalClicks,
      impressions: totalImpressions,
      ctr: avgCtr,
      position: avgPosition,
      dailyMetrics,
      queryMetrics,
      pageMetrics,
    }
  },
}
