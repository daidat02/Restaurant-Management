# 03 — TDD: viết test đỏ toàn bộ matrix T1–T13 (trừ rate-limit & E2E lỗ hổng)

**What to build:** Viết test tự động phủ toàn bộ các trường hợp hiện có (matrix T1–T13). Các test thuộc nhóm lỗ hổng (T2 cross-tenant, T9 payment public, T4 revenue-channels) sẽ **FAIL** ngay bây giờ — đây là mồi cho ticket 04 fix làm test xanh. Các nhóm khác phải pass ngay (không hồi quy).

**Blocked by:** 01 — Hạ tầng test.

**Status:** ready-for-agent

Chi tiết kỹ thuật — viết theo từng file `*.test.ts` trong `server/src/**/__tests__/` hoặc `server/tests/`:

### T1 — Auth & token (~12 case)
- login/register success + wrong password 401.
- refresh trả token mới (giữ `restaurantId`).
- token hết hạn → 401.
- `switch-tenant` hợp lệ (user [X,Y] switch Y) → 200 + token mới; không thuộc → 403 "Bạn không thuộc nhà hàng này!".
- super-admin switch → 200.
- change/reset password.

### T2 — Tenant isolation trên verifyRole-only routes (~26 case) ⚠️ **ĐỎ hiện tại**
- Token staff/admin X gọi `PUT/DELETE /tables/:id` (id bàn của Y) → hiện 200 → **kỳ vọng 403**.
- Tương tự: `/menu/category/:id`, `/menu/item/:id`, `/menu/item/:id/availability`, `/orders/:id`, `/orders/:id/status`, `/settings/:id`, `/settings/:id/payment-method`, `/reservations/:id`, `/reservations/update/:id`, `/reservations/update-status/:id`, `/reservations/cancel/:id`, `/auth/profile/:id`, `/auth/admin/update/:id`, `/auth/admin/delete/:id`, `/restaurants/update/:id`, `/restaurants/:id` (delete).
- Yêu cầu: dùng id thật của tenant Y (seed), token của X.

### T3 — verifyTenant routes (~17 case)
- Đúng tenant → 200.
- Giả mạo param (token X, gọi `/:restaurantId` của Y) → trả dữ liệu của X (không leak Y).
- super-admin bypass đúng (gọi chéo OK).

### T4 — Super-admin lock/unlock (~6 case)
- `PATCH /restaurants/status/:id` active→inactive; token Y sau đó mọi API → 403 "Nhà hàng đã bị khóa!".
- Mở lại → OK.
- Admin X không bị ảnh hưởng khi Y khoá.
- `GET /analytics/revenue-channels` **chưa scoped tenant** → ⚠️ đỏ: admin X thấy gộp cả Y (kỳ vọng chỉ X).

### T5 — KDS (~8 case)
- `POST /settings/kds/verify` mã X → token gắn X; mã Y → gắn Y; mã sai → 401.
- KDS token X gọi `/orders/active/:Y` (giả mạo) → vẫn trả X.
- KDS bị khoá tenant → 403.
- Generate kitchen code: admin X `POST /settings/:id/kds-code` → 200 (đã fix ticket 09, giữ regress).

### T6 — Socket isolation (~8 case)
- Dùng `socket.io-client` kết nối với token KDS X + KDS Y: X nhận `order_event`/`new_Notification` khi add món vào order X; Y **không** nhận.
- `init_orders`/`init_room_restaurant` sai tenant → `room_error`.
- admin.test [X,Y] nhận cả 2 phòng (đúng quyền).

### T7 — Upload (~6 case)
- Upload (mô phỏng multer file) → publicId `restaurants/<tenant>/...`.
- Xoá ảnh của X bằng token Y → 400 "Bạn không có quyền xóa ảnh của nhà hàng khác!".
- Xoá bằng X → 200. (Có thể mock Cloudinary để không gọi API thật — dùng `cloudinary` mock.)

### T8 — QR bàn (~8 case)
- `createOrder` dine-in đúng (table X + restaurant X) → 201, order.restaurant = X.
- Forged (table X + restaurant Y) → 400 "Bàn không thuộc nhà hàng này".
- QR cũ (thiếu restaurantId) → 201 auto gán tenant bàn.
- `GET /orders/table/:tableId` hoạt động (public).

### T9 — Payment public (~10 case) ⚠️ **ĐỎ hiện tại**
- `/payments/webhook` không có signature hợp lệ → bị từ chối (kỳ vọng 4xx) — hiện có thể chấp nhận.
- `/payments/banking/:orderId`, `/:orderId/cancel`, `/check-connect` public — xác định kỳ vọng bảo mật (rate limit sẽ phủ — test phần signature/logic tại đây).
- PayOS theo tenant: order X dùng key X.

### T10 — Analytics (~5 case)
- overview/hourly/order-channels scoped tenant (admin X chỉ thấy X).
- `revenue-channels` ⚠️ đỏ (xem T4).
- Thiếu `startDate/endDate` → 400.

### T11 — Settings (~8 case)
- `get-or-create` trả setting đúng tenant.
- `GET /settings/:id` (bỏ qua param, dùng req.tenantId).
- update PayOS key; payment-method; generate kitchen code (regress).

### T12 — Client E2E (~20 case) — **Playwright, viết ở ticket 06**
- (File này chỉ khai báo scope; thực thi ở ticket 06 sau khi fix lỗ hổng.)

### T13 — Regression nghiệp vụ (~15 case)
- Reservation slots; menu CRUD; order add-item; item status pending→preparing→served; notification read; customer đặt bàn.

- [ ] T1, T3, T4 (trừ revenue-channels), T5–T8, T10, T11, T13 **pass**.
- [ ] T2 (~26) + T4-revenue-channels + T9 **đỏ** — ghi lại danh sách fail đúng lỗ hổng đã biết.
- [ ] Không test nào đụng DB thật.
