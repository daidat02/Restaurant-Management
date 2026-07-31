# 01 — Mô hình role + User đa tenant (backend core)

**What to build:** User model cho phép 1 tài khoản thuộc nhiều nhà hàng, thêm vai diễn `super-admin`, và chuẩn hoá quy tắc thuộc về theo role. Đây là nền móng: sau ticket này, hệ thống "biết" ai thuộc nhà hàng nào và có quyền gì, nhưng chưa enforce vào request.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

Chi tiết kỹ thuật:
- Thêm `super-admin` vào enum role của User (hiện: `customer | staff | manager | admin`).
- Đổi `restaurant` (ObjectId đơn) thành `restaurantIds: ObjectId[]` + index.
- Quy tắc ràng buộc: `staff`/`manager` đúng 1 phần tử; `admin` nhiều; `super-admin`/`customer` rỗng. Enforce trong service khi tạo/cập nhật user (không chỉ schema), trả lỗi rõ ràng nếu vi phạm.
- Cập nhật mọi nơi backend đang đọc field `restaurant` của user (đặc biệt login trả user populate, auth middleware) sang `restaurantIds`.
- Cập nhật type `IUser` phía client tương ứng.

- [ ] Enum role User có `super-admin`.
- [ ] `restaurantIds: ObjectId[]` thay cho `restaurant` đơn, có index.
- [ ] Service tạo/cập nhật user enforce đúng quy tắc số nhà hàng theo role (staff/manager = 1, admin = nhiều).
- [ ] Mọi nơi backend đọc `user.restaurant` đã đọc `user.restaurantIds` (không còn field cũ được tham chiếu).
- [ ] Type `IUser` client khớp schema mới.
- [ ] Typecheck server + client pass; server chạy được.
