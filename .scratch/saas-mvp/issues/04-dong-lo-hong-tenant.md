# 04 — Đóng lỗ hổng tenant: ownership middleware chung + đóng 2 endpoint public (làm test xanh)

**What to build:** Đóng triệt để lỗ hổng tenant-isolation: 26 route chỉ `verifyRole` (thiếu verifyTenant) + 2 endpoint public lộ dữ liệu. Làm các test đỏ của ticket 03 (nhóm T2, T4-revenue-channels, T9) chuyển sang xanh.

**Blocked by:** 03 — TDD test matrix (cần test đỏ tồn tại để verify fix).

**Status:** ready-for-agent

Chi tiết kỹ thuật:

### 1. Ownership middleware chung (`server/src/middlewares/auth.middleware.ts`)
- Thêm middleware `requireResourceTenant(resolveResourceTenant)`:
  - `resolveResourceTenant(req) => Promise<string | null>` — trả tenantId của tài nguyên (`:id` trong params).
  - Nếu resource không tồn tại → 404 (tránh leak sự tồn tại tài nguyên).
  - Nếu `resolveResourceTenant(req) !== req.user.restaurantId` → **403 "Bạn không có quyền truy cập tài nguyên này!"**.
  - `super-admin` bypass (quyền nền tảng — vẫn cho phép gọi chéo).
- Cần repository/service helper: `getTableTenant(id)`, `getMenuItemTenant(id)`, `getCategoryTenant(id)`, `getOrderTenant(id)`, `getSettingTenant(id)`, `getReservationTenant(id)`, `getUserTenant(id)` (qua restaurantIds), `getRestaurantTenant(id)` (chính là id).

### 2. Áp middleware cho 26 route
- **Auth**: `GET /profile/:id`, `DELETE /admin/delete/:id`, `PUT /admin/update/:id`.
- **Restaurant**: `PUT /update/:id`, `DELETE /:id` (owner). `POST /` (create) — verify admin tạo cho chính mình (không cần ownership middleware, nhưng check admin thuộc... ghi chú: admin tạo nhà hàng → auto gắn restaurantIds — giữ logic hiện có).
- **Table**: `POST /create` (body có restaurant — verify = req.user.restaurantId), `PUT /:id`, `DELETE /:id`, `PATCH /:id/status`.
- **Reservation**: `POST /create-by-staff` (body restaurant), `GET /:id`, `PUT /update/:id`, `PUT /update-status/:id`, `PUT /cancel/:id`.
- **Menu**: `PUT /category/:id`, `PUT /item/:id`, `PUT /item/:id/availability`.
- **Order**: `PUT /:id`, `PUT /:id/status`.
- **Setting**: `POST /create` (body), `PUT /:id`, `PATCH /:id/payment-method`, `DELETE /:id`.

### 3. Đóng 2 endpoint public lộ dữ liệu
- `GET /api/tables/:id` (public) — cần cho khách tại bàn? Xem client dùng ở đâu (`fetchTableById` trong cart.tsx). Nếu cần cho QR/khách: **giữ public nhưng trả field an toàn** (bỏ `_id`? giữ nguyên vì bàn cần `_id`; che thông tin không cần thiết nếu có). Nếu chỉ dùng nội bộ → thêm `verifyToken`.
- `GET /api/orders/table/:tableId` (public) — khách tại bàn cần lấy order theo bàn (QR). Giữ public nhưng **che field nhạy cảm** (customer info, staff, payment) khi không có token tenant; có token tenant hợp lệ → đầy đủ.
- Quyết định chính xác trong khi làm: mục tiêu là không để lộ data nhạy cảm ra công khai mà vẫn giữ flow khách tại bàn hoạt động.

### 4. Revenue-channels scoped tenant
- `GET /analytics/revenue-channels` hiện gộp toàn nền tẳng — thêm `verifyTenant`, chỉ scoped tenant trừ khi role `super-admin` (dùng `system-overview` riêng cho gộp).

### 5. Xác minh
- Chạy lại toàn bộ test ticket 03: T2 (~26), T4-revenue-channels, T9 → **xanh**.
- Regression: T1, T3, T5–T8, T10, T11, T13 vẫn xanh (không vỡ flow hợp lệ).

- [ ] 26 route có ownership check, cross-tenant → 403.
- [ ] 2 endpoint public không còn lộ data nhạy cảm.
- [ ] `revenue-channels` scoped tenant (super-admin vẫn gộp).
- [ ] Toàn bộ test đỏ của ticket 03 chuyển xanh; không test xanh nào vỡ.
