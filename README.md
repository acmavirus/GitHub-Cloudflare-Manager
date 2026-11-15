# GITCORE v2.0 — Premium Dev & Site Management Hub 🚀

**GITCORE v2.0** là thế hệ ứng dụng máy tính (Desktop App) thế hệ mới được tái thiết kế toàn diện trên nền tảng **Tauri 2.0 (Rust) + React 19 + TypeScript + Tailwind CSS**. 

Ứng dụng gom toàn bộ tác vụ vận hành website & DevOps hàng ngày của bạn vào một giao diện Cyberpunk Glassmorphism mượt mà: quản lý GitHub repositories, cấu hình Cloudflare DNS đa tài khoản, đo lường Google Analytics 4, lập chỉ mục tìm kiếm siêu tốc IndexNow, kiểm toán sitemap domain và quản lý tiến độ Kanban.

---

## ✨ Điểm nổi bật phiên bản v2.0

- ⚡ **Siêu nhẹ & Tiết kiệm tài nguyên**: Kích thước file cài đặt chỉ **~10-15MB**, mức tiêu hao RAM chỉ **~35-50MB** (thay vì 100MB+ và 200MB RAM của kiến trúc Python PyWebView cũ).
- 🛡️ **Bypass CORS tự nhiên (Direct Socket)**: Sử dụng `@tauri-apps/plugin-http` của Tauri 2.0 để gọi trực tiếp tới Cloudflare API, GitHub API, IndexNow và các máy chủ bên ngoài từ tầng Rust Native — **không cần proxy trung gian, không bị chặn CORS**.
- 🧩 **Kiến trúc Feature-Driven**: Toàn bộ mã nguồn monolithic 4,600 dòng đã được phân tách thành các module React + TypeScript độc lập, kiểu dữ liệu chặt chẽ và an toàn tuyệt đối.
- 💾 **Lưu trữ cấu hình bền vững**: Sử dụng `@tauri-apps/plugin-store` lưu trực tiếp vào hệ thống file `AppData` của máy, không lo mất dữ liệu khi xóa cache trình duyệt.

---

## 🛠 Tech Stack

- **Desktop Runtime**: [Tauri 2.0](https://tauri.app/) (Rust 1.90+)
- **Frontend Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite 7](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (Custom Cyber Dark / Light Glass Design System)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State & Caching**: [Zustand](https://zustand-demo.pmnd.rs/) + [TanStack React Query v5](https://tanstack.com/query/latest)
- **Native Plugins**:
  - `@tauri-apps/plugin-http` (CORS-free HTTP requests)
  - `@tauri-apps/plugin-store` (Persistent Key-Value Storage)
  - `@tauri-apps/plugin-clipboard-manager` (Clipboard integration)
  - `@tauri-apps/plugin-opener` (Default system browser launcher)
  - `@tauri-apps/plugin-notification` (System desktop notifications)

---

## 🚀 Hướng dẫn phát triển & Khởi chạy

### Yêu cầu hệ thống
1. **Node.js**: v18+ (khuyên dùng v20 hoặc v22)
2. **Rust & Cargo**: v1.78+ ([Tải Rustup](https://rustup.rs/))
3. **Microsoft C++ Build Tools** (trên Windows)

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Chạy ứng dụng Desktop ở chế độ Development
Lệnh này sẽ khởi động Vite dev server và mở ngay cửa sổ ứng dụng Desktop:
```bash
npm run tauri dev
```

*(Hoặc nếu chỉ muốn chạy giao diện trên trình duyệt web: `npm run dev`)*

### 3. Đóng gói ứng dụng Desktop (.exe / .msi)
Lệnh này sẽ biên dịch mã nguồn Rust và đóng gói thành file cài đặt độc lập:
```bash
npm run tauri build
```
File cài đặt hoàn thiện sẽ nằm tại thư mục: `src-tauri/target/release/bundle/`.

---

## 📦 Danh sách Module chức năng

1. **GitHub Repository Manager**:
   - Xác thực an toàn qua Personal Access Token (PAT).
   - Đổi tên trực tiếp (Inline Rename), sao chép lệnh `git clone` 1-click.
   - Xóa đơn lẻ và **Xóa hàng loạt (Bulk Delete)** an toàn với hộp thoại xác nhận.
   - Khám phá bảng xếp hạng **GitHub Trending** (Daily / Weekly / Monthly).

2. **Cloudflare Domains & DNS Manager**:
   - Quản lý đa tài khoản Cloudflare qua Global API Key.
   - Quản lý Zones và danh sách bản ghi DNS (A, AAAA, CNAME, TXT, MX, NS...).
   - **Tính năng độc quyền Bulk IP Replacement**: Tự động tìm và thay thế địa chỉ IP cũ sang IP mới cho toàn bộ tên miền khi chuyển đổi máy chủ.

3. **Google Analytics 4**:
   - Quản lý danh sách Properties và Measurement ID.
   - 1-Click sao chép đoạn mã nhúng `gtag.js`.

4. **IndexNow Submitter**:
   - Gửi yêu cầu lập chỉ mục tức thì tới Bing, Yandex, Seznam.
   - Kiểm tra và xác thực file key trên hosting/tên miền.
   - Lưu trữ lịch sử submit.

5. **Domain Auditor & URL Checker**:
   - Tự động trích xuất URLs từ file XML Sitemap.
   - Kiểm tra mã trạng thái HTTP, độ trễ phản hồi (ms), dung lượng trang và thẻ tiêu đề SEO.
   - Xuất toàn bộ báo cáo kiểm toán ra định dạng CSV.

6. **Kanban Tasks**:
   - Bảng quản lý tiến độ 4 cột (To Do, In Progress, Review, Done).
   - Gắn công việc với từng repository cụ thể và thiết lập độ ưu tiên.

7. **System Settings**:
   - Chuyển đổi linh hoạt giao diện Cyber Dark / Light.
   - Kiểm tra trạng thái runtime và khôi phục cài đặt gốc an toàn.
