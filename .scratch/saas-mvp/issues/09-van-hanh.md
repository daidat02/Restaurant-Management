# 09 — Vận hành: ping giữ tỉnh + CORS/env domain thật + Sentry + backup

**What to build:** Chuẩn bị vận hành cho môi trường production thật: Render free tier (có sleep) + Vercel + MongoDB Atlas. Giảm thiểu cold start, cấu hình đúng domain, thêm monitoring và backup.

**Blocked by:** (chạy song song được với 07/08; nên xong trước khi deploy thật).

**Status:** ready-for-agent

Chi tiết kỹ thuật:

### 1. Ping giữ tỉnh (giảm thiểu cold start free tier)
- Dùng uptime robot / cron bên ngoài (UptimeRobot, cron-job.org, hoặc GitHub Action scheduled) gọi `GET /api/restaurants` (public, nhẹ) mỗi ~5 phút để Render không sleep (free ~15 phút).
- Ghi chú trong tài liệu vận hành: vẫn có thể có cold start khi scale đột biến; chấp nhận cho MVP.

### 2. CORS + env domain thật
- Render (server): set `ALLOWED_ORIGINS=https://<client>.vercel.app` (server đọc env, đã có sẵn logic split — `server/src/index.ts:20-28`). Dọn hardcode ngrok/192.168 nếu không cần (hoặc để lại cho local).
- Vercel (client): set `VITE_SERVER_BASE_URL=https://<server>.onrender.com` (build-time).
- Socket cors `origin:'*'` (`socketsConfig.ts:9-10`) — cân nhắc thu hẹp theo `ALLOWED_ORIGINS` (quyết định: giữ `*` nếu khách tại bàn truy cập từ nhiều nguồn, hoặc thu hẹp — ghi chú).
- Verify HTTPS + CORS hoạt động từ browser thật.

### 3. Sentry
- Cài `@sentry/node` (server) + `@sentry/react` (client); init khi có `SENTRY_DSN` (server) / `VITE_SENTRY_DSN` (client) — không init nếu thiếu (không phá local).
- Capture error middleware server + `ErrorBoundary` client.
- Test: gây lỗi mẫu → xuất hiện trong Sentry project (nếu có DSN) hoặc không crash khi không có DSN.

### 4. Backup DB
- Kích hoạt **Atlas Cloud Backup** (PITR) — khuyến nghị chính.
- Hoặc script `mongodump` chạy cron ngoài Render (Render disk ephemeral — KHÔNG backup trên Render).
- Ghi chú trong tài liệu vận hành.

### 5. Tài liệu vận hành
- Thêm `OPS.md` (hoặc mục README): env production Render/Vercel, ping schedule, backup, deploy steps, cold start lưu ý.
- Cập nhật `.env.example` nếu có (thêm `ALLOWED_ORIGINS`, `SENTRY_DSN`).

- [ ] Server được giữ tỉnh (ping hoạt động, không sleep trong 1 khoảng thời gian).
- [ ] CORS cho domain Vercel thật hoạt động (browser không CORS error).
- [ ] Sentry init khi có DSN, không crash khi thiếu.
- [ ] Backup Atlas kích hoạt (hoặc script mongodump đã chạy thử).
- [ ] Tài liệu vận hành đầy đủ.
