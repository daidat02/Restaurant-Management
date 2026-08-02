# 01 — Backend auth: admin bypass tenant + ownership theo ownerId, manager/staff ưu tiên nhà hàng đầu

**What to build:** Thay đổi tầng xác thực để `admin` không còn bị ép có `currentRestaurantId`. `verifyTenant` (auth.middleware.ts:117) cho phép admin bypass giống super-admin (lấy tenant từ query/params/body), nhưng thay vì "quyền nền tảng" thì kiểm tra tài nguyên thuộc một trong các `restaurantIds` của chủ (middleware `assertOwnerOfRestaurant`). Manager/staff tiếp tục dùng `restaurantId` từ token / `restaurantIds[0]`. Guard subscription locked **không áp dụng cho admin** (admin luôn vào được /admin, /admin/restaurants, /admin/billing để xử lý thanh toán); chỉ manager/staff của chi nhánh locked bị chặn.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `verifyTenant` cho role admin: bypass yêu cầu `tokenRestaurantId`, `req.tenantId` lấy từ query/params/body (giống super-admin).
- [ ] Middleware `assertOwnerOfRestaurant` tồn tại: tài nguyên (restaurant / :id / body restaurantId) phải nằm trong `user.restaurantIds`; ngoài phạm vi → 403; không tồn tại → 404 (không leak).
- [ ] `assertRestaurantActive` (guard locked) không chặn admin — chỉ chặn manager/staff của nhà hàng locked.
- [ ] `verifyTenant` cho manager/staff có nhiều `restaurantIds` legacy: tự ưu tiên `restaurantIds[0]` (không cần token riêng).
- [ ] Backend integration test: admin gọi route có `restaurantId` của chi nhánh mình → 200; của người khác → 403; manager chi nhánh locked bị chặn nhưng admin không bị chặn.
- [ ] Toàn bộ suite server test xanh.

### Kết quả đạt được (điền sau khi hoàn thành)
