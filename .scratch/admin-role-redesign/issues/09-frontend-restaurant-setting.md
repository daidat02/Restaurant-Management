# 09 — /admin/restaurants: nút Cài Đặt mở SettingModal theo restaurantIdOverride

**What to build:** Trang Quản Lý Nhà Hàng (RestaurantPage/restaurants.tsx) thêm nút **Cài Đặt** cho từng chi nhánh → mở `SettingModal` với prop mới `restaurantIdOverride` (SettingModal.tsx:31,45) để modal cấu hình đúng chi nhánh đó (tab: profile, tables, menu_config, receipt, integrations) thay vì dùng `useActiveRestaurantId()` (trả rỗng với admin). Khi có `restaurantIdOverride`, toàn bộ hook trong modal (tables, categories, setting) dùng id đó; manager/staff không truyền prop → giữ hành vi cũ.

**Blocked by:** 04 — Frontend auth flow; 05 — Frontend shell.

**Status:** ready-for-agent

- [ ] `SettingModal` nhận `restaurantIdOverride?: string`; có → dùng làm nhà hàng hoạt động cho mọi hook; không → `useActiveRestaurantId()`.
- [ ] Trang `/admin/restaurants`: mỗi dòng chi nhánh có nút Cài Đặt → mở modal đúng chi nhánh.
- [ ] Admin cấu hình (profile/bàn/menu/receipt/integrations) của chi nhánh X không ảnh hưởng chi nhánh Y; lưu thành công.
- [ ] Manager/staff mở Cài Đặt Nhà Hàng từ sidebar → hành vi không đổi.
- [ ] E2E: admin mở cài đặt chi nhánh, đổi tên/phí, verify chỉ chi nhánh đó đổi.

### Kết quả đạt được (điền sau khi hoàn thành)
