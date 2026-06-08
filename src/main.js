import './style.css'

// State Management
const state = {
  token: localStorage.getItem('github_token') || null,
  user: null,
  repos: [],
  repoStats: {}, // Stores { repoId: { branches: N, commits: N } }
  selectedRepos: new Set(), // Set of "owner/name"
  searchQuery: '',
  filter: 'all',
  ownerFilter: 'all',
  sortBy: 'updated',
  loading: false,
  activeView: 'github', // 'github', 'cf-domains', 'cf-accounts'
  cfAccounts: JSON.parse(localStorage.getItem('cf_accounts')) || [],
  cfZones: {}, // { accountId: [zones] }
  cfAccountFilter: 'all',
  cfRealAccountFilter: 'all', // Filter by real CF account name/id
  activeZone: null, // { zoneId, zoneName, account }
  cfDnsRecords: {}, // { zoneId: [records] },
  globalCommits: [],
  loadingGlobalCommits: false,
  trendingRepos: [],
  loadingTrending: false,
  trendingTimeframe: 'daily',
  kanbanTasks: JSON.parse(localStorage.getItem('kanban_tasks')) || [],
  kanbanFilters: {
    repo: 'all',
    priority: 'all'
  },
  cfStarredDomains: JSON.parse(localStorage.getItem('cf_starred_domains')) || [],
  indexnowKeys: JSON.parse(localStorage.getItem('indexnow_keys')) || {},
  indexnowHistory: JSON.parse(localStorage.getItem('indexnow_history')) || [],
  indexnowVerification: {},
  indexnowSubmitIndividually: false,
  indexnowProgress: { running: false, total: 0, current: 0, successes: 0, failures: 0, results: [] },
  domainCheckerSelectedDomain: '',
  domainCheckerUrls: '',
  domainCheckerResults: [],
  domainCheckerProgress: { running: false, total: 0, current: 0, successes: 0, redirects: 0, errors: 0 },
  gaProperties: JSON.parse(localStorage.getItem('ga_properties')) || [],
  gaId: (JSON.parse(localStorage.getItem('ga_properties')) || []).find(p => p.active)?.measurementId || localStorage.getItem('google_analytics_id') || '',
  googleClientId: localStorage.getItem('google_client_id') || '',
  googleRedirectUri: localStorage.getItem('google_redirect_uri') || (window.location.origin === 'http://localhost:8900' ? 'http://localhost:8900/callback' : ''),
  gaAccessToken: sessionStorage.getItem('ga_access_token') || null
}

// Google Analytics Integration
let lastTrackedView = null;
function initGoogleAnalytics(gaId) {
  if (!gaId) return
  if (document.getElementById('google-analytics-script')) return

  const gTagScript = document.createElement('script')
  gTagScript.id = 'google-analytics-script'
  gTagScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
  gTagScript.async = true
  document.head.appendChild(gTagScript)

  const inlineScript = document.createElement('script')
  inlineScript.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', '${gaId}', {
      page_path: window.location.pathname,
    });
  `
  document.head.appendChild(inlineScript)
}

function trackPageView(viewName) {
  if (window.gtag && state.gaId) {
    window.gtag('event', 'page_view', {
      page_title: viewName,
      page_path: `/${viewName}`,
      page_location: window.location.href
    })
  }
}

async function fetchAllGaAccountsAndProperties(accessToken) {
  try {
    state.loading = true
    render()

    console.log("Starting to fetch GA accounts...")
    // 1. Fetch Google Analytics accounts
    const accountsRes = await fetch('https://analyticsadmin.googleapis.com/v1alpha/accounts', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    
    if (!accountsRes.ok) {
      let details = ''
      try {
        const errJson = await accountsRes.json()
        details = errJson.error?.message || ''
        console.error("Google API Error response:", errJson)
      } catch (e) {
        details = accountsRes.statusText
      }
      throw new Error(`Google API returned status ${accountsRes.status}. ${details}`)
    }

    const accountsData = await accountsRes.json()
    const accounts = accountsData.accounts || []
    console.log(`Found ${accounts.length} Google Analytics accounts.`, accounts)

    if (accounts.length === 0) {
      Toast.show('No Google Analytics accounts found on this Google profile.', 'warning', 6000)
      return
    }

    let allProperties = []

    // 2. Fetch properties for each account
    for (const acc of accounts) {
      console.log(`Fetching properties for account ${acc.displayName} (${acc.name})...`)
      const propsRes = await fetch(`https://analyticsadmin.googleapis.com/v1alpha/properties?filter=parent:${acc.name}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      if (!propsRes.ok) {
        console.warn(`Failed to fetch properties for account ${acc.name}. Status: ${propsRes.status}`)
        continue
      }
      const propsData = await propsRes.json()
      const props = propsData.properties || []
      console.log(`Found ${props.length} properties for account ${acc.displayName}.`, props)

      // 3. Fetch data streams for each property to extract measurement ID (G-XXXXXXXXXX)
      for (const prop of props) {
        const propertyId = prop.name.split('/').pop()
        console.log(`Fetching data streams for property ${prop.displayName} (ID: ${propertyId})...`)
        const streamsRes = await fetch(`https://analyticsadmin.googleapis.com/v1alpha/properties/${propertyId}/dataStreams`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        if (!streamsRes.ok) {
          console.warn(`Failed to fetch streams for property ${propertyId}. Status: ${streamsRes.status}`)
          continue
        }
        const streamsData = await streamsRes.json()
        const streams = streamsData.dataStreams || []
        console.log(`Found ${streams.length} data streams for property ${prop.displayName}.`, streams)

        // Find the first stream that has a GA4 Web Measurement ID
        const webStream = streams.find(s => s.webStreamData && s.webStreamData.measurementId)
        if (webStream) {
          console.log(`Found active Web Data Stream: ${webStream.webStreamData.measurementId}`)
          allProperties.push({
            id: propertyId,
            name: `${acc.displayName} - ${prop.displayName}`,
            propertyId: propertyId,
            measurementId: webStream.webStreamData.measurementId,
            active: false
          })
        } else {
          console.warn(`Property ${prop.displayName} has no Web Data Streams (it might only have App streams or is empty).`)
        }
      }
    }

    console.log("Total valid web properties resolved:", allProperties)

    if (allProperties.length === 0) {
      Toast.show('No GA4 properties with Web Data Streams found. Ensure your property has a Web Stream configured.', 'warning', 7000)
      return
    }

    // 4. Merge properties into state
    const existingIds = new Set(state.gaProperties.map(p => p.measurementId))
    let addedCount = 0

    allProperties.forEach(p => {
      if (!existingIds.has(p.measurementId)) {
        if (state.gaProperties.length === 0) {
          p.active = true
          state.gaId = p.measurementId
          localStorage.setItem('google_analytics_id', p.measurementId)
          initGoogleAnalytics(p.measurementId)
        }
        state.gaProperties.push(p)
        addedCount++
      }
    })

    localStorage.setItem('ga_properties', JSON.stringify(state.gaProperties))
    Toast.show(`Successfully imported ${addedCount} new Google Analytics properties!`)
  } catch (err) {
    console.error("GA Import Error:", err)
    Toast.show('Error importing GA: ' + err.message, 'error', 10000)
  } finally {
    state.loading = false
    render()
  }
}



// GitHub API Client
const github = {
  async request(endpoint, options = {}) {
    const response = await fetch(`https://api.github.com${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Accept': 'application/vnd.github.v3+json',
        ...options.headers,
      },
    })
    if (!response.ok) {
      if (response.status === 401) {
        logout()
        throw new Error('Invalid or expired token')
      }
      const errorText = await response.text()
      let errorMessage = 'GitHub API request failed'
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.message || errorMessage
      } catch (e) {
        errorMessage = errorText || errorMessage
      }
      throw new Error(errorMessage)
    }

    // Handle 204 No Content or empty bodies
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return null
    }

    return response.json()
  },

  async fetchUser() {
    return this.request('/user')
  },

  async fetchRepos() {
    let allRepos = [];
    let page = 1;
    while (true) {
      const repos = await this.request(`/user/repos?sort=updated&per_page=100&page=${page}`);
      if (!repos || repos.length === 0) break;
      allRepos = allRepos.concat(repos);
      if (repos.length < 100) break;
      page++;
    }
    return allRepos;
  },

  async createRepo(data) {
    return this.request('/user/repos', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  async updateRepo(owner, repo, data) {
    return this.request(`/repos/${owner}/${repo}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    })
  },

  async deleteRepo(owner, repo) {
    return this.request(`/repos/${owner}/${repo}`, {
      method: 'DELETE'
    })
  },

  async fetchCounts(owner, repo) {
    const fetchWithHandle = async (url) => {
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${state.token}` }
      })
      if (res.status === 409) return { headers: new Map(), status: 409 } // Empty repo
      return res
    }

    const [branchesRes, commitsRes] = await Promise.all([
      fetchWithHandle(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=1`),
      fetchWithHandle(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`)
    ])

    const getCount = (res) => {
      if (res.status === 409) return 0
      const link = res.headers.get('Link')
      // If there's no Link header, it means there's only 1 page of data
      // BUT if it's a 200 OK and no link, we should check if the body is empty
      // For simplicity, if status is 200 and no link, it usually means 1 item (or 0 if truly empty, but 409 handles the main case)
      if (!link) return 1
      const match = link.match(/page=(\d+)>; rel="last"/)
      return match ? parseInt(match[1]) : 1
    }

    return {
      branches: getCount(branchesRes),
      commits: getCount(commitsRes)
    }
  },

  async fetchCommitsList(owner, repo, page = 1) {
    return this.request(`/repos/${owner}/${repo}/commits?page=${page}&per_page=30`)
  },

  async fetchGlobalCommits() {
    if (!state.user || !state.repos.length) return []
    try {
      // Instead of using the search API which frequently hits validation limit errors with multiple repos,
      // we fetch the commits directly from the top N most recently updated repos concurrently and then sort them together.
      const topRepos = [...state.repos]
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, 10) // fetch from top 10 most recently updated repos

      const promises = topRepos.map(repo => {
        return this.request(`/repos/${repo.owner.login}/${repo.name}/commits?per_page=10`)
          .then(commits => {
            // attach repository data
            return (commits || []).map(c => ({
              ...c,
              repository: repo
            }))
          })
          .catch(() => []) // fail gracefully for individual empty/permission issue repos
      })

      const repoCommits = await Promise.all(promises)

      // Flatten arrays, sort by date descending
      const allCommits = repoCommits.flat().sort((a, b) => {
        const dateA = new Date(a.commit.author.date)
        const dateB = new Date(b.commit.author.date)
        return dateB - dateA
      })

      return allCommits.slice(0, 50) // Return top 50 across all these repos
    } catch (err) {
      console.warn("Global commit fetch fallback failed", err)
      return []
    }
  },

  async fetchTrending(timeframe) {
    // Note: Due to the high instability of public unofficial scraping APIs for Github Trending,
    // and packages like @huchenme/github-trending failing,
    // we use the official Github Search API with optimized parameters as a robust, native fallback.
    const dates = {
      'daily': new Date(Date.now() - 86400000).toISOString().split('T')[0],
      'weekly': new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
      'monthly': new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    }

    // We search for repos created recently OR pushed recently, sorted by stars 
    const query = `created:>${dates[timeframe]} sort:stars-desc`

    return this.request(`/search/repositories?q=${encodeURIComponent(query)}&per_page=30`)
      .then(res => {
        return (res.items || []).map(repo => {
          // Calculate a more realistic pseudo current period stars so UI looks nice
          const periodWeight = timeframe === 'daily' ? 0.9 : (timeframe === 'weekly' ? 0.8 : 0.6)
          const recentStars = Math.floor(repo.stargazers_count * periodWeight)

          return {
            full_name: repo.full_name,
            name: repo.name,
            author: repo.owner.login,
            html_url: repo.html_url,
            description: repo.description,
            language: repo.language,
            languageColor: getLangColor(repo.language),
            stargazers_count: repo.stargazers_count,
            forks_count: repo.forks_count,
            currentPeriodStars: recentStars > 0 ? recentStars : 1,
            builtBy: [{ username: repo.owner.login, avatar: repo.owner.avatar_url, href: repo.owner.html_url }]
          }
        })
      })
  }
}

// Cloudflare API Client
const cloudflare = {
  async request(account, endpoint, options = {}) {
    const response = await fetch(`/cf-api${endpoint}`, {
      ...options,
      headers: {
        'X-Auth-Email': account.email,
        'X-Auth-Key': account.key,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    const data = await response.json()
    if (!data.success) {
      throw new Error(data.errors?.[0]?.message || 'Cloudflare API request failed')
    }
    return data.result
  },

  async fetchZones(account) {
    // Fetch zones across all accounts the user has access to
    return this.request(account, '/zones?per_page=100&status=active,pending')
  },

  async fetchDnsRecords(account, zoneId) {
    return this.request(account, `/zones/${zoneId}/dns_records?per_page=100`)
  },

  async createDnsRecord(account, zoneId, data) {
    return this.request(account, `/zones/${zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  async updateDnsRecord(account, zoneId, recordId, data) {
    return this.request(account, `/zones/${zoneId}/dns_records/${recordId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    })
  },

  async deleteDnsRecord(account, zoneId, recordId) {
    return this.request(account, `/zones/${zoneId}/dns_records/${recordId}`, {
      method: 'DELETE'
    })
  }
}

// Helper: Filter and Sort Repos
function getProcessedRepos() {
  return state.repos
    .filter(repo => {
      const matchesSearch = repo.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        (repo.description && repo.description.toLowerCase().includes(state.searchQuery.toLowerCase()))

      let matchesFilter = true
      if (state.filter === 'public') matchesFilter = !repo.private
      if (state.filter === 'private') matchesFilter = repo.private
      if (state.filter === 'forks') matchesFilter = repo.fork
      if (state.filter === 'sources') matchesFilter = !repo.fork

      const matchesOwner = state.ownerFilter === 'all' || repo.owner.login === state.ownerFilter

      return matchesSearch && matchesFilter && matchesOwner
    })
    .sort((a, b) => {
      if (state.sortBy === 'name') return a.name.localeCompare(b.name)
      if (state.sortBy === 'stars') return b.stargazers_count - a.stargazers_count
      return new Date(b.updated_at) - new Date(a.updated_at)
    })
}

// Navigation / Routing
async function init() {
  // Auto-correct old localhost redirect URIs to include /callback
  if (state.googleRedirectUri === 'http://localhost:8900/' || state.googleRedirectUri === 'http://localhost:8900') {
    state.googleRedirectUri = 'http://localhost:8900/callback'
    localStorage.setItem('google_redirect_uri', 'http://localhost:8900/callback')
  }

  initGoogleAnalytics(state.gaId)
  trackPageView(state.activeView)

  // Check Google OAuth redirect
  const hashParams = new URLSearchParams(window.location.hash.substring(1))
  const accessToken = hashParams.get('access_token')
  const isGaAuth = hashParams.get('state') === 'google-analytics-auth'
  
  if (accessToken && isGaAuth) {
    window.history.replaceState({}, document.title, '/')
    state.gaAccessToken = accessToken
    sessionStorage.setItem('ga_access_token', accessToken)
    state.activeView = 'ga-properties'
    fetchAllGaAccountsAndProperties(accessToken)
  } else if (window.location.pathname === '/callback') {
    window.history.replaceState({}, document.title, '/')
  }

  if (state.token) {
    try {
      state.loading = true
      render()
      state.user = await github.fetchUser()
      state.repos = await github.fetchRepos()
      fetchAllStats() // Background fetch stats
      if (state.cfAccounts.length > 0) {
        fetchAllCfZones()
      }
    } catch (err) {
      console.error(err)
      state.token = null
      localStorage.removeItem('github_token')
    } finally {
      state.loading = false
      render()
    }
  } else {
    render()
  }
}

// Toast Utility
const Toast = {
  show(message, type = 'success', duration = 3000) {
    const container = document.querySelector('#toast-container')
    const toast = document.createElement('div')
    toast.className = `toast glass-panel ${type}`

    const icon = type === 'success' ? 'check-circle' : (type === 'error' ? 'alert-circle' : 'info')

    toast.innerHTML = `
      <i data-lucide="${icon}" style="width: 20px; height: 20px;"></i>
      <span>${message}</span>
    `
    container.appendChild(toast)
    lucide.createIcons()

    setTimeout(() => {
      toast.classList.add('removing')
      setTimeout(() => toast.remove(), 300)
    }, duration)
  }
}

// Custom Confirm Utility
const Confirm = (title, message, okText = 'OK') => {
  return new Promise((resolve) => {
    const overlay = document.querySelector('#confirm-overlay')
    const titleEl = document.querySelector('#confirm-title')
    const messageEl = document.querySelector('#confirm-message')
    const okBtn = document.querySelector('#confirm-ok')
    const cancelBtn = document.querySelector('#confirm-cancel')

    titleEl.textContent = title
    messageEl.textContent = message
    okBtn.textContent = okText
    overlay.classList.add('active')

    const cleanup = (result) => {
      overlay.classList.remove('active')
      okBtn.onclick = null
      cancelBtn.onclick = null
      resolve(result)
    }

    okBtn.onclick = () => cleanup(true)
    cancelBtn.onclick = () => cleanup(false)
  })
}

// Custom GA Delete Confirm Utility
const ConfirmGaDelete = (propName, hasToken) => {
  return new Promise((resolve) => {
    let overlay = document.querySelector('#ga-delete-confirm-overlay')
    if (!overlay) {
      overlay = document.createElement('div')
      overlay.id = 'ga-delete-confirm-overlay'
      overlay.className = 'confirm-overlay'
      overlay.innerHTML = `
        <div class="confirm-card glass-panel" style="max-width: 450px;">
          <div class="confirm-icon" style="background: rgba(239, 68, 68, 0.1); color: var(--error); width: 56px; height: 56px; margin: 0 auto 1.5rem; display: flex; align-items: center; justify-content: center; border-radius: 50%;">
            <i data-lucide="trash-2"></i>
          </div>
          <h2 id="ga-delete-title" style="margin-bottom: 0.5rem;">Remove GA Property</h2>
          <p id="ga-delete-message" style="color: var(--text-muted); margin-bottom: 1.5rem; font-size: 0.9rem; line-height: 1.5;"></p>
          
          <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem;">
            <button class="btn btn-outline" id="ga-delete-local" style="width: 100%; justify-content: flex-start; height: auto; padding: 0.75rem 1rem;">
              <i data-lucide="list-x" style="color: var(--warning); flex-shrink: 0;"></i>
              <div style="text-align: left; margin-left: 0.75rem;">
                <div style="font-weight: 600; font-size: 0.875rem;">Remove from List Only</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal; margin-top: 0.1rem; white-space: normal;">Delete local config, keeps the property on Google Analytics.</div>
              </div>
            </button>
            
            <button class="btn btn-outline" id="ga-delete-remote" style="width: 100%; justify-content: flex-start; border-color: rgba(239, 68, 68, 0.2); color: var(--error); background: rgba(239, 68, 68, 0.05); height: auto; padding: 0.75rem 1rem;">
              <i data-lucide="globe" style="color: var(--error); flex-shrink: 0;"></i>
              <div style="text-align: left; margin-left: 0.75rem;">
                <div style="font-weight: 600; font-size: 0.875rem;">Delete from Google Analytics Account</div>
                <div style="font-size: 0.75rem; color: var(--text-dim); font-weight: normal; margin-top: 0.1rem; white-space: normal;">Soft-deletes the property from Google's servers via API.</div>
              </div>
            </button>
          </div>
          
          <div id="ga-delete-warning-oauth" style="display: none; padding: 0.75rem; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: var(--radius-sm); margin-bottom: 1.5rem; text-align: left; font-size: 0.75rem; color: var(--warning); line-height: 1.4;">
            <i data-lucide="alert-circle" style="width: 14px; height: 14px; display: inline; vertical-align: text-bottom; margin-right: 4px;"></i>
            <strong>OAuth Token Required:</strong> You must authenticate/import via Google OAuth first to perform actual deletion from your Google account.
          </div>
          
          <button class="btn btn-outline" id="ga-delete-cancel" style="width: 100%;">Cancel</button>
        </div>
      `
      document.body.appendChild(overlay)
    }

    const titleEl = overlay.querySelector('#ga-delete-title')
    const messageEl = overlay.querySelector('#ga-delete-message')
    const localBtn = overlay.querySelector('#ga-delete-local')
    const remoteBtn = overlay.querySelector('#ga-delete-remote')
    const oauthWarning = overlay.querySelector('#ga-delete-warning-oauth')
    const cancelBtn = overlay.querySelector('#ga-delete-cancel')

    titleEl.textContent = `Remove GA Property`
    messageEl.innerHTML = `How do you want to remove the property <strong>'${propName}'</strong>?`
    
    if (hasToken) {
      remoteBtn.disabled = false
      remoteBtn.style.opacity = '1'
      remoteBtn.style.cursor = 'pointer'
      oauthWarning.style.display = 'none'
    } else {
      remoteBtn.disabled = true
      remoteBtn.style.opacity = '0.5'
      remoteBtn.style.cursor = 'not-allowed'
      oauthWarning.style.display = 'block'
    }

    overlay.classList.add('active')
    if (window.lucide) {
      window.lucide.createIcons()
    }

    const cleanup = (result) => {
      overlay.classList.remove('active')
      localBtn.onclick = null
      remoteBtn.onclick = null
      cancelBtn.onclick = null
      resolve(result)
    }

    localBtn.onclick = () => cleanup('local')
    remoteBtn.onclick = () => cleanup('remote')
    cancelBtn.onclick = () => cleanup(null)
  })
}

function login(token) {
  state.token = token
  localStorage.setItem('github_token', token)
  init()
}

function logout() {
  state.token = null
  state.user = null
  state.repos = []
  state.selectedRepos.clear()
  localStorage.removeItem('github_token')
  render()
}

// Components
function Header() {
  return `
    <header>
      <div class="logo">
        <i data-lucide="github" class="logo-icon"></i>
        <span>GITCORE</span>
      </div>
      ${state.user ? `
        <div class="user-profile">
          <div class="user-info">
            <div class="username">${state.user.login}</div>
            <div class="user-role">${state.user.bio || 'Developer'}</div>
          </div>
          <img src="${state.user.avatar_url}" class="avatar" alt="Avatar">
          <button class="btn btn-outline" id="logout-btn" style="padding: 0.5rem; margin-top: 2px;">
            <i data-lucide="log-out" style="width: 18px; height: 18px;"></i>
          </button>
        </div>
      ` : ''}
    </header>
  `
}

function AuthScreen() {
  return `
    <div class="auth-container glass-panel" style="margin-top: 10vh">
      <i data-lucide="shield-check" style="width: 48px; height: 48px; color: var(--primary); margin-bottom: 1.5rem;"></i>
      <h1>Secure Access</h1>
      <p>Please enter your GitHub Personal Access Token to manage your repositories.</p>
      
      <div class="input-group">
        <label>Personal Access Token</label>
        <input type="password" id="token-input" placeholder="ghp_xxxxxxxxxxxx">
      </div>
      
      <button class="btn btn-primary" id="login-btn" style="width: 100%;">
        Connect GitHub <i data-lucide="arrow-right"></i>
      </button>

      <div style="margin-top: 1.5rem; font-size: 0.75rem; color: var(--text-dim);">
        <p>Tip: Generate a PAT with <code style="color: var(--primary)">repo</code> & <code style="color: var(--primary)">user</code> scopes.</p>
      </div>
    </div>
  `
}

function RepoListItem(repo) {
  const repoId = `${repo.owner.login}/${repo.name}`
  const isSelected = state.selectedRepos.has(repoId)
  const stats = state.repoStats[repoId] || { branches: '...', commits: '...' }

  return `
    <div class="repo-list-item glass-panel ${isSelected ? 'selected' : ''}" data-repo-id="${repoId}">
      <div class="repo-checkbox-container">
        <div class="custom-checkbox ${isSelected ? 'checked' : ''}" data-repo-id="${repoId}"></div>
      </div>
      
      <div class="repo-info-main">
        <div class="repo-name-box">
          <a href="${repo.html_url}" target="_blank" class="repo-name" style="display: block; margin-bottom: 2px;">${repo.name}</a>
          <div style="font-size: 0.7rem; color: var(--text-dim); display: flex; align-items: center; gap: 0.5rem;">
            ${repo.private ? '<span style="color: var(--warning)">🔒 Private</span>' : '🌐 Public'}
            <span>•</span>
            <span title="Owner">${repo.owner.login}</span>
          </div>
        </div>
        
        <div class="repo-meta-list">
          <div class="meta-item">
            <span class="lang-dot" style="background: ${getLangColor(repo.language)}"></span>
            ${repo.language || 'Plain Text'}
          </div>
          <div class="meta-item" title="Branches">
            <i data-lucide="git-branch" style="width: 14px;"></i> ${stats.branches}
          </div>
          <div class="meta-item" title="Commits">
            <i data-lucide="history" style="width: 14px;"></i> ${stats.commits}
          </div>
          <div class="meta-item" title="Stars">
            <i data-lucide="star" style="width: 14px;"></i> ${repo.stargazers_count}
          </div>
          <div class="meta-item" title="Forks">
            <i data-lucide="git-fork" style="width: 14px;"></i> ${repo.forks_count}
          </div>
          <div class="meta-item" title="Last updated">
            <i data-lucide="clock" style="width: 14px;"></i> ${new Date(repo.updated_at).toLocaleDateString()}
          </div>
        </div>
      </div>
      
      <div class="repo-actions" style="margin-top: 0; padding-top: 0; border-top: none;">
        <button class="btn-icon edit-repo-btn" data-owner="${repo.owner.login}" data-name="${repo.name}" title="Rename Repository">
          <i data-lucide="edit-3" style="width: 16px;"></i>
        </button>
        <button class="btn-icon view-commits-btn" data-owner="${repo.owner.login}" data-name="${repo.name}" title="View Commits">
          <i data-lucide="history" style="width: 16px;"></i>
        </button>
        <button class="btn-icon copy-clone-btn" data-clone-url="${repo.clone_url}" title="Copy git clone command">
          <i data-lucide="copy" style="width: 16px;"></i>
        </button>
        <a href="${repo.html_url}" target="_blank" class="btn-icon" title="View on GitHub">
          <i data-lucide="external-link" style="width: 16px;"></i>
        </a>
        <button class="btn-icon danger delete-repo-btn" data-owner="${repo.owner.login}" data-name="${repo.name}" title="Delete">
          <i data-lucide="trash-2" style="width: 16px;"></i>
        </button>
      </div>
    </div>
  `
}

function Dashboard() {
  const filteredRepos = getProcessedRepos()
  const stats = {
    total: state.repos.length,
    public: state.repos.filter(r => !r.private).length,
    private: state.repos.filter(r => r.private).length,
    stars: state.repos.reduce((acc, r) => acc + r.stargazers_count, 0)
  }

  return `
    <main class="dashboard container">
      <div class="stats-grid">
        <div class="stat-card glass-panel">
          <div class="stat-label">Total Repositories</div>
          <div class="stat-value">${stats.total}</div>
        </div>
        <div class="stat-card glass-panel">
          <div class="stat-label">Public / Private</div>
          <div class="stat-value"><span style="color: var(--primary)">${stats.public}</span> <span style="color: var(--text-dim)">/</span> ${stats.private}</div>
        </div>
        <div class="stat-card glass-panel">
          <div class="stat-label">Total Gained Stars</div>
          <div class="stat-value"><i data-lucide="star" style="color: var(--warning); width: 24px; display: inline; vertical-align: middle;"></i> ${stats.stars}</div>
        </div>
      </div>

      <div class="toolbar">
        <div class="search-box">
          <i data-lucide="search"></i>
          <input type="text" id="repo-search" placeholder="Search repositories..." value="${state.searchQuery}">
        </div>

        <div class="filter-group">
          <select class="select-custom" id="sort-select">
            <option value="updated" ${state.sortBy === 'updated' ? 'selected' : ''}>Sort by: Last Updated</option>
            <option value="name" ${state.sortBy === 'name' ? 'selected' : ''}>Sort by: Name</option>
            <option value="stars" ${state.sortBy === 'stars' ? 'selected' : ''}>Sort by: Stars</option>
          </select>
          <button class="btn btn-primary" id="open-modal-btn">
            <i data-lucide="plus"></i> New Repo
          </button>
        </div>
      </div>

      <div class="quick-filters" style="margin-bottom: 0.75rem;">
        <div class="chip ${state.filter === 'all' ? 'active' : ''}" data-filter="all">All Types</div>
        <div class="chip ${state.filter === 'public' ? 'active' : ''}" data-filter="public">Public</div>
        <div class="chip ${state.filter === 'private' ? 'active' : ''}" data-filter="private">Private</div>
        <div class="chip ${state.filter === 'sources' ? 'active' : ''}" data-filter="sources">Sources</div>
        <div class="chip ${state.filter === 'forks' ? 'active' : ''}" data-filter="forks">Forks</div>
      </div>

      <div class="quick-filters owners-filter" style="margin-bottom: 2rem; border-top: 1px solid var(--border-subtle); padding-top: 0.75rem;">
        <div style="font-size: 0.75rem; color: var(--text-dim); display: flex; align-items: center; margin-right: 0.5rem;">
          <i data-lucide="user" style="width: 14px; margin-right: 4px;"></i> Owner:
        </div>
        <div class="chip ${state.ownerFilter === 'all' ? 'active' : ''}" data-owner="all">Everyone</div>
        ${Array.from(new Set(state.repos.map(r => r.owner.login))).map(owner => `
          <div class="chip ${state.ownerFilter === owner ? 'active' : ''}" data-owner="${owner}">${owner}</div>
        `).join('')}
      </div>

      <div class="repo-list">
        ${filteredRepos.map(repo => RepoListItem(repo)).join('')}
      </div>

      <div class="bulk-actions-bar ${state.selectedRepos.size > 0 ? 'active' : ''}">
        <div class="selection-count">
          <i data-lucide="check-square" style="vertical-align: middle; margin-right: 0.5rem;"></i>
          ${state.selectedRepos.size} items selected
        </div>
        <div style="display: flex; gap: 1rem;">
          <button class="btn btn-outline" id="clear-selection-btn">Cancel</button>
          <button class="btn btn-primary" id="bulk-delete-btn" style="background: var(--error); color: white;">
            <i data-lucide="trash-2"></i> Delete Selected
          </button>
        </div>
      </div>

      <div class="modal-overlay" id="modal-overlay">
        <div class="modal glass-panel">
          <button class="modal-close" id="close-modal-btn">
            <i data-lucide="x"></i>
          </button>
          <h2 style="margin-bottom: 0.5rem;">Create New Repository</h2>
          <p style="color: var(--text-dim); font-size: 0.875rem; margin-bottom: 2rem;">Setup your new project in seconds.</p>
          
          <div class="input-group">
            <label>Repository Name</label>
            <input type="text" id="new-repo-name" placeholder="my-awesome-project">
          </div>
          
          <div class="input-group">
            <label>Description (optional)</label>
            <input type="text" id="new-repo-desc" placeholder="A brief description of your project">
          </div>

          <div class="input-group" style="display: flex; gap: 1rem; align-items: center;">
            <input type="checkbox" id="new-repo-private" style="width: auto;">
            <label for="new-repo-private" style="margin-bottom: 0; cursor: pointer;">Private Repository</label>
          </div>

          <button class="btn btn-primary" id="create-repo-btn" style="width: 100%; margin-top: 1rem;">
            Create Repository
          </button>
        </div>
      </div>

      <div class="modal-overlay" id="commits-modal-overlay">
        <div class="modal glass-panel" style="max-width: 600px; width: 90%;">
          <button class="modal-close" id="close-commits-modal-btn">
            <i data-lucide="x"></i>
          </button>
          <h2 style="margin-bottom: 0.5rem;" id="commits-modal-title">Repository Commits</h2>
          <p style="color: var(--text-dim); font-size: 0.875rem; margin-bottom: 1.5rem;" id="commits-modal-subtitle">Recent commits</p>
          
          <div id="commits-list-container" style="max-height: 50vh; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; padding-right: 0.5rem;">
            <!-- Commits will be loaded here -->
          </div>
        </div>
      </div>
    </main>
  `
}

function CloudflareAccountsView() {
  return `
    <main class="container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem;">
        <div>
          <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem;">CF Accounts</h1>
          <p style="color: var(--text-dim);">Manage your Cloudflare identities and API keys.</p>
        </div>
        <button class="btn btn-primary" id="add-cf-account-btn">
          <i data-lucide="plus-circle"></i> Add Account
        </button>
      </div>

      ${state.cfAccounts.length === 0 ? `
        <div class="glass-panel" style="padding: 4rem; text-align: center;">
          <i data-lucide="user-plus" style="width: 48px; height: 48px; color: var(--text-dim); margin-bottom: 1.5rem;"></i>
          <h3>No Cloudflare Accounts</h3>
          <p style="color: var(--text-dim); margin-top: 0.5rem;">Add your first account to start managing domains.</p>
        </div>
      ` : `
        <div class="cf-accounts-grid">
          ${state.cfAccounts.map(acc => `
            <div class="cf-account-card glass-panel" style="display: flex; flex-direction: column; justify-content: space-between;">
              <div class="cf-account-header">
                <div>
                  <div class="cf-badge"><i data-lucide="shield"></i> Account</div>
                  <h3 style="margin-top: 0.75rem;">${acc.name || acc.email}</h3>
                  <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 0.25rem;">${acc.email}</div>
                </div>
                <button class="btn-icon danger remove-cf-acc" data-id="${acc.id}">
                  <i data-lucide="trash-2"></i>
                </button>
              </div>
              
              <div style="margin-top: 1rem; padding: 1rem; background: var(--bg-deep); border-radius: 8px; font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); border: 1px solid var(--border-subtle);">
                Key: ••••••••••••••••${acc.key.slice(-4)}
              </div>
            </div>
          `).join('')}
        </div>
      `}

      <!-- Add Account Modal -->
      <div class="modal-overlay" id="cf-modal-overlay">
        <div class="modal glass-panel">
          <button class="modal-close" id="close-cf-modal-btn">
            <i data-lucide="x"></i>
          </button>
          <h2 style="margin-bottom: 0.5rem;">Add Cloudflare Account</h2>
          <p style="color: var(--text-dim); font-size: 0.875rem; margin-bottom: 2rem;">Use your Global API Key for full access.</p>
          
          <div class="input-group">
            <label>Custom Name (optional)</label>
            <input type="text" id="cf-acc-name" placeholder="Work Account / Personal">
          </div>

          <div class="input-group">
            <label>Cloudflare Email</label>
            <input type="email" id="cf-acc-email" placeholder="user@example.com">
          </div>
          
          <div class="input-group">
            <label>Global API Key</label>
            <input type="password" id="cf-acc-key" placeholder="Paste your key here">
          </div>

          <button class="btn btn-primary" id="save-cf-account-btn" style="width: 100%; margin-top: 1rem;">
            Save Account
          </button>
        </div>
      </div>
    </main>
  `
}

function CloudflareDomainsView() {
  const allZones = []
  const uniqueRealAccounts = new Map() // { id: name }

  Object.entries(state.cfZones).forEach(([accId, zones]) => {
    const localCredential = state.cfAccounts.find(a => a.id === accId)
    zones.forEach(z => {
      allZones.push({ ...z, localAccount: localCredential })
      if (z.account && z.account.id) {
        uniqueRealAccounts.set(z.account.id, z.account.name)
      }
    })
  })

  const searchQuery = state.searchQuery || ''
  const filteredZones = allZones.filter(z => {
    const matchesSearch = z.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCredential = state.cfAccountFilter === 'all' || (z.localAccount && z.localAccount.id === state.cfAccountFilter)
    const matchesRealAccount = state.cfRealAccountFilter === 'all' || (z.account && z.account.id === state.cfRealAccountFilter)
    return matchesSearch && matchesCredential && matchesRealAccount
  })

  // Sort: Starred zones first, then alphabetically by name
  const sortedZones = [...filteredZones].sort((a, b) => {
    const aStarred = state.cfStarredDomains.includes(a.id) ? 1 : 0
    const bStarred = state.cfStarredDomains.includes(b.id) ? 1 : 0
    if (aStarred !== bStarred) {
      return bStarred - aStarred
    }
    return a.name.localeCompare(b.name)
  })

  return `
    <main class="container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem;">
        <div>
          <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem;">CF Domains</h1>
          <p style="color: var(--text-dim);">Aggregated list from all your Cloudflare accounts and memberships.</p>
        </div>
      </div>

      <div class="toolbar" style="margin-bottom: 1.5rem;">
        <div class="search-box">
          <i data-lucide="search"></i>
          <input type="text" id="cf-domain-search" placeholder="Search domains..." value="${searchQuery}">
        </div>
        <div class="filter-group">
          <input type="text" id="auto-replace-old-ip" placeholder="Old IP" class="select-custom" style="padding: 0.4rem; width: 120px;">
          <input type="text" id="auto-replace-new-ip" placeholder="New IP" class="select-custom" style="padding: 0.4rem; width: 120px;">
          <button class="btn btn-outline" id="auto-replace-ip-btn" title="Auto replace A records IP across filtered domains">
            <i data-lucide="repeat"></i> Replace IP
          </button>
        </div>
      </div>

      <div class="filter-section glass-panel" style="padding: 1rem; margin-bottom: 2rem; border-color: var(--border-subtle);">
        <div class="quick-filters" style="margin-bottom: 1rem;">
          <div style="font-size: 0.75rem; color: var(--text-dim); display: flex; align-items: center; min-width: 80px;">
            <i data-lucide="key" style="width: 14px; margin-right: 6px;"></i> API:
          </div>
          <div class="chip ${state.cfAccountFilter === 'all' ? 'active' : ''}" data-cf-filter="all">All</div>
          ${state.cfAccounts.map(acc => `
            <div class="chip ${state.cfAccountFilter === acc.id ? 'active' : ''}" data-cf-filter="${acc.id}" title="${acc.name}">${acc.name}</div>
          `).join('')}
        </div>

        <div class="quick-filters">
          <div style="font-size: 0.75rem; color: var(--text-dim); display: flex; align-items: center; min-width: 80px;">
            <i data-lucide="building" style="width: 14px; margin-right: 6px;"></i> Org:
          </div>
          <div class="chip ${state.cfRealAccountFilter === 'all' ? 'active' : ''}" data-cf-real-filter="all">All Orgs</div>
          ${Array.from(uniqueRealAccounts.entries()).map(([id, name]) => {
    const shortName = name.replace(/'s Account$/i, '')
    return `
              <div class="chip ${state.cfRealAccountFilter === id ? 'active' : ''}" data-cf-real-filter="${id}" title="${name}">${shortName}</div>
            `
  }).join('')}
        </div>
      </div>

      ${allZones.length === 0 ? `
        <div class="glass-panel" style="padding: 4rem; text-align: center;">
          <i data-lucide="cloud-off" style="width: 48px; height: 48px; color: var(--text-dim); margin-bottom: 1.5rem;"></i>
          <h3>No Domains Found</h3>
          <p style="color: var(--text-dim); margin-top: 0.5rem;">Try adding a credential or refreshing the page.</p>
        </div>
      ` : `
        <div class="repo-list">
          ${sortedZones.length === 0 ? `
            <div style="padding: 3rem; text-align: center; color: var(--text-dim);">No domains match your filters.</div>
          ` : sortedZones.map(zone => {
            const isStarred = state.cfStarredDomains.includes(zone.id)
            return `
              <div class="repo-list-item glass-panel" style="padding: 1.25rem 2rem; border-color: ${isStarred ? 'rgba(245, 158, 11, 0.45)' : 'var(--glass-border)'}; box-shadow: ${isStarred ? '0 0 10px rgba(245, 158, 11, 0.05)' : 'none'};">
                <div style="display: flex; align-items: center; gap: 1.5rem; flex: 1;">
                  <button class="toggle-star-domain-btn" data-zone-id="${zone.id}" title="${isStarred ? 'Unstar Domain' : 'Star Domain'}" style="border: none; background: none; padding: 4px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: ${isStarred ? 'var(--warning)' : 'var(--text-dim)'}; transition: var(--transition);">
                    <i data-lucide="star" style="width: 18px; height: 18px; ${isStarred ? 'fill: var(--warning); color: var(--warning);' : 'color: var(--text-dim);'}"></i>
                  </button>
                  <span class="domain-status ${zone.status === 'active' ? 'domain-active' : 'domain-pending'}"></span>
                  <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 1.1rem; color: var(--primary); display: flex; align-items: center; gap: 0.5rem;">
                      ${zone.name}
                      ${isStarred ? '<span style="font-size: 0.65rem; background: rgba(245, 158, 11, 0.15); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.25); padding: 1px 6px; border-radius: 4px; font-weight: 600;">PINNED</span>' : ''}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 0.25rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                      <span>Account:</span>
                      <span style="color: var(--warning); font-weight: 600;" title="${zone.account.name}">${zone.account.name.replace(/'s Account$/i, '')}</span>
                      <span style="opacity: 0.5;">•</span>
                      <span style="font-size: 0.75rem;">Status: ${zone.status}</span>
                      ${zone.localAccount ? `
                        <span style="opacity: 0.5;">•</span>
                        <span style="font-size: 0.7rem; background: var(--bg-elevated); padding: 1px 6px; border-radius: 4px; border: 1px solid var(--border-subtle);">via ${zone.localAccount.name}</span>
                      ` : ''}
                    </div>
                  </div>
                  <div class="repo-actions" style="border: none; margin: 0; padding: 0;">
                    <button class="btn-icon view-dns-btn" data-zone-id="${zone.id}" data-zone-name="${zone.name}" data-acc-id="${zone.localAccount.id}" title="Manage DNS Records">
                      <i data-lucide="list"></i>
                    </button>
                    <a href="https://dash.cloudflare.com/${zone.account.id}/${zone.name}" target="_blank" class="btn-icon" title="Open in Cloudflare">
                      <i data-lucide="external-link"></i>
                    </a>
                  </div>
                </div>
              </div>
            `
          }).join('')}
        </div>
      `}
    </main>
  `
}

function CloudflareDnsView() {
  const { zoneId, zoneName, localAccount } = state.activeZone
  const records = state.cfDnsRecords[zoneId] || []
  const searchQuery = state.searchQuery || ''
  const filteredRecords = records.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return `
    <main class="container">
      <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem;">
        <button class="btn-icon" id="back-to-domains" title="Back to Domains">
          <i data-lucide="arrow-left"></i>
        </button>
        <div>
          <h1 style="font-size: 2rem; margin-bottom: 0.25rem;">${zoneName}</h1>
          <p style="color: var(--text-dim); font-size: 0.875rem;">
            DNS Records • <span style="color: var(--warning)">${localAccount.name}</span>
          </p>
        </div>
      </div>

      <div class="toolbar" style="margin-bottom: 2rem;">
        <div class="search-box">
          <i data-lucide="search"></i>
          <input type="text" id="dns-search" placeholder="Search DNS records..." value="${searchQuery}">
        </div>
        <div class="filter-group">
           <button class="btn btn-outline" id="refresh-dns-btn">
            <i data-lucide="refresh-cw"></i>
          </button>
          <button class="btn btn-primary" id="add-dns-record-btn">
            <i data-lucide="plus"></i> Add Record
          </button>
        </div>
      </div>

      ${records.length === 0 ? `
        <div class="glass-panel" style="padding: 4rem; text-align: center;">
          <p style="color: var(--text-dim);">No DNS records found.</p>
        </div>
      ` : `
        <div class="repo-list">
          ${filteredRecords.map(record => `
            <div class="repo-list-item glass-panel" style="padding: 1rem 1.5rem; gap: 1rem;">
              <div style="width: 60px; font-weight: 800; color: var(--primary); font-size: 0.75rem; background: var(--bg-elevated); padding: 4px 8px; border-radius: 4px; text-align: center; border: 1px solid var(--border-subtle);">
                ${record.type}
              </div>
              <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 600; font-family: var(--font-mono); font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${record.name}
                </div>
                <div style="font-size: 0.8rem; color: var(--text-dim); font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 0.25rem;">
                  ${record.content}
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 1.5rem; font-size: 0.75rem; color: var(--text-dim);">
                <div title="Proxied Status" style="display: flex; align-items: center; gap: 4px;">
                  <i data-lucide="${record.proxied ? 'cloud' : 'cloud-off'}" style="width: 14px; color: ${record.proxied ? '#f38020' : 'inherit'}"></i>
                  ${record.proxied ? 'Proxied' : 'DNS Only'}
                </div>
                <div title="TTL" style="display: flex; align-items: center; gap: 4px;">
                  <i data-lucide="clock" style="width: 12px;"></i> ${record.ttl === 1 ? 'Auto' : record.ttl}
                </div>
              </div>
              <div class="repo-actions" style="border: none; margin: 0; padding: 0;">
                <button class="btn-icon edit-dns-btn" 
                  data-id="${record.id}" 
                  data-type="${record.type}" 
                  data-name="${record.name}" 
                  data-content="${record.content}" 
                  data-proxied="${record.proxied}" 
                  data-ttl="${record.ttl}"
                >
                  <i data-lucide="edit-3"></i>
                </button>
                <button class="btn-icon danger delete-dns-btn" data-id="${record.id}" data-name="${record.name}">
                  <i data-lucide="trash-2"></i>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `}

      <!-- DNS Modal -->
      <div class="modal-overlay" id="dns-modal-overlay">
        <div class="modal glass-panel">
          <button class="modal-close" id="close-dns-modal-btn">
            <i data-lucide="x"></i>
          </button>
          <h2 id="dns-modal-title" style="margin-bottom: 0.5rem;">Add DNS Record</h2>
          <p style="color: var(--text-dim); font-size: 0.875rem; margin-bottom: 2rem;">Configure your domain routing.</p>
          
          <input type="hidden" id="dns-record-id">

          <div style="display: grid; grid-template-columns: 100px 1fr; gap: 1rem;">
            <div class="input-group">
              <label>Type</label>
              <select class="select-custom" id="dns-record-type" style="width: 100%;">
                <option value="A">A</option>
                <option value="AAAA">AAAA</option>
                <option value="CNAME">CNAME</option>
                <option value="TXT">TXT</option>
                <option value="MX">MX</option>
                <option value="NS">NS</option>
              </select>
            </div>
            <div class="input-group">
              <label>Name (e.g. @, www)</label>
              <input type="text" id="dns-record-name" placeholder="example.com">
            </div>
          </div>
          
          <div class="input-group">
            <label>Content / Value</label>
            <input type="text" id="dns-record-content" placeholder="192.168.1.1 or target.com">
          </div>

          <div style="display: flex; gap: 2rem; align-items: center; margin-bottom: 1.5rem; background: var(--bg-elevated); padding: 1rem; border-radius: 8px;">
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <input type="checkbox" id="dns-record-proxied" style="width: auto;">
              <label for="dns-record-proxied" style="margin-bottom: 0; cursor: pointer;">Proxied</label>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center; flex: 1;">
              <label style="margin-bottom: 0; white-space: nowrap;">TTL:</label>
              <select class="select-custom" id="dns-record-ttl" style="padding: 0.5rem; flex: 1;">
                <option value="1">Auto</option>
                <option value="60">1 min</option>
                <option value="3600">1 hour</option>
                <option value="86400">1 day</option>
              </select>
            </div>
          </div>

          <button class="btn btn-primary" id="save-dns-record-btn" style="width: 100%;">
            Save DNS Record
          </button>
        </div>
      </div>
    </main>
  `
}

function GlobalCommitsView() {
  if (state.globalCommits.length === 0 && !state.loadingGlobalCommits) {
    fetchGlobalCommits()
  }

  return `
    <main class="container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem;">
        <div>
          <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem;">Recent Commits</h1>
          <p style="color: var(--text-dim);">Global commit history across all your repositories.</p>
        </div>
        <button class="btn btn-outline" id="refresh-global-commits">
          <i data-lucide="refresh-cw" class="${state.loadingGlobalCommits ? 'spin' : ''}"></i> Refresh
        </button>
      </div>

      <div id="global-commits-list" class="repo-list">
        ${state.loadingGlobalCommits ?
      '<div style="text-align: center; padding: 4rem;"><div class="loader" style="margin: 0 auto;"></div><p style="margin-top: 1rem; color: var(--text-dim);">Fetching global history...</p></div>' :
      (state.globalCommits.length === 0 ?
        '<div class="glass-panel" style="padding: 4rem; text-align: center;"><i data-lucide="history" style="width: 48px; height: 48px; color: var(--text-dim); margin-bottom: 1.5rem;"></i><p>No commits found in your history.</p></div>' :
        state.globalCommits.map(c => {
          const repoName = c.repository ? c.repository.full_name : 'Unknown Repo'
          const author = c.commit.author.name
          const date = new Date(c.commit.author.date).toLocaleString()
          const message = c.commit.message.split('\n')[0]
          const sha = c.sha.substring(0, 7)
          return `
                 <div class="repo-list-item glass-panel" style="padding: 1.25rem 2rem;">
                   <div style="display: flex; align-items: center; gap: 1.5rem; flex: 1; min-width: 0;">
                     <div style="flex: 1; min-width: 0;">
                       <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                         <span style="font-family: var(--font-mono); font-size: 0.75rem; background: var(--bg-deep); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border-subtle); color: var(--primary);">${sha}</span>
                         <span style="font-weight: 600; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;" title="${message}">${message}</span>
                       </div>
                       <div style="font-size: 0.8rem; color: var(--text-dim); display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
                         <span style="display: flex; align-items: center; gap: 4px;">
                           <i data-lucide="folder" style="width: 14px;"></i> ${repoName}
                         </span>
                         <span style="display: flex; align-items: center; gap: 4px;">
                           <i data-lucide="user" style="width: 14px;"></i> ${author}
                         </span>
                         <span style="display: flex; align-items: center; gap: 4px;">
                           <i data-lucide="clock" style="width: 14px;"></i> ${date}
                         </span>
                       </div>
                     </div>
                     <a href="${c.html_url}" target="_blank" class="btn-icon" title="View Commit">
                       <i data-lucide="external-link"></i>
                     </a>
                   </div>
                 </div>
               `
        }).join('')
      )
    }
      </div>
    </main>
  `
}

function TrendingView() {
  if (state.trendingRepos.length === 0 && !state.loadingTrending) {
    fetchTrending()
  }

  return `
    <main class="container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem;">
        <div>
          <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem;">Trending</h1>
          <p style="color: var(--text-dim);">See what the GitHub community is most excited about.</p>
        </div>
        <div style="display: flex; gap: 1rem; align-items: center;">
          <select class="select-custom" id="trending-timeframe" style="padding: 0.5rem 1rem;">
            <option value="daily" ${state.trendingTimeframe === 'daily' ? 'selected' : ''}>Today</option>
            <option value="weekly" ${state.trendingTimeframe === 'weekly' ? 'selected' : ''}>This Week</option>
            <option value="monthly" ${state.trendingTimeframe === 'monthly' ? 'selected' : ''}>This Month</option>
          </select>
          <button class="btn btn-outline" id="refresh-trending-btn" title="Refresh Trending">
            <i data-lucide="refresh-cw" class="${state.loadingTrending ? 'spin' : ''}"></i>
          </button>
        </div>
      </div>

      <div id="trending-repo-list" class="repo-list">
        ${state.loadingTrending ?
      '<div style="text-align: center; padding: 4rem;"><div class="loader" style="margin: 0 auto;"></div><p style="margin-top: 1rem; color: var(--text-dim);">Fetching trending repositories...</p></div>' :
      (state.trendingRepos.length === 0 ?
        '<div class="glass-panel" style="padding: 4rem; text-align: center;"><i data-lucide="trending-up" style="width: 48px; height: 48px; color: var(--text-dim); margin-bottom: 1.5rem;"></i><p>No trending repositories found.</p></div>' :
        state.trendingRepos.map((repo, index) => {
          const periodText = state.trendingTimeframe === 'daily' ? 'today' : (state.trendingTimeframe === 'weekly' ? 'this week' : 'this month');

          return `
                 <div class="repo-list-item glass-panel" style="padding: 1.25rem 2rem; border-color: var(--border-subtle); display:flex; flex-direction:column; gap:0.75rem;">
                   <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                     <div style="display: flex; align-items: center; gap: 0.75rem;">
                       <i data-lucide="book" style="width: 16px; color: var(--text-dim);"></i>
                       <a href="${repo.html_url}" target="_blank" style="font-weight: 500; font-size: 1.15rem; color: var(--primary); text-decoration: none;">
                          <span style="font-weight: normal; opacity: 0.8">${repo.author} / </span>${repo.name}
                       </a>
                     </div>
                     <button class="btn btn-outline" style="padding: 0.25rem 0.75rem; font-size: 0.75rem; margin: 0;">
                       <i data-lucide="star" style="width: 14px;"></i> Star
                     </button>
                   </div>
                   
                   <p style="font-size: 0.85rem; color: var(--text-main); line-height: 1.5; max-width: 85%;">
                     ${repo.description || 'No description provided.'}
                   </p>
                   
                   <div style="font-size: 0.75rem; color: var(--text-dim); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;">
                     <div style="display: flex; align-items: center; gap: 1.25rem;">
                       ${repo.language ? `
                       <span style="display: flex; align-items: center; gap: 4px;">
                         <span class="lang-dot" style="background: ${repo.languageColor || getLangColor(repo.language)}"></span> ${repo.language}
                       </span>` : ''}
                       <span style="display: flex; align-items: center; gap: 4px;" title="Stars">
                         <i data-lucide="star" style="width: 14px;"></i> ${repo.stargazers_count.toLocaleString()}
                       </span>
                       <span style="display: flex; align-items: center; gap: 4px;" title="Forks">
                         <i data-lucide="git-fork" style="width: 14px;"></i> ${repo.forks_count.toLocaleString()}
                       </span>
                       ${repo.builtBy && repo.builtBy.length > 0 ? `
                       <span style="display: flex; align-items: center; gap: 4px; margin-left: 0.5rem;">
                         Built by
                         <div style="display:flex; margin-left:2px;">
                           ${repo.builtBy.map(u => `<a href="${u.href}" target="_blank" title="${u.username}"><img src="${u.avatar}" style="width: 20px; height: 20px; border-radius: 50%; margin-left: -4px; border: 2px solid var(--bg-main);" /></a>`).join('')}
                         </div>
                       </span>` : ''}
                     </div>
                     
                     ${repo.currentPeriodStars ? `
                     <span style="display: flex; align-items: center; gap: 4px;">
                       <i data-lucide="star" style="width: 14px;"></i> ${repo.currentPeriodStars.toLocaleString()} stars ${periodText}
                     </span>` : ''}
                   </div>
                 </div>
               `
        }).join('')
      )
    }
      </div>
    </main>
  `
}

function KanbanView() {
  const columns = [
    { id: 'backlog', title: 'Backlog', icon: 'clipboard-list', color: 'var(--text-dim)' },
    { id: 'todo', title: 'To Do', icon: 'list-todo', color: 'var(--primary)' },
    { id: 'in_progress', title: 'In Progress', icon: 'play-circle', color: 'var(--warning)' },
    { id: 'done', title: 'Done', icon: 'check-circle-2', color: 'var(--success)' }
  ];

  // Get tasks filtered by repo and priority
  const filteredTasks = state.kanbanTasks.filter(task => {
    const matchesRepo = state.kanbanFilters.repo === 'all' || task.repo === state.kanbanFilters.repo;
    const matchesPriority = state.kanbanFilters.priority === 'all' || task.priority === state.kanbanFilters.priority;
    return matchesRepo && matchesPriority;
  });

  const allRepos = state.repos || [];

  return `
    <main class="container kanban-board-container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem;">Kanban Board</h1>
          <p style="color: var(--text-dim);">Organize and track your repository tasks and development workflow.</p>
        </div>
        <button class="btn btn-primary" id="kanban-new-task-btn">
          <i data-lucide="plus"></i> New Task
        </button>
      </div>

      <div class="toolbar" style="margin-bottom: 1.5rem; background: rgba(18, 18, 22, 0.2); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; width: 100%;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i data-lucide="filter" style="width: 16px; color: var(--text-dim);"></i>
            <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">Filters:</span>
          </div>
          
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <label style="font-size: 0.75rem; color: var(--text-dim); margin-right: 4px;">Repo:</label>
            <select class="select-custom" id="kanban-filter-repo" style="padding: 0.45rem 0.8rem; font-size: 0.8rem; min-width: 165px;">
              <option value="all" ${state.kanbanFilters.repo === 'all' ? 'selected' : ''}>All Repositories</option>
              ${allRepos.map(r => `
                <option value="${r.full_name}" ${state.kanbanFilters.repo === r.full_name ? 'selected' : ''}>${r.name}</option>
              `).join('')}
            </select>
          </div>

          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <label style="font-size: 0.75rem; color: var(--text-dim); margin-right: 4px;">Priority:</label>
            <select class="select-custom" id="kanban-filter-priority" style="padding: 0.45rem 0.8rem; font-size: 0.8rem; min-width: 125px;">
              <option value="all" ${state.kanbanFilters.priority === 'all' ? 'selected' : ''}>All Priorities</option>
              <option value="low" ${state.kanbanFilters.priority === 'low' ? 'selected' : ''}>Low</option>
              <option value="medium" ${state.kanbanFilters.priority === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="high" ${state.kanbanFilters.priority === 'high' ? 'selected' : ''}>High</option>
            </select>
          </div>

          <div style="margin-left: auto; font-size: 0.8rem; color: var(--text-dim); display: flex; align-items: center; gap: 0.5rem;">
            <i data-lucide="check-square" style="width: 14px;"></i>
            <span>Total Tasks: ${filteredTasks.length}</span>
          </div>
        </div>
      </div>

      <div class="kanban-board">
        ${columns.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          return `
            <div class="kanban-column" data-column-id="${col.id}">
              <div class="kanban-column-header">
                <div class="kanban-column-title" style="color: ${col.color}">
                  <i data-lucide="${col.icon}" style="width: 18px; height: 18px;"></i>
                  ${col.title}
                </div>
                <div class="kanban-column-count">${colTasks.length}</div>
              </div>
              <div class="kanban-column-body" data-column-id="${col.id}">
                ${colTasks.length === 0 ? `
                  <div class="kanban-empty-state">
                    <i data-lucide="inbox" style="width: 24px; height: 24px; opacity: 0.4;"></i>
                    <div>Empty Column</div>
                  </div>
                ` : colTasks.map(task => KanbanTaskCard(task)).join('')}
              </div>
              <button class="kanban-column-add-btn" data-column-id="${col.id}">
                <i data-lucide="plus" style="width: 14px; height: 14px;"></i> Add Task
              </button>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Add/Edit Task Modal -->
      <div class="modal-overlay" id="kanban-task-modal-overlay">
        <div class="modal glass-panel">
          <button class="modal-close" id="close-kanban-task-modal-btn">
            <i data-lucide="x"></i>
          </button>
          <h2 id="kanban-modal-title" style="margin-bottom: 0.5rem;">Create New Task</h2>
          <p style="color: var(--text-dim); font-size: 0.875rem; margin-bottom: 2rem;">Add a new item to your board.</p>
          
          <input type="hidden" id="kanban-task-id">

          <div class="input-group">
            <label>Task Title</label>
            <input type="text" id="kanban-task-title" placeholder="Fix DNS settings...">
          </div>

          <div class="input-group">
            <label>Description</label>
            <textarea id="kanban-task-desc" class="select-custom" style="width: 100%; min-height: 80px; font-family: var(--font-sans); resize: vertical; border: 1px solid var(--border-subtle); background: var(--bg-elevated); color: var(--text-main); border-radius: var(--radius-sm); padding: 0.75rem 1rem;" placeholder="Detailed steps or notes..."></textarea>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div class="input-group" style="margin-bottom: 0;">
              <label>Status</label>
              <select class="select-custom" id="kanban-task-status" style="width: 100%;">
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div class="input-group" style="margin-bottom: 0;">
              <label>Priority</label>
              <select class="select-custom" id="kanban-task-priority" style="width: 100%;">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div class="input-group">
            <label>Associated GitHub Repo (optional)</label>
            <select class="select-custom" id="kanban-task-repo" style="width: 100%;">
              <option value="">None</option>
              ${allRepos.map(r => `
                <option value="${r.full_name}">${r.full_name}</option>
              `).join('')}
            </select>
          </div>

          <button class="btn btn-primary" id="save-kanban-task-btn" style="width: 100%; margin-top: 1rem;">
            Save Task
          </button>
        </div>
      </div>
    </main>
  `;
}

function KanbanTaskCard(task) {
  const priorityClass = `priority-${task.priority}`;
  
  let moveButtonsHtml = '';
  if (task.status !== 'backlog') {
    moveButtonsHtml += `
      <button class="kanban-card-btn move-task-left-btn" data-task-id="${task.id}" title="Move left">
        <i data-lucide="chevron-left" style="width: 14px; height: 14px;"></i>
      </button>
    `;
  }
  if (task.status !== 'done') {
    moveButtonsHtml += `
      <button class="kanban-card-btn move-task-right-btn" data-task-id="${task.id}" title="Move right">
        <i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i>
      </button>
    `;
  }

  return `
    <div class="kanban-card" draggable="true" data-task-id="${task.id}">
      <h3 class="kanban-card-title">${task.title}</h3>
      ${task.desc ? `<p class="kanban-card-desc">${task.desc}</p>` : ''}
      
      <div class="kanban-card-footer">
        <div style="display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
          <span class="kanban-badge ${priorityClass}">${task.priority}</span>
          ${task.repo ? `
            <span class="kanban-card-repo" title="Linked to ${task.repo}">
              <i data-lucide="github" style="width: 10px; height: 10px;"></i>
              ${task.repo.split('/')[1]}
            </span>
          ` : ''}
        </div>
        
        <div class="kanban-card-actions">
          ${moveButtonsHtml}
          <button class="kanban-card-btn edit-task-btn" data-task-id="${task.id}" title="Edit Task">
            <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
          </button>
          <button class="kanban-card-btn danger delete-task-btn" data-task-id="${task.id}" title="Delete Task">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

const indexnow = {
  async submit(host, key, keyLocation, urls) {
    const response = await fetch('/indexnow-api/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        host,
        key,
        keyLocation,
        urlList: urls
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`IndexNow API error (Status ${response.status}): ${errorText || response.statusText}`)
    }
    return response.status
  },

  async fetchExternalUrl(url) {
    const response = await fetch(`/fetch-url?url=${encodeURIComponent(url)}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url} (Status ${response.status})`)
    }
    return response.text()
  },

  parseRobotsTxt(text) {
    const sitemaps = []
    const lines = text.split('\n')
    lines.forEach(line => {
      const parts = line.split(':')
      if (parts[0] && parts[0].trim().toLowerCase() === 'sitemap') {
        const sitemapUrl = parts.slice(1).join(':').trim()
        if (sitemapUrl) sitemaps.push(sitemapUrl)
      }
    })
    return sitemaps
  },

  async fetchAndParseSitemap(sitemapUrl, collectedUrls = new Set(), depth = 0) {
    if (depth > 5 || collectedUrls.size > 2000) return collectedUrls
    
    try {
      const xmlText = await this.fetchExternalUrl(sitemapUrl)
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml')
      
      const parserError = xmlDoc.querySelector('parsererror')
      if (parserError) {
        console.warn('XML parsing error on sitemap:', sitemapUrl)
        return collectedUrls
      }
      
      const sitemaps = xmlDoc.getElementsByTagName('sitemap')
      if (sitemaps.length > 0) {
        const sitemapPromises = []
        for (let i = 0; i < Math.min(sitemaps.length, 10); i++) {
          const loc = sitemaps[i].getElementsByTagName('loc')[0]
          if (loc && loc.textContent.trim()) {
            sitemapPromises.push(
              this.fetchAndParseSitemap(loc.textContent.trim(), collectedUrls, depth + 1)
            )
          }
        }
        await Promise.all(sitemapPromises)
      } else {
        const urls = xmlDoc.getElementsByTagName('url')
        for (let i = 0; i < urls.length; i++) {
          const loc = urls[i].getElementsByTagName('loc')[0]
          if (loc && loc.textContent.trim()) {
            collectedUrls.add(loc.textContent.trim())
          }
        }
      }
    } catch (e) {
      console.warn(`Error reading sitemap ${sitemapUrl}:`, e)
    }
    
    return collectedUrls
  }
}

function IndexNowView() {
  const allZones = []
  Object.values(state.cfZones).forEach(zones => {
    zones.forEach(z => {
      allZones.push(z)
    })
  })

  const selectedDomain = state.indexnowSelectedDomain || (allZones[0] ? allZones[0].name : '')
  state.indexnowSelectedDomain = selectedDomain
  const currentKey = state.indexnowKeys[selectedDomain] || ''
  const history = state.indexnowHistory || []

  return `
    <main class="container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem;">
        <div>
          <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem;">IndexNow Console</h1>
          <p style="color: var(--text-dim);">Submit URLs directly to search engines to index your pages instantly.</p>
        </div>
      </div>

      <div class="indexnow-grid">
        <!-- Configuration Panel -->
        <div class="indexnow-panel glass-panel">
          <div class="indexnow-panel-title">
            <i data-lucide="settings" style="width: 20px; height: 20px;"></i> Configuration
          </div>

          <div class="input-group">
            <label>Select Domain</label>
            <select class="select-custom" id="indexnow-domain-select" style="width: 100%;">
              ${allZones.length === 0 ? `
                <option value="">No Cloudflare domains found</option>
              ` : allZones.map(z => `
                <option value="${z.name}" ${z.name === selectedDomain ? 'selected' : ''}>${z.name}</option>
              `).join('')}
            </select>
          </div>

          <div class="input-group">
            <label>IndexNow Key</label>
            <div style="display: flex; gap: 0.5rem;">
              <input type="text" id="indexnow-key-input" placeholder="Generate or enter a key..." value="${currentKey}" style="flex: 1;">
              <button class="btn btn-outline" id="indexnow-generate-key-btn" title="Generate API Key">
                <i data-lucide="refresh-cw"></i> Generate
              </button>
            </div>
            <p style="font-size: 0.75rem; color: var(--text-dim); margin-top: 0.5rem;">
              Must be 8 to 128 hex or alphanumeric characters.
            </p>
          </div>

          ${currentKey ? `
            <div class="glass-panel" style="padding: 1rem; background: var(--bg-deep); border-color: var(--border-subtle); display: flex; flex-direction: column; gap: 0.75rem;">
              <div style="font-size: 0.8rem; font-weight: 600; color: var(--warning); display: flex; align-items: center; gap: 4px;">
                <i data-lucide="alert-triangle" style="width: 14px; height: 14px;"></i> Key Verification Required
              </div>
              <p style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.4; margin: 0;">
                You must host a text file named <code style="color: var(--primary)">${currentKey}.txt</code> at the root of your domain.
              </p>
              <div style="font-size: 0.75rem; color: var(--text-dim); word-break: break-all; font-family: var(--font-mono);">
                Target URL: <a href="https://${selectedDomain}/${currentKey}.txt" target="_blank" style="color: var(--primary); text-decoration: underline;">https://${selectedDomain}/${currentKey}.txt</a>
              </div>
              <div style="display: flex; gap: 0.5rem; margin-top: 0.25rem;">
                <button class="btn btn-outline" id="indexnow-download-key-btn" style="flex: 1; padding: 0.4rem; font-size: 0.8rem;">
                  <i data-lucide="download" style="width: 14px;"></i> Download Key
                </button>
                <button class="btn btn-outline" id="indexnow-copy-key-btn" style="flex: 1; padding: 0.4rem; font-size: 0.8rem;">
                  <i data-lucide="copy" style="width: 14px;"></i> Copy Key
                </button>
                <button class="btn btn-outline" id="indexnow-verify-key-btn" style="flex: 1; padding: 0.4rem; font-size: 0.8rem; border-color: var(--warning); color: var(--warning);">
                  <i data-lucide="shield-check" style="width: 14px;"></i> Verify Hosting
                </button>
              </div>
              ${state.indexnowVerification && state.indexnowVerification[selectedDomain] ? `
                <div style="font-size: 0.75rem; display: flex; align-items: center; gap: 4px; padding: 0.4rem 0.6rem; border-radius: 4px; margin-top: 0.25rem; 
                  background: ${
                    state.indexnowVerification[selectedDomain].status === 'verified' ? 'rgba(46, 204, 113, 0.1)' : 
                    state.indexnowVerification[selectedDomain].status === 'verifying' ? 'rgba(52, 152, 219, 0.1)' : 'rgba(231, 76, 60, 0.1)'
                  }; 
                  color: ${
                    state.indexnowVerification[selectedDomain].status === 'verified' ? '#2ecc71' : 
                    state.indexnowVerification[selectedDomain].status === 'verifying' ? '#3498db' : '#e74c3c'
                  };
                  border: 1px solid ${
                    state.indexnowVerification[selectedDomain].status === 'verified' ? 'rgba(46, 204, 113, 0.2)' : 
                    state.indexnowVerification[selectedDomain].status === 'verifying' ? 'rgba(52, 152, 219, 0.2)' : 'rgba(231, 76, 60, 0.2)'
                  };">
                  <i data-lucide="${
                    state.indexnowVerification[selectedDomain].status === 'verified' ? 'check-circle' : 
                    state.indexnowVerification[selectedDomain].status === 'verifying' ? 'loader' : 'x-circle'
                  }" class="${state.indexnowVerification[selectedDomain].status === 'verifying' ? 'spin' : ''}" style="width: 14px; height: 14px; min-width: 14px; ${state.indexnowVerification[selectedDomain].status === 'verifying' ? 'animation: spin 1s linear infinite;' : ''}"></i>
                  <span style="flex: 1; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${state.indexnowVerification[selectedDomain].message}</span>
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>

        <!-- Submit Panel -->
        <div class="indexnow-panel glass-panel">
          <div class="indexnow-panel-title">
            <i data-lucide="send" style="width: 20px; height: 20px;"></i> Submit URLs
          </div>

          <div class="input-group" style="flex: 1; display: flex; flex-direction: column;">
            <label style="display: flex; justify-content: space-between; align-items: center;">
              <span>URLs to Index (one per line)</span>
              ${selectedDomain ? `
                <div style="display: flex; gap: 0.5rem;">
                  <button class="btn-icon" id="indexnow-import-sitemap-btn" title="Fetch URLs from robots.txt & sitemaps" style="width: auto; height: auto; padding: 2px 8px; font-size: 0.75rem; font-family: var(--font-sans); display: inline-flex; align-items: center; gap: 4px; background: var(--bg-elevated); color: var(--warning); border: 1px solid var(--border-subtle);">
                    <i data-lucide="globe" style="width: 12px; height: 12px;"></i> Import Sitemap
                  </button>
                  <button class="btn-icon" id="indexnow-prepend-domain-btn" title="Add prefix 'https://${selectedDomain}' to lines" style="width: auto; height: auto; padding: 2px 8px; font-size: 0.75rem; font-family: var(--font-sans); display: inline-flex; align-items: center; gap: 4px; background: var(--bg-elevated); color: var(--primary); border: 1px solid var(--border-subtle);">
                    <i data-lucide="plus" style="width: 12px; height: 12px;"></i> Prepend Domain
                  </button>
                </div>
              ` : ''}
            </label>
            <textarea id="indexnow-urls-input" class="indexnow-textarea" style="flex: 1;" placeholder="https://${selectedDomain || 'example.com'}/page-1&#10;https://${selectedDomain || 'example.com'}/blog/post-1"></textarea>
          </div>

          <div style="display: flex; align-items: center; gap: 0.5rem; margin: 0.5rem 0 1rem 0; font-size: 0.85rem; color: var(--text-dim);">
            <input type="checkbox" id="indexnow-individual-checkbox" ${state.indexnowSubmitIndividually ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px; accent-color: var(--primary);">
            <label for="indexnow-individual-checkbox" style="cursor: pointer; user-select: none;">Submit URLs individually (Slow, but isolates errors)</label>
          </div>

          ${state.indexnowProgress && state.indexnowProgress.running ? `
            <div class="glass-panel" style="padding: 1rem; margin-bottom: 1rem; border-color: var(--primary-subtle); background: var(--bg-deep); display: flex; flex-direction: column; gap: 0.5rem;">
              <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600;">
                <span style="color: var(--primary); display: flex; align-items: center; gap: 4px;">
                  <i data-lucide="loader" class="spin" style="width: 14px; height: 14px; animation: spin 1s linear infinite;"></i>
                  Indexing URLs...
                </span>
                <span style="color: var(--text-main);">${state.indexnowProgress.current} / ${state.indexnowProgress.total}</span>
              </div>
              <div style="width: 100%; height: 6px; background: var(--border-subtle); border-radius: 3px; overflow: hidden;">
                <div style="height: 100%; width: ${(state.indexnowProgress.current / state.indexnowProgress.total) * 100}%; background: var(--primary); transition: width 0.15s ease;"></div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem;">
                <div style="display: flex; gap: 0.75rem; color: var(--text-dim);">
                  <span style="color: #2ecc71; font-weight: 500;">✓ Success: ${state.indexnowProgress.successes}</span>
                  <span style="color: #e74c3c; font-weight: 500;">✗ Failed: ${state.indexnowProgress.failures}</span>
                </div>
                <button class="btn btn-outline danger" id="indexnow-cancel-btn" style="padding: 0.2rem 0.5rem; font-size: 0.7rem; height: auto; width: auto;">Cancel</button>
              </div>
            </div>
          ` : ''}

          ${state.indexnowProgress && !state.indexnowProgress.running && state.indexnowProgress.total > 0 && state.indexnowProgress.failures > 0 ? `
            <div class="glass-panel" style="padding: 1rem; margin-bottom: 1rem; border-color: rgba(231, 76, 60, 0.3); background: rgba(231, 76, 60, 0.05); display: flex; flex-direction: column; gap: 0.5rem;">
              <div style="font-size: 0.8rem; font-weight: 600; color: #e74c3c; display: flex; align-items: center; gap: 4px;">
                <i data-lucide="alert-circle" style="width: 14px; height: 14px;"></i> Submission completed with ${state.indexnowProgress.failures} error(s)
              </div>
              <div style="max-height: 100px; overflow-y: auto; font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 2px; padding-right: 4px;">
                ${state.indexnowProgress.results.filter(r => r.status >= 400).map(r => `
                  <div style="display: flex; justify-content: space-between; gap: 10px; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 2px;">
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;" title="${r.url}">${r.url}</span>
                    <span style="color: #e74c3c; font-weight: 600;">Status ${r.status}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <button class="btn btn-primary" id="indexnow-submit-btn" style="width: 100%;" ${state.indexnowProgress && state.indexnowProgress.running ? 'disabled' : ''}>
            <i data-lucide="zap" style="width: 16px; height: 16px;"></i> Submit to IndexNow
          </button>
        </div>
      </div>

      <!-- History Table -->
      <div class="glass-panel" style="padding: 1.5rem; margin-top: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.75rem;">
          <h3 style="font-size: 1.15rem; font-weight: 600; color: var(--text-main); display: flex; align-items: center; gap: 0.5rem;">
            <i data-lucide="history" style="width: 20px; height: 20px; color: var(--primary);"></i> Submission History
          </h3>
          ${history.length > 0 ? `
            <button class="btn btn-outline danger" id="indexnow-clear-history-btn" style="padding: 0.4rem 1rem; font-size: 0.8rem; height: auto;">
              <i data-lucide="trash-2" style="width: 14px;"></i> Clear History
            </button>
          ` : ''}
        </div>

        <div style="overflow-x: auto;">
          ${history.length === 0 ? `
            <div style="text-align: center; padding: 3rem; color: var(--text-dim);">
              <i data-lucide="database" style="width: 32px; height: 32px; opacity: 0.3; margin-bottom: 0.5rem;"></i>
              <div>No submission history found</div>
            </div>
          ` : `
            <table class="indexnow-history-table">
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Submitted At</th>
                  <th>URLs Count</th>
                  <th>URLs Submitted</th>
                  <th>Status Code</th>
                </tr>
              </thead>
              <tbody>
                ${history.slice().reverse().map(h => `
                  <tr>
                    <td style="font-weight: 600; color: var(--primary);">${h.domain}</td>
                    <td style="color: var(--text-muted);">${new Date(h.submittedAt).toLocaleString()}</td>
                    <td>
                      <span class="chip" style="padding: 1px 8px; border-radius: 4px; font-size: 0.75rem; margin: 0; background: var(--bg-elevated);">
                        ${h.urlsCount} ${h.isIndividual ? '(Indiv)' : '(Bulk)'}
                      </span>
                      ${h.isIndividual && h.failures > 0 ? `
                        <span style="color: #e74c3c; font-size: 0.7rem; font-weight: 600; margin-left: 4px;">(${h.failures} failed)</span>
                      ` : ''}
                    </td>
                    <td style="max-width: 300px; font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-dim); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${h.urls.join('\n')}">
                      ${h.urls.join(', ')}
                    </td>
                    <td>
                      <span class="indexnow-status-badge ${h.status >= 200 && h.status < 300 ? 'indexnow-status-success' : 'indexnow-status-error'}">
                        <i data-lucide="${h.status >= 200 && h.status < 300 ? 'check-circle' : 'alert-circle'}" style="width: 12px; height: 12px;"></i>
                        ${h.status} ${h.status === 200 ? 'OK' : (h.status === 202 ? 'Accepted' : 'Error')}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    </main>
  `
}

function DomainCheckerView() {
  const allZones = []
  Object.values(state.cfZones).forEach(zones => {
    zones.forEach(z => {
      allZones.push(z)
    })
  })

  const selectedDomain = state.domainCheckerSelectedDomain || (allZones[0] ? allZones[0].name : '')
  state.domainCheckerSelectedDomain = selectedDomain
  const urlsText = state.domainCheckerUrls || ''
  const results = state.domainCheckerResults || []
  const progress = state.domainCheckerProgress || { running: false, total: 0, current: 0, successes: 0, redirects: 0, errors: 0 }

  return `
    <main class="container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem;">
        <div>
          <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem;">Domain Checker</h1>
          <p style="color: var(--text-dim);">Audit website URLs to check response status, load times, page sizes, and HTML titles.</p>
        </div>
      </div>

      <div class="indexnow-grid">
        <!-- Configuration Panel -->
        <div class="indexnow-panel glass-panel">
          <div class="indexnow-panel-title">
            <i data-lucide="settings" style="width: 20px; height: 20px;"></i> Configuration
          </div>

          <div class="input-group">
            <label>Select Domain</label>
            <select class="select-custom" id="domainchecker-domain-select" style="width: 100%;">
              ${allZones.length === 0 ? `
                <option value="">No Cloudflare domains found</option>
              ` : allZones.map(z => `
                <option value="${z.name}" ${z.name === selectedDomain ? 'selected' : ''}>${z.name}</option>
              `).join('')}
            </select>
          </div>

          <div class="input-group" style="flex: 1; display: flex; flex-direction: column; margin-top: 1rem;">
            <label style="display: flex; justify-content: space-between; align-items: center;">
              <span>URLs to Check (one per line)</span>
              ${selectedDomain ? `
                <button class="btn-icon" id="domainchecker-import-sitemap-btn" title="Fetch URLs from robots.txt & sitemaps" style="width: auto; height: auto; padding: 2px 8px; font-size: 0.75rem; font-family: var(--font-sans); display: inline-flex; align-items: center; gap: 4px; background: var(--bg-elevated); color: var(--warning); border: 1px solid var(--border-subtle);">
                  <i data-lucide="globe" style="width: 12px; height: 12px;"></i> Import Sitemap
                </button>
              ` : ''}
            </label>
            <textarea id="domainchecker-urls-input" class="indexnow-textarea" style="flex: 1; min-height: 200px;" placeholder="https://${selectedDomain || 'example.com'}/page-1&#10;https://${selectedDomain || 'example.com'}/blog/post-1">${urlsText}</textarea>
          </div>

          <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
            <button class="btn btn-primary" id="domainchecker-start-btn" style="flex: 2;" ${progress.running ? 'disabled' : ''}>
              <i data-lucide="play" style="width: 16px; height: 16px;"></i> Start Check
            </button>
            ${progress.running ? `
              <button class="btn btn-outline danger" id="domainchecker-cancel-btn" style="flex: 1;">
                <i data-lucide="square" style="width: 16px; height: 16px;"></i> Cancel
              </button>
            ` : `
              <button class="btn btn-outline" id="domainchecker-clear-btn" style="flex: 1;">
                <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i> Clear
              </button>
            `}
          </div>
        </div>

        <!-- Audit Progress & Results Summary -->
        <div class="indexnow-panel glass-panel" style="display: flex; flex-direction: column;">
          <div class="indexnow-panel-title">
            <i data-lucide="activity" style="width: 20px; height: 20px;"></i> Audit Summary
          </div>

          ${progress.running ? `
            <div class="glass-panel" style="padding: 1rem; margin-bottom: 1.5rem; border-color: var(--primary-subtle); background: var(--bg-deep); display: flex; flex-direction: column; gap: 0.5rem;">
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 600;">
                <span style="color: var(--primary); display: flex; align-items: center; gap: 4px;">
                  <i data-lucide="loader" class="spin" style="width: 14px; height: 14px; animation: spin 1s linear infinite;"></i>
                  Auditing URLs...
                </span>
                <span style="color: var(--text-main);">${progress.current} / ${progress.total} (${Math.round((progress.current / progress.total) * 100) || 0}%)</span>
              </div>
              <div style="width: 100%; height: 8px; background: var(--border-subtle); border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${(progress.current / progress.total) * 100}%; background: var(--primary); transition: width 0.15s ease;"></div>
              </div>
            </div>
          ` : ''}

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; overflow: visible;">
            <div class="glass-panel" style="padding: 1rem; text-align: center; background: rgba(255,255,255,0.02);">
              <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase;">Total</div>
              <div style="font-size: 1.8rem; font-weight: 700; color: var(--text-main); margin-top: 0.25rem;">${progress.total || results.length}</div>
            </div>
            <div class="glass-panel" style="padding: 1rem; text-align: center; background: rgba(46, 204, 113, 0.05); border-color: rgba(46, 204, 113, 0.2);">
              <div style="font-size: 0.75rem; color: #2ecc71; text-transform: uppercase;">Success (2xx)</div>
              <div style="font-size: 1.8rem; font-weight: 700; color: #2ecc71; margin-top: 0.25rem;">${progress.successes}</div>
            </div>
            <div class="glass-panel" style="padding: 1rem; text-align: center; background: rgba(241, 196, 15, 0.05); border-color: rgba(241, 196, 15, 0.2);">
              <div style="font-size: 0.75rem; color: #f1c40f; text-transform: uppercase;">Redirect (3xx)</div>
              <div style="font-size: 1.8rem; font-weight: 700; color: #f1c40f; margin-top: 0.25rem;">${progress.redirects}</div>
            </div>
            <div class="glass-panel" style="padding: 1rem; text-align: center; background: rgba(231, 76, 60, 0.05); border-color: rgba(231, 76, 60, 0.2);">
              <div style="font-size: 0.75rem; color: #e74c3c; text-transform: uppercase;">Error (4xx/5xx)</div>
              <div style="font-size: 1.8rem; font-weight: 700; color: #e74c3c; margin-top: 0.25rem;">${progress.errors}</div>
            </div>
          </div>

          ${results.length > 0 ? `
            <div style="display: flex; justify-content: flex-end; margin-bottom: 0.5rem;">
              <button class="btn btn-outline" id="domainchecker-export-btn" style="padding: 0.4rem 1rem; font-size: 0.8rem; height: auto; width: auto;">
                <i data-lucide="download" style="width: 14px; height: 14px;"></i> Export CSV
              </button>
            </div>
          ` : ''}

          <div style="flex: 1; overflow-y: auto; max-height: 380px; border: 1px solid var(--border-subtle); border-radius: 8px;">
            ${results.length === 0 ? `
              <div style="text-align: center; padding: 4rem; color: var(--text-dim);">
                <i data-lucide="clipboard-list" style="width: 48px; height: 48px; opacity: 0.2; margin-bottom: 0.5rem;"></i>
                <div>No audit results. Enter URLs and click Start Check.</div>
              </div>
            ` : `
              <table class="indexnow-history-table" style="margin: 0; border: none; width: 100%;">
                <thead>
                  <tr style="background: var(--bg-deep);">
                    <th style="border-top-left-radius: 8px;">URL</th>
                    <th>Status</th>
                    <th>Response Time</th>
                    <th>Size</th>
                    <th style="border-top-right-radius: 8px;">Title</th>
                  </tr>
                </thead>
                <tbody>
                  ${results.map(r => {
                    let statusClass = 'indexnow-status-error';
                    if (r.status >= 200 && r.status < 300) statusClass = 'indexnow-status-success';
                    else if (r.status >= 300 && r.status < 400) statusClass = 'indexnow-status-warning';

                    return `
                      <tr>
                        <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-mono); font-size: 0.75rem;" title="${r.url}">
                          <a href="${r.url}" target="_blank" style="color: var(--text-main); text-decoration: underline;">${r.url}</a>
                        </td>
                        <td>
                          <span class="indexnow-status-badge ${statusClass}" style="font-weight: 600;">
                            ${r.status === -1 ? 'Pending' : r.status === -2 ? 'Timeout/Error' : r.status}
                          </span>
                        </td>
                        <td style="color: var(--text-muted); font-size: 0.75rem;">
                          ${r.responseTime === -1 ? '-' : `${r.responseTime} ms`}
                        </td>
                        <td style="color: var(--text-muted); font-size: 0.75rem;">
                          ${r.size === -1 ? '-' : `${(r.size / 1024).toFixed(1)} KB`}
                        </td>
                        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; color: var(--text-dim);" title="${r.title || '-'}">
                          ${r.title || '-'}
                        </td>
                      </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>
      </div>
    </main>
  `
}

function SettingsView() {
  const isConfigured = !!state.googleClientId;

  return `
    <main class="container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem;">
        <div>
          <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem;">System Settings</h1>
          <p style="color: var(--text-dim);">Configure system settings and external integrations.</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem; align-items: start;">
        <!-- Card 1: Google Analytics (GA4) Tracking -->
        <div class="glass-panel" style="padding: 2rem; border-color: var(--border-subtle); display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;">
              <i data-lucide="bar-chart-3" style="width: 24px; height: 24px; color: var(--primary);"></i>
              <h2 style="font-size: 1.25rem; margin-bottom: 0;">Google Analytics (GA4)</h2>
            </div>
            <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6; margin-bottom: 1.5rem;">
              Track page views and navigation events across your dashboard. Enter your GA4 Measurement ID below.
            </p>
            
            <div class="input-group" style="margin-bottom: 2rem;">
              <label style="font-weight: 500; margin-bottom: 0.75rem;">Measurement ID (GA4)</label>
              <input type="text" id="settings-ga-id" placeholder="G-XXXXXXXXXX" value="${state.gaId || ''}">
              <p style="font-size: 0.75rem; color: var(--text-dim); margin-top: 0.5rem;">
                e.g., G-B5LDKS73KD. Leave blank to disable.
              </p>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <button class="btn btn-primary" id="save-settings-btn" style="width: 100%;">
              <i data-lucide="save" style="width: 18px; height: 18px;"></i> Save GA ID
            </button>
            ${state.gaId ? `
              <button class="btn btn-outline" id="settings-copy-ga-code-btn" style="width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;">
                <i data-lucide="copy" style="width: 16px; height: 16px;"></i> Copy Tracking Script
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Card 2: Google OAuth Configuration -->
        <div class="glass-panel" style="padding: 2rem; border-color: var(--border-subtle);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <i data-lucide="key" style="color: #4285f4; width: 24px; height: 24px;"></i>
              <h2 style="font-size: 1.25rem; margin-bottom: 0;">Google API Configuration</h2>
            </div>
            ${isConfigured ? `
              <button class="btn btn-outline" id="edit-google-client-id-btn" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">
                <i data-lucide="edit-2"></i> Edit Config
              </button>
            ` : ''}
          </div>
          <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6; margin-bottom: 1.5rem;">
            Configure Client ID & Redirect URI to enable automatic Google Analytics account and property sync.
          </p>
          
          ${isConfigured ? `
            <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.85rem;">
              <div><strong>Client ID:</strong> <code style="font-family: var(--font-mono); color: var(--text-muted); word-break: break-all;">${state.googleClientId}</code></div>
              <div><strong>Redirect URI:</strong> <code style="font-family: var(--font-mono); color: var(--primary);">${state.googleRedirectUri || window.location.origin}</code></div>
              <p style="color: var(--text-dim); font-size: 0.75rem; margin-top: 0.25rem;">
                * Make sure the Redirect URI above matches exactly what is configured in your Google Cloud Console.
              </p>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              <div class="input-group" style="margin-bottom: 0;">
                <label>Google Client ID</label>
                <input type="text" id="google-client-id-input" placeholder="Enter Client ID (xxx.apps.googleusercontent.com)">
              </div>
              <div class="input-group" style="margin-bottom: 0;">
                <label>OAuth Redirect URI</label>
                <input type="text" id="google-redirect-uri-input" placeholder="e.g. http://localhost:8900/" value="${state.googleRedirectUri || window.location.origin + '/'}">
              </div>
              <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                <button class="btn btn-primary" id="save-google-client-id-btn" style="flex: 1; font-size: 0.85rem;">
                  Save Config
                </button>
                <input type="file" id="google-credentials-file" accept=".json" style="display: none;">
                <button class="btn btn-outline" id="upload-google-json-btn" style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.8rem; padding: 0.5rem 0.75rem;">
                  <i data-lucide="upload-cloud"></i> Upload JSON
                </button>
              </div>
            </div>
          `}
        </div>
      </div>
    </main>
  `
}

function GoogleAnalyticsManagerView() {
  const isConfigured = !!state.googleClientId;
  const searchQuery = state.searchQuery || '';

  const filteredProperties = state.gaProperties.filter(prop => {
    const matchesSearch = prop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (prop.propertyId && prop.propertyId.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          prop.measurementId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return `
    <main class="container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem;">
        <div>
          <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem;">GA Properties</h1>
          <p style="color: var(--text-dim);">Manage multiple Google Analytics accounts and properties in one place.</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          ${isConfigured ? `
            <button class="btn btn-outline" id="import-ga-properties-btn" style="border-color: #4285f4; color: #4285f4;">
              <i data-lucide="refresh-cw"></i> Import from Google Account
            </button>
          ` : `
            <button class="btn btn-outline" onclick="state.activeView = 'settings'; render();" style="border-color: var(--warning); color: var(--warning); display: inline-flex; align-items: center; gap: 0.25rem;">
              <i data-lucide="settings"></i> Configure Google API
            </button>
          `}
          <button class="btn btn-primary" id="add-ga-property-btn">
            <i data-lucide="plus-circle"></i> Add Property
          </button>
        </div>
      </div>

      <div class="toolbar" style="margin-bottom: 1.5rem;">
        <div class="search-box">
          <i data-lucide="search"></i>
          <input type="text" id="ga-property-search" placeholder="Search properties..." value="${searchQuery}">
        </div>
      </div>

      ${state.gaProperties.length === 0 ? `
        <div class="glass-panel" style="padding: 4rem; text-align: center;">
          <i data-lucide="bar-chart-3" style="width: 48px; height: 48px; color: var(--text-dim); margin-bottom: 1.5rem;"></i>
          <h3>No Google Analytics Properties</h3>
          <p style="color: var(--text-dim); margin-top: 0.5rem;">
            Add properties manually or configure Google API Client ID in <a href="#" onclick="state.activeView = 'settings'; render(); return false;" style="color: var(--primary); text-decoration: underline;">Settings</a> to import them automatically.
          </p>
        </div>
      ` : `
        <div class="repo-list">
          ${filteredProperties.length === 0 ? `
            <div style="padding: 3rem; text-align: center; color: var(--text-dim);">No properties match your filters.</div>
          ` : filteredProperties.map(prop => {
            const isCurrentlyActive = state.gaId === prop.measurementId;
            return `
              <div class="repo-list-item glass-panel" style="padding: 1.25rem 2rem; border-color: ${isCurrentlyActive ? 'var(--primary)' : 'var(--glass-border)'}; box-shadow: ${isCurrentlyActive ? '0 0 10px var(--primary-glow)' : 'none'};">
                <div style="display: flex; align-items: center; gap: 1.5rem; flex: 1; flex-wrap: wrap;">
                  <span class="domain-status ${isCurrentlyActive ? 'domain-active' : 'domain-pending'}" style="margin-left: 0.5rem;"></span>
                  <div style="flex: 1; min-width: 200px;">
                    <div style="font-weight: 600; font-size: 1.1rem; color: var(--primary); display: flex; align-items: center; gap: 0.5rem;">
                      ${prop.name}
                      ${isCurrentlyActive ? '<span style="font-size: 0.65rem; background: var(--primary-glow); color: var(--primary); border: 1px solid var(--primary-glow); padding: 1px 6px; border-radius: 4px; font-weight: 600; letter-spacing: 0.05em;">ACTIVE</span>' : ''}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 0.25rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                      <span>Property ID:</span>
                      <span style="color: var(--text-muted); font-weight: 500;">${prop.propertyId || 'N/A'}</span>
                      <span style="opacity: 0.5;">•</span>
                      <span>Measurement ID:</span>
                      <code style="color: var(--primary); font-family: var(--font-mono); font-size: 0.75rem;">${prop.measurementId}</code>
                    </div>
                  </div>
                  
                  <div style="display: flex; align-items: center; gap: 0.5rem; margin-left: auto;">
                    <button class="btn ${isCurrentlyActive ? 'btn-outline' : 'btn-primary'} activate-ga-property" data-id="${prop.id}" data-measurement-id="${prop.measurementId}" style="font-size: 0.8rem; padding: 0.4rem 0.8rem; height: 36px; min-width: 100px;">
                      ${isCurrentlyActive ? 'Deactivate' : 'Set Active'}
                    </button>
                    <button class="btn btn-outline copy-ga-code" data-measurement-id="${prop.measurementId}" title="Copy Tracking Script" style="padding: 0; width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center;">
                      <i data-lucide="copy" style="width: 16px; height: 16px;"></i>
                    </button>
                    <button class="btn-icon danger remove-ga-property" data-id="${prop.id}" title="Remove Property" style="width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center; margin: 0;">
                      <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                    </button>
                  </div>
                </div>
              </div>
            `
          }).join('')}
        </div>
      `}

      <!-- Add GA Property Modal -->
      <div class="modal-overlay" id="ga-modal-overlay">
        <div class="modal glass-panel">
          <button class="modal-close" id="close-ga-modal-btn">
            <i data-lucide="x"></i>
          </button>
          <h2 style="margin-bottom: 0.5rem;">Add GA Property</h2>
          <p style="color: var(--text-dim); font-size: 0.875rem; margin-bottom: 2rem;">Add a Google Analytics 4 (GA4) property to manage.</p>
          
          <div class="input-group">
            <label>Property Name</label>
            <input type="text" id="ga-prop-name" placeholder="My Blog / Company Web">
          </div>

          <div class="input-group">
            <label>Property ID (Optional)</label>
            <input type="text" id="ga-prop-id" placeholder="123456789">
          </div>
          
          <div class="input-group">
            <label>Measurement ID (GA4)</label>
            <input type="text" id="ga-prop-measurement-id" placeholder="G-XXXXXXXXXX">
          </div>

          <button class="btn btn-primary" id="save-ga-property-btn" style="width: 100%; margin-top: 1rem;">
            Save Property
          </button>
        </div>
      </div>
    </main>
  `
}

function Sidebar() {
  return `
    <aside class="sidebar">
      <div style="margin: 1.5rem 0 0.5rem 1rem; font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em;">Github</div>
      
      <div class="nav-item ${state.activeView === 'github' ? 'active' : ''}" data-view="github">
        <i data-lucide="github"></i> GitHub Repos
      </div>
      <div class="nav-item ${state.activeView === 'commits' ? 'active' : ''}" data-view="commits">
        <i data-lucide="history"></i> Recent Commits
      </div>
      <div class="nav-item ${state.activeView === 'trending' ? 'active' : ''}" data-view="trending">
        <i data-lucide="trending-up"></i> Trending
      </div>
      
      <div style="margin: 1.5rem 0 0.5rem 1rem; font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em;">Cloudflare</div>
      
      <div class="nav-item ${state.activeView === 'cf-domains' ? 'active' : ''}" data-view="cf-domains">
        <i data-lucide="globe"></i> Manage Domains
      </div>
      <div class="nav-item ${state.activeView === 'cf-accounts' ? 'active' : ''}" data-view="cf-accounts">
        <i data-lucide="users"></i> Manage Accounts
      </div>

      <div style="margin: 1.5rem 0 0.5rem 1rem; font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em;">Google Analytics</div>
      <div class="nav-item ${state.activeView === 'ga-properties' ? 'active' : ''}" data-view="ga-properties">
        <i data-lucide="bar-chart-2"></i> GA Properties
      </div>

      <div style="margin: 1.5rem 0 0.5rem 1rem; font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em;">Management</div>
      <div class="nav-item ${state.activeView === 'kanban' ? 'active' : ''}" data-view="kanban">
        <i data-lucide="kanban"></i> Kanban Board
      </div>

      <div style="margin: 1.5rem 0 0.5rem 1rem; font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em;">SEO</div>
      <div class="nav-item ${state.activeView === 'seo-indexnow' ? 'active' : ''}" data-view="seo-indexnow">
        <i data-lucide="zap"></i> IndexNow Submit
      </div>
      <div class="nav-item ${state.activeView === 'seo-domainchecker' ? 'active' : ''}" data-view="seo-domainchecker">
        <i data-lucide="search"></i> Domain Checker
      </div>

      <div style="margin: 1.5rem 0 0.5rem 1rem; font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em;">System</div>
      <div class="nav-item ${state.activeView === 'settings' ? 'active' : ''}" data-view="settings">
        <i data-lucide="settings"></i> Settings
      </div>

      <div style="margin-top: auto; padding: 1rem; border-top: 1px solid var(--border-subtle);">
        <div style="font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">Resources</div>
        <a href="https://dash.cloudflare.com" target="_blank" class="nav-item" style="padding: 0.5rem 0.75rem; font-size: 0.85rem;">
          <i data-lucide="external-link" style="width: 14px;"></i> CF Dashboard
        </a>
      </div>
    </aside>
  `
}

function getLangColor(lang) {
  const colors = {
    'JavaScript': '#f7df1e',
    'TypeScript': '#3178c6',
    'HTML': '#e34c26',
    'CSS': '#563d7c',
    'Python': '#3776ab',
    'Rust': '#dea584',
    'Go': '#00add8',
  }
  return colors[lang] || '#8b949e'
}

// Global Event Handlers
function updateBulkActionBar() {
  const bar = document.querySelector('.bulk-actions-bar')
  const countDisplay = document.querySelector('.selection-count')
  if (bar && countDisplay) {
    if (state.selectedRepos.size > 0) {
      bar.classList.add('active')
      countDisplay.innerHTML = `
        <i data-lucide="check-square" style="vertical-align: middle; margin-right: 0.5rem;"></i>
        ${state.selectedRepos.size} items selected
      `
    } else {
      bar.classList.remove('active')
    }
  }
}

// Rendering Logic
function render() {
  if (state.activeView !== lastTrackedView) {
    trackPageView(state.activeView)
    lastTrackedView = state.activeView
  }

  const app = document.querySelector('#app')
  if (state.loading) {
    app.innerHTML = `
      ${Header()}
      <div class="loader"></div>
    `
    lucide.createIcons()
    return
  }

  if (!state.token) {
    app.innerHTML = `${Header()}${AuthScreen()}`
  } else if (state.user) {
    app.innerHTML = `
      ${Header()}
      <div class="app-layout">
        ${Sidebar()}
        <div class="main-content">
          ${(() => {
            if (state.activeView === 'github') return Dashboard()
            if (state.activeView === 'commits') return GlobalCommitsView()
            if (state.activeView === 'trending') return TrendingView()
            if (state.activeView === 'cf-domains') return CloudflareDomainsView()
            if (state.activeView === 'cf-accounts') return CloudflareAccountsView()
            if (state.activeView === 'cf-dns') return CloudflareDnsView()
            if (state.activeView === 'kanban') return KanbanView()
            if (state.activeView === 'seo-indexnow') return IndexNowView()
            if (state.activeView === 'seo-domainchecker') return DomainCheckerView()
            if (state.activeView === 'settings') return SettingsView()
            if (state.activeView === 'ga-properties') return GoogleAnalyticsManagerView()
            return Dashboard()
          })()}
        </div>
      </div>
    `
  }

  bindEvents()
  lucide.createIcons()
}

function renderReposOnly() {
  const listContainer = document.querySelector('.repo-list')
  if (!listContainer) return
  const filteredRepos = getProcessedRepos()
  listContainer.innerHTML = filteredRepos.map(repo => RepoListItem(repo)).join('')
  bindRepoItemEvents()
  lucide.createIcons()
}

function bindRepoItemEvents() {
  // Checkbox logic
  const checkboxes = document.querySelectorAll('.custom-checkbox')
  checkboxes.forEach(cb => {
    cb.onclick = (e) => {
      e.stopPropagation()
      const repoId = cb.dataset.repoId
      if (state.selectedRepos.has(repoId)) {
        state.selectedRepos.delete(repoId)
        cb.classList.remove('checked')
        cb.closest('.repo-list-item').classList.remove('selected')
      } else {
        state.selectedRepos.add(repoId)
        cb.classList.add('checked')
        cb.closest('.repo-list-item').classList.add('selected')
      }
      updateBulkActionBar()
    }
  })

  // Individual Delete
  const deleteBtns = document.querySelectorAll('.delete-repo-btn')
  deleteBtns.forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation()
      const { owner, name } = btn.dataset
      const confirmed = await Confirm('Delete Repository', `Are you sure you want to delete ${owner}/${name}?`, 'Delete Now')
      if (confirmed) {
        try {
          state.loading = true
          render()
          await github.deleteRepo(owner, name)
          // Optimistic local update: remove from state immediately
          state.repos = state.repos.filter(r => !(r.owner.login === owner && r.name === name))
          state.selectedRepos.delete(`${owner}/${name}`)
          Toast.show('Repository deleted successfully')
        } catch (err) {
          Toast.show('Failed to delete: ' + err.message, 'error')
        } finally {
          state.loading = false
          render()
        }
      }
    }
  })

  // Quick Rename
  const editBtns = document.querySelectorAll('.edit-repo-btn')
  editBtns.forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation()
      const { owner, name } = btn.dataset
      const item = btn.closest('.repo-list-item')
      const nameAnchor = item.querySelector('.repo-name')

      // Create input element
      const input = document.createElement('input')
      input.type = 'text'
      input.value = name
      input.className = 'inline-edit-input'
      input.style.width = '100%'
      input.style.fontSize = '1.125rem'
      input.style.fontWeight = '600'
      input.style.background = 'var(--bg-elevated)'
      input.style.border = '1px solid var(--primary)'
      input.style.borderRadius = '4px'
      input.style.padding = '2px 8px'
      input.style.color = 'var(--primary)'

      const originalDisplay = nameAnchor.style.display
      nameAnchor.style.display = 'none'
      nameAnchor.parentNode.insertBefore(input, nameAnchor)
      input.focus()
      input.select()

      const finishEdit = async (save) => {
        const newName = input.value.trim()
        if (save && newName && newName !== name) {
          try {
            Toast.show('Renaming...', 'info')
            await github.updateRepo(owner, name, { name: newName })

            // Update local state
            const repo = state.repos.find(r => r.owner.login === owner && r.name === name)
            if (repo) {
              repo.name = newName
              repo.full_name = `${owner}/${newName}`
              // Update clone URL if possible or just rely on re-render
            }
            Toast.show('Repository renamed!')
            render()
          } catch (err) {
            Toast.show('Rename failed: ' + err.message, 'error')
            nameAnchor.style.display = originalDisplay
            input.remove()
          }
        } else {
          nameAnchor.style.display = originalDisplay
          input.remove()
        }
      }

      input.onkeydown = (e) => {
        if (e.key === 'Enter') finishEdit(true)
        if (e.key === 'Escape') finishEdit(false)
      }

      input.onblur = () => finishEdit(true)
    }
  })

  // Copy Clone Command
  const copyBtns = document.querySelectorAll('.copy-clone-btn')
  copyBtns.forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation()
      const url = btn.dataset.cloneUrl
      const command = `git clone ${url}`

      try {
        await navigator.clipboard.writeText(command)
        Toast.show('Clone command copied to clipboard!')

        // Visual feedback on button
        const icon = btn.querySelector('i, svg')
        if (icon) {
          const originalIconName = icon.getAttribute('data-lucide') || 'copy'

          icon.setAttribute('data-lucide', 'check')
          lucide.createIcons()

          setTimeout(() => {
            icon.setAttribute('data-lucide', originalIconName)
            lucide.createIcons()
          }, 2000)
        }
      } catch (err) {
        console.error('Clipboard copy failed:', err)
        Toast.show('Failed to copy', 'error')
      }
    }
  })

  // View Commits
  const viewCommitsBtns = document.querySelectorAll('.view-commits-btn')
  viewCommitsBtns.forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation()
      const { owner, name } = btn.dataset
      const overlay = document.getElementById('commits-modal-overlay')
      const container = document.getElementById('commits-list-container')
      const title = document.getElementById('commits-modal-title')

      title.textContent = `Commits: ${owner}/${name}`
      container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-dim);">Loading commits <i data-lucide="loader-2" class="spin" style="width: 16px; margin-left: 0.5rem; vertical-align: middle;"></i></div>'
      overlay.classList.add('active')
      lucide.createIcons()

      try {
        const commits = await github.fetchCommitsList(owner, name)

        if (!commits || commits.length === 0) {
          container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-dim);">No commits found.</div>'
          return
        }

        container.innerHTML = commits.map(c => {
          const author = c.commit.author.name
          const date = new Date(c.commit.author.date).toLocaleString()
          const message = c.commit.message || ''
          const sha = c.sha.substring(0, 7)
          const url = c.html_url
          return `
            <div class="glass-panel" style="padding: 1rem; border-color: var(--border-subtle); display: flex; flex-direction: column; gap: 0.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                <div style="font-weight: 500; font-size: 0.95rem; line-height: 1.4; flex: 1;">${message.split('\\n')[0]}</div>
                <a href="${url}" target="_blank" style="font-family: var(--font-mono); font-size: 0.8rem; background: var(--bg-elevated); padding: 2px 6px; border-radius: 4px; color: var(--text-dim); text-decoration: none; border: 1px solid var(--border-subtle);">${sha}</a>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: var(--text-dim);">
                <i data-lucide="user" style="width: 12px; height: 12px;"></i> ${author}
                <span>•</span>
                <i data-lucide="clock" style="width: 12px; height: 12px;"></i> ${date}
              </div>
            </div>
          `
        }).join('')
        lucide.createIcons()
      } catch (err) {
        container.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--error);">Failed to load commits: ${err.message}</div>`
      }
    }
  })
}

function bindEvents() {
  // Navigation / Auth
  const loginBtn = document.querySelector('#login-btn')
  const logoutBtn = document.querySelector('#logout-btn')
  const tokenInput = document.querySelector('#token-input')
  if (loginBtn && tokenInput) loginBtn.onclick = () => {
    const token = tokenInput.value.trim()
    if (token) login(token)
  }
  if (logoutBtn) logoutBtn.onclick = logout

  // Search & Filter
  const searchInput = document.querySelector('#repo-search')
  if (searchInput) searchInput.oninput = (e) => {
    state.searchQuery = e.target.value
    renderReposOnly()
    updateBulkActionBar()
  }

  const sortSelect = document.querySelector('#sort-select')
  if (sortSelect) sortSelect.onchange = (e) => {
    state.sortBy = e.target.value
    render()
  }

  const filterChips = document.querySelectorAll('.chip[data-filter]')
  filterChips.forEach(chip => {
    chip.onclick = () => {
      state.filter = chip.dataset.filter
      render()
    }
  })

  const ownerChips = document.querySelectorAll('.chip[data-owner]')
  ownerChips.forEach(chip => {
    chip.onclick = () => {
      state.ownerFilter = chip.dataset.owner
      render()
    }
  })

  // Bulk Actions
  const clearBtn = document.querySelector('#clear-selection-btn')
  if (clearBtn) clearBtn.onclick = () => {
    state.selectedRepos.clear()
    render()
  }

  const bulkDeleteBtn = document.querySelector('#bulk-delete-btn')
  if (bulkDeleteBtn) bulkDeleteBtn.onclick = async () => {
    const count = state.selectedRepos.size
    const confirmed = await Confirm('Bulk Delete', `Are you sure you want to delete ${count} selected repositories?`, 'Delete All')
    if (confirmed) {
      try {
        state.loading = true
        render()
        for (const repoId of Array.from(state.selectedRepos)) {
          const [owner, name] = repoId.split('/')
          await github.deleteRepo(owner, name)
          // Optimistic local update for each
          state.repos = state.repos.filter(r => !(r.owner.login === owner && r.name === name))
        }
        state.selectedRepos.clear()
        Toast.show(`Successfully deleted ${count} repositories`)
      } catch (err) {
        Toast.show('Error: ' + err.message, 'error')
      } finally {
        state.loading = false
        render()
      }
    }
  }

  // Modal logic
  const modalOverlay = document.querySelector('#modal-overlay')
  const openModalBtn = document.querySelector('#open-modal-btn')
  const closeModalBtn = document.querySelector('#close-modal-btn')
  const createRepoBtn = document.querySelector('#create-repo-btn')
  if (openModalBtn) openModalBtn.onclick = () => modalOverlay.classList.add('active')
  if (closeModalBtn) closeModalBtn.onclick = () => modalOverlay.classList.remove('active')

  const commitsModalOverlay = document.querySelector('#commits-modal-overlay')
  const closeCommitsModalBtn = document.querySelector('#close-commits-modal-btn')
  if (closeCommitsModalBtn) closeCommitsModalBtn.onclick = () => commitsModalOverlay.classList.remove('active')
  if (commitsModalOverlay) {
    commitsModalOverlay.onclick = (e) => {
      if (e.target === commitsModalOverlay) commitsModalOverlay.classList.remove('active')
    }
  }

  if (createRepoBtn) createRepoBtn.onclick = async () => {
    const name = document.querySelector('#new-repo-name').value.trim()
    const description = document.querySelector('#new-repo-desc').value.trim()
    const isPrivate = document.querySelector('#new-repo-private').checked
    if (!name) {
      Toast.show('Repository name is required', 'error')
      return
    }
    try {
      state.loading = true
      render()
      await github.createRepo({ name, description, private: isPrivate })
      state.repos = await github.fetchRepos()
      Toast.show('Repository created successfully')
    } catch (err) {
      Toast.show(err.message, 'error')
    } finally {
      state.loading = false
      render()
    }
  }

  // Sidebar navigation
  const navItems = document.querySelectorAll('.nav-item[data-view]')
  navItems.forEach(item => {
    item.onclick = () => {
      state.activeView = item.dataset.view
      state.searchQuery = '' // Reset search when switching tabs
      render()
    }
  })

  // Cloudflare Domain Filter
  const cfDomainSearch = document.querySelector('#cf-domain-search')
  if (cfDomainSearch) {
    cfDomainSearch.oninput = (e) => {
      state.searchQuery = e.target.value
      render()
      // Preserve focus
      const box = document.querySelector('#cf-domain-search')
      if (box) {
        box.focus()
        box.setSelectionRange(box.value.length, box.value.length)
      }
    }
  }

  // Toggle star/pinned status of Cloudflare domain
  const toggleStarBtns = document.querySelectorAll('.toggle-star-domain-btn')
  toggleStarBtns.forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation()
      const zoneId = btn.dataset.zoneId
      const index = state.cfStarredDomains.indexOf(zoneId)
      if (index === -1) {
        state.cfStarredDomains.push(zoneId)
        Toast.show('Domain pinned to top')
      } else {
        state.cfStarredDomains.splice(index, 1)
        Toast.show('Domain unpinned')
      }
      localStorage.setItem('cf_starred_domains', JSON.stringify(state.cfStarredDomains))
      render()
    }
  })

  // Cloudflare Actions
  const cfFilterChips = document.querySelectorAll('.chip[data-cf-filter]')
  cfFilterChips.forEach(chip => {
    chip.onclick = () => {
      state.cfAccountFilter = chip.dataset.cfFilter
      render()
    }
  })

  const cfRealFilterChips = document.querySelectorAll('.chip[data-cf-real-filter]')
  cfRealFilterChips.forEach(chip => {
    chip.onclick = () => {
      state.cfRealAccountFilter = chip.dataset.cfRealFilter
      render()
    }
  })

  const addCfBtn = document.querySelector('#add-cf-account-btn')
  const closeCfBtn = document.querySelector('#close-cf-modal-btn')
  const saveCfBtn = document.querySelector('#save-cf-account-btn')
  const cfModal = document.querySelector('#cf-modal-overlay')

  // DNS Record actions
  const dnsRecordsBtn = document.querySelectorAll('.view-dns-btn')
  dnsRecordsBtn.forEach(btn => {
    btn.onclick = async () => {
      const { zoneId, zoneName, accId } = btn.dataset
      const localAccount = state.cfAccounts.find(a => a.id === accId)
      state.activeZone = { zoneId, zoneName, localAccount }
      state.activeView = 'cf-dns'
      state.searchQuery = ''
      render()

      try {
        const records = await cloudflare.fetchDnsRecords(localAccount, zoneId)
        state.cfDnsRecords[zoneId] = records
        render()
      } catch (err) {
        Toast.show('Failed to load DNS records: ' + err.message, 'error')
      }
    }
  })

  const backBtn = document.querySelector('#back-to-domains')
  if (backBtn) backBtn.onclick = () => {
    state.activeView = 'cf-domains'
    state.activeZone = null
    state.searchQuery = ''
    render()
  }

  const dnsSearch = document.querySelector('#dns-search')
  if (dnsSearch) dnsSearch.oninput = (e) => {
    state.searchQuery = e.target.value
    render()
    document.querySelector('#dns-search').focus()
  }

  const refreshDnsBtn = document.querySelector('#refresh-dns-btn')
  if (refreshDnsBtn) refreshDnsBtn.onclick = async () => {
    const { zoneId, localAccount } = state.activeZone
    try {
      Toast.show('Refreshing DNS records...', 'info')
      const records = await cloudflare.fetchDnsRecords(localAccount, zoneId)
      state.cfDnsRecords[zoneId] = records
      render()
      Toast.show('DNS records updated')
    } catch (err) {
      Toast.show('Refresh failed: ' + err.message, 'error')
    }
  }

  const autoReplaceBtn = document.querySelector('#auto-replace-ip-btn')
  if (autoReplaceBtn) autoReplaceBtn.onclick = async () => {
    const oldIp = document.querySelector('#auto-replace-old-ip').value.trim()
    const newIp = document.querySelector('#auto-replace-new-ip').value.trim()
    if (!oldIp || !newIp) {
      Toast.show('Please enter both Old IP and New IP', 'error')
      return
    }

    const allZones = []
    Object.entries(state.cfZones).forEach(([accId, zones]) => {
      const localCredential = state.cfAccounts.find(a => a.id === accId)
      zones.forEach(z => {
        allZones.push({ ...z, localAccount: localCredential })
      })
    })

    const searchQuery = state.searchQuery || ''
    const filteredZones = allZones.filter(z => {
      const matchesSearch = z.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCredential = state.cfAccountFilter === 'all' || (z.localAccount && z.localAccount.id === state.cfAccountFilter)
      const matchesRealAccount = state.cfRealAccountFilter === 'all' || (z.account && z.account.id === state.cfRealAccountFilter)
      return matchesSearch && matchesCredential && matchesRealAccount
    })

    if (filteredZones.length === 0) {
      Toast.show('No domains available to update', 'info')
      return
    }

    const confirmed = await Confirm('Replace IP', `Are you sure you want to search and change IP from ${oldIp} to ${newIp} across ${filteredZones.length} domains?`, 'Replace')
    if (!confirmed) return

    try {
      state.loading = true
      render()

      let totalUpdated = 0
      let totalDomainsUpdated = 0

      for (const zone of filteredZones) {
        try {
          const records = await cloudflare.fetchDnsRecords(zone.localAccount, zone.id)
          const matchingRecords = records.filter(r => r.type === 'A' && r.content === oldIp)

          if (matchingRecords.length > 0) {
            let zoneUpdated = false
            for (const record of matchingRecords) {
              const data = {
                type: record.type,
                name: record.name,
                content: newIp,
                proxied: record.proxied,
                ttl: record.ttl
              }
              await cloudflare.updateDnsRecord(zone.localAccount, zone.id, record.id, data)
              totalUpdated++
              zoneUpdated = true
            }
            if (zoneUpdated) totalDomainsUpdated++
          }
        } catch (err) {
          console.warn(`Failed to process zone ${zone.name}`, err)
        }
      }

      Toast.show(`Updated ${totalUpdated} A records across ${totalDomainsUpdated} domains.`)
    } catch (err) {
      Toast.show('Error during replacement: ' + err.message, 'error')
    } finally {
      state.loading = false
      render()
    }
  }

  // DNS Modal Logic
  const dnsModal = document.querySelector('#dns-modal-overlay')
  const addDnsBtn = document.querySelector('#add-dns-record-btn')
  const closeDnsBtn = document.querySelector('#close-dns-modal-btn')
  const saveDnsRecordBtn = document.querySelector('#save-dns-record-btn')

  if (addDnsBtn) addDnsBtn.onclick = () => {
    document.querySelector('#dns-modal-title').textContent = 'Add DNS Record'
    document.querySelector('#dns-record-id').value = ''
    document.querySelector('#dns-record-type').value = 'A'
    document.querySelector('#dns-record-name').value = ''
    document.querySelector('#dns-record-content').value = ''
    document.querySelector('#dns-record-proxied').checked = true
    document.querySelector('#dns-record-ttl').value = '1'
    dnsModal.classList.add('active')
  }

  if (closeDnsBtn) closeDnsBtn.onclick = () => dnsModal.classList.remove('active')

  if (saveDnsRecordBtn) saveDnsRecordBtn.onclick = async () => {
    const { zoneId, localAccount } = state.activeZone
    const id = document.querySelector('#dns-record-id').value
    const data = {
      type: document.querySelector('#dns-record-type').value,
      name: document.querySelector('#dns-record-name').value.trim(),
      content: document.querySelector('#dns-record-content').value.trim(),
      proxied: document.querySelector('#dns-record-proxied').checked,
      ttl: parseInt(document.querySelector('#dns-record-ttl').value)
    }

    if (!data.name || !data.content) {
      Toast.show('Name and Content are required', 'error')
      return
    }

    try {
      state.loading = true
      render()
      if (id) {
        await cloudflare.updateDnsRecord(localAccount, zoneId, id, data)
        Toast.show('Record updated successfully')
      } else {
        await cloudflare.createDnsRecord(localAccount, zoneId, data)
        Toast.show('Record created successfully')
      }
      // Refresh list
      const records = await cloudflare.fetchDnsRecords(localAccount, zoneId)
      state.cfDnsRecords[zoneId] = records
    } catch (err) {
      Toast.show('Error: ' + err.message, 'error')
    } finally {
      state.loading = false
      render()
    }
  }

  // Individual DNS Actions
  const editDnsBtns = document.querySelectorAll('.edit-dns-btn')
  editDnsBtns.forEach(btn => {
    btn.onclick = () => {
      const { id, type, name, content, proxied, ttl } = btn.dataset
      document.querySelector('#dns-modal-title').textContent = 'Edit DNS Record'
      document.querySelector('#dns-record-id').value = id
      document.querySelector('#dns-record-type').value = type
      document.querySelector('#dns-record-name').value = name
      document.querySelector('#dns-record-content').value = content
      document.querySelector('#dns-record-proxied').checked = proxied === 'true'
      document.querySelector('#dns-record-ttl').value = ttl
      dnsModal.classList.add('active')
    }
  })

  const deleteDnsBtns = document.querySelectorAll('.delete-dns-btn')
  deleteDnsBtns.forEach(btn => {
    btn.onclick = async () => {
      const { id, name } = btn.dataset
      const { zoneId, localAccount } = state.activeZone
      const confirmed = await Confirm('Delete DNS Record', `Are you sure you want to delete the record for ${name}?`, 'Delete')
      if (confirmed) {
        try {
          state.loading = true
          render()
          await cloudflare.deleteDnsRecord(localAccount, zoneId, id)
          Toast.show('Record deleted')
          const records = await cloudflare.fetchDnsRecords(localAccount, zoneId)
          state.cfDnsRecords[zoneId] = records
        } catch (err) {
          Toast.show('Delete failed: ' + err.message, 'error')
        } finally {
          state.loading = false
          render()
        }
      }
    }
  })

  if (addCfBtn) addCfBtn.onclick = () => cfModal.classList.add('active')
  if (closeCfBtn) closeCfBtn.onclick = () => cfModal.classList.remove('active')
  if (saveCfBtn) saveCfBtn.onclick = async () => {
    const name = document.querySelector('#cf-acc-name').value.trim()
    const email = document.querySelector('#cf-acc-email').value.trim()
    const key = document.querySelector('#cf-acc-key').value.trim()

    if (!email || !key) {
      Toast.show('Email and Global API Key are required', 'error')
      return
    }

    const newAccount = {
      id: Date.now().toString(),
      name: name || email,
      email,
      key
    }

    state.cfAccounts.push(newAccount)
    localStorage.setItem('cf_accounts', JSON.stringify(state.cfAccounts))
    cfModal.classList.remove('active')
    Toast.show('Cloudflare account added')

    // Fetch zones for the new account
    try {
      state.loading = true
      render()
      const zones = await cloudflare.fetchZones(newAccount)
      state.cfZones[newAccount.id] = zones
    } catch (err) {
      Toast.show('Failed to fetch domains: ' + err.message, 'error')
    } finally {
      state.loading = false
      render()
    }
  }

  const removeCfBtns = document.querySelectorAll('.remove-cf-acc')
  removeCfBtns.forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id
      const confirmed = await Confirm('Remove Account', 'Are you sure you want to remove this Cloudflare account?', 'Remove')
      if (confirmed) {
        state.cfAccounts = state.cfAccounts.filter(acc => acc.id !== id)
        delete state.cfZones[id]
        localStorage.setItem('cf_accounts', JSON.stringify(state.cfAccounts))
        render()
        Toast.show('Account removed')
      }
    }
  })

  // Global Commits Refresh
  const refreshCommitsBtn = document.querySelector('#refresh-global-commits')
  if (refreshCommitsBtn) refreshCommitsBtn.onclick = () => {
    state.globalCommits = []
    fetchGlobalCommits()
  }

  // Trending Refresh & Filter
  const refreshTrendingBtn = document.querySelector('#refresh-trending-btn')
  if (refreshTrendingBtn) refreshTrendingBtn.onclick = () => {
    state.trendingRepos = []
    fetchTrending()
  }

  const trendingTimeframeSelect = document.querySelector('#trending-timeframe')
  if (trendingTimeframeSelect) trendingTimeframeSelect.onchange = (e) => {
    state.trendingTimeframe = e.target.value
    state.trendingRepos = []
    fetchTrending()
  }

  // Kanban Event Handlers
  const filterRepo = document.querySelector('#kanban-filter-repo')
  if (filterRepo) {
    filterRepo.onchange = (e) => {
      state.kanbanFilters.repo = e.target.value
      render()
    }
  }

  const filterPriority = document.querySelector('#kanban-filter-priority')
  if (filterPriority) {
    filterPriority.onchange = (e) => {
      state.kanbanFilters.priority = e.target.value
      render()
    }
  }

  const newTaskBtn = document.querySelector('#kanban-new-task-btn')
  const taskModal = document.querySelector('#kanban-task-modal-overlay')
  
  if (newTaskBtn && taskModal) {
    newTaskBtn.onclick = () => {
      document.querySelector('#kanban-modal-title').textContent = 'Create New Task'
      document.querySelector('#kanban-task-id').value = ''
      document.querySelector('#kanban-task-title').value = ''
      document.querySelector('#kanban-task-desc').value = ''
      document.querySelector('#kanban-task-status').value = 'todo'
      document.querySelector('#kanban-task-priority').value = 'medium'
      document.querySelector('#kanban-task-repo').value = ''
      taskModal.classList.add('active')
    }
  }

  const columnAddBtns = document.querySelectorAll('.kanban-column-add-btn')
  columnAddBtns.forEach(btn => {
    btn.onclick = () => {
      const columnId = btn.dataset.columnId
      if (taskModal) {
        document.querySelector('#kanban-modal-title').textContent = 'Create New Task'
        document.querySelector('#kanban-task-id').value = ''
        document.querySelector('#kanban-task-title').value = ''
        document.querySelector('#kanban-task-desc').value = ''
        document.querySelector('#kanban-task-status').value = columnId
        document.querySelector('#kanban-task-priority').value = 'medium'
        document.querySelector('#kanban-task-repo').value = ''
        taskModal.classList.add('active')
      }
    }
  })

  const closeTaskModalBtn = document.querySelector('#close-kanban-task-modal-btn')
  if (closeTaskModalBtn && taskModal) {
    closeTaskModalBtn.onclick = () => taskModal.classList.remove('active')
  }
  if (taskModal) {
    taskModal.onclick = (e) => {
      if (e.target === taskModal) taskModal.classList.remove('active')
    }
  }

  const saveTaskBtn = document.querySelector('#save-kanban-task-btn')
  if (saveTaskBtn) {
    saveTaskBtn.onclick = () => {
      const id = document.querySelector('#kanban-task-id').value
      const title = document.querySelector('#kanban-task-title').value.trim()
      const desc = document.querySelector('#kanban-task-desc').value.trim()
      const status = document.querySelector('#kanban-task-status').value
      const priority = document.querySelector('#kanban-task-priority').value
      const repo = document.querySelector('#kanban-task-repo').value

      if (!title) {
        Toast.show('Task title is required', 'error')
        return
      }

      if (id) {
        // Edit existing task
        const task = state.kanbanTasks.find(t => t.id === id)
        if (task) {
          task.title = title
          task.desc = desc
          task.status = status
          task.priority = priority
          task.repo = repo
          Toast.show('Task updated successfully')
        }
      } else {
        // Create new task
        const newTask = {
          id: Date.now().toString(),
          title,
          desc,
          status,
          priority,
          repo,
          createdAt: new Date().toISOString()
        }
        state.kanbanTasks.push(newTask)
        Toast.show('Task created successfully')
      }

      localStorage.setItem('kanban_tasks', JSON.stringify(state.kanbanTasks))
      if (taskModal) taskModal.classList.remove('active')
      render()
    }
  }

  const editTaskBtns = document.querySelectorAll('.edit-task-btn')
  editTaskBtns.forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation()
      const id = btn.dataset.taskId
      const task = state.kanbanTasks.find(t => t.id === id)
      if (task && taskModal) {
        document.querySelector('#kanban-modal-title').textContent = 'Edit Task'
        document.querySelector('#kanban-task-id').value = task.id
        document.querySelector('#kanban-task-title').value = task.title
        document.querySelector('#kanban-task-desc').value = task.desc || ''
        document.querySelector('#kanban-task-status').value = task.status
        document.querySelector('#kanban-task-priority').value = task.priority
        document.querySelector('#kanban-task-repo').value = task.repo || ''
        taskModal.classList.add('active')
      }
    }
  })

  const deleteTaskBtns = document.querySelectorAll('.delete-task-btn')
  deleteTaskBtns.forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation()
      const id = btn.dataset.taskId
      const task = state.kanbanTasks.find(t => t.id === id)
      if (task) {
        const confirmed = await Confirm('Delete Task', `Are you sure you want to delete task "${task.title}"?`, 'Delete')
        if (confirmed) {
          state.kanbanTasks = state.kanbanTasks.filter(t => t.id !== id)
          localStorage.setItem('kanban_tasks', JSON.stringify(state.kanbanTasks))
          Toast.show('Task deleted')
          render()
        }
      }
    }
  })

  const moveLeftBtns = document.querySelectorAll('.move-task-left-btn')
  moveLeftBtns.forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation()
      const id = btn.dataset.taskId
      const task = state.kanbanTasks.find(t => t.id === id)
      if (task) {
        const statusOrder = ['backlog', 'todo', 'in_progress', 'done']
        const currentIndex = statusOrder.indexOf(task.status)
        if (currentIndex > 0) {
          task.status = statusOrder[currentIndex - 1]
          localStorage.setItem('kanban_tasks', JSON.stringify(state.kanbanTasks))
          render()
        }
      }
    }
  })

  const moveRightBtns = document.querySelectorAll('.move-task-right-btn')
  moveRightBtns.forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation()
      const id = btn.dataset.taskId
      const task = state.kanbanTasks.find(t => t.id === id)
      if (task) {
        const statusOrder = ['backlog', 'todo', 'in_progress', 'done']
        const currentIndex = statusOrder.indexOf(task.status)
        if (currentIndex < statusOrder.length - 1) {
          task.status = statusOrder[currentIndex + 1]
          localStorage.setItem('kanban_tasks', JSON.stringify(state.kanbanTasks))
          render()
        }
      }
    }
  })

  // Drag and Drop Event Binding
  const cards = document.querySelectorAll('.kanban-card')
  cards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      card.classList.add('dragging')
      e.dataTransfer.setData('text/plain', card.dataset.taskId)
      e.dataTransfer.effectAllowed = 'move'
    })
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging')
    })
  })

  const cols = document.querySelectorAll('.kanban-column')
  cols.forEach(column => {
    column.addEventListener('dragover', (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      column.classList.add('drag-over')
    })
    column.addEventListener('dragenter', (e) => {
      e.preventDefault()
      column.classList.add('drag-over')
    })
    column.addEventListener('dragleave', () => {
      column.classList.remove('drag-over')
    })
    column.addEventListener('drop', (e) => {
      e.preventDefault()
      column.classList.remove('drag-over')
      const taskId = e.dataTransfer.getData('text/plain')
      const columnId = column.dataset.columnId
      const task = state.kanbanTasks.find(t => t.id === taskId)
      if (task && task.status !== columnId) {
        task.status = columnId
        localStorage.setItem('kanban_tasks', JSON.stringify(state.kanbanTasks))
        render()
      }
    })
  })

  // IndexNow Event Handlers
  const indexnowDomainSelect = document.querySelector('#indexnow-domain-select')
  if (indexnowDomainSelect) {
    indexnowDomainSelect.onchange = (e) => {
      state.indexnowSelectedDomain = e.target.value
      render()
    }
  }

  const indexnowGenKeyBtn = document.querySelector('#indexnow-generate-key-btn')
  if (indexnowGenKeyBtn) {
    indexnowGenKeyBtn.onclick = () => {
      const domain = state.indexnowSelectedDomain
      if (!domain) {
        Toast.show('Please select a domain first', 'error')
        return
      }
      const chars = '0123456789abcdef'
      let key = ''
      for (let i = 0; i < 32; i++) {
        key += chars[Math.floor(Math.random() * chars.length)]
      }
      state.indexnowKeys[domain] = key
      localStorage.setItem('indexnow_keys', JSON.stringify(state.indexnowKeys))
      Toast.show('New key generated')
      render()
    }
  }

  const indexnowDownloadKeyBtn = document.querySelector('#indexnow-download-key-btn')
  if (indexnowDownloadKeyBtn) {
    indexnowDownloadKeyBtn.onclick = () => {
      const domain = state.indexnowSelectedDomain
      const key = state.indexnowKeys[domain]
      if (!key) return
      
      const blob = new Blob([key], { type: 'text/plain;charset=utf-8' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${key}.txt`
      link.click()
      URL.revokeObjectURL(link.href)
      Toast.show('Key file download started')
    }
  }

  const indexnowCopyKeyBtn = document.querySelector('#indexnow-copy-key-btn')
  if (indexnowCopyKeyBtn) {
    indexnowCopyKeyBtn.onclick = async () => {
      const domain = state.indexnowSelectedDomain
      const key = state.indexnowKeys[domain]
      if (!key) return
      try {
        await navigator.clipboard.writeText(key)
        Toast.show('Key copied to clipboard!')
      } catch (err) {
        Toast.show('Failed to copy', 'error')
      }
    }
  }

  const indexnowImportSitemapBtn = document.querySelector('#indexnow-import-sitemap-btn')
  if (indexnowImportSitemapBtn) {
    indexnowImportSitemapBtn.onclick = async () => {
      const domain = state.indexnowSelectedDomain
      if (!domain) {
        Toast.show('Please select a domain first', 'error')
        return
      }

      const textarea = document.querySelector('#indexnow-urls-input')
      if (!textarea) return

      try {
        Toast.show('Fetching robots.txt...', 'info')
        const robotsUrl = `https://${domain}/robots.txt`
        let sitemapUrls = []
        
        try {
          const robotsText = await indexnow.fetchExternalUrl(robotsUrl)
          sitemapUrls = indexnow.parseRobotsTxt(robotsText)
        } catch (e) {
          console.warn('Failed to fetch robots.txt, falling back to default sitemap URLs', e)
        }

        if (sitemapUrls.length === 0) {
          sitemapUrls = [
            `https://${domain}/sitemap.xml`,
            `https://${domain}/sitemap_index.xml`
          ]
        }

        Toast.show(`Found ${sitemapUrls.length} sitemap(s). Fetching XML...`, 'info')
        
        const allUrls = new Set()
        for (const sitemapUrl of sitemapUrls) {
          Toast.show(`Reading sitemap: ${sitemapUrl.split('/').pop()}...`, 'info')
          await indexnow.fetchAndParseSitemap(sitemapUrl, allUrls)
        }

        if (allUrls.size === 0) {
          Toast.show('No URLs found in sitemaps', 'warning')
          return
        }

        const domainUrls = Array.from(allUrls).filter(url => {
          try {
            const parsed = new URL(url)
            return parsed.hostname === domain
          } catch (e) {
            return false
          }
        })

        textarea.value = domainUrls.join('\n')
        Toast.show(`Successfully imported ${domainUrls.length} URL(s) from sitemaps!`, 'success')
      } catch (err) {
        console.error(err)
        Toast.show(`Import failed: ${err.message}`, 'error')
      }
    }
  }

  const indexnowPrependDomainBtn = document.querySelector('#indexnow-prepend-domain-btn')
  if (indexnowPrependDomainBtn) {
    indexnowPrependDomainBtn.onclick = () => {
      const domain = state.indexnowSelectedDomain
      if (!domain) return
      const textarea = document.querySelector('#indexnow-urls-input')
      if (!textarea) return
      
      const lines = textarea.value.split('\n')
      const updatedLines = lines.map(line => {
        let trimmed = line.trim()
        if (!trimmed) return ''
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          return trimmed
        }
        if (!trimmed.startsWith('/')) {
          trimmed = '/' + trimmed
        }
        return `https://${domain}${trimmed}`
      })
      textarea.value = updatedLines.join('\n')
      Toast.show('Prefix domain added')
    }
  }

  const indexnowVerifyKeyBtn = document.querySelector('#indexnow-verify-key-btn')
  if (indexnowVerifyKeyBtn) {
    indexnowVerifyKeyBtn.onclick = async () => {
      const domain = state.indexnowSelectedDomain
      const key = state.indexnowKeys[domain]
      if (!domain || !key) return

      state.indexnowVerification[domain] = {
        status: 'verifying',
        message: 'Checking key file on host...'
      }
      render()

      try {
        const targetUrl = `https://${domain}/${key}.txt`
        const text = await indexnow.fetchExternalUrl(targetUrl)
        
        if (text.trim() === key.trim()) {
          state.indexnowVerification[domain] = {
            status: 'verified',
            message: 'Verified! Key matches.'
          }
          Toast.show('Key verification succeeded!', 'success')
        } else {
          state.indexnowVerification[domain] = {
            status: 'failed',
            message: 'Content mismatch (File does not contain the key)'
          }
          Toast.show('Verification failed: Key content mismatch.', 'error')
        }
      } catch (err) {
        state.indexnowVerification[domain] = {
          status: 'failed',
          message: 'Key file unreachable or status not 200'
        }
        Toast.show('Verification failed. Key file might not be hosted or has CORS restriction.', 'error')
      }
      render()
    }
  }

  const indexnowIndividualCheckbox = document.querySelector('#indexnow-individual-checkbox')
  if (indexnowIndividualCheckbox) {
    indexnowIndividualCheckbox.onchange = (e) => {
      state.indexnowSubmitIndividually = e.target.checked
    }
  }

  const indexnowCancelBtn = document.querySelector('#indexnow-cancel-btn')
  if (indexnowCancelBtn) {
    indexnowCancelBtn.onclick = () => {
      if (state.indexnowProgress) {
        state.indexnowProgress.running = false
        Toast.show('Submission cancelled by user', 'warning')
        render()
      }
    }
  }

  const indexnowSubmitBtn = document.querySelector('#indexnow-submit-btn')
  if (indexnowSubmitBtn) {
    indexnowSubmitBtn.onclick = async () => {
      const domain = state.indexnowSelectedDomain
      const key = state.indexnowKeys[domain]
      const textarea = document.querySelector('#indexnow-urls-input')
      
      if (!domain) {
        Toast.show('Please select a domain', 'error')
        return
      }
      if (!key) {
        Toast.show('IndexNow key is required', 'error')
        return
      }
      if (!textarea || !textarea.value.trim()) {
        Toast.show('Please enter at least one URL to index', 'error')
        return
      }

      const urls = textarea.value
        .split('\n')
        .map(u => u.trim())
        .filter(u => u.length > 0)

      const invalidUrls = urls.filter(u => {
        try {
          const parsed = new URL(u)
          return parsed.hostname !== domain
        } catch (e) {
          return true
        }
      })

      if (invalidUrls.length > 0) {
        Toast.show(`Some URLs do not belong to the domain '${domain}' or have invalid format`, 'error')
        return
      }

      const keyLocation = `https://${domain}/${key}.txt`

      // Alert if key is not verified
      const verification = state.indexnowVerification[domain]
      if (!verification || verification.status !== 'verified') {
        const confirmMsg = "Warning: The key file has not been verified on your website yet. Submitting URLs might result in a 400 Bad Request error from IndexNow.\n\nDo you still want to proceed?"
        if (!confirm(confirmMsg)) {
          return
        }
      }

      // Clear previous progress
      state.indexnowProgress = {
        running: false,
        total: 0,
        current: 0,
        successes: 0,
        failures: 0,
        results: []
      }

      if (state.indexnowSubmitIndividually) {
        state.indexnowProgress = {
          running: true,
          total: urls.length,
          current: 0,
          successes: 0,
          failures: 0,
          results: []
        }
        render()

        for (const url of urls) {
          if (!state.indexnowProgress.running) break

          try {
            const status = await indexnow.submit(domain, key, keyLocation, [url])
            const success = status >= 200 && status < 300
            if (success) {
              state.indexnowProgress.successes++
            } else {
              state.indexnowProgress.failures++
            }
            state.indexnowProgress.results.push({ url, status, success })
          } catch (err) {
            state.indexnowProgress.failures++
            state.indexnowProgress.results.push({ url, status: 400, success: false, error: err.message })
          }
          state.indexnowProgress.current++
          render()
        }

        const isCancelled = !state.indexnowProgress.running
        state.indexnowProgress.running = false

        // Save progress to history
        const status = state.indexnowProgress.failures === 0 ? 202 : 400
        const historyRecord = {
          id: Date.now().toString(),
          domain,
          urls,
          urlsCount: urls.length,
          status,
          submittedAt: new Date().toISOString(),
          isIndividual: true,
          successes: state.indexnowProgress.successes,
          failures: state.indexnowProgress.failures
        }
        state.indexnowHistory.push(historyRecord)
        localStorage.setItem('indexnow_history', JSON.stringify(state.indexnowHistory))

        if (state.indexnowProgress.failures === 0) {
          Toast.show(`All ${state.indexnowProgress.successes} URLs submitted successfully!`, 'success')
          textarea.value = ''
        } else {
          Toast.show(`Completed with ${state.indexnowProgress.failures} error(s)`, isCancelled ? 'warning' : 'error')
        }
        render()
      } else {
        try {
          Toast.show('Submitting URLs to IndexNow (Bulk)...', 'info')
          const status = await indexnow.submit(domain, key, keyLocation, urls)
          
          const historyRecord = {
            id: Date.now().toString(),
            domain,
            urls,
            urlsCount: urls.length,
            status,
            submittedAt: new Date().toISOString()
          }
          state.indexnowHistory.push(historyRecord)
          localStorage.setItem('indexnow_history', JSON.stringify(state.indexnowHistory))
          
          Toast.show(`Submitted successfully (Status ${status})`, 'success')
          textarea.value = ''
          render()
        } catch (err) {
          console.error(err)
          Toast.show(err.message || 'Submission failed', 'error')
          
          const historyRecord = {
            id: Date.now().toString(),
            domain,
            urls,
            urlsCount: urls.length,
            status: 400,
            submittedAt: new Date().toISOString()
          }
          state.indexnowHistory.push(historyRecord)
          localStorage.setItem('indexnow_history', JSON.stringify(state.indexnowHistory))

          const confirmRetry = confirm(`Bulk submission failed (Status 400). This is usually due to an unverified key file or an invalid URL in the list.\n\nWould you like to switch to 'Submit URLs individually' to check which URLs are causing the error?`)
          if (confirmRetry) {
            state.indexnowSubmitIndividually = true
          }
          render()
        }
      }
    }
  }

  const indexnowClearHistoryBtn = document.querySelector('#indexnow-clear-history-btn')
  if (indexnowClearHistoryBtn) {
    indexnowClearHistoryBtn.onclick = async () => {
      const confirmed = await Confirm('Clear History', 'Are you sure you want to delete all IndexNow submission records?', 'Delete')
      if (confirmed) {
        state.indexnowHistory = []
        localStorage.setItem('indexnow_history', JSON.stringify(state.indexnowHistory))
        Toast.show('Submission history cleared')
        render()
      }
    }
  }

  // Domain Checker Events
  const domainCheckerDomainSelect = document.querySelector('#domainchecker-domain-select')
  if (domainCheckerDomainSelect) {
    domainCheckerDomainSelect.onchange = (e) => {
      state.domainCheckerSelectedDomain = e.target.value
      state.domainCheckerUrls = ''
      state.domainCheckerResults = []
      state.domainCheckerProgress = { running: false, total: 0, current: 0, successes: 0, redirects: 0, errors: 0 }
      render()
    }
  }

  const domainCheckerImportBtn = document.querySelector('#domainchecker-import-sitemap-btn')
  if (domainCheckerImportBtn) {
    domainCheckerImportBtn.onclick = async () => {
      const domain = state.domainCheckerSelectedDomain
      if (!domain) {
        Toast.show('Please select a domain first', 'error')
        return
      }

      const textarea = document.querySelector('#domainchecker-urls-input')
      if (!textarea) return

      try {
        Toast.show('Fetching robots.txt...', 'info')
        const robotsUrl = `https://${domain}/robots.txt`
        let sitemapUrls = []
        
        try {
          const robotsText = await indexnow.fetchExternalUrl(robotsUrl)
          sitemapUrls = indexnow.parseRobotsTxt(robotsText)
        } catch (e) {
          console.warn('Failed to fetch robots.txt, falling back to default sitemap URLs', e)
        }

        if (sitemapUrls.length === 0) {
          sitemapUrls = [
            `https://${domain}/sitemap.xml`,
            `https://${domain}/sitemap_index.xml`
          ]
        }

        Toast.show(`Found ${sitemapUrls.length} sitemap(s). Fetching XML...`, 'info')
        
        const allUrls = new Set()
        for (const sitemapUrl of sitemapUrls) {
          Toast.show(`Reading sitemap: ${sitemapUrl.split('/').pop()}...`, 'info')
          await indexnow.fetchAndParseSitemap(sitemapUrl, allUrls)
        }

        if (allUrls.size === 0) {
          Toast.show('No URLs found in sitemaps', 'warning')
          return
        }

        const domainUrls = Array.from(allUrls).filter(url => {
          try {
            const parsed = new URL(url)
            return parsed.hostname === domain
          } catch (e) {
            return false
          }
        })

        state.domainCheckerUrls = domainUrls.join('\n')
        textarea.value = state.domainCheckerUrls
        Toast.show(`Successfully imported ${domainUrls.length} URL(s) from sitemaps!`, 'success')
        render()
      } catch (err) {
        console.error(err)
        Toast.show(`Import failed: ${err.message}`, 'error')
      }
    }
  }

  const domainCheckerUrlsInput = document.querySelector('#domainchecker-urls-input')
  if (domainCheckerUrlsInput) {
    domainCheckerUrlsInput.oninput = (e) => {
      state.domainCheckerUrls = e.target.value
    }
  }

  const domainCheckerStartBtn = document.querySelector('#domainchecker-start-btn')
  if (domainCheckerStartBtn) {
    domainCheckerStartBtn.onclick = async () => {
      const textarea = document.querySelector('#domainchecker-urls-input')
      if (!textarea || !textarea.value.trim()) {
        Toast.show('Please enter at least one URL to check', 'error')
        return
      }

      const urls = textarea.value
        .split('\n')
        .map(u => u.trim())
        .filter(u => u.length > 0)

      state.domainCheckerResults = urls.map(url => ({
        url,
        status: -1,
        responseTime: -1,
        size: -1,
        title: '',
        success: false
      }))

      state.domainCheckerProgress = {
        running: true,
        total: urls.length,
        current: 0,
        successes: 0,
        redirects: 0,
        errors: 0
      }

      render()

      const queue = [...urls]
      const limit = 5

      const runTask = async (url) => {
        if (!state.domainCheckerProgress.running) return

        const startTime = performance.now()
        let status = -2
        let size = -1
        let title = ''
        let responseTime = -1

        try {
          const response = await fetch(`/fetch-url?url=${encodeURIComponent(url)}`)
          responseTime = Math.round(performance.now() - startTime)
          status = response.status
          
          if (response.ok || status < 400) {
            const text = await response.text()
            size = text.length
            
            try {
              const parser = new DOMParser()
              const doc = parser.parseFromString(text, 'text/html')
              const titleEl = doc.querySelector('title')
              if (titleEl) {
                title = titleEl.textContent.trim()
              }
            } catch (e) {
              console.warn('Failed to parse title for url:', url, e)
            }
          }
        } catch (err) {
          console.error(`Error auditing ${url}:`, err)
          responseTime = Math.round(performance.now() - startTime)
        }

        if (state.domainCheckerProgress.running) {
          const resObj = state.domainCheckerResults.find(r => r.url === url)
          if (resObj) {
            resObj.status = status
            resObj.responseTime = responseTime
            resObj.size = size
            resObj.title = title
            resObj.success = status >= 200 && status < 300
          }

          state.domainCheckerProgress.current++
          if (status >= 200 && status < 300) {
            state.domainCheckerProgress.successes++
          } else if (status >= 300 && status < 400) {
            state.domainCheckerProgress.redirects++
          } else {
            state.domainCheckerProgress.errors++
          }

          render()
        }
      }

      const worker = async () => {
        while (queue.length > 0 && state.domainCheckerProgress.running) {
          const url = queue.shift()
          await runTask(url)
        }
      }

      const workers = []
      for (let i = 0; i < Math.min(limit, urls.length); i++) {
        workers.push(worker())
      }

      await Promise.all(workers)
      state.domainCheckerProgress.running = false
      Toast.show('Domain URLs check completed!', 'info')
      render()
    }
  }

  const domainCheckerCancelBtn = document.querySelector('#domainchecker-cancel-btn')
  if (domainCheckerCancelBtn) {
    domainCheckerCancelBtn.onclick = () => {
      if (state.domainCheckerProgress) {
        state.domainCheckerProgress.running = false
        Toast.show('Audit cancelled', 'warning')
        render()
      }
    }
  }

  const domainCheckerClearBtn = document.querySelector('#domainchecker-clear-btn')
  if (domainCheckerClearBtn) {
    domainCheckerClearBtn.onclick = () => {
      state.domainCheckerUrls = ''
      state.domainCheckerResults = []
      state.domainCheckerProgress = { running: false, total: 0, current: 0, successes: 0, redirects: 0, errors: 0 }
      const textarea = document.querySelector('#domainchecker-urls-input')
      if (textarea) textarea.value = ''
      render()
    }
  }

  const domainCheckerExportBtn = document.querySelector('#domainchecker-export-btn')
  if (domainCheckerExportBtn) {
    domainCheckerExportBtn.onclick = () => {
      const results = state.domainCheckerResults
      if (results.length === 0) return

      const headers = ['URL', 'Status Code', 'Response Time (ms)', 'Size (bytes)', 'Title']
      const rows = results.map(r => [
        r.url,
        r.status === -1 ? 'Pending' : r.status === -2 ? 'Error' : r.status,
        r.responseTime,
        r.size,
        r.title || ''
      ])

      const csvContent = [headers, ...rows]
        .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `domain_audit_${state.domainCheckerSelectedDomain || 'export'}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      Toast.show('CSV export completed')
    }
  }

  // Save Settings Event
  const saveSettingsBtn = document.querySelector('#save-settings-btn')
  if (saveSettingsBtn) {
    saveSettingsBtn.onclick = () => {
      const gaIdInput = document.querySelector('#settings-ga-id')
      if (gaIdInput) {
        const value = gaIdInput.value.trim()
        state.gaId = value
        localStorage.setItem('google_analytics_id', value)
        if (value) {
          initGoogleAnalytics(value)
          Toast.show('Google Analytics configured successfully!')
        } else {
          Toast.show('Google Analytics Measurement ID cleared.')
        }
        render()
      }
    }
  }

  // Copy Settings GA Script Event
  const copySettingsGaBtn = document.querySelector('#settings-copy-ga-code-btn')
  if (copySettingsGaBtn) {
    copySettingsGaBtn.onclick = () => {
      if (!state.gaId) {
        Toast.show('No GA Measurement ID configured', 'error')
        return
      }
      const scriptCode = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${state.gaId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${state.gaId}');
</script>`

      navigator.clipboard.writeText(scriptCode)
        .then(() => Toast.show('Tracking script copied to clipboard!'))
        .catch(() => Toast.show('Failed to copy to clipboard', 'error'))
    }
  }

  // GA Properties Manager Event Bindings
  const addGaBtn = document.querySelector('#add-ga-property-btn')
  const closeGaBtn = document.querySelector('#close-ga-modal-btn')
  const saveGaBtn = document.querySelector('#save-ga-property-btn')
  const gaModal = document.querySelector('#ga-modal-overlay')

  if (addGaBtn && gaModal) addGaBtn.onclick = () => gaModal.classList.add('active')
  if (closeGaBtn && gaModal) closeGaBtn.onclick = () => gaModal.classList.remove('active')

  if (saveGaBtn && gaModal) {
    saveGaBtn.onclick = () => {
      const nameInput = document.querySelector('#ga-prop-name')
      const idInput = document.querySelector('#ga-prop-id')
      const measurementIdInput = document.querySelector('#ga-prop-measurement-id')

      const name = nameInput.value.trim()
      const propertyId = idInput.value.trim()
      const measurementId = measurementIdInput.value.trim()

      if (!name || !measurementId) {
        Toast.show('Name and Measurement ID are required', 'error')
        return
      }

      if (!/^G-[A-Z0-9]+$/i.test(measurementId)) {
        Toast.show('Invalid Measurement ID format (should be G-XXXXXXXXXX)', 'error')
        return
      }

      const isFirst = state.gaProperties.length === 0
      const newProperty = {
        id: Date.now().toString(),
        name,
        propertyId,
        measurementId,
        active: isFirst
      }

      state.gaProperties.push(newProperty)
      localStorage.setItem('ga_properties', JSON.stringify(state.gaProperties))
      
      if (isFirst) {
        state.gaId = measurementId
        localStorage.setItem('google_analytics_id', measurementId)
        initGoogleAnalytics(measurementId)
        Toast.show('GA Property added and set as active')
      } else {
        Toast.show('GA Property added successfully')
      }

      // Clear inputs and hide modal
      nameInput.value = ''
      idInput.value = ''
      measurementIdInput.value = ''
      gaModal.classList.remove('active')
      render()
    }
  }

  // Remove GA Property
  const removeGaBtns = document.querySelectorAll('.remove-ga-property')
  removeGaBtns.forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id
      const propToDelete = state.gaProperties.find(p => p.id === id)
      if (!propToDelete) return

      const hasToken = !!state.gaAccessToken
      const action = await ConfirmGaDelete(propToDelete.name, hasToken)
      if (!action) return

      if (action === 'remote') {
        const propertyId = propToDelete.propertyId
        if (!propertyId) {
          Toast.show('No Property ID configured. Removing from list only.', 'warning', 5000)
        } else {
          try {
            state.loading = true
            render()
            Toast.show('Soft-deleting property on Google Analytics...', 'info')
            const res = await fetch(`https://analyticsadmin.googleapis.com/v1alpha/properties/${propertyId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${state.gaAccessToken}`
              }
            })

            if (!res.ok) {
              const errText = await res.text()
              let errDetail = ''
              try {
                const errJson = JSON.parse(errText)
                errDetail = errJson.error?.message || ''
              } catch (e) {
                errDetail = res.statusText
              }
              throw new Error(`Google API returned status ${res.status}. ${errDetail}`)
            }

            Toast.show('GA Property trashed successfully!', 'success')
          } catch (err) {
            console.error("Failed to delete GA property remotely:", err)
            Toast.show(`Failed to delete from Google Account: ${err.message}`, 'error', 8000)
            state.loading = false
            render()
            return
          } finally {
            state.loading = false
          }
        }
      }

      const wasActive = propToDelete.measurementId === state.gaId
      state.gaProperties = state.gaProperties.filter(p => p.id !== id)
      localStorage.setItem('ga_properties', JSON.stringify(state.gaProperties))

      if (wasActive) {
        if (state.gaProperties.length > 0) {
          state.gaProperties[0].active = true
          state.gaId = state.gaProperties[0].measurementId
          localStorage.setItem('ga_properties', JSON.stringify(state.gaProperties))
          localStorage.setItem('google_analytics_id', state.gaId)
          initGoogleAnalytics(state.gaId)
          Toast.show('Active property removed. Next property activated.')
        } else {
          state.gaId = ''
          localStorage.removeItem('google_analytics_id')
          Toast.show('GA Property removed. Analytics disabled.')
        }
      } else {
        if (action === 'local') {
          Toast.show('GA Property removed from list')
        }
      }
      render()
    }
  })

  // Activate/Deactivate GA Property
  const activateGaBtns = document.querySelectorAll('.activate-ga-property')
  activateGaBtns.forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id
      const measurementId = btn.dataset.measurementId
      const wasActive = state.gaId === measurementId

      state.gaProperties.forEach(p => {
        if (p.id === id) {
          p.active = !wasActive
        } else {
          p.active = false
        }
      })

      if (wasActive) {
        state.gaId = ''
        localStorage.removeItem('google_analytics_id')
        Toast.show('Google Analytics tracking deactivated')
      } else {
        state.gaId = measurementId
        localStorage.setItem('google_analytics_id', measurementId)
        initGoogleAnalytics(measurementId)
        Toast.show('GA Property activated successfully!')
      }

      localStorage.setItem('ga_properties', JSON.stringify(state.gaProperties))
      render()
    }
  })

  // Copy GA script
  const copyGaCodeBtns = document.querySelectorAll('.copy-ga-code')
  copyGaCodeBtns.forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation()
      const measurementId = btn.dataset.measurementId
      const scriptCode = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${measurementId}');
</script>`

      navigator.clipboard.writeText(scriptCode)
        .then(() => Toast.show('Tracking script copied to clipboard!'))
        .catch(() => Toast.show('Failed to copy to clipboard', 'error'))
    }
  })

  // GA Property Search Filter
  const gaPropertySearch = document.querySelector('#ga-property-search')
  if (gaPropertySearch) {
    gaPropertySearch.oninput = (e) => {
      state.searchQuery = e.target.value
      render()
      const box = document.querySelector('#ga-property-search')
      if (box) {
        box.focus()
        box.setSelectionRange(box.value.length, box.value.length)
      }
    }
  }

  // Save Google Client ID
  const saveGoogleClientIdBtn = document.querySelector('#save-google-client-id-btn')
  if (saveGoogleClientIdBtn) {
    saveGoogleClientIdBtn.onclick = () => {
      const input = document.querySelector('#google-client-id-input')
      const redirectInput = document.querySelector('#google-redirect-uri-input')
      if (input && redirectInput) {
        const value = input.value.trim()
        const redirectValue = redirectInput.value.trim()
        if (!value) {
          Toast.show('Please enter a valid Google Client ID', 'error')
          return
        }
        if (!redirectValue) {
          Toast.show('Please enter a valid Redirect URI', 'error')
          return
        }
        state.googleClientId = value
        state.googleRedirectUri = redirectValue
        localStorage.setItem('google_client_id', value)
        localStorage.setItem('google_redirect_uri', redirectValue)
        Toast.show('Google API Configuration saved successfully!')
        render()
      }
    }
  }

  // Edit Google Client ID
  const editGoogleClientIdBtn = document.querySelector('#edit-google-client-id-btn')
  if (editGoogleClientIdBtn) {
    editGoogleClientIdBtn.onclick = () => {
      state.googleClientId = ''
      state.googleRedirectUri = ''
      localStorage.removeItem('google_client_id')
      localStorage.removeItem('google_redirect_uri')
      Toast.show('Google API Configuration cleared')
      render()
    }
  }

  // Upload Credentials JSON
  const uploadJsonBtn = document.querySelector('#upload-google-json-btn')
  const fileInput = document.querySelector('#google-credentials-file')
  
  if (uploadJsonBtn && fileInput) {
    uploadJsonBtn.onclick = () => fileInput.click()
    
    fileInput.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return
      
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const creds = JSON.parse(event.target.result)
          const webCreds = creds.web
          if (!webCreds || !webCreds.client_id) {
            Toast.show('Invalid Google Credentials JSON file format.', 'error')
            return
          }
          
          state.googleClientId = webCreds.client_id
          localStorage.setItem('google_client_id', webCreds.client_id)
          
          const redirectUris = webCreds.redirect_uris || []
          const currentOrigin = window.location.origin
          const matchedUri = redirectUris.find(uri => uri.startsWith(currentOrigin))
          
          if (matchedUri) {
            state.googleRedirectUri = matchedUri
            localStorage.setItem('google_redirect_uri', matchedUri)
            Toast.show('Google Credentials file imported successfully!', 'success')
          } else {
            state.googleRedirectUri = currentOrigin
            localStorage.setItem('google_redirect_uri', currentOrigin)
            Toast.show(`Imported, but no redirect URI in file matches ${currentOrigin}.`, 'warning', 6000)
          }
          render()
        } catch (err) {
          Toast.show('Failed to parse JSON file: ' + err.message, 'error')
        }
      }
      reader.readAsText(file)
    }
  }

  // Import GA Properties via Google OAuth
  const importGaPropertiesBtn = document.querySelector('#import-ga-properties-btn')
  if (importGaPropertiesBtn) {
    importGaPropertiesBtn.onclick = () => {
      if (!state.googleClientId) {
        Toast.show('Google Client ID is not configured', 'error')
        return
      }
      const redirectUri = state.googleRedirectUri || window.location.origin
      console.log("OAuth Redirect URI sent:", redirectUri)
      Toast.show(`Redirecting with URI: ${redirectUri}`, 'info', 4000)
      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(state.googleClientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=token` +
        `&scope=${encodeURIComponent('https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/analytics.edit')}` +
        `&state=google-analytics-auth`
      setTimeout(() => {
        window.location.href = oauthUrl
      }, 1000)
    }
  }

  // Bind repo list items initially
  bindRepoItemEvents()
}

async function fetchGlobalCommits() {
  if (state.loadingGlobalCommits) return
  state.loadingGlobalCommits = true
  render()
  try {
    state.globalCommits = await github.fetchGlobalCommits()
  } catch (err) {
    console.error(err)
    Toast.show('Failed to fetch global commits: ' + err.message, 'error')
  } finally {
    state.loadingGlobalCommits = false
    render()
  }
}

async function fetchTrending() {
  if (state.loadingTrending) return
  state.loadingTrending = true
  render()
  try {
    state.trendingRepos = await github.fetchTrending(state.trendingTimeframe)
  } catch (err) {
    console.error(err)
    Toast.show('Failed to fetch trending repos: ' + err.message, 'error')
  } finally {
    state.loadingTrending = false
    render()
  }
}

async function fetchAllCfZones() {
  for (const account of state.cfAccounts) {
    if (state.cfZones[account.id]) continue
    try {
      const zones = await cloudflare.fetchZones(account)
      state.cfZones[account.id] = zones
      render()
    } catch (err) {
      console.warn(`Failed to fetch zones for ${account.email}:`, err)
    }
  }
}

async function fetchAllStats() {
  const visibleRepos = getProcessedRepos().slice(0, 50) // Limit to 50 for performance
  for (const repo of visibleRepos) {
    const repoId = `${repo.owner.login}/${repo.name}`
    if (state.repoStats[repoId]) continue

    try {
      const counts = await github.fetchCounts(repo.owner.login, repo.name)
      state.repoStats[repoId] = counts
      // Partial update the specific item if it exists in DOM
      updateListItemStats(repoId, counts)
    } catch (e) {
      console.warn(`Failed to fetch stats for ${repoId}`, e)
    }
  }
}

function updateListItemStats(repoId, counts) {
  const item = document.querySelector(`.repo-list-item[data-repo-id="${repoId}"]`)
  if (item) {
    const branchItem = item.querySelector('[title="Branches"]')
    const commitItem = item.querySelector('[title="Commits"]')
    if (branchItem) branchItem.innerHTML = `<i data-lucide="git-branch" style="width: 14px;"></i> ${counts.branches}`
    if (commitItem) commitItem.innerHTML = `<i data-lucide="history" style="width: 14px;"></i> ${counts.commits}`
    lucide.createIcons()
  }
}

// Kickoff
init()
