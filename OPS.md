# Vận hành (OPS) — Restaurant Management SaaS

Tài liệu vận hành cho môi trường production trên **Render (server) + Vercel (client) + MongoDB Atlas**.

## Kiến trúc triển khai

| Thành phần | Nơi deploy | Stack |
|---|---|---|
| Server API + Socket.io | Render (free tier) | Node 22, Express, Mongoose |
| Client web | Vercel | React + Vite |
| Database | MongoDB Atlas | M0/M10 |
| Upload ảnh | Cloudinary | — |
| Thanh toán | VNPay sandbox | — |

---

## 1. Env production

### Server — set trên Render dashboard (môi trường: Production)

Copy từ `server/.env.example`:

| Biến | Giá trị prod |
|---|---|
| `PORT` | `8000` (Render tự chèn port, có thể để trống) |
| `MONGODB_URL` | Connection string Atlas |
| `ALLOWED_ORIGINS` | `https://<client>.vercel.app` (comma-separated nếu nhiều domain) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Random 64-byte hex |
| `SENTRY_DSN` | *(optional)* DSN Node.js project |

> **Lưu ý CORS:** app **luôn** cho phép thêm các origin local dev (`localhost:5173`, `192.168.1.93:5173`, `*.ngrok-free.app`) bên cạnh `ALLOWED_ORIGINS` để không làm hỏng dev local. Trong prod, browser vẫn chỉ thực sự gọi được từ origin có trong allowlist.
> **Socket.io CORS** giữ `origin: '*'` — khách tại bàn (QR) truy cập từ nhiều nguồn không thể liệt kê hết. Bảo mật thực tế nằm ở lớp JWT tenant verify, không phải CORS.

### Client — set trên Vercel dashboard (build-time)

Copy từ `client/.env.example`:

| Biến | Giá trị prod |
|---|---|
| `VITE_SERVER_BASE_URL` | `https://<server>.onrender.com` |
| `VITE_SENTRY_DSN` | *(optional)* DSN React project |

> `VITE_*` được nạp **lúc build**. Đổi giá trị → phải deploy lại build mới.

---

## 2. Ping giữ tỉnh (giảm cold start Render free tier)

Render free tier tự sleep sau ~15 phút không có request. Cold start mỗi lần ~1-5 phút đầu.

**Giải pháp (chọn 1):**

- **UptimeRobot** (free 50 monitor): tạo monitor HTTP(S) gọi `GET https://<server>.onrender.com/api/restaurants`, interval **5 phút**.
- **cron-job.org** (free): cron `*/5 * * * *` curl endpoint trên.
- **GitHub Action scheduled**: workflow chạy mỗi 10 phút curl endpoint (cần deploy repo lên GitHub).

> `GET /api/restaurants` là endpoint public, nhẹ (đã verify bằng test). Dùng nó thay vì `/` để chắc chắn app + DB connect đang sống.
> Vẫn có thể có cold start khi tăng đột biến → **chấp nhận cho MVP**. Nếu cần, nâng lên Render paid (không sleep).

---

## 3. Sentry (monitoring)

Chưa bật — chỉ ghi hướng dẫn. Khi cần:

1. Tạo tài khoản [sentry.io](https://sentry.io) → tạo **2 project**: `restaurant-server` (Node.js), `restaurant-client` (React).
2. Server: `npm i @sentry/node` trong `server`, init có điều kiện:
   ```ts
   if (process.env.SENTRY_DSN) {
     Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
   }
   ```
   Thêm `Sentry.Handlers.errorHandler()` **sau** router, trước error handler hiện có.
3. Client: `npm i @sentry/react`, init có điều kiện:
   ```ts
   if (import.meta.env.VITE_SENTRY_DSN) {
     Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, tracesSampleRate: 0.1 });
   }
   ```
   Bọc `<ErrorBoundary>` quanh `<App/>` trong `main.tsx` (dùng `Sentry.ErrorBoundary` hoặc `react-error-boundary`).
4. Không có DSN → không init → không crash local (đây là yêu cầu bắt buộc).

---

## 4. Backup database

**Khuyến nghị chính: Atlas Cloud Backup (PITR)**
- Bật trong Atlas → Organization/Project → Back up & Restore → *Continuous Cloud Backup* (PITR) + schedule snapshot.
- Khôi phục được tại bất kỳ thời điểm nào, không tốn hạ tầng thêm.

**Phương án thay thế — script `mongodump`:**
- `server/scripts/backup.sh` — dump toàn bộ DB ra `server/backups/<timestamp>/`, tự xoá bản cũ (giữ mặc định 7 bản, đổi bằng `KEEP`).
- **KHÔNG chạy trên Render** — disk của Render là ephemeral, mất khi restart. Chạy trên máy ngoài: GitHub Actions / cron-job.org / VPS.
- Schedule mỗi 24h, upload lên S3/Google Drive nếu muốn giữ ngoài repo.

Test backup: chạy `bash server/scripts/backup.sh` rồi kiểm tra thư mục `server/backups/`.

---

## 5. Deploy steps

### Server (Render)

1. New → **Web Service**, kết nối repo, branch `main`.
2. Root directory: `server`, Build command: `npm ci && npm run build`, Start command: `npm start`.
3. Set toàn bộ env ở mục 1.
4. Deploy. Kiểm tra logs không lỗi + truy cập `https://<server>.onrender.com/api/restaurants`.

### Client (Vercel)

1. Import repo → framework **Vite**.
2. Root directory: `client`, Build command: `npm ci && npm run build`, Output: `dist`.
3. Set `VITE_SERVER_BASE_URL` ở build-time.
4. Deploy. Mở browser → login → kiểm tra không có CORS error (xem console).

---

## 6. Checklist khi deploy lần đầu

- [ ] `GET /api/restaurants` từ browser không CORS error.
- [ ] Socket connect được (xem console client, không báo error).
- [ ] Upload ảnh lên Cloudinary hoạt động.
- [ ] Ping giữ tỉnh đang chạy (UptimeRobot / cron).
- [ ] Atlas backup bật.
- [ ] `.env.example` đã đầy đủ biến (so với `.env` thật).
