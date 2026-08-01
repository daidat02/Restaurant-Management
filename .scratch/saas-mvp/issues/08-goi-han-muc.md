# 08 — Gói + hạn mức (plan & limits), chưa thu phí tự động

**What to build:** Mô hình gói cước (`plan`) + hạn mức sử dụng cho từng tenant, do super-admin quản lý. Chưa tích hợp thu phí tự động (PayOS recurring để giai đoạn sau).

**Blocked by:** 04 — Đóng lỗ hổng tenant; (07 — wizard onboarding nên xong trước để tạo tenant có plan).

**Status:** done

## Kết quả (đã implement)
- **Quyết định khi làm** (hỏi user): **bỏ enforce hạn mức nhà hàng** (free=1 cơ sở) để không phá wizard E2E (admin seed sẵn 2 cơ sở); test hạn mức order dùng insertMany 500 đơn thẳng vào DB; đổi plan có audit log.
- **Server**:
  - `RestaurantSchema` thêm `plan: 'free'|'pro'` (default free); seed tenant X, Y = `pro`; client type `IRestaurant.plan` đồng bộ.
  - `PLAN_LIMITS` trong `configs/constants.ts`: free = 5 user, 500 order/tháng; pro = ∞.
  - `createStaffService` chặn 403 khi tenant free đã đủ 5 nhân sự (`authRepository.countStaffByTenant`).
  - `createOrderService` + `checkOrderLimit` chặn 403 khi tenant free vượt 500 order/tháng (tính theo `createdAt >= đầu tháng`).
  - API `PATCH /restaurants/plan/:id` (super-admin): validate gói, trả oldPlan, ghi audit log `restaurant.plan.change` (pattern ticket 05).
- **Client**: SuperAdmin Restaurants thêm cột Plan (badge Free/Pro) + nút Crown đổi gói có dialog xác nhận; `updateRestaurantPlan` trong hook + API.
- **Test**: `server/src/test/plans-limits.test.ts` 9 test (đổi gói + role guard + gói invalid + audit log + hạn mức user free 5 + nâng pro mở lại + hạn mức order 500 + nâng pro tạo được + tenant khác không bị ảnh hưởng). Full suite 148/148 + `tsc --noEmit` sạch 2 phía.

Chi tiết kỹ thuật:

### 1. Model & field
- `Restaurant` thêm: `plan: 'free' | 'pro'` (mặc định `free`), `planLimits` (hoặc tính theo hằng số gói).
- Định nghĩa hạn mức mặc định (quyết định khi làm, gợi ý):
  - `free`: 5 user, 500 order/tháng, 1 nhà hàng/admin.
  - `pro`: không giới hạn (hoặc giới hạn cao).
- Cần migration field mới cho restaurant hiện có (seed `plan: 'pro'` hoặc `free` — quyết định: tenant test có thể set pro để không bị chặn).

### 2. Enforce hạn mức
- **Số user**: khi tạo user thuộc tenant (admin/manager/staff) — đếm user hiện có của tenant, vượt → 403 "Đạt giới hạn số user của gói hiện tại".
- **Số order/tháng**: khi `createOrder` — đếm order tháng hiện tại của tenant, vượt → 403.
- **Số nhà hàng/admin**: khi `POST /restaurants` — admin free chỉ 1 nhà hàng.
- Cách đếm: on-demand query (đơn giản) — không cần counter field đợt này (trừ khi chậm).

### 3. Super-admin quản lý
- API `PATCH /restaurants/status/:id` (đã có) + thêm endpoint đổi plan (vd `PATCH /restaurants/plan/:id { plan }` — super-admin).
- UI `/super-admin/restaurants`: hiển thị plan + hạn mức + nút nâng cấp/hạ gói.

### 4. Test
- Tạo user vượt hạn mức free → 403.
- Tạo order vượt hạn mức → 403.
- Nâng lên pro → hết chặn.
- Super-admin đổi plan được.

- [x] Field `plan` + hạn mức enforce đúng (user/order; nhà hàng bỏ enforce theo quyết định — xem Kết quả).
- [x] Super-admin đổi plan → hạn mức cập nhật (enforce đọc plan tại thời điểm tạo tài nguyên).
- [x] Tenant test không bị chặn ngầm (seed X, Y = `pro`).
- [x] Không thu phí tự động (chỉ ghi nhận cho giai đoạn sau).
