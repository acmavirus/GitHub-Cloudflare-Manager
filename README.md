# GITCORE v2.2 — Ultimate Webmaster & DevOps Desktop Suite 🚀

**GITCORE v2.2** là trung tâm điều hành desktop tất cả-trong-một (All-in-One Desktop Hub) được xây dựng trên nền tảng **Tauri 2.0 (Rust) + React 19 + TypeScript + Tailwind CSS**. 

Ứng dụng tích hợp toàn diện hệ sinh thái quản trị hạ tầng website và bộ công cụ tìm kiếm lớn nhất thế giới vào một bảng điều khiển duy nhất.

---

## 🧭 Kiến trúc Điều hướng & Module Chức năng

### 🐙 1. DevOps & Code
- **GitHub Repository Manager**: Quản lý repos, xem commit & branch metrics, inline rename, copy lệnh `git clone`, xóa an toàn và xóa hàng loạt (Bulk Delete). Khám phá GitHub Trending repos theo Daily / Weekly / Monthly.
- **Kanban Task Manager**: Bảng theo dõi công việc 4 cột (To Do, In Progress, Review, Done) liên kết trực tiếp với từng repository.

### ☁️ 2. Domains & Cloud
- **Cloudflare Domains & DNS Manager**: Quản lý các Zones và bản ghi DNS (A, AAAA, CNAME, TXT, MX, NS...).
- **Tính năng độc quyền Bulk IP Replacement**: Quét và thay thế địa chỉ IP máy chủ cũ sang mới trên hàng loạt tên miền chỉ với 1 cú click.
- **Cloudflare Multi-Accounts**: Quản lý và chuyển đổi nhanh giữa nhiều tài khoản Cloudflare Global API Keys.

### 🌐 3. Search Engines & Webmaster Suite *(Tích hợp từ GSC Dashboard)*
- **🔍 Google Search Console (GSC) Central**:
  - Hỗ trợ kết nối qua **Google Service Account JSON Key** hoặc OAuth Access Token.
  - Tự động quét và liệt kê toàn bộ các website được cấp quyền trên Google Search Console.
  - Báo cáo số liệu 28 ngày: **Clicks**, **Lượt Hiển thị (Impressions)**, **CTR**, **Vị trí trung bình**.
  - Bảng xếp hạng **Top Từ Khóa (Top Queries)** và **Top Trang Đích (Top Pages)**.
- **🟦 Bing Webmaster Tools**:
  - Kết nối qua Bing Webmaster API Key.
  - Quản lý danh sách website, xem hạn mức submit URL hàng ngày (Submission Quota).
  - Bảng thống kê từ khóa và thứ hạng trên Bing.
  - Gửi URL lập chỉ mục tức thì tới Bing Bot (`SubmitUrl` & `SubmitUrlBatch`).
- **🔴 Yandex Webmaster Hub**:
  - Kết nối qua Yandex OAuth Token.
  - Quản lý danh sách website, xem **Chỉ số chất lượng SQI (ИКС)** và số trang đã lập chỉ mục.
  - Gửi yêu cầu Yandex Bot quét lại đường dẫn tức thì (Re-crawl Queue).
- **⚡ Fast Indexing Hub**:
  - **IndexNow Engine**: Submit URL tức thì tới Bing, Yandex, Seznam, Naver... kèm kiểm tra tệp xác minh key trên hosting.
  - **Baidu Ziyuan Push Engine**: Đẩy link trực tiếp tới Baidu Spider qua Site Push Token và quản lý hạn mức hàng ngày.
- **📊 Google Analytics 4 (GA4)**:
  - Quản lý Measurement ID và lấy nhanh đoạn mã nhúng `gtag.js`.

### 🔍 4. Diagnostics & System
- **Domain Auditor & Sitemap Checker**: Trích xuất URLs từ Sitemap XML, kiểm tra đa luồng HTTP status, thời gian phản hồi, kích thước, tiêu đề SEO và xuất báo cáo ra CSV.
- **System Settings**: Quản lý giao diện Cyber Dark / Light, xem thông số động cơ native và dọn sạch bộ nhớ ứng dụng.

---

## 🛠 Tech Stack

- **Desktop Engine**: [Tauri 2.0](https://tauri.app/) (Rust Native)
- **Frontend**: [React 19](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/) + [Vite 7](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (Cyber Glass Design System)
- **Crypto & Security**: `jose` (Web Crypto JWT signing cho Google Service Account)
- **State & Data**: [Zustand](https://zustand-demo.pmnd.rs/) + [TanStack React Query v5](https://tanstack.com/)
- **Storage**: `@tauri-apps/plugin-store` (Offline-first persistent storage trên AppData)

---

## 🚀 Hướng dẫn khởi chạy

```powershell
# Chạy ứng dụng Desktop ở chế độ Development
npm run tauri dev

# Đóng gói bản cài đặt độc lập (.exe)
npm run tauri build
```
