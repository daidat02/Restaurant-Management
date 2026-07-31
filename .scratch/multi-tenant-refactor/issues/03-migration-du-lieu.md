# 03 — Migration dữ liệu hiện tại sang mô hình tenant

**What to build:** Toàn bộ dữ liệu NhamNhi hiện có được chuyển sang mô hình mới mà không mất dữ liệu; nhà hàng hiện tại trở thành tenant đầu tiên; có sẵn 1 tài khoản nền tảng cho người cho thuê.

**Blocked by:** 01 — Mô hình role + User đa tenant.

**Status:** ready-for-agent

Chi tiết kỹ thuật:
- Viết script migration chạy **1 lần**, an toàn (chạy trên bản sao DB trước, sau đó DB thật; có log/track tiến độ).
- Backfill: `OrderItem` + `Payment` (thiếu field `restaurant`) lấy từ `order.restaurant`, thêm field + index.
- `AuditLog.restaurantId` → đổi tên `restaurant` cho đồng bộ với các model khác, kèm migration dữ liệu.
- User `admin@gmail.com` hiện tại → giữ role `admin`, gắn `restaurantIds: [69fccba996a14809070b9ef2]` (NhamNhi trở thành tenant đầu tiên).
- Tạo tài khoản `super-admin` riêng cho người cho thuê (thông tin đăng nhập do người vận hành đặt).
- Sau migrate: verify mọi entity cũ vẫn đọc được qua API với tenant NhamNhi.

- [ ] Script migration chạy được trên bản sao DB, không lỗi, có thể chạy lại (idempotent).
- [ ] OrderItem/Payment đều có field `restaurant` đúng giá trị lấy từ order (kiểm tra đếm số dòng).
- [ ] AuditLog đổi tên field đồng bộ, dữ liệu không mất.
- [ ] `admin@gmail.com` là admin thuộc NhamNhi; account `super-admin` đăng nhập được, role đúng.
- [ ] Không còn dữ liệu thiếu `restaurant` trong các collection có ref tenant.
- [ ] Chạy xong trên DB thật, mọi flow cũ (đơn, menu, bàn, reservation) hoạt động với tenant NhamNhi.
