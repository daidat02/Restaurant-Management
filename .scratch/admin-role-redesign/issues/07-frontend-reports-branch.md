# 07 — /admin/reports: so sánh chi nhánh, bỏ mock data

**What to build:** Trang Báo Cáo (AnalyticsPage/analytics.tsx) hiện hoàn toàn mock data (mockOverviewStats, mockBranchRevenue, mockTopDishes, mockChannelStats — analytics.tsx:28-104). Thay bằng dữ liệu thật từ API mảng (ticket 02) + giao diện **so sánh giữa chi nhánh**: bảng xếp hạng doanh thu/đơn theo từng chi nhánh, biểu đồ so sánh (kèm filter theo thời gian + có thể lọc nhà hàng). Manager không dùng trang này (đã có dashboard chi nhánh).

**Blocked by:** 02 — Backend analytics mảng restaurantIds; 04 — Frontend auth flow; 05 — Frontend shell.

**Status:** ready-for-agent

- [ ] Bỏ hoàn toàn mock data khỏi `/admin/reports`.
- [ ] Bảng xếp hạng chi nhánh: doanh thu + số đơn từng chi nhánh trong khoảng thời gian (sort giảm dần), data thật từ API.
- [ ] Biểu đồ so sánh doanh thu các chi nhánh (cùng trục thời gian).
- [ ] Filter thời gian hoạt động; không còn phụ thuộc `useActiveRestaurantId` đơn lẻ.
- [ ] E2E: admin thấy số liệu thật khớp DB (không còn "mock").

### Kết quả đạt được (điền sau khi hoàn thành)
