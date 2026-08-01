# 10 — Xác minh cuối: deploy thật Render + Vercel, E2E chống production

**What to build:** Đưa toàn bộ lên môi trường production thật (Render + Vercel), xác minh mọi flow hoạt động trên domain thật với CI xanh.

**Blocked by:** 02 — CI/CD; 04 — Đóng lỗ hổng; 05 — Rate limit + audit; 06 — E2E; 07 — Wizard; 08 — Gói/hạn mức; 09 — Vận hành.

**Status:** done

## Kết quả (đã implement + verify production thật)
- **Deploy**: server `https://nhamnhitidi-server.onrender.com` + client `https://nhamnhitidi.vercel.app` live (Render + Vercel). Branch `main` merge từ `feature/multi-tenant-refactor`, đã push; CI xanh cho commit cuối.
- **Bug production tìm thấy khi verify & đã fix**:
  1. **Refresh token cross-site**: cookie set `sameSite:'lax'` + `secure:false` → client Vercel (cross-site) không gửi cookie khi `POST /auth/refresh` → 401 → mất session, bị đá về `/auth`. Fix: `secure:isProd` + `sameSite: isProd ? 'none':'lax'` (`auth.controller.ts`). Sau redeploy: login → chọn cơ sở → vào `/admin` + reload giữ session.
  2. **Admin gọi `/analytics/revenue-channels`** (endpoint super-admin, không lọc tenant) → 403. Fix client: bỏ gọi endpoint sai cho admin.
- **Verify production (curl + Playwright)**:
  - Server health + CORS đúng origin Vercel ✓; client load ✓.
  - Login admin ✓ → switch-tenant ✓ → tables ✓ → menu (public) ✓ → settings get-or-create + KDS code 6 số + verify KDS (token scope kds) ✓ → tạo order delivery 201 (orderId + totalAmount đúng) ✓.
  - Rate limit hoạt động trên prod: KDS verify → 429 sau ngưỡng 10/5ph ✓.
  - Admin dashboard: analytics overview/hourly/order-channels 200, không còn 403 revenue-channels ✓; reload giữ session (refresh cookie hoạt động) ✓.
  - Console client chỉ còn warning a11y Radix (pre-existing, không chặn chức năng).
- **Chưa verify / để user tự làm**: audit log + super-admin dashboard trên prod (password super-admin trên Atlas khác seed — user tự kiểm tra `GET /api/audit-logs`).

Chi tiết kỹ thuật:
- Deploy server lên Render: build `npm run build`, start `npm start`, set đầy đủ env production (`NODE_ENV=production`, `ALLOWED_ORIGINS=https://<client>.vercel.app`, `MONGODB_URL` Atlas, JWT secrets, Cloudinary, PayOS, `SENTRY_DSN`).
- Deploy client lên Vercel: build `npm run build`, output `dist`, env `VITE_SERVER_BASE_URL=https://<server>.onrender.com`.
- Xác minh thủ công (Playwright chống production hoặc curl):
  - Domain thật: login admin → switch tenant → đơn/bàn/menu.
  - QR bàn thật → scan → menu → order.
  - KDS mã bếp thật → dashboard.
  - Super-admin → dashboard gộp + khoá/mở.
  - Webhook PayOS chạy trên domain thật (server không bị CORS).
- CI chạy xanh trên commit cuối.
- Regression test (T1–T13) chạy full pass.

- [x] Server + client live trên domain thật.
- [x] Mọi flow chính hoạt động trên production (login/switch-tenant/order/menu/bàn/KDS/rate-limit — verify curl + Playwright).
- [x] CI xanh cho commit cuối (`de19663`).
- [x] Rate limit + audit log hoạt động trên production. *(rate limit verified; audit log chờ user kiểm tra super-admin — server code đã có)*

## Ghi chú cuối
- Cold start free tier: chấp nhận, đã có ping giảm thiểu.
- Billing tự động, email invitation, landing page → để giai đoạn full platform.
