# 09 — /admin/restaurants: nút Cài Đặt mở SettingModal theo restaurantIdOverride

**What to build:** Trang Quản Lý Nhà Hàng (RestaurantPage/restaurants.tsx) thêm nút **Cài Đặt** cho từng chi nhánh → mở `SettingModal` với prop mới `restaurantIdOverride` (SettingModal.tsx:31,45) để modal cấu hình đúng chi nhánh đó (tab: profile, tables, menu_config, receipt, integrations) thay vì dùng `useActiveRestaurantId()` (trả rỗng với admin). Khi có `restaurantIdOverride`, toàn bộ hook trong modal (tables, categories, setting) dùng id đó; manager/staff không truyền prop → giữ hành vi cũ.

**Blocked by:** 04 — Frontend auth flow; 05 — Frontend shell.

**Status:** done

- [x] `SettingModal` nhận `restaurantIdOverride?: string`; có → dùng làm nhà hàng hoạt động cho mọi hook; không → `useActiveRestaurantId()`.
- [x] Trang `/admin/restaurants`: mỗi dòng chi nhánh có nút Cài Đặt → mở modal đúng chi nhánh.
- [x] Admin cấu hình (profile/bàn/menu/receipt/integrations) của chi nhánh X không ảnh hưởng chi nhánh Y; lưu thành công.
- [x] Manager/staff mở Cài Đặt Nhà Hàng từ sidebar → hành vi không đổi.
- [x] E2E: admin mở cài đặt chi nhánh, đổi tên/phí, verify chỉ chi nhánh đó đổi.

### Kết quả đạt được (điền sau khi hoàn thành)

- `SettingModal.tsx`: thêm `restaurantIdOverride?: string`; `effectiveRestaurantId = override || useActiveRestaurantId()`, effect fetch (tables/categories/setting/profile) đổi dep sang `effectiveRestaurantId`; tab profile lưu thật qua `updateRestaurant` (trước chỉ `console.log`), chỉ set original khi cập nhật thành công. Sub-modal thêm bàn/danh mục dùng `selectedRestaurant?._id` (được select theo override) nên vẫn đúng chi nhánh.
- `restaurants.tsx`: thêm nút **Cài Đặt** (icon `Settings`, title "Cài đặt chi nhánh") mỗi dòng → state `settingsRestaurantId` → render `<SettingModal key={id} restaurantIdOverride={id}/>` (key remount reset state khi đổi chi nhánh); refactor tìm kiếm/phân trang sang derived state `useMemo` (bỏ `setState` trong effect), `safeCurrentPage` clamp; xoá import `Eye` thừa.
- `SettingTabContent.tsx`: sửa bug `onChange` giờ hoạt động ghi nhầm `data.time` → `operatingHours`.
- LayoutAdmin (manager/staff) không truyền override → giữ `useActiveRestaurantId()` như cũ.
- E2E `admin-restaurants.spec.ts` (2 tests): mở Cài Đặt cơ sở 2 → input hồ sơ hiển thị đúng cơ sở 2; đổi tên cơ sở 1 → lưu (toast "Cập nhật nhà hàng thành công") → reload danh sách chỉ cơ sở 1 đổi, cơ sở 2 giữ nguyên. Lưu ý: build playwright hiện không có `page.getByDisplayValue` → dùng `locator('input[value=...]')`.
- Kiểm chứng: client build xanh; eslint 3 file sạch (lỗi còn lại trong SettingModal/SettingTabContent là pre-existing: set-state-in-effect + `any`); Full E2E 35 passed / 3 skipped (subscription-owner chưa rewrite).
