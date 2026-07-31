# 06 — Client: tenant switcher + tập trung nguồn restaurantId (wide refactor expand–contract)

**What to build:** Sau khi đăng nhập, admin có nhiều nhà hàng sẽ chọn nhà hàng muốn làm việc; toàn bộ app admin đọc restaurantId từ **1 nguồn duy nhất** thay vì 32 chỗ trích `user.restaurant` rải rác — tránh sót chỗ, tránh hiển thị nhầm tenant.

**Blocked by:** 02 — JWT thêm tenantId + middleware verifyTenant + switch-tenant.

**Status:** ready-for-agent

Chi tiết kỹ thuật — wide refactor theo **expand–contract**:
1. **Expand**: thêm selector/hook tenant duy nhất (đọc `restaurantIds` + `currentRestaurantId` từ Redux), đặt cạnh cách cũ để app vẫn chạy.
2. **Migrate (theo từng nhóm file, giữ CI xanh từng bước)**: lần lượt đưa các trang admin sang selector mới — Header, Sidebar, trang Order, Table, Menu/Product, Setting, Analytics, Users, Reservation, POS, Bill, Payment, TimeSlot, KDS. Mỗi nhóm là 1 batch, sau mỗi batch app vẫn hoạt động.
3. **Contract**: xoá cách đọc cũ `extractId(user?.restaurant)` khi không còn nơi nào dùng.
- Redux: auth slice lưu thêm `currentRestaurantId`; sau login, nếu `restaurantIds.length > 1` → màn hình chọn nhà hàng; nếu 1 → tự chọn; nếu 0 (super-admin) → không vào admin thường.
- Gọi `POST /auth/switch-tenant` khi đổi nhà hàng; refresh token + state.

- [ ] Admin có 2 nhà hàng → sau login hiện màn hình chọn; chọn xong vào đúng admin của nhà hàng đó.
- [ ] Đổi nhà hàng giữa chừng → toàn bộ dữ liệu hiển thị (đơn, bàn, menu, setting, analytics) chuyển sang tenant mới.
- [ ] Manager/staff (1 nhà hàng) không bị hỏi chọn — vào thẳng nhà hàng của họ.
- [ ] Super-admin không vào admin thường được.
- [ ] Không còn chỗ nào trong app admin đọc `user.restaurant` trực tiếp (contract hoàn tất).
- [ ] Typecheck + eslint client pass sau mỗi batch.
