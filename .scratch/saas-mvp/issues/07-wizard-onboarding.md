# 07 — Tính năng SaaS: wizard onboarding 4 bước

**What to build:** Wizard tạo nhà hàng mới (tenant) theo 4 bước để admin đưa tenant từ 0 lên hoạt động được trong 1 luồng liền mạch.

**Blocked by:** 04 — Đóng lỗ hổng tenant (restaurant create/update có ownership check ổn định).

**Status:** ready-for-agent

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

- [ ] Wizard 4 bước hoàn tất tạo được tenant hoạt động (setting + user + bàn).
- [ ] Admin tự gắn vào tenant mới, switch được.
- [ ] Regression: tạo nhà hàng đơn (không wizard) vẫn hoạt động.
