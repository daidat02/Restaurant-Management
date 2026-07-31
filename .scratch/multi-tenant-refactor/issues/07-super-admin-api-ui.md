# 07 — Super-admin: API + UI `/super-admin/*`

**What to build:** Người cho thuê (super-admin) có giao diện riêng để quản lý toàn nền tảng: xem tổng quan, danh sách nhà hàng, khoá/mở nhà hàng, xem tài khoản theo nhà hàng.

**Blocked by:** 02 — JWT thêm tenantId + middleware verifyTenant + switch-tenant; 03 — Migration dữ liệu hiện tại.

**Status:** ready-for-agent

Chi tiết kỹ thuật:
- API (dành riêng `super-admin`, bypass tenant check):
  - Dashboard gộp: tổng nhà hàng, tổng user, doanh thu toàn hệ thống (Analytic thêm khả năng bỏ lọc `restaurantId` khi role super-admin).
  - Danh sách nhà hàng + khoá/mở (dùng field `Restaurant.status`).
  - Danh sách tài khoản theo nhà hàng (`restaurantIds` chứa nhà hàng đó).
- UI: route `/super-admin/*`, sidebar riêng (không trộn menu admin thường), 3 trang: Dashboard tổng quan, Quản lý nhà hàng (list + khoá/mở), Tài khoản người thuê (xem theo nhà hàng).
- Route `/super-admin/*` chỉ role `super-admin` truy cập (nếu người khác truy cập → chặn/redirect).

- [ ] Super-admin login → vào được `/super-admin/*`.
- [ ] Dashboard hiện đúng số nhà hàng, số user, doanh thu gộp toàn hệ thống.
- [ ] Khoá 1 nhà hàng → nhà hàng đó hiển thị trạng thái khoá, admin/manager/staff của nó không thao tác được (chặn phía server); mở lại → hoạt động.
- [ ] Xem danh sách tài khoản theo từng nhà hàng đúng dữ liệu.
- [ ] Manager/staff/admin (không phải super-admin) truy cập `/super-admin` bị chặn.
- [ ] Typecheck + eslint pass.
