# 05 — Rate limit + audit log cơ bản

**What to build:** Chống spam/abuse cho endpoint public bằng rate limiting (có cơ chế bypass khi test) + ghi audit log cho hành động admin quan trọng.

**Blocked by:** 04 — Đóng lỗ hổng tenant (tránh chạm code chưa ổn định).

**Status:** ready-for-agent

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

- [ ] Endpoint public có rate limit; test thường không bị chặn (bypass).
- [ ] Test rate limit riêng (env bật) → 429 khi vượt ngưỡng.
- [ ] Audit log ghi đúng khi các hành động admin xảy ra.
- [ ] Endpoint xem audit log bảo vệ đúng role.
