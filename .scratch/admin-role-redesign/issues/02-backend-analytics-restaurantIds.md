# 02 — Backend analytics: nhận mảng restaurantIds + query $in + intersect quyền

**What to build:** 3 endpoint analytics của admin/manager (`/overview`, `/revenue-hourly`, `/order-channels` — analytic.route.ts:7-29) hiện nhận 1 `restaurantId` và đã `verifyTenant`. Sửa service `getOverviewStats` / `getRevenueByHour` / `getOrderChannelAnalytics` (analytic.service.ts:5,75,112) để nhận **mảng `restaurantIds`** và query `$in` (kể cả `Reservation.countDocuments`). Thêm middleware **intersect**: mảng id gửi lên được **intersect với `user.restaurantIds`** (đọc từ DB); id ngoài phạm vi → 403. Manager gửi 1 id vẫn hoạt động bình thường.

**Blocked by:** 01 — Backend auth: admin bypass tenant + ownership theo ownerId.

**Status:** ready-for-agent

- [ ] `getOverviewStats(startDate, endDate, restaurantIds: string[])` — order stats + reservation count theo `$in`.
- [ ] `getRevenueByHour` + `getOrderChannelAnalytics` nhận mảng `restaurantIds`, query `$in`.
- [ ] Middleware intersect: mảng id từ query ∩ `user.restaurantIds` (DB); trống/id ngoài phạm vi → 403.
- [ ] Route 3 endpoint dùng mảng `restaurantIds` (query param lặp hoặc dạng mảng) + middleware intersect.
- [ ] Backend integration test: admin gửi 2 id thuộc chuỗi → data gộp đúng; gửi 1 id không thuộc → 403; manager gửi 1 id → vẫn hoạt động.
- [ ] Suite server test xanh.

### Kết quả đạt được (điền sau khi hoàn thành)
