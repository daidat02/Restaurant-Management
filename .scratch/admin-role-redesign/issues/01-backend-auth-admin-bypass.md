# 01 — Backend auth: admin bypass tenant + ownership theo ownerId, manager/staff ưu tiên nhà hàng đầu

**What to build:** Thay đổi tầng xác thực để `admin` không còn bị ép có `currentRestaurantId`. `verifyTenant` (auth.middleware.ts:117) cho phép admin bypass giống super-admin (lấy tenant từ query/params/body), nhưng thay vì "quyền nền tảng" thì kiểm tra tài nguyên thuộc một trong các `restaurantIds` của chủ (middleware `assertOwnerOfRestaurant`). Manager/staff tiếp tục dùng `restaurantId` từ token / `restaurantIds[0]`. Guard subscription locked **không áp dụng cho admin** (admin luôn vào được /admin, /admin/restaurants, /admin/billing để xử lý thanh toán); chỉ manager/staff của chi nhánh locked bị chặn.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] `verifyTenant` cho role admin: bypass yêu cầu `tokenRestaurantId`, `req.tenantId` lấy từ query/params/body (giống super-admin).
- [x] Middleware `assertOwnerOfRestaurant` tồn tại: tài nguyên (restaurant / :id / body restaurantId) phải nằm trong `user.restaurantIds`; ngoài phạm vi → 403; không tồn tại → 404 (không leak).
- [x] `assertRestaurantActive` (guard locked) không chặn admin — chỉ chặn manager/staff của nhà hàng locked.
- [x] `verifyTenant` cho manager/staff có nhiều `restaurantIds` legacy: tự ưu tiên `restaurantIds[0]` (không cần token riêng).
- [x] Backend integration test: admin gọi route có `restaurantId` của chi nhánh mình → 200; của người khác → 403; manager chi nhánh locked bị chặn nhưng admin không bị chặn.
- [x] Toàn bộ suite server test xanh.

### Kết quả đạt được (điền sau khi hoàn thành)
- `verifyTenant` (auth.middleware.ts): nhánh `admin` mới — load `restaurantIds` từ DB, cho phép admin truy cập mọi chi nhánh thuộc chuỗi qua `restaurantId` do request chỉ định (query/params/body, không dùng `:id` tài nguyên). Nếu request không chỉ định → fallback `tokenRestaurantId` (restaurantIds[0]) giữ tương thích route cũ (vd `/auth/admin/create` wizard). Không áp dụng `assertRestaurantActive` → admin vào được chi nhánh locked.
- `requireResourceTenant`: thêm nhánh `admin` — so resource với toàn bộ `restaurantIds` của chủ (thay vì 1 tenant duy nhất), đảm bảo admin sửa được tài nguyên của mọi chi nhánh mình sở hữu.
- `AuthRequest` thêm field `restaurantIds` để admin branch gắn danh sách chuỗi.
- Test: seed `adminX` đã sở hữu cả X+Y (đúng mô hình chủ chuỗi) → các test isolation/tenant-scoping/super-admin/kds dùng adminX để test "chặn Y" chuyển sang `ownerSub` (admin không sở hữu X/Y). Sửa `tokenFor('staffY')` để tạo token role `staff` đúng. Thêm `src/test/admin-bypass.test.ts` (6 case: truy cập chi nhánh mình 200, ngoài chuỗi 403, admin bypass locked, staff bị locked chặn).
- Kết quả: toàn bộ 187 tests / 24 files xanh, `npm run build` sạch.
