# 06 — Client: tenant switcher + tập trung nguồn restaurantId (wide refactor expand–contract)

**What to build:** Sau khi đăng nhập, admin có nhiều nhà hàng sẽ chọn nhà hàng muốn làm việc; toàn bộ app admin đọc restaurantId từ **1 nguồn duy nhất** thay vì 32 chỗ trích `user.restaurant` rải rác — tránh sót chỗ, tránh hiển thị nhầm tenant.

**Blocked by:** 02 — JWT thêm tenantId + middleware verifyTenant + switch-tenant.

**Status:** done — đã test thực tế + commit

Chi tiết kỹ thuật — wide refactor theo **expand–contract**:
1. **Expand**: thêm selector/hook tenant duy nhất (đọc `restaurantIds` + `currentRestaurantId` từ Redux), đặt cạnh cách cũ để app vẫn chạy.
2. **Migrate (theo từng nhóm file, giữ CI xanh từng bước)**: lần lượt đưa các trang admin sang selector mới — Header, Sidebar, trang Order, Table, Menu/Product, Setting, Analytics, Users, Reservation, POS, Bill, Payment, TimeSlot, KDS. Mỗi nhóm là 1 batch, sau mỗi batch app vẫn hoạt động.
3. **Contract**: xoá cách đọc cũ `extractId(user?.restaurant)` khi không còn nơi nào dùng.
- Redux: auth slice lưu thêm `currentRestaurantId`; sau login, nếu `restaurantIds.length > 1` → màn hình chọn nhà hàng; nếu 1 → tự chọn; nếu 0 (super-admin) → không vào admin thường.
- Gọi `POST /auth/switch-tenant` khi đổi nhà hàng; refresh token + state.

- [x] Admin có 2 nhà hàng → sau login hiện màn hình chọn; chọn xong vào đúng admin của nhà hàng đó.
- [x] Đổi nhà hàng giữa chừng → toàn bộ dữ liệu hiển thị (đơn, bàn, menu, setting, analytics) chuyển sang tenant mới.
- [x] Manager/staff (1 nhà hàng) không bị hỏi chọn — vào thẳng nhà hàng của họ.
- [x] Super-admin không vào admin thường được.
- [x] Không còn chỗ nào trong app admin đọc `user.restaurant` trực tiếp (contract hoàn tất). — còn lại chỉ trong `authSlice` (deriveDefaultRestaurant), `use-active-restaurant` (fallback), `RestaurantSwitcher` (restaurantIds).
- [x] Typecheck + eslint client pass sau mỗi batch.

### Kết quả test thực tế (Playwright, đã xác nhận)
- Account test tạm tạo trong DB (password `Test@NhamNhi2026`, có thể xoá sau): `admin.test@nhamnhi.vn` (role admin, restaurantIds [X, Y]), `manager.test@nhamnhi.vn` (role manager, restaurantIds [X]).
- Admin 2 tenant: login → `/select-restaurant` hiện 2 nhà hàng "NhamNhi Cơ Sở 1/2" → chọn Cơ Sở 1 vào `/admin`, dashboard hiển thị dữ liệu NhamNhi.
- Switch giữa chừng: về `/select-restaurant` chọn Cơ Sở 2 → mọi API chuyển sang `69fb58d6ca9d7bade016e912` (restaurants/menu/tables/notifications 200; settings 404 vì tenant Y chưa có dữ liệu — không phải lỗi code).
- Manager 1 tenant: login vào thẳng `/manager`, sidebar hiển thị "Nhà hàng #9ef2" (tenant X).
- Super-admin: login → redirect về trang khách `/` (không vào admin) — đúng yêu cầu.
- Các trang admin render OK + không loop + 0 console error: `/admin`, `/admin/orders`, `/manager`, `/manager/menu/items`, `/manager/tables`, `/manager/orders/pos`, `/manager/orders/management`, `/manager/reservations`, `/manager/staff`.

### Bug phát hiện & đã fix trong lúc test
1. **Infinite loop fetch** — `SettingModal` (mount ở mọi trang admin) có `useEffect` deps chứa các hàm fetch (không `useCallback`) → chạy lại mỗi render → loop vô hạn gọi `tables/restaurants/menu-category/settings`. Fix: đưa deps về `[activeRestaurantId]` (string ổn định). Tương tự bỏ `fetchSettingById` khỏi deps `FormPayment`.
2. **403 revenue-channels với manager** — `home.tsx` bỏ điều kiện role admin nên manager gọi `/analytics/revenue-channels` (server `verifyRole(['admin'])`). Fix: chỉ gọi khi `user.role === 'admin'`.
3. Không commit `client/src/hooks/use-order.ts` (chứa dòng `console.log` debug cá nhân).

### Tiến độ code (đã thực hiện)
- `authSlice.ts`: thêm `currentRestaurantId` + `deriveDefaultRestaurant` (1 nhà hàng → tự chọn; >1 → `null` chờ chọn; super-admin/customer → `null`); reducer `setCurrentRestaurantId`.
- `hooks/use-active-restaurant.ts` (mới): `useActiveRestaurantId()` = `currentRestaurantId` → `restaurantIds[0]` → `restaurant` (legacy) — nguồn duy nhất cho app.
- `api/auth.api.ts` + `constants/index.ts`: `switchTenant(restaurantId, dispatch)` gọi `POST /auth/switch-tenant`, dispatch `refreshToken` + `setCurrentRestaurantId`.
- `pages/Auth/RestaurantSwitcher.tsx` (mới): màn hình chọn nhà hàng (lấy tên qua `getRestaurantById`), navigate `/admin`/`/manager`/`/staff` theo role.
- `App.tsx`: `ProtectedRoute` thêm `requiresTenant`/`isTenantSelected` → redirect `/select-restaurant`; route `/select-restaurant`; admin dùng `useActiveRestaurantId`.
- Đã migrate sang `useActiveRestaurantId()`: `Header` (noti), `Sidebar`, `AnalyticsPage/home`, `PosPage/pos`, `TablePage/table`, `OrderPage/management-order`, `OrderPage/order`, `UserPage/users`, `ReservationPage/reservation` + `TimeSlotModal`, `components/FormPayment`, `components/FormBillOrder`, `ProductPage/product` + `components/FormCreateItem`, `SettingPage/SettingModal`, `Customer/payment` (fallback URL `?restaurantId`).

### Còn lại để hoàn tất ticket
- Test thực tế (xem checklist trên): cần 1 admin có 2 nhà hàng để test màn hình chọn + switch giữa chừng; hiện DB chỉ `admin@gmail.com` có 1 tenant (X). Cần gán admin vào tenant Y (`sonn.manager@gmail.com` hoặc tạo thêm) rồi test.
- Commit riêng (KHÔNG kèm `client/src/hooks/use-order.ts` — dòng `console.log('orderData:', orderData)` là debug cá nhân).
