# 04 — Frontend auth flow: bỏ /select-restaurant, admin vào thẳng /admin, manager/staff ưu tiên nhà hàng đầu

**What to build:** Xoá hoàn toàn màn hình chọn nhà hàng. `deriveDefaultRestaurant` (authSlice.ts:29-37): admin luôn → `null` (không chọn); manager/staff nhiều `restaurantIds` legacy → `restaurantIds[0]` (không hỏi); super-admin/customer giữ null. Xoá route `/select-restaurant` + `RestaurantSwitcher` + redirect ép chọn trong `ProtectedRoute` (App.tsx:83). `useActiveRestaurantId` (use-active-restaurant.ts): admin → `''`, manager/staff → `currentRestaurantId` → `restaurantIds[0]`. Admin không bị `requiresTenant`.

**Blocked by:** 01 — Backend auth: admin bypass tenant + ownership theo ownerId.

**Status:** ready-for-agent

- [x] `deriveDefaultRestaurant`: admin → null; manager/staff → `restaurantIds[0]` (nếu nhiều id); không còn trả null chờ chọn.
- [x] Xoá route `/select-restaurant`, component `RestaurantSwitcher`, redirect ép chọn ở `ProtectedRoute`.
- [x] `ProtectedRoute` admin: `requiresTenant=false`, không ép `isTenantSelected`; redirect đúng `/admin` cho admin.
- [x] `useActiveRestaurantId`: admin trả `''`; manager/staff giữ hành vi cũ.
- [x] Đăng nhập admin.test (2 cơ sở) → vào thẳng `/admin` không qua chọn nhà hàng; manager.test → thẳng `/manager`.
- [x] E2E Playwright cho luồng login 2 role.

### Kết quả đạt được (điền sau khi hoàn thành)
- `authSlice.deriveDefaultRestaurant`: admin → `null`; manager/staff nhiều id legacy → `restaurantIds[0]`; bỏ trả `null` chờ chọn.
- `ProtectedRoute`: bỏ props `requiresTenant`/`isTenantSelected`; bỏ block redirect `/select-restaurant`; giữ nhánh redirect theo role (`admin` → `/admin`, `manager` → `/manager`, `staff` → `/staff`).
- `useActiveRestaurantId`: nhánh `admin` → trả `''` (quản toàn chuỗi); manager/staff giữ `currentRestaurantId` → `restaurantIds[0]` → `restaurant` legacy.
- Xoá `RestaurantSwitcher.tsx` + route `/select-restaurant`; dọn import `useAppSelector`/`currentRestaurantId` thừa trong App.tsx.
- E2E: viết lại `auth-tenant.spec.ts` (4 case T04: admin thẳng /admin + currentRestaurantId=null, manager tự chọn X, chặn Y, staff POS); sửa `smoke`, `admin-flows`; `helpers.waitAuthPersisted` support `null`; `loginAdminAndSelect` cũ → throw (switcher đã gỡ); `subscription-owner.spec.ts` skip chờ T07; `owner-register.spec.ts` bỏ assertion banner cũ (TODO T07).
- Kết quả: full E2E 23 pass / 3 skip (T07); client build sạch; lint không phát sinh lỗi mới. Commit `ca0283d`.
