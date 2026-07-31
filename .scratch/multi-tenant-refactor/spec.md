# SPEC — Refactor Multi-Tenant (SaaS: Admin + Order tại bàn)

## Problem Statement

Ứng dụng hiện tại là **1 nhà hàng đơn lẻ** (NhamNhi) dù dữ liệu đã có field `restaurant` rải rác. Không có ranh giới bảo mật thật giữa các nhà hàng: bất kỳ ai biết `restaurantId` đều truyền được vào params/query/body mà không bị kiểm tra quyền sở hữu; socket `restaurant_<id>` ai cũng join được; user chỉ thuộc **1** nhà hàng và không có khái niệm người cho thuê (super-admin). Muốn biến nền tảng thành SaaS để **người thuê tự đăng ký, quản lý nhiều nhà hàng, mỗi nhà hàng là 1 tenant tách biệt** — mà không phải viết lại từ đầu.

## Solution

Chuyển ứng dụng thành nền tảng **multi-tenant** với:

- **4 vai diễn + khách**: `super-admin` (người cho thuê, quản nền tảng), `admin` (người thuê, quản **nhiều** nhà hàng, switch tenant), `manager`/`staff` (khoá **cố định 1** nhà hàng), `customer` (khách tại bàn, không có account tenant).
- **Ngữ cảnh tenant được xác thực**: access token chứa `restaurantId` (nhà hàng đang hoạt động); middleware `verifyTenant` kiểm tra user thuộc nhà hàng đó với mọi request, thay thế việc tin tưởng params/query/body.
- **Isolation chặt**: socket xác thực + verify membership; upload phân vùng theo tenant.
- **Khách tại bàn**: QR bàn mang `restaurantId` + `tableId`, server verify khớp khi tạo đơn.
- **Super-admin UI**: `/super-admin/*` quản lý tenant (danh sách, khoá/mở, xem user, thống kê gộp).

Phạm vi đợt đầu: **Admin + Order tại bàn + KDS + Reservation**. Delivery/To-go **giữ nguyên code, không đa-tenant hoá**. Billing/subdomain **để sau**.

## User Stories

1. Là một **người cho thuê (super-admin)**, tôi muốn có 1 tài khoản nền tảng riêng để quản lý toàn bộ nhà hàng trong hệ thống.
2. Là một **người thuê**, tôi muốn tự đăng ký 1 tài khoản `admin` để bắt đầu dùng nền tảng mà không cần chờ ai duyệt.
3. Là một **admin**, tôi muốn tạo **nhiều nhà hàng** trong cùng 1 account để quản lý chuỗi chi nhánh của tôi.
4. Là một **admin**, tôi muốn chuyển đổi giữa các nhà hàng (switch tenant) sau khi đăng nhập để thao tác đúng chi nhánh đang cần.
5. Là một **admin/manager**, tôi muốn tạo `manager`/`staff` cho nhà hàng của mình để phân việc cho nhân viên.
6. Là một **manager/staff**, tôi muốn tài khoản của mình chỉ thao tác được dữ liệu của **đúng 1 nhà hàng** mà tôi thuộc về.
7. Là một **manager/staff**, tôi muốn bị chặn khi cố truy cập dữ liệu nhà hàng khác (kể cả khi biết restaurantId) để đảm bảo bảo mật giữa các tenant.
8. Là một **khách tại bàn**, tôi quét QR trên bàn và được vào đúng nhà hàng + bàn của mình để xem menu và đặt món.
9. Là một **nhân viên bếp (KDS)**, tôi nhập mã nhà bếp của đúng nhà hàng tôi làm việc để xem đơn của chi nhánh đó, không nhìn thấy chi nhánh khác.
10. Là một **super-admin**, tôi muốn xem danh sách tất cả nhà hàng và khoá/mở bất kỳ nhà hàng nào để quản lý nền tảng.
11. Là một **super-admin**, tôi muốn xem tài khoản (`admin`/`manager`/`staff`) của từng nhà hàng để hỗ trợ người thuê.
12. Là một **super-admin**, tôi muốn xem số liệu tổng quan toàn hệ thống (số nhà hàng, số user, doanh thu gộp).
13. Là một **admin**, khi tạo nhà hàng mới, tôi muốn hệ thống tự seed setting mặc định (mã bếp, maintenanceMode) để nhà hàng sẵn sàng hoạt động ngay.
14. Là một **manager/staff**, tôi muốn upload ảnh món ăn chỉ hiển thị/phân loại trong nhà hàng của tôi.
15. Là một **khách**, tôi muốn thanh toán qua PayOS dùng cấu hình của đúng nhà hàng tôi đang ăn.
16. Là một **admin/manager**, tôi vẫn dùng được Reservation (đặt bàn) cho nhà hàng của mình như trước.

## Implementation Decisions

### 1. Mô hình role & tenant
- Enum `User.role` mở rộng: `customer | staff | manager | admin | super-admin` (`server/src/models/Schema/UserSchema.ts:29`).
- `User.restaurant` (ObjectId đơn, `UserSchema.ts:30`) → **`restaurantIds: ObjectId[]`** + index.
- Quy tắc thuộc về: `staff`/`manager` đúng **1** phần tử; `admin` nhiều; `super-admin` rỗng (toàn cục, bypass mọi tenant check); `customer` rỗng.
- Enforce khi tạo/cập nhật user trong service (không chỉ schema).

### 2. Ngữ cảnh tenant trong JWT
- Access token thêm claim `restaurantId` (nhà hàng **đang hoạt động**), ngoài `_id`, `role` hiện tại (`auth.service.ts:7-11`).
- Refresh token **không** đổi cấu trúc.
- Endpoint mới `POST /auth/switch-tenant { restaurantId }`: xác minh user thuộc nhà hàng đó → trả access token mới (không cần đăng nhập lại).

### 3. Middleware `verifyTenant`
- Middleware mới chạy sau `verifyToken`: đọc `restaurantId` từ token; xác minh user thuộc tenant; **gán `req.tenantId`**.
- Các route admin/manager/staff dùng `verifyToken` + `verifyRole` sẽ thêm `verifyTenant`.
- **~11 controller bỏ lấy restaurantId từ params/query/body**, chuyển sang `req.tenantId`: Order (create/getByRestaurant/getActive), Menu, Table, Reservation, Notification, Analytic, Setting.
- `super-admin` bypass: khi role là `super-admin` thì `req.tenantId` lấy từ param/query (cho phép gọi chéo).
- Route công khai giữ nguyên cơ chế nhận `restaurantId` từ param/body (KDS, khách tại bàn, upload).
- Bỏ các hardcode fallback `'69fccba996a14809070b9ef2'` (`client/src/App.tsx:88`, `client/src/pages/Customer/payment.tsx:86`).

### 4. Token KDS (mã nhà bếp)
- Thay token impersonate hiện tại (`setting.service.ts:184-188`, `{_id: restaurantId, role:'staff'}`) bằng token có đánh dấu `scope: 'kds'` + `restaurantId` đúng nghĩa.
- KDS chỉ được join room `restaurant_<restaurantId>` của tenant nó; không được nhận diện như `userId = restaurantId`.

### 5. Socket isolation
- Kích hoạt `io.use(authenticateToken)` (`sockets/index.ts:2`) — middleware đã viết sẵn nhưng chưa dùng.
- Sửa bug `auth.middleware.ts:86` (`user.restaurantId` → `user.restaurant`).
- Khi join room `restaurant_<id>` / emit `order_event`/`new_notification`: verify user thuộc tenant đó (hoặc token KDS `scope:'kds'` khớp tenant).

### 6. Upload theo tenant
- Cloudinary folder `restaurants-system` (cố định) → `restaurants/<restaurantId>/...` (`multer.middleware.ts:7-13`, `upload.repository.ts:4`).
- Xoá ảnh (`DELETE /upload`) phải kiểm tra ownership: chỉ tenant sở hữu ảnh mới được xoá.
- Xem xét gắn `verifyToken` cho các route upload (hiện công khai).

### 7. PayOS — KHÔNG sửa (đã per-tenant)
- Key đã lưu trong Setting từng nhà hàng (`payos.service.ts:20-22`); instance PayOS tạo per-request với đúng key; webhook xác định tenant qua `orderCode → payment → order → restaurant` rồi verify đúng key.
- Chỉ dọn 3 dòng `process.env.PAYOS_*` thừa (`payos.service.ts:31-33`) — dead code ghi đè env, không có race thật.

### 8. Tạo tenant (onboarding)
- `admin` tạo nhà hàng qua `POST /restaurants` (đã có, chỉ `admin`) → tự động: thêm `restaurantId` vào `admin.restaurantIds`, **seed Setting mặc định** (`systemConfig`: maintenanceMode off, `kitchenCode` 6 số ngẫu nhiên).
- **Auto-active**, không cần super-admin duyệt. Super-admin vẫn khoá/mở qua field `Restaurant.status`.

### 9. QR bàn
- QR value đổi từ `/scan-to-order?tableId=<id>` (`TableCard.tsx:117`) → `/scan-to-order?restaurantId=<id>&tableId=<id>`.
- Route `/scan-to-order` parse 2 param, set tenant + bàn cho phiên khách.
- Khi tạo đơn tại bàn: server **verify `table.restaurant === restaurantId`**.

### 10. Super-admin UI
- Route `/super-admin/*` trong cùng app, sidebar riêng, chỉ role `super-admin` truy cập.
- Dashboard: tổng nhà hàng, tổng user, doanh thu gộp (Analytic thêm khả năng bỏ `restaurantId` khi role super-admin).
- Danh sách nhà hàng: thông tin + khoá/mở (`Restaurant.status`).
- Xem tài khoản theo nhà hàng (đã có sẵn dữ liệu User + `restaurantIds`).

### 11. Migration dữ liệu (script chạy 1 lần)
- `OrderItem` + `Payment` thêm field `restaurant` ref + index; **backfill** từ `order.restaurant`.
- `AuditLog.restaurantId` → `restaurant` (đổi tên cho đồng bộ) kèm migration dữ liệu.
- User `admin@gmail.com` hiện tại → giữ role `admin`, gắn `restaurantIds: [69fccba996a14809070b9ef2]` (NhamNhi).
- Tạo account `super-admin` riêng (tài khoản nền tảng).
- Seed: restaurant hiện tại thành tenant đầu tiên; chạy trên bản sao DB trước, rồi DB thật.

### 12. Client — tenant context tập trung
- 32 chỗ `extractId(user?.restaurant)` (Header, order, table, product, SettingModal, analytics, users, management-order, FormCreateItem, reservation, pos, FormBillOrder, FormPayment, TimeSlotModal, Sidebar...) → gom về **1 selector/context** đọc `restaurantIds` + tenant đang active.
- Redux: auth slice lưu thêm `currentRestaurantId` (tenant active); sau login admin có nhiều nhà hàng → màn hình chọn nhà hàng.

## Testing Decisions

- **Seam duy nhất**: verify qua **API + Playwright** (không thêm test framework). Dự án chưa có vitest/jest.
- Mỗi ticket kèm tiêu chí chấp nhận dạng "chạy script/curl → output đúng" hoặc "Playwright → UI đúng".
- **Trọng tâm kiểm thử bảo mật tenant**: dùng token staff của nhà hàng A gọi API với `restaurantId` của nhà hàng B → phải bị 403/404; socket A không nhận event của B; upload A không xoá được ảnh B.
- Regression chính: flow khách tại bàn (QR → menu → đặt món → PayOS), KDS (mã bếp → dashboard → cập nhật trạng thái), admin thường (đơn, bàn, menu, reservation), super-admin (danh sách + khoá/mở).

## Out of Scope

- Billing/gói cước cho người thuê (PayOS vẫn dùng để thu tiền đơn tại bàn).
- Subdomain routing per-tenant (dùng app dùng chung + QR mang tenant).
- Self-service signup giao diện khách (chỉ luồng đăng ký admin cơ bản, UI tối thiểu).
- Đa-tenant hoá Delivery/To-go (giữ nguyên code, không ưu tiên).
- `tenantRoles` (role khác nhau theo từng nhà hàng cho 1 user) — làm sau nếu cần.
- Test framework tự động (vitest/jest) — ticket cuối có thể đề xuất riêng.

## Further Notes

- Không tách app riêng; giữ **1 app** React duy nhất (route `/admin`, `/super-admin`, `/customer`, `/kds`).
- Field tenant thống nhất tên `restaurant` (đang chuẩn hoá `AuditLog`).
- Kế hoạch chia 4 giai đoạn: (1) backend core → (2) isolation → (3) client → (4) E2E. Ước lượng ~3-4 tuần, 1 dev.
- Chi tiết ticket trong `.scratch/multi-tenant-refactor/issues/`.
