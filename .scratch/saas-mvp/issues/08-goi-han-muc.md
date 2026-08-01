# 08 — Gói + hạn mức (plan & limits), chưa thu phí tự động

**What to build:** Mô hình gói cước (`plan`) + hạn mức sử dụng cho từng tenant, do super-admin quản lý. Chưa tích hợp thu phí tự động (PayOS recurring để giai đoạn sau).

**Blocked by:** 04 — Đóng lỗ hổng tenant; (07 — wizard onboarding nên xong trước để tạo tenant có plan).

**Status:** ready-for-agent

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

- [ ] Field `plan` + hạn mức enforce đúng (user/order/nhà hàng).
- [ ] Super-admin đổi plan → hạn mức cập nhật.
- [ ] Tenant test không bị chặn ngầm (set plan phù hợp trong seed).
- [ ] Không thu phí tự động (chỉ ghi nhận cho giai đoạn sau).
