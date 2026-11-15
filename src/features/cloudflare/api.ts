import { http } from '../../lib/http'
import { CloudflareAccount, CloudflareZone, CloudflareDnsRecord } from '../../types'

const BASE_URL = 'https://api.cloudflare.com/client/v4'

const getHeaders = (account: CloudflareAccount) => ({
  'X-Auth-Email': account.email.trim(),
  'X-Auth-Key': account.apiKey.trim(),
  'Content-Type': 'application/json',
})

export const cfApi = {
  getZones: async (account: CloudflareAccount): Promise<CloudflareZone[]> => {
    let allZones: CloudflareZone[] = []
    let page = 1

    while (page <= 5) {
      const res = await http.get(`${BASE_URL}/zones?per_page=50&page=${page}`, getHeaders(account))
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.errors?.[0]?.message || `Lỗi tải zones từ account ${account.name} (${res.status})`)
      }

      const data = await res.json()
      if (!data.success || !Array.isArray(data.result) || data.result.length === 0) break

      const zonesWithAccount = data.result.map((z: any) => ({
        ...z,
        account: {
          id: account.id,
          name: account.name,
        },
      }))

      allZones = [...allZones, ...zonesWithAccount]
      if (data.result.length < 50) break
      page++
    }

    return allZones
  },

  getDnsRecords: async (account: CloudflareAccount, zoneId: string): Promise<CloudflareDnsRecord[]> => {
    const res = await http.get(`${BASE_URL}/zones/${zoneId}/dns_records?per_page=100`, getHeaders(account))
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.errors?.[0]?.message || `Lỗi tải DNS records (${res.status})`)
    }

    const data = await res.json()
    if (!data.success) throw new Error('Không thể tải DNS records')
    return data.result
  },

  createDnsRecord: async (
    account: CloudflareAccount,
    zoneId: string,
    record: { type: string; name: string; content: string; ttl: number; proxied: boolean }
  ) => {
    const res = await http.post(`${BASE_URL}/zones/${zoneId}/dns_records`, record, getHeaders(account))
    const data = await res.json()
    if (!data.success) {
      throw new Error(data.errors?.[0]?.message || 'Lỗi tạo DNS record')
    }
    return data.result
  },

  updateDnsRecord: async (
    account: CloudflareAccount,
    zoneId: string,
    recordId: string,
    record: { type: string; name: string; content: string; ttl: number; proxied: boolean }
  ) => {
    const res = await http.put(`${BASE_URL}/zones/${zoneId}/dns_records/${recordId}`, record, getHeaders(account))
    const data = await res.json()
    if (!data.success) {
      throw new Error(data.errors?.[0]?.message || 'Lỗi cập nhật DNS record')
    }
    return data.result
  },

  deleteDnsRecord: async (account: CloudflareAccount, zoneId: string, recordId: string) => {
    const res = await http.delete(`${BASE_URL}/zones/${zoneId}/dns_records/${recordId}`, undefined, getHeaders(account))
    const data = await res.json()
    if (!data.success) {
      throw new Error(data.errors?.[0]?.message || 'Lỗi xóa DNS record')
    }
    return true
  },
}
