import { http } from '../../lib/http'

export interface BaiduPushResult {
  success: boolean
  message: string
  remain?: number
  pushedCount?: number
}

export const baiduApi = {
  pushUrls: async (siteUrl: string, token: string, urls: string[]): Promise<BaiduPushResult> => {
    const cleanUrls = urls
      .map((u) => u.trim())
      .filter((u) => u.startsWith('http://') || u.startsWith('https://'))

    if (cleanUrls.length === 0) {
      return { success: false, message: 'Không tìm thấy URL hợp lệ để gửi tới Baidu' }
    }

    const endpoint = `http://data.zz.baidu.com/urls?site=${encodeURIComponent(siteUrl.trim())}&token=${encodeURIComponent(token.trim())}`
    const payload = cleanUrls.join('\n')

    try {
      const res = await http.post(endpoint, payload, {
        'Content-Type': 'text/plain',
      })

      const data = await res.json()

      if (data.error) {
        return {
          success: false,
          message: `Baidu lỗi (${data.error}): ${data.message || 'Token hoặc Site không hợp lệ'}`,
        }
      }

      const pushedCount = data.success ?? cleanUrls.length
      const remain = data.remain ?? 0

      return {
        success: true,
        message: `Đã push thành công ${pushedCount} URL tới Baidu Bot! Còn lại ${remain.toLocaleString()} lượt hôm nay.`,
        remain,
        pushedCount,
      }
    } catch (e: any) {
      return { success: false, message: `Lỗi kết nối Baidu Push API: ${e.message}` }
    }
  },
}
