# 08 — /admin/customers: chỉ quản manager, bỏ tab khách hàng, form tạo manager chọn nhà hàng

**What to build:** Trang Người Dùng Hệ Thống (UserPage/users.tsx) hiện có 2 tab Nhân Viên + Khách Hàng, admin fetch `['manager','admin']` hoặc `['customer']`. Đổi: **bỏ tab Khách Hàng** cho admin; chỉ fetch `['manager','admin']` theo mọi chi nhánh (có dropdown lọc nhà hàng đã có). Form tạo/sửa user (FormCreateUser.tsx:41,85): khi admin tạo **manager** → dropdown **"Chọn nhà hàng"** bắt buộc (liệt kê chi nhánh của chủ); tạo xong gán `restaurantIds = [chi nhánh đó]`. Manager ở `/manager/staff` giữ nguyên (chỉ staff).

**Blocked by:** 04 — Frontend auth flow; 05 — Frontend shell.

**Status:** done

- [x] Admin không còn tab Khách Hàng; chỉ thấy danh sách manager + chính mình.
- [x] Form tạo manager (admin): dropdown chọn nhà hàng bắt buộc; manager tạo xong thuộc đúng 1 chi nhánh đó.
- [x] Admin sửa user: có thể đổi nhà hàng gán cho manager.
- [x] Manager `/manager/staff`: không đổi (chỉ staff của chi nhánh mình).
- [x] E2E: admin tạo manager chọn cơ sở → manager đó login vào thẳng cơ sở đã chọn.

### Kết quả đạt được (điền sau khi hoàn thành)

- **Backend**: `auth.controller.ts` `createStaff` bỏ field legacy `restaurant` khi ép `restaurantIds=[req.tenantId]` (tránh gộp nhầm 2 id → fix bug manager cố gán nhà hàng ngoài chuỗi vẫn bị ép đúng chi nhánh); `auth.service.ts` `updateUserService` thêm check admin chỉ gán user vào nhà hàng thuộc chuỗi của chính mình (403 nếu ngoài chuỗi). Cơ chế gán chi nhánh dựa sẵn trên `verifyTenant` (admin: `body.restaurant` phải thuộc `restaurantIds` của chủ).
- **Frontend**: `users.tsx` bỏ hoàn toàn tab Khách Hàng + logic `activeTab`; admin fetch `['manager','admin']` theo dropdown nhà hàng (toàn chuỗi mặc định), manager `/manager/staff` giữ nguyên `['staff','manager']` theo chi nhánh mình; refactor search/pagination sang derived state (`useMemo`). `FormCreateUser.tsx`: role options theo role đăng nhập (admin → manager/staff; manager → staff); dropdown nhà hàng bắt buộc (bỏ option "Không thuộc nhà hàng"); tạo user dùng API `POST /auth/admin/create` (không còn dùng `register` công khai); admin sửa có thể đổi nhà hàng; khởi tạo form qua state initializer + `key` remount (sạch lint react-compiler). Thêm API `createStaffUser` + hook `createUser`.
- **Kiểm thử**: server `npm test` 207 pass (thêm `auth-create-manager.test.ts`: admin tạo manager gán X → login thẳng X; gán nhà hàng ngoài chuỗi → 403; manager ép về chi nhánh mình; admin đổi nhà hàng sang Y → 200; gán ngoài chuỗi → 403); server + client build xanh; E2E mới `admin-customers.spec.ts` 2 tests pass (admin không còn tab khách; tạo manager chọn "NhamNhi Cơ Sở 2" → login thẳng tenantY). Full E2E: 33 passed / 3 skipped.
