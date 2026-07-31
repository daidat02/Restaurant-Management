# 04 — Socket xác thực + verify membership + token KDS scope:'kds'

**What to build:** Real-time không còn "mở cửa" cho mọi người: chỉ user thuộc nhà hàng (hoặc token KDS hợp lệ của đúng nhà hàng) mới join và nhận event của tenant đó; tách bỏ hành vi impersonate của token bếp.

**Blocked by:** 02 — JWT thêm tenantId + middleware verifyTenant + switch-tenant.

**Status:** done ✅

> **Kết quả test thực tế (socket.io-client + REST, server localhost:8000):**
> - Socket không token → từ chối kết nối (`Token required`).
> - Client manager tenant X nhận `order_event` của X; client manager tenant Y **không** nhận (NO-EVENT) → cách ly tenant OK.
> - Manager có `restaurantIds` rỗng (chỉ field legacy `restaurant`) vẫn join room nhận event nhờ fallback trong `authenticateToken`.
> - KDS mã bếp X vào được room X và nhận event X; cố vào room Y → `room_error "Bạn không thuộc nhà hàng này!"`.
> - Token KDS mới có `scope:'kds'` + `restaurantId` (đã verify claims); gọi `GET /orders/active/:id` HTTP 200.
> - Typecheck server + client pass.

Chi tiết kỹ thuật:
- Kích hoạt `io.use(authenticateToken)` (middleware đã viết sẵn nhưng chưa được đăng ký).
- Sửa bug trong authenticateToken đang kiểm tra field sai (`user.restaurantId` — field không tồn tại — thành `user.restaurant`/`restaurantIds`).
- Khi join room `restaurant_<id>` (sự kiện `init_room_restaurant`/`init_orders`) và khi emit `order_event`/`new_notification`: verify user thuộc tenant đó.
- Token KDS (mã nhà bếp) đổi sang đánh dấu `scope: 'kds'` + `restaurantId` đúng nghĩa (thay token impersonate hiện tại giả làm `userId = restaurantId`).
- KDS socket chỉ join được room của tenant mà mã bếp thuộc về.
- Loại bỏ sự kiện `join_restaurant` vô nghĩa phía client (server không có handler) hoặc triển khai handler đúng.

- [x] Kết nối socket không có token hợp lệ bị từ chối.
- [x] Client A không nhận được event `order_event` của nhà hàng B (test 2 client với 2 tenant khác nhau).
- [x] Admin/manager/staff đúng tenant vẫn nhận event bình thường.
- [x] KDS vào bằng mã bếp của nhà hàng X chỉ nhận event của X; mã bếp Y không vào được.
- [x] Không còn trường hợp `userId === restaurantId` (token bếp) trong hệ thống.
- [x] Typecheck server + client pass.
