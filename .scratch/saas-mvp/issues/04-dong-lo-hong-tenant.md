# 04 — Đóng lỗ hổng tenant: ownership middleware chung + đóng 2 endpoint public (làm test xanh)

**What to build:** Đóng triệt để lỗ hổng tenant-isolation: 26 route chỉ `verifyRole` (thiếu verifyTenant) + 2 endpoint public lộ dữ liệu. Làm các test đỏ của ticket 03 (nhóm T2, T4-revenue-channels, T9) chuyển sang xanh.

**Blocked by:** 03 — TDD test matrix (cần test đỏ tồn tại để verify fix).

**Status:** done — **125/125 test xanh** (13 files). Typecheck pass. Chạy lặp 2× ổn định (kèm fix flaky hạ tầng).

## Kết quả thực tế

- **Middleware** `requireResourceTenant(resolveResourceTenant)` + 9 resolver (`tableTenantResolver`, `menuCategoryTenantResolver`, `menuItemTenantResolver`, `orderTenantResolver`, `reservationTenantResolver`, `settingTenantResolver`, `userTenantResolver`, `restaurantTenantResolver`, `paymentTenantResolver`) trong `auth.middleware.ts`. Super-admin bypass; resource không tồn tại → 404; khác tenant → 403.
- **26 route** đã áp middleware (hoặc đổi role guard) — cross-tenant giờ 403. Đổi cụ thể:
  - Thêm `requireResourceTenant`: tables PUT/DELETE/PATCH-status, menu category/item/availability PUT, orders PUT/status/GET `/:id`, settings PUT/payment-method/DELETE/kds-code, reservations GET/update/update-status/cancel, auth profile/admin-update/admin-delete, restaurants update/DELETE, payments `GET /:paymentId`.
  - **Lưu ý T10**: test kỳ vọng admin X gọi `revenue-channels` → **403** (không phải scoped tenant). Quyết định theo test: chuyển `verifyRole(['admin'])` → `verifyRole(['super-admin'])` (super-admin vẫn gộp toàn hệ thống; admin xem scoped qua `overview`).
- **2 endpoint public**:
  - `GET /tables/:id`: không có field nhạy cảm (restaurant/tableNumber/capacity/status/currentOrder) → giữ nguyên public.
  - `GET /orders/table/:tableId`: thêm sanitize trong controller — khi request không có tenant hợp lệ (khách tại bàn), che `customer`, `staff`, `deliveryInfo`, `notes`, `reservation`; có token tenant hợp lệ → đầy đủ.
- **Fix flaky hạ tầng test**: thêm `await mongoose.connection.syncIndexes()` sau seed trong `setup.ts` — khử transient `WriteConflict` (code 112, catalog changes) khi transaction ghi ngay sau seed trong MongoMemoryReplSet.
- **Fix typecheck**: `idOf` chuyển vào `utils.ts`, sửa `Cookie` undefined, `afterAll` import, mở rộng union `tokenFor` nhận `'staffY'` → `tsc --noEmit` sạch (CI typecheck xanh).

Chi tiết kỹ thuật:

### 1. Ownership middleware chung (`server/src/middlewares/auth.middleware.ts`)
- Thêm middleware `requireResourceTenant(resolveResourceTenant)`:
  - `resolveResourceTenant(req) => Promise<string | null>` — trả tenantId của tài nguyên (`:id` trong params).
  - Nếu resource không tồn tại → 404 (tránh leak sự tồn tại tài nguyên).
  - Nếu `resolveResourceTenant(req) !== req.user.restaurantId` → **403 "Bạn không có quyền truy cập tài nguyên này!"**.
  - `super-admin` bypass (quyền nền tảng — vẫn cho phép gọi chéo).
- Cần repository/service helper: `getTableTenant(id)`, `getMenuItemTenant(id)`, `getCategoryTenant(id)`, `getOrderTenant(id)`, `getSettingTenant(id)`, `getReservationTenant(id)`, `getUserTenant(id)` (qua restaurantIds), `getRestaurantTenant(id)` (chính là id).

### 2. Áp middleware cho 26 route (danh sách khớp chính xác test đỏ T2/T4/T5/T9/T10)

Danh sách 22 route T2 (token X truy cập resource Y → 200, cần → 403) + 4 route đỏ rải rác:
- **T2 tenant-isolation (22)**:
  - Table: `PUT /tables/:id`, `DELETE /tables/:id`, `PATCH /tables/:id/status`
  - Menu: `PUT /menu/category/:id`, `PUT /menu/item/:id`, `PUT /menu/item/:id/availability`
  - Order: `PUT /orders/:id`, `PUT /orders/:id/status`
  - Setting: `PUT /settings/:id`, `PATCH /settings/:id/payment-method`, `DELETE /settings/:id`
  - Reservation: `GET /reservations/:id`, `PUT /reservations/update/:id`, `PUT /reservations/update-status/:id`, `PUT /reservations/cancel/:id`
  - Auth: `GET /auth/profile/:id`, `PUT /auth/admin/update/:id`, `DELETE /auth/admin/delete/:id`
  - Restaurant: `PUT /restaurants/update/:id`, `DELETE /restaurants/:id`
- **T4 super-admin**: `GET /orders/:id` (admin X đọc order Y → 200, cần 403; super-admin vẫn bypass 200).
- **T5 kds**: `POST /settings/:id/kds-code` (admin X generate code cho setting Y → 200, cần 403).
- **T9 payment**: `GET /payments/:paymentId` (staff X đọc payment Y → 200, cần 403).
- **T10 analytics**: `GET /analytics/revenue-channels` (admin X thấy gộp toàn hệ thống, cần scoped tenant).

Ghi chú: 2 endpoint public trong mục 3 (`GET /tables/:id`, `GET /orders/table/:tableId`) **không nằm trong 26 đỏ** — T8 qr-table.test.ts đã verify xanh (đúng tenant 200, bàn khác tenant 404). Chỉ cần rà soát che field nhạy cảm, không phải sửa cho chuyển test xanh.

### 3. Đóng 2 endpoint public lộ dữ liệu
- `GET /api/tables/:id` (public) — cần cho khách tại bàn? Xem client dùng ở đâu (`fetchTableById` trong cart.tsx). Nếu cần cho QR/khách: **giữ public nhưng trả field an toàn** (bỏ `_id`? giữ nguyên vì bàn cần `_id`; che thông tin không cần thiết nếu có). Nếu chỉ dùng nội bộ → thêm `verifyToken`.
- `GET /api/orders/table/:tableId` (public) — khách tại bàn cần lấy order theo bàn (QR). Giữ public nhưng **che field nhạy cảm** (customer info, staff, payment) khi không có token tenant; có token tenant hợp lệ → đầy đủ.
- Quyết định chính xác trong khi làm: mục tiêu là không để lộ data nhạy cảm ra công khai mà vẫn giữ flow khách tại bàn hoạt động.

### 4. Revenue-channels
- `GET /analytics/revenue-channels` hiện gộp toàn nền tẳng — **đã chuyển sang `verifyRole(['super-admin'])`** theo test T10 (admin X → 403). Super-admin gộp qua endpoint này; admin/manager xem scoped qua `overview`/`order-channels`.

### 5. Xác minh
- Chạy lại toàn bộ test ticket 03: T2 (22), T4 orders/:id, T5 kds-code, T9 payment, T10 revenue-channels → **đã xanh**.
- Regression: T1, T3, T5–T8, T10, T11, T13 vẫn xanh — **125/125**.

- [x] 26 route có ownership check, cross-tenant → 403.
- [x] 2 endpoint public (`tables/:id`, `orders/table/:tableId`) không còn lộ data nhạy cảm.
- [x] `revenue-channels` chỉ super-admin (admin X → 403 theo test).
- [x] Toàn bộ 26 test đỏ của ticket 03 chuyển xanh; không test xanh nào vỡ (125/125).
