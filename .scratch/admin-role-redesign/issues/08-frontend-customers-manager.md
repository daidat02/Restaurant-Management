# 08 — /admin/customers: chỉ quản manager, bỏ tab khách hàng, form tạo manager chọn nhà hàng

**What to build:** Trang Người Dùng Hệ Thống (UserPage/users.tsx) hiện có 2 tab Nhân Viên + Khách Hàng, admin fetch `['manager','admin']` hoặc `['customer']`. Đổi: **bỏ tab Khách Hàng** cho admin; chỉ fetch `['manager','admin']` theo mọi chi nhánh (có dropdown lọc nhà hàng đã có). Form tạo/sửa user (FormCreateUser.tsx:41,85): khi admin tạo **manager** → dropdown **"Chọn nhà hàng"** bắt buộc (liệt kê chi nhánh của chủ); tạo xong gán `restaurantIds = [chi nhánh đó]`. Manager ở `/manager/staff` giữ nguyên (chỉ staff).

**Blocked by:** 04 — Frontend auth flow; 05 — Frontend shell.

**Status:** ready-for-agent

- [ ] Admin không còn tab Khách Hàng; chỉ thấy danh sách manager + chính mình.
- [ ] Form tạo manager (admin): dropdown chọn nhà hàng bắt buộc; manager tạo xong thuộc đúng 1 chi nhánh đó.
- [ ] Admin sửa user: có thể đổi nhà hàng gán cho manager.
- [ ] Manager `/manager/staff`: không đổi (chỉ staff của chi nhánh mình).
- [ ] E2E: admin tạo manager chọn cơ sở → manager đó login vào thẳng cơ sở đã chọn.

### Kết quả đạt được (điền sau khi hoàn thành)
