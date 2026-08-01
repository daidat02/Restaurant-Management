# 05 — Rate limit + audit log cơ bản

**What to build:** Chống spam/abuse cho endpoint public bằng rate limiting (có cơ chế bypass khi test) + ghi audit log cho hành động admin quan trọng.

**Blocked by:** 04 — Đóng lỗ hổng tenant (tránh chạm code chưa ổn định).

**Status:** done — **134/134 test xanh** (14 files). Typecheck pass. Chạy lặp 2× ổn định.

## Kết quả thực tế

- **Rate limit** (`server/src/middlewares/rateLimit.middleware.ts`, cài `express-rate-limit@8.6.1`):
  - `authRateLimit` (20/15min): `POST /auth/login`, `/auth/register`, `/auth/refresh`.
  - `kdsVerifyRateLimit` (10/5min): `POST /settings/kds/verify`.
  - `paymentWebhookRateLimit` (50/1min): `payments/webhook`, `return/vnpay`, `check-connect`, `banking/:orderId`, `:orderId/cancel`.
  - `orderCreateRateLimit` (60/1min): `POST /orders`, `/orders/add-item`.
  - `menuReadRateLimit` (300/1min): các GET menu public.
  - **Bypass khi test**: `rateLimitEnabled()` trả false khi `NODE_ENV==='test'` hoặc `RATE_LIMIT_ENABLED==='false'` → skip. Test 429 dùng test riêng đổi `NODE_ENV='development'` (restore trong `finally`).
- **Audit log**:
  - Service chung `server/src/services/auditLog.service.ts` — `writeAuditLog()` không throw (lỗi log không làm hỏng nghiệp vụ).
  - Đã ghi ở: `user.register`, `user.update.role`, `user.delete`, `user.switch-tenant`, `restaurant.create`, `restaurant.delete`, `restaurant.lock/unlock`, `setting.kds-code.generate`.
  - Schema `AuditLogSchema`: `restaurant` và `targetId` chuyển sang optional (register khách không có tenant), thêm index `createdAt`.
  - Module mới `AuditLogModule` + route `GET /api/audit-logs` (chỉ `super-admin`, optional `?restaurantId=`, phân trang `page`/`limit`).
- **Test mới** `rate-limit-audit.test.ts` (9 case): 4 audit log đúng restaurant+actor, 3 bảo vệ role endpoint, 2 rate limit (bypass khi test + 429 khi bật).

Chi tiết kỹ thuật:

### 1. Rate limit
- Cài `express-rate-limit` (server).
- Áp cho endpoint public:
  - `POST /auth/login`, `/auth/register`, `/auth/refresh` — vd 20/15min per IP.
  - `POST /settings/kds/verify` — vd 10/5min (chống brute mã bếp).
  - `POST /payments/webhook`, `/payments/return/vnpay`, `/payments/check-connect`, `/payments/banking/:orderId`, `/payments/:orderId/cancel` — vd 50/1min (nhưng webhook cần đủ linh hoạt).
  - `POST /orders`, `/orders/add-item` (public) — vd 60/1min.
  - Menu GET public — vd 300/1min.
- **Bypass khi test**: đọc `process.env.RATE_LIMIT_ENABLED !== 'false'` → middleware no-op khi `NODE_ENV==='test'` hoặc `RATE_LIMIT_ENABLED==='false'`. CI + local test luôn bypass.
- Số liệu cụ thể quyết định khi làm (không cần chuẩn đúng ngay).

### 2. Audit log
- Model `AuditLog` (đã tồn tại — kiểm tra schema, đồng bộ field `restaurant`).
- Ghi khi:
  - Tạo/xoá user (`POST /auth/register`, `DELETE /auth/admin/delete/:id`).
  - Đổi role user (`PUT /auth/admin/update/:id`).
  - `switch-tenant`.
  - Khoá/mở tenant (`PATCH /restaurants/status/:id`).
  - Tạo/xoá nhà hàng (`POST /restaurants`, `DELETE /restaurants/:id`).
  - Generate kitchen code.
- Payload: `actor` (userId), `restaurant`, `action`, `target` (id + type), `meta`, `timestamp`.
- Endpoint xem audit log: chỉ `super-admin` (vd `GET /api/audit-logs?restaurantId=` optional) — hoặc ghi nhận trong ticket nếu super-admin UI chưa có màn.

### 3. Test
- Test rate limit: khi `RATE_LIMIT_ENABLED` bật (1 env test riêng), gọi vượt ngưỡng → 429; khi test bình thường không bị ảnh hưởng.
- Test audit log: tạo user / switch-tenant / khoá tenant → có bản ghi AuditLog đúng `restaurant` + `actor`.

- [x] Endpoint public có rate limit; test thường không bị chặn (bypass).
- [x] Test rate limit riêng (env bật) → 429 khi vượt ngưỡng.
- [x] Audit log ghi đúng khi các hành động admin xảy ra.
- [x] Endpoint xem audit log bảo vệ đúng role (chỉ super-admin).
