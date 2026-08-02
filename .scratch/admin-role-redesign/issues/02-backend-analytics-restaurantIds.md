# 02 — Backend analytics: nhận mảng restaurantIds + query $in + intersect quyền

**What to build:** 3 endpoint analytics của admin/manager (`/overview`, `/revenue-hourly`, `/order-channels` — analytic.route.ts:7-29) hiện nhận 1 `restaurantId` và đã `verifyTenant`. Sửa service `getOverviewStats` / `getRevenueByHour` / `getOrderChannelAnalytics` (analytic.service.ts:5,75,112) để nhận **mảng `restaurantIds`** và query `$in` (kể cả `Reservation.countDocuments`). Thêm middleware **intersect**: mảng id gửi lên được **intersect với `user.restaurantIds`** (đọc từ DB); id ngoài phạm vi → 403. Manager gửi 1 id vẫn hoạt động bình thường.

**Blocked by:** 01 — Backend auth: admin bypass tenant + ownership theo ownerId.

**Status:** done

- [x] `getOverviewStats(startDate, endDate, restaurantIds: string[])` — order stats + reservation count theo `$in`.
- [x] `getRevenueByHour` + `getOrderChannelAnalytics` nhận mảng `restaurantIds`, query `$in`.
- [x] Middleware intersect: mảng id từ query ∩ `user.restaurantIds` (DB); trống/id ngoài phạm vi → 403.
- [x] Route 3 endpoint dùng mảng `restaurantIds` (query param lặp hoặc dạng mảng) + middleware intersect.
- [x] Backend integration test: admin gửi 2 id thuộc chuỗi → data gộp đúng; gửi 1 id không thuộc → 403; manager gửi 1 id → vẫn hoạt động.
- [x] Suite server test xanh.

### Kết quả đạt được (điền sau khi hoàn thành)
- `order.repository.ts`: `getRawOrderStats` / `getRevenueByHourStats` / `getOrderChannelStats` đổi từ `restaurantId?: string` sang `restaurantIds: string[]`, query `matchQuery.restaurant = { $in: [...ObjectId] }`. Bỏ `console.log` dư.
- `analytic.service.ts`: `getOverviewStats` nhận mảng, `Reservation.countDocuments` dùng `$in`; `getRevenueByHour` / `getOrderChannelAnalytics` nhận mảng.
- `auth.middleware.ts`: thêm `intersectRestaurantIds` — không gửi mảng thì admin mặc định toàn chuỗi, manager/staff mặc định tenant hiện tại (token); id ngoài `user.restaurantIds` (DB) → 403; kết quả rỗng → 403; ghi danh sách hợp lệ vào `req.user.restaurantIds`.
- `analytic.route.ts`: 3 endpoint `/overview` `/revenue-hourly` `/order-channels` thêm `intersectRestaurantIds` sau `verifyTenant`.
- `analytic.controller.ts`: đọc `req.user.restaurantIds` thay `req.tenantId`.
- Test: thêm 7 case trong `analytics.test.ts` (admin gộp X+Y 200, admin id ngoài chuỗi 403, manager gửi Y 403, manager gửi X 200, admin không gửi → mặc định toàn chuỗi 200).
- Kết quả: toàn bộ 194 tests / 24 files xanh, `npm run build` sạch.
