# 09 — Vận hành: ping giữ tỉnh + CORS/env domain thật + Sentry + backup

**What to build:** Chuẩn bị vận hành cho môi trường production thật: Render free tier (có sleep) + Vercel + MongoDB Atlas. Giảm thiểu cold start, cấu hình đúng domain, thêm monitoring và backup.

**Blocked by:** (chạy song song được với 07/08; nên xong trước khi deploy thật).

**Status:** done

## Kết quả (đã implement)
- **Quyết định khi làm** (hỏi user): Sentry chỉ ghi docs (chưa có DSN thật) — không cài dep; ping chỉ ghi docs (chưa có domain production) — không tạo workflow; CORS giữ local + thêm env prod.
- **Đã làm**:
  - `OPS.md` (root): tài liệu vận hành đầy đủ — env Render/Vercel, ping giữ tỉnh (UptimeRobot/cron-job.org/GitHub Action, mỗi 5 phút gọi `GET /api/restaurants`), hướng dẫn bật Sentry có điều kiện (không DSN → không init), backup (Atlas PITR khuyến nghị + script mongodump), deploy steps Render + Vercel, checklist khi deploy.
  - `server/.env.example` + `client/.env.example`: thêm `ALLOWED_ORIGINS`, `SENTRY_DSN`, `VITE_SENTRY_DSN`; server đã sẵn logic đọc `ALLOWED_ORIGINS` split (app.ts) + giữ local hardcode cho dev.
  - `server/scripts/backup.sh`: mongodump toàn DB ra `server/backups/<timestamp>/`, tự xoá bản cũ giữ `KEEP` (mặc định 7); syntax đã kiểm tra; lưu ý KHÔNG chạy trên Render (disk ephemeral).
- **Test**: `server/src/test/ops.test.ts` 5 test CORS (allowlist local OK, `evil.com` bị chặn, preflight 204, endpoint public dùng cho ping). Full suite 153/153 + `tsc --noEmit` sạch.
- **Chưa verify được (chờ domain/prod thật, đã ghi rõ trong OPS.md):** ping thật, CORS domain Vercel thật, Sentry DSN, backup Atlas chạy thật.

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

- [ ] Server được giữ tỉnh (ping hoạt động, không sleep trong 1 khoảng thời gian). *(đã ghi hướng dẫn OPS.md, chờ domain + deploy thật)*
- [ ] CORS cho domain Vercel thật hoạt động (browser không CORS error). *(cơ chế allowlist + test xong; verify thật chờ deploy)*
- [ ] Sentry init khi có DSN, không crash khi thiếu. *(chưa cài dep — quyết định chỉ ghi docs; hướng dẫn trong OPS.md)*
- [ ] Backup Atlas kích hoạt (hoặc script mongodump đã chạy thử). *(script sẵn sàng + syntax OK; chạy thật cần mongodump + URI thật)*
- [x] Tài liệu vận hành đầy đủ (`OPS.md` + `.env.example` cả 2 phía).
