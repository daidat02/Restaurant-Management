# 07 — Tính năng SaaS: wizard onboarding 4 bước

**What to build:** Wizard tạo nhà hàng mới (tenant) theo 4 bước để admin đưa tenant từ 0 lên hoạt động được trong 1 luồng liền mạch.

**Blocked by:** 04 — Đóng lỗ hổng tenant (restaurant create/update có ownership check ổn định).

**Status:** done

## Kết quả (đã implement)
- **Quyết định:** client gọi tuần tự 4 API hiện có, wizard state ở client (`/admin/onboarding`, LayoutAdmin).
- **Server**:
  - `POST /restaurants` giờ tự gắn `restaurantId` mới vào `restaurantIds` của người tạo (`addRestaurantToUser`) → admin switch-tenant sang cơ sở mới được.
  - Thêm route `POST /api/auth/admin/create` (admin/manager + `verifyTenant`) → tạo staff/manager thuộc tenant đang xác thực; controller ép `restaurantIds=[req.tenantId]` chặn gán tùy ý.
  - Fix bug client: `getOrCreateSetting` gọi sai URL (5 segment) → URL đúng 3 segment; `createRestaurant` đọc nhầm response shape `{ result: ... }` → unwrap về object.
- **Client**: wizard 4 bước `/admin/onboarding` — B1 tạo nhà hàng (+switch-tenant tự động), B2 `get-or-create` setting + sinh mã bếp 6 số, B3 tạo manager/staff, B4 tạo 1..n bàn + hiển thị QR scan-to-order; nút "Thêm nhà hàng" tại `/admin/restaurants` chuyển sang wizard.
- **Test**: `server/src/test/wizard.test.ts` 5 test API pass (tạo tenant → gắn creator → switch → tạo user ép tenant → setting+kds-code → bàn); E2E `e2e/wizard.spec.ts` pass; full suite server 139/139, E2E 21/21.

Chi tiết kỹ thuật:

### Flow 4 bước
1. **B1 — Thông tin nhà hàng**: `POST /restaurants` (đã có). Auto: thêm vào `admin.restaurantIds`, seed Setting mặc định (`systemConfig`: maintenanceMode off, kitchenCode 6 số). (Logic đã có từ multi-tenant — verify còn hoạt động sau ownership refactor.)
2. **B2 — Cấu hình**: giờ mở cửa, maintenanceMode, PayOS keys (qua `PUT /settings/:id` / `PATCH /:id/payment-method`).
3. **B3 — Tạo user**: admin/manager/staff cho tenant mới (`POST /auth/register` hoặc API tạo user nội bộ — verify route).
4. **B4 — Tạo bàn + QR**: tạo 1..n bàn (`POST /tables/create`), hiển thị QR bàn (đã có ở `/manager/tables`).

### Server
- Quyết định khi làm: **endpoint transaction `POST /restaurants/onboarding`** (một lần tạo nhà hàng + setting + users + tables) hay **client gọi tuần tự 4 API hiện có**.
  - Khuyến nghị: client gọi tuần tự (tận dụng API đã có, ít code mới), wizard state ở client. Endpoint transaction để dành nếu cần idempotent.
- Cần `POST /auth/register` chấp nhận tạo user có `restaurantIds` cho admin (verify hiện tại — nếu chỉ customer thì thêm route admin tạo user thuộc tenant).

### Client
- UI: `/admin/onboarding` (wizard) hoặc modal ngay sau khi bấm "Tạo nhà hàng" ở `/admin/restaurants`.
- Bước state ở client (stepper), mỗi bước gọi API tương ứng, cuối cùng chuyển tenant mới + điều hướng `/manager/tables` để in QR.

### Test
- API: chuỗi tạo tenant → setting mặc định tồn tại → user tạo được thuộc tenant → bàn + QR đúng.
- E2E: admin tạo nhà hàng qua wizard → tenant mới active → chuyển được sang tenant mới.

- [x] Wizard 4 bước hoàn tất tạo được tenant hoạt động (setting + user + bàn).
- [x] Admin tự gắn vào tenant mới, switch được.
- [x] Regression: tạo nhà hàng đơn (không wizard) vẫn hoạt động (server suite 139/139, `FormCreateRestaurant` cũ giữ nguyên).
