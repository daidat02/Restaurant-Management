# TICKETS — Refactor vai trò Admin: chủ quản toàn chuỗi (kế hoạch chi tiết)

> Tham chiếu `SPEC.md`. Thứ tự theo phụ thuộc: backend trước, frontend sau, verify cuối cùng.
> Mỗi ticket: commit riêng, có test, CI xanh. Trong mỗi file ticket có mục **Kết quả đạt được** — điền sau khi hoàn thành + đánh dấu checkbox.

---

## 01 — Backend auth: admin bypass tenant + ownership theo ownerId, manager/staff ưu tiên nhà hàng đầu
- **Phụ thuộc**: —
- **Giao**: verifyTenant cho phép admin không cần currentRestaurantId; assertOwnerOfRestaurant; guard locked không chặn admin; manager/staff nhiều id ưu tiên id đầu.

## 02 — Backend analytics: nhận mảng restaurantIds + query $in + intersect quyền
- **Phụ thuộc**: 01
- **Giao**: 3 endpoint analytics nhận mảng id, `$in`, server intersect với user.restaurantIds → 403 khi ngoài phạm vi.

## 03 — Backend audit: mở /api/audit-logs cho admin + endpoint log thanh toán
- **Phụ thuộc**: 01
- **Giao**: admin xem được audit theo chuỗi + `GET /api/audit-logs/payments` (transactions của chủ).

## 04 — Frontend auth flow: bỏ /select-restaurant, admin vào thẳng /admin, manager/staff ưu tiên nhà hàng đầu
- **Phụ thuộc**: 01
- **Giao**: xoá RestaurantSwitcher + redirect ép chọn; deriveDefaultRestaurant admin→null, manager/staff→id đầu; useActiveRestaurantId admin→''.

## 05 — Frontend shell: Sidebar menu admin mới, Header avatar → modal tài khoản, chuông gộp toàn chuỗi
- **Phụ thuộc**: 01, 04
- **Giao**: menu admin mới, Cài Đặt Chung = modal tài khoản, bỏ dropdown mock Header, chuông admin gộp chuỗi.

## 06 — Dashboard /admin: KPI gộp chuỗi + bảng cảnh báo thuê bao
- **Phụ thuộc**: 02, 04, 05
- **Giao**: dashboard admin gộp chuỗi, thay banner đơn bằng bảng cảnh báo (locked/sắp hết + nút thanh toán).

## 07 — /admin/reports: so sánh chi nhánh, bỏ mock data
- **Phụ thuộc**: 02, 04, 05
- **Giao**: reports dữ liệu thật, bảng xếp hạng + biểu đồ so sánh chi nhánh.

## 08 — /admin/customers: chỉ quản manager, bỏ tab khách hàng, form tạo manager chọn nhà hàng
- **Phụ thuộc**: 04, 05
- **Giao**: bỏ tab Khách Hàng; form tạo manager có dropdown chọn nhà hàng bắt buộc.

## 09 — /admin/restaurants: nút Cài Đặt mở SettingModal theo restaurantIdOverride
- **Phụ thuộc**: 04, 05
- **Giao**: SettingModal nhận restaurantIdOverride; admin cấu hình đúng chi nhánh.

## 10 — /admin/logs: trang audit hành động + log thanh toán mọi chi nhánh
- **Phụ thuộc**: 03, 04, 05
- **Giao**: trang logs 2 tab (Hành Động / Thanh Toán), filter theo chi nhánh + thời gian.

## 11 — Verify toàn diện + cập nhật docs vận hành
- **Phụ thuộc**: 02, 03, 06, 07, 08, 09, 10
- **Giao**: toàn bộ test/typecheck/build xanh; verify production 4 role; cập nhật HUONG-DAN-VAN-HANH.md.

---

## Sơ đồ phụ thuộc

```
01 (backend auth)
├─► 02 (analytics $in) ──► 06 (dashboard admin) ──► 07 (reports so sánh)
├─► 03 (audit admin) ──► 10 (logs)
└─► 04 (auth flow client)
     ├─► 05 (shell: sidebar/header/chuông)
     │    ├─► 06
     │    ├─► 07
     │    ├─► 08 (customers)
     │    └─► 09 (restaurants setting)
     └─► 10
11 (verify + docs) ← 02,03,06,07,08,09,10
```
