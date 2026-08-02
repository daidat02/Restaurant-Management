# 04 — Frontend auth flow: bỏ /select-restaurant, admin vào thẳng /admin, manager/staff ưu tiên nhà hàng đầu

**What to build:** Xoá hoàn toàn màn hình chọn nhà hàng. `deriveDefaultRestaurant` (authSlice.ts:29-37): admin luôn → `null` (không chọn); manager/staff nhiều `restaurantIds` legacy → `restaurantIds[0]` (không hỏi); super-admin/customer giữ null. Xoá route `/select-restaurant` + `RestaurantSwitcher` + redirect ép chọn trong `ProtectedRoute` (App.tsx:83). `useActiveRestaurantId` (use-active-restaurant.ts): admin → `''`, manager/staff → `currentRestaurantId` → `restaurantIds[0]`. Admin không bị `requiresTenant`.

**Blocked by:** 01 — Backend auth: admin bypass tenant + ownership theo ownerId.

**Status:** ready-for-agent

- [ ] `deriveDefaultRestaurant`: admin → null; manager/staff → `restaurantIds[0]` (nếu nhiều id); không còn trả null chờ chọn.
- [ ] Xoá route `/select-restaurant`, component `RestaurantSwitcher`, redirect ép chọn ở `ProtectedRoute`.
- [ ] `ProtectedRoute` admin: `requiresTenant=false`, không ép `isTenantSelected`; redirect đúng `/admin` cho admin.
- [ ] `useActiveRestaurantId`: admin trả `''`; manager/staff giữ hành vi cũ.
- [ ] Đăng nhập admin.test (2 cơ sở) → vào thẳng `/admin` không qua chọn nhà hàng; manager.test → thẳng `/manager`.
- [ ] E2E Playwright cho luồng login 2 role.

### Kết quả đạt được (điền sau khi hoàn thành)
