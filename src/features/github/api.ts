import { http } from '../../lib/http'
import { GitHubUser, GitHubRepo } from '../../types'

const getHeaders = (token: string) => ({
  Accept: 'application/vnd.github.v3+json',
  Authorization: `Bearer ${token.trim()}`,
})

export const githubApi = {
  getProfile: async (token: string): Promise<GitHubUser> => {
    const res = await http.get('https://api.github.com/user', getHeaders(token))
    if (!res.ok) {
      throw new Error(`Xác thực thất bại (${res.status}): Kiểm tra lại Personal Access Token.`)
    }
    return res.json()
  },

  getRepos: async (token: string): Promise<GitHubRepo[]> => {
    let allRepos: GitHubRepo[] = []
    let page = 1
    const perPage = 100

    while (page <= 5) {
      const url = `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&affiliation=owner,collaborator,organization_member&sort=updated`
      const res = await http.get(url, getHeaders(token))
      if (!res.ok) break

      const data: GitHubRepo[] = await res.json()
      if (!Array.isArray(data) || data.length === 0) break

      allRepos = [...allRepos, ...data]
      if (data.length < perPage) break
      page++
    }

    return allRepos
  },

  getRepoStats: async (token: string, owner: string, repo: string) => {
    try {
      const [branchesRes, commitsRes] = await Promise.all([
        http.get(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=1`, getHeaders(token)),
        http.get(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`, getHeaders(token)),
      ])

      const parseLinkHeader = (linkHeader: string | null) => {
        if (!linkHeader) return 1
        const match = linkHeader.match(/page=(\d+)>; rel="last"/)
        return match ? parseInt(match[1], 10) : 1
      }

      const branchesCount = parseLinkHeader(branchesRes.headers.get('link'))
      const commitsCount = parseLinkHeader(commitsRes.headers.get('link'))

      return {
        branches: branchesCount,
        commits: commitsCount,
      }
    } catch {
      return { branches: 1, commits: 1 }
    }
  },

  renameRepo: async (token: string, owner: string, oldName: string, newName: string) => {
    const res = await http.patch(
      `https://api.github.com/repos/${owner}/${oldName}`,
      { name: newName },
      getHeaders(token)
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Lỗi đổi tên repository (${res.status})`)
    }
    return res.json()
  },

  deleteRepo: async (token: string, owner: string, repoName: string) => {
    const res = await http.delete(
      `https://api.github.com/repos/${owner}/${repoName}`,
      undefined,
      getHeaders(token)
    )
    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Lỗi xóa repository (${res.status})`)
    }
    return true
  },

  getTrending: async (timeframe: 'daily' | 'weekly' | 'monthly', query = '') => {
    const now = new Date()
    const days = timeframe === 'daily' ? 1 : timeframe === 'weekly' ? 7 : 30
    now.setDate(now.getDate() - days)
    const dateStr = now.toISOString().split('T')[0]

    const q = query ? `${query} created:>${dateStr}` : `stars:>10 created:>${dateStr}`
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=30`
    
    const res = await http.get(url, {
      Accept: 'application/vnd.github.v3+json',
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.items || []
  },
}
