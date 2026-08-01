# 10 — Xác minh cuối: deploy thật Render + Vercel, E2E chống production

**What to build:** Đưa toàn bộ lên môi trường production thật (Render + Vercel), xác minh mọi flow hoạt động trên domain thật với CI xanh.

**Blocked by:** 02 — CI/CD; 04 — Đóng lỗ hổng; 05 — Rate limit + audit; 06 — E2E; 07 — Wizard; 08 — Gói/hạn mức; 09 — Vận hành.

**Status:** ready-for-agent

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

- [ ] Server + client live trên domain thật.
- [ ] Mọi flow chính hoạt động trên production (verify thủ công + Playwright).
- [ ] CI xanh cho commit cuối.
- [ ] Rate limit + audit log hoạt động trên production.

## Ghi chú cuối
- Cold start free tier: chấp nhận, đã có ping giảm thiểu.
- Billing tự động, email invitation, landing page → để giai đoạn full platform.
