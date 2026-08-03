# 06 — Dashboard /admin: KPI gộp chuỗi + bảng cảnh báo thuê bao

**What to build:** Trang chủ admin (AnalyticsPage/home.tsx) hiện gọi analytic theo `activeRestaurantId` (1 nhà hàng) và hiển thị `SubscriptionBanner` đơn. Đổi: admin gọi analytic với toàn bộ `user.restaurantIds` (data gộp chuỗi qua ticket 02); thay banner đơn bằng **bảng cảnh báo thuê bao** — liệt kê từng chi nhánh đang locked / sắp hết hạn (≤7 ngày) kèm nút thanh toán → `/admin/billing`. Manager giữ nguyên dashboard chi nhánh.

**Blocked by:** 02 — Backend analytics mảng restaurantIds; 04 — Frontend auth flow; 05 — Frontend shell.

**Status:** done

- [ ] Dashboard admin gửi `restaurantIds = user.restaurantIds` cho 3 API analytic; hiển thị KPI gộp chuỗi.
- [ ] Bảng cảnh báo thuê bao: mỗi dòng = chi nhánh (tên, trạng thái locked/trial≤7 ngày, ngày hết hạn, nút "Thanh toán" → /admin/billing). Trạng thái "xấu nhất" không còn bị gói vào 1 banner đơn.
- [ ] Manager dashboard không đổi (1 chi nhánh).
- [ ] Nếu chuỗi không có chi nhánh cảnh báo → ẩn bảng (hoặc thông báo trắng).
- [ ] E2E: admin.test (2 cơ sở, 1 có Sub Sắp Hết Hạn) thấy KPI gộp + cảnh báo đúng chi nhánh.

### Kết quả đạt được (điền sau khi hoàn thành)

Hoàn thành.

- `home.tsx` (AnalyticsPage): admin gửi `restaurantIds = user.restaurantIds` (qua `extractId`) thay vì `restaurantId` cho 3 API analytic → KPI gộp chuỗi (backend T02 đã nhận mảng qua `intersectRestaurantIds`). Manager/staff giữ `restaurantId = activeRestaurantId` (1 chi nhánh).
- `types/analytic.type.ts`: thêm `restaurantIds?: string[]` vào `IAnalyticQueryParams`.
- `SubscriptionAlertsTable.tsx` (mới) thay `SubscriptionBanner`: dùng `useSubscription().subscriptions` (GET /subscriptions/me), lọc chi nhánh `locked` hoặc `trial ≤7 ngày`; mỗi dòng = tên chi nhánh + trạng thái + ngày hết hạn + nút "Thanh toán" → `/admin/billing`. Không có chi nhánh cảnh báo → render null (ẩn).
- Xoá import/usage `SubscriptionBanner` trong home.tsx (file component giữ nguyên — không còn nơi nào dùng).

**Validation:** Client build xanh; lint không phát sinh lỗi mới (chỉ còn lỗi `payload: any` pre-existing trong home.tsx). E2E thêm `admin-dashboard.spec.ts` (2 test: admin.test 2 cơ sở active thấy KPI + không cảnh báo; owner.sub thấy đúng chi nhánh sắp hết hạn + bị khoá + nút thanh toán → /admin/billing). Full suite: 29 passed / 3 skipped (subscription-owner chờ T07).

