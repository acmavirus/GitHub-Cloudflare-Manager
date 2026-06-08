# GITCORE - Premium Dev & Site Management Hub 🚀

**GITCORE** is a high-performance, aesthetically pleasing "Cyber Premium" web application designed for developers and web administrators. It aggregates your daily operations—managing GitHub repositories, Cloudflare DNS configurations, Google Analytics properties, indexing web pages via IndexNow, auditing site URLs, and tracking tasks—into a single unified, glassmorphic desktop-like dashboard.

---

## ✨ Features

### 🐙 GitHub Repository Manager
- 🔐 **Secure Login**: Connect securely using your GitHub Personal Access Token (PAT).
- 📊 **Real-time Metrics**: View commits count, branches, stars, and forks at a glance.
- ⚡ **Direct Operations**:
  - **Inline Rename**: Edit repository names directly inside the listing.
  - **Clone Command**: Copy `git clone` command to clipboard with a single click.
  - **Bulk Deletion**: Select multiple repositories and trash them in one bulk operation.
- 🔍 **Advanced Filters**: Filter repositories by visibility (Public/Private), Type (Source/Fork), or Owner (User vs Organizations).
- 📈 **Explore**: View global public commits and trending repositories directly inside the application.

### ☁️ Cloudflare Domain & DNS Manager
- 🔑 **Multi-Account Integration**: Add multiple Cloudflare credentials using Global API Keys.
- 🌐 **Unified Domains View**: Access all zones and domain records grouped by organization or API key.
- 🛠️ **DNS Records Control**: Full support to view and modify DNS records (A, AAAA, CNAME, TXT, MX, NS) with proxy status toggles.
- 🔄 **Bulk IP Replacement**: Find and replace IP addresses for A records across multiple filtered domains in a single click (ideal for server migration).

### 📊 Google Analytics 4 (GA4) Manager
- 🔑 **Google OAuth Integration**: Connect your Google Account to fetch and sync properties automatically.
- 📋 **Horizontal List Layout**: View and search GA4 properties via a clean horizontal list including active status trackers, Property IDs, and Measurement IDs.
- 🎯 **Active Script Copying**: One-click to copy Google Analytics tracking code (`gtag.js`).
- 🗑️ **Dual Deletion Flow**:
  - **Remove from List**: Deletes the local tracking entry in your manager dashboard.
  - **Delete from Google Analytics**: Soft-deletes the actual property on Google's servers via the Google Admin API (requires OAuth authentication with `analytics.edit` scope).

### 🚀 IndexNow Submitter
- ⚡ **Fast Search Engine Indexing**: Submit URLs directly to IndexNow-supported search engines (like Bing, Yandex, Seznam).
- 🔑 **Key Management**: Save and verify your unique key files on your domains.
- 📝 **Bulk or Individual Submission**: Submit multiple URLs in a single batch, or select individual mode to track exactly which URLs succeeded or failed.
- 📜 **History Log**: Keeps a submission log with status codes and request summaries in browser cache.

### 🔍 Domain Auditor & URL Checker
- 🌐 **XML Sitemap Import**: Automatically parse and extract URLs from site sitemaps (detects through `robots.txt` paths).
- ⚙️ **Performance & Audit**: Perform multi-threaded checks on URLs to measure Response Times, HTTP Status Codes, File Size, and SEO Page Titles.
- 📥 **Export to CSV**: Export auditing reports to a standard CSV spreadsheet for diagnostics.

### 📋 Kanban Task Manager
- 🗂️ **Visual Boards**: Organize development work using standard Kanban columns (To Do, In Progress, Review, Done).
- 🔗 **Repo Linking**: Assign tasks directly to specific GitHub repositories.
- 🏷️ **Priority and Filters**: Set Priority Levels (Low, Medium, High) and filter tasks dynamically by project or level.

---

## 🛠 Tech Stack

- **Core**: Vanilla JavaScript (ES6+), HTML5 Semantic layout
- **Styling**: Custom Vanilla CSS (Modern CSS variables, Flexbox/Grid, perpetual glassmorphic blur filters, custom scrollbars)
- **Icons**: Lucide Icons
- **Build Tool**: Vite (Ultra-fast HMR)
- **Environment**: Docker-Ready (Docker Compose)

---

## 🚀 Getting Started

### Prerequisites
1. Docker Desktop (Recommended container setup) OR Node.js (v18+)
2. API Access Tokens (see instructions below for details)

### Installation (Docker - Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/app-github.git
   cd app-github
   ```

2. **Spin up container**
   ```bash
   docker-compose down ; docker-compose up -d --build
   ```

3. Open your browser and navigate to: `http://localhost:8900`

### Installation (Node.js Local)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run dev server**
   ```bash
   npm run dev
   ```

3. The application will serve at `http://localhost:5173` (or the default Vite development port).

---

## 🔑 API Configuration & Setup

### 1. GitHub Personal Access Token (PAT)
1. Go to your **GitHub Settings** -> **Developer settings** -> **Personal access tokens** -> **Tokens (classic)**.
2. Click **Generate new token (classic)**.
3. Configure scopes:
   - Check `repo` (Full control of private and public repositories).
   - Check `user` (Read/write profile metadata).
4. Generate the token, copy it, and paste it into GITCORE's Login Screen.

### 2. Cloudflare API Key
1. Go to your Cloudflare Dashboard -> My Profile -> **API Tokens**.
2. Locate the **Global API Key** row and click **View**.
3. In GITCORE's Cloudflare view, enter your **Cloudflare Account Email** and the **Global API Key**.

### 3. Google API & OAuth Configuration (for GA4 Property Manager)
To enable automated importing and property deletion, configure OAuth credentials:
1. Go to the **Google Cloud Console** and select/create a project.
2. Navigate to **APIs & Services** -> **Library** and enable the **Google Analytics Admin API**.
3. Navigate to **OAuth consent screen**:
   - Choose User Type (External/Internal) and fill in application details.
   - Under Scopes, add:
     - `https://www.googleapis.com/auth/analytics.readonly`
     - `https://www.googleapis.com/auth/analytics.edit` (Required for remote deletion/trashing).
4. Navigate to **Credentials** -> **Create Credentials** -> **OAuth client ID**:
   - Select **Web application** as application type.
   - Add **Authorized JavaScript origins** (e.g. `http://localhost:8900` if using Docker, or `http://localhost:5173` if local).
   - Add **Authorized redirect URIs** (e.g., `http://localhost:8900/callback` or your custom domain setup).
5. Click Save, and download the client credentials JSON file.
6. In GITCORE's GA Properties view, click **Configure Google API** and upload this JSON file (or copy the Client ID and Redirect URI manually). Click **Save Config**.

---

Built with ❤️ by AcmaTvirus
