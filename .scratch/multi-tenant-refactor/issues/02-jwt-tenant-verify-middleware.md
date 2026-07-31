# 02 — JWT thêm tenantId + middleware verifyTenant + switch-tenant (backend core)

**What to build:** Mọi request của admin/manager/staff đều mang ngữ cảnh nhà hàng **được xác thực** (không còn tin tưởng params/query/body); người dùng có nhiều nhà hàng có thể chuyển đổi tenant sau khi đăng nhập mà không cần đăng nhập lại.

**Blocked by:** 01 — Mô hình role + User đa tenant.

**Status:** done ✅

> **Ghi chú expand–contract:** Data cũ chưa backfill `restaurantIds` nên `verifyTenant`, `switchTenantService`, `refreshTokenService` vẫn fallback kiểm tra field legacy `restaurant` (dọn ở ticket 03). Token access mới có claim `restaurantId`; super-admin login không có claim này (không thuộc nhà hàng) — bypass qua param/query.

Chi tiết kỹ thuật:
- Access token thêm claim `restaurantId` (nhà hàng đang hoạt động); refresh token không đổi cấu trúc.
- Endpoint `POST /auth/switch-tenant`: nhận `restaurantId`, kiểm tra user thuộc nhà hàng đó, trả access token mới.
- Middleware mới `verifyTenant` chạy sau `verifyToken`: đọc `restaurantId` từ token, xác minh user thuộc tenant, gán `req.tenantId`.
- Gắn `verifyTenant` cho các route của `staff`/`manager`/`admin`.
- **~11 controller bỏ lấy restaurantId từ params/query/body**, chuyển sang `req.tenantId` (module: Order create/getByRestaurant/getActive, Menu, Table, Reservation, Notification, Analytic, Setting).
- `super-admin` bypass: role `super-admin` thì `req.tenantId` lấy từ param/query (cho phép gọi chéo để quản lý). `verifyRole` cũng cho phép `super-admin` vượt qua.
- Route công khai (KDS, khách tại bàn, upload) giữ cơ chế nhận `restaurantId` từ param/body — KHÔNG gắn verifyTenant.

- [x] Access token chứa `restaurantId`; `switch-tenant` trả token mới đúng tenant, từ chối nhà hàng không thuộc user.
- [x] `verifyTenant` chặn: token staff/admin dùng restaurantId của nhà hàng khác → 403 (test curl: token user A gọi API với restaurantId B).
- [x] ~11 controller dùng `req.tenantId`, không còn tin restaurantId từ body/query/param (trừ route công khai).
- [x] `super-admin` bypass hoạt động (gọi được API mọi tenant).
- [x] Xoá 2 hardcode fallback restaurantId mặc định ở client.
- [x] Flow khách tại bàn + KDS vẫn hoạt động (route công khai không bị chặn).
- [x] Typecheck server + client pass.
