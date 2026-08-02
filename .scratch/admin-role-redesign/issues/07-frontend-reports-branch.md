# 07 — /admin/reports: so sánh chi nhánh, bỏ mock data

**What to build:** Trang Báo Cáo (AnalyticsPage/analytics.tsx) hiện hoàn toàn mock data (mockOverviewStats, mockBranchRevenue, mockTopDishes, mockChannelStats — analytics.tsx:28-104). Thay bằng dữ liệu thật từ API mảng (ticket 02) + giao diện **so sánh giữa chi nhánh**: bảng xếp hạng doanh thu/đơn theo từng chi nhánh, biểu đồ so sánh (kèm filter theo thời gian + có thể lọc nhà hàng). Manager không dùng trang này (đã có dashboard chi nhánh).

**Blocked by:** 02 — Backend analytics mảng restaurantIds; 04 — Frontend auth flow; 05 — Frontend shell.

**Status:** done

- [x] Bỏ hoàn toàn mock data khỏi `/admin/reports`.
- [x] Bảng xếp hạng chi nhánh: doanh thu + số đơn từng chi nhánh trong khoảng thời gian (sort giảm dần), data thật từ API.
- [x] Biểu đồ so sánh doanh thu các chi nhánh (cùng trục thời gian).
- [x] Filter thời gian hoạt động; không còn phụ thuộc `useActiveRestaurantId` đơn lẻ.
- [x] E2E: admin thấy số liệu thật khớp DB (không còn "mock").

### Kết quả đạt được (điền sau khi hoàn thành)

- **Backend**: thêm `getBranchRevenueStatsByIds(startDate, endDate, restaurantIds)` trong `order.repository.ts` (aggregate `status:'paid'` + `$match restaurant $in` + lookup `restaurants`, sort revenue desc); nối service `getBranchRevenueByIdsService`, controller `getBranchRevenueByIds` (đọc `req.query.startDate/endDate` + `req.user.restaurantIds`) và route `GET /api/analytics/revenue-branches` (`verifyRole(['manager','admin'])` + `verifyTenant` + `intersectRestaurantIds`). Endpoint `/revenue-channels` của super-admin giữ nguyên.
- **Frontend**: `analytics.tsx` bỏ toàn bộ mock (mockOverviewStats/mockBranchRevenue/mockTopDishes/mockChannelStats); dùng `useAnalytic` + `fetchDashboardData`/`fetchRevenueBranches` với `restaurantIds` của admin (không phụ thuộc `useActiveRestaurantId` cho admin); filter thời gian (Hôm nay/7 ngày/Tháng/Năm); `ChartsSection` hiển thị bảng xếp hạng chi nhánh thật + biểu đồ so sánh doanh thu các chi nhánh. Thêm `ANALYTIC.REVENUE_BRANCHES`, API `getRevenueBranches`, hook `fetchRevenueBranches`.
- **Kiểm thử**: server `npm test` 201 pass (thêm `analytics-branches.test.ts`: admin sở hữu 2 nhánh → 200 có data; manager X không leak tên chi nhánh Y); server + client `npm run build` xanh; E2E mới `admin-reports.spec.ts` 2 tests pass (admin thấy 2 chi nhánh thật từ DB + biểu đồ so sánh; không còn mock). Full E2E: 31 passed / 3 skipped.
