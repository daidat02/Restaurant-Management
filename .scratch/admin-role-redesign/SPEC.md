# SPEC — Refactor vai trò Admin: 1 chủ quản toàn chuỗi, không chọn nhà hàng

> Mô hình được chốt qua phiên grill (Q1–Q24). Phần vận hành/subscription đã có ở `.scratch/saas-mvp/subscription/SPEC.md`.
> Tài liệu này tập trung vào **tách vai trò**: admin = chủ chuỗi (chiến lược), manager/staff = vận hành 1 chi nhánh.

---

## 1. Problem Statement

Hiện tại hệ thống xử lý vai trò `admin` như một **manager có thêm quyền nền tảng**: admin phải chọn 1 nhà hàng đang làm việc (`currentRestaurantId`) trước khi vào bất kỳ trang nào, bị ép qua màn hình `/select-restaurant` khi có nhiều nhà hàng, và menu/trang giống hệt manager (POS, menu, tables, orders...). Hệ quả:

1. **Admin bị ép chọn 1 nhà hàng** mỗi lần làm việc → không thể quản lý toàn chuỗi, nhìn tổng quan bị bó hẹp 1 chi nhánh.
2. **Không phân biệt "chủ" và "quản lý"**: admin thấy đủ màn hình vận hành như manager → trùng lặp, nhầm lẫn vai trò; không có màn hình nào cho việc quản lý chuỗi (so sánh chi nhánh, giám sát nhân sự, audit).
3. **Không có nơi giám sát hoạt động**: audit log chỉ super-admin; admin không biết manager/staff làm gì trên chi nhánh của mình.
4. **Manager bị thiết kế theo đa tenant** (mảng `restaurantIds`, màn hình chọn nhà hàng) trong khi thực tế manager quản đúng 1 chi nhánh → dư thừa, dễ nhầm.

## 2. Mục tiêu

- **Admin (chủ)**: 1 tài khoản duy nhất, quản **tất cả** nhà hàng của mình cùng lúc — **không chọn nhà hàng**, không có `currentRestaurantId`. Nhìn tổng quan chuỗi, quản chi nhánh, so sánh báo cáo, giám sát nhân sự + audit.
- **Manager**: thuộc **đúng 1 nhà hàng**, không có màn hình chọn. Quản lý nhân viên (staff) của chi nhánh mình.
- **Staff**: thuộc 1 nhà hàng, vận hành POS/đơn/bàn/lịch đặt.
- **Bỏ hẳn màn hình `/select-restaurant`** — mọi vai trò vào thẳng nơi làm việc của mình.

## 3. Mô hình vai trò (đã chốt)

| Vai trò | Phạm vi | Chọn nhà hàng? | Trang chính |
|---|---|---|---|
| **admin** | Toàn chuỗi (tất cả `restaurantIds`) | Không | `/admin` — tổng quan chuỗi |
| **manager** | 1 nhà hàng | Không (tự động vào chi nhánh duy nhất) | `/manager` |
| **staff** | 1 nhà hàng | Không | `/staff` |
| **super-admin** | Nền tảng | Không | `/super-admin` |

## 4. Admin dùng được gì (menu mới)

- **Tổng Quan Hệ Thống** `/admin` — KPI **gộp cả chuỗi** + bảng **cảnh báo thuê bao** (từng chi nhánh locked/sắp hết hạn + nút thanh toán).
- **Quản Lý Nhà Hàng** `/admin/restaurants` — danh sách chi nhánh, thêm (wizard/trial đầu tiên, trả phí 2+), sửa, xoá, thanh toán mở lại, **nút Cài Đặt** mở SettingModal theo `restaurantIdOverride`.
- **Báo Cáo Kinh Doanh** `/admin/reports` — **so sánh giữa chi nhánh** (xếp hạng doanh thu/đơn, biểu đồ so sánh), nối **API thật** (không mock).
- **Người Dùng Hệ Thống** `/admin/customers` — **chỉ quản manager** (bỏ tab Khách Hàng), hiển thị cả chính admin; form tạo manager có dropdown **chọn nhà hàng** (bắt buộc).
- **Thanh Toán & Gói** `/admin/billing` — giữ nguyên (đã có dropdown chọn nhà hàng).
- **Audit Logs** `/admin/logs` — **mới**: audit hành động (tạo/sửa/xoá) + **log thanh toán** của mọi chi nhánh.
- **Cài Đặt Chung** — **modal tài khoản cá nhân**: thông tin (tên/email/SĐT/avatar) + đổi mật khẩu + logout. Không chứa cài đặt nhà hàng.
- **Tin Nhắn** — giữ (mock hiện tại).

### Không còn trên admin
POS, Quản Lý Thực Đơn, Sơ Đồ Bàn, Đơn Hiện Tại, Lịch Đặt Bàn, Quản Lý Đơn Hàng, Nhân Viên (màn hình vận hành) — chuyển hết về manager/staff. Truy cập URL trực tiếp các trang này → **redirect về `/admin`**.

## 5. Quyết định kỹ thuật (đã chốt)

### 5.1. Xác thực & tenant
- **Token**: giữ cấu trúc JWT hiện tại (không bắt buộc `restaurantId` claim mới cho admin). `verifyTenant` xử lý theo vai trò:
  - **admin**: **bypass** giống super-admin (không cần `currentRestaurantId`); `req.tenantId` lấy từ query/params/body. Kiểm tra quyền sở hữu thêm bởi `assertOwnerOfRestaurant(ownerId)` — tài nguyên phải thuộc 1 trong `user.restaurantIds`.
  - **manager/staff**: lấy `restaurantId` từ token/`restaurantIds[0]` (ưu tiên nhà hàng đầu), kiểm tra thuộc như hiện tại.
  - **super-admin**: giữ nguyên.
- **Guard locked (subscription)**: **không áp dụng cho admin** — admin luôn vào được `/admin`, `/admin/restaurants`, `/admin/billing` để xử lý thanh toán. Chỉ manager/staff của chi nhánh locked bị chặn.

### 5.2. Auth flow (client)
- `deriveDefaultRestaurant` (authSlice.ts:29-37): **admin → null** (luôn); manager/staff → `restaurantIds[0]` nếu nhiều id (không hỏi); super-admin/customer → null (giữ).
- **Xoá route `/select-restaurant`** + `RestaurantSwitcher` + redirect trong `ProtectedRoute` (App.tsx:83).
- `ProtectedRoute` admin: `requiresTenant={false}`, không ép `isTenantSelected`.
- `useActiveRestaurantId`: admin → trả `''` (hoặc các trang admin đổi sang dùng mảng `restaurantIds`); manager/staff → như cũ (ưu tiên `currentRestaurantId` → `restaurantIds[0]`).
- Dữ liệu cũ (manager/staff mang nhiều `restaurantIds`): **ưu tiên id đầu khi login**, không chạy migration dọn DB.

### 5.3. Analytics (admin xem toàn chuỗi)
- `getOverviewStats` / `getRevenueByHour` / `getOrderChannelAnalytics`: đổi tham số từ `restaurantId?: string` → nhận `restaurantIds?: string[]`, query **`$in`** (reservation count cũng theo `$in`).
- Route `/overview`, `/revenue-hourly`, `/order-channels`: thêm middleware **`intersectRestaurantIds`** — lấy mảng `restaurantIds` từ query, **intersect với `user.restaurantIds`** (đọc từ DB); id ngoài phạm vi → 403 (hoặc tự loại). Manager gửi 1 id vẫn hoạt động.
- Client: admin gửi toàn bộ `user.restaurantIds`; manager/staff gửi `restaurantIds[0]`.

### 5.4. Audit logs cho admin
- Mở `GET /api/audit-logs` cho admin: filter theo `restaurantIds` của chủ (intersect như trên).
- **Log thanh toán**: query từ collection `Transaction` (đã có `ownerId` + `restaurant`) theo `ownerId` của admin → kết hợp cả hai nguồn (audit hành động + transaction) trên trang `/admin/logs`.

### 5.5. UI
- **SettingModal** (`SettingModal.tsx:46`): thêm prop `restaurantIdOverride?: string`. Nếu có → dùng `restaurantIdOverride` làm nhà hàng hiển thị/chỉnh; không có → dùng `useActiveRestaurantId()` (manager/staff giữ nguyên). Admin mở từ `/admin/restaurants` truyền id chi nhánh.
- **Header** (`Header.tsx:48-60`): bỏ dropdown mock "My Account" (Profile/Billing/Settings); thay bằng **avatar → mở thẳng modal tài khoản cá nhân** (thông tin + đổi mật khẩu + logout).
- **Chuông thông báo**: admin → gộp toàn chuỗi (lấy theo mọi `restaurantIds`, hiển thị kèm tên nhà hàng); manager/staff giữ nguyên theo 1 nhà hàng.
- **Sidebar**: admin → menu mới (mục 4). Manager giữ "Cài Đặt Nhà Hàng" (mở SettingModal); admin không có mục này (chỉ Cài Đặt Chung = modal tài khoản).
- **Billing**: giữ nguyên — đã có dropdown chọn nhà hàng + ưu tiên nhà hàng bị khoá/sắp hết (billing.tsx:51-58).

## 6. Data model

**Không đổi schema nào.** Chỉ thay đổi hành vi:
- `User.restaurantIds` vẫn là mảng — admin giữ nhiều id, manager/staff về sau chỉ có 1.
- Không chạy migration; xử lý lúc login (ưu tiên id đầu cho manager/staff).

## 7. Backend endpoints (mới/sửa)

| Method | Route | Quyền | Thay đổi |
|---|---|---|---|
| GET | `/api/analytics/overview` | manager/admin | Nhận `restaurantIds[]`, `$in`, intersect |
| GET | `/api/analytics/revenue-hourly` | manager/admin | Nhận `restaurantIds[]`, `$in`, intersect |
| GET | `/api/analytics/order-channels` | manager/admin | Nhận `restaurantIds[]`, `$in`, intersect |
| GET | `/api/audit-logs` | super-admin/**admin** | Thêm admin: filter theo `restaurantIds` của chủ |
| GET | `/api/audit-logs/payments` (mới) | admin | Log thanh toán mọi chi nhánh của chủ (từ `Transaction`) |

> `verifyTenant` + `assertOwnerOfRestaurant` áp dụng cho toàn bộ route admin để đảm bảo không cross-owner.

## 8. Frontend pages (mới/sửa)

| Route | Thay đổi |
|---|---|
| `/select-restaurant` | **Xoá** |
| `/admin` (HomePage) | KPI gộp chuỗi + bảng cảnh báo thuê bao (thay banner đơn) |
| `/admin/restaurants` | Thêm nút Cài Đặt → SettingModal `restaurantIdOverride` |
| `/admin/reports` | **Đại tu**: so sánh chi nhánh, bỏ mock data |
| `/admin/customers` | Chỉ quản manager; bỏ tab Khách Hàng; form tạo manager có dropdown chọn nhà hàng |
| `/admin/logs` | **Mới**: audit + log thanh toán |
| `/admin/products`, `/admin/orders` | **Xoá** khỏi route admin (vận hành) |
| Header | Avatar → modal tài khoản (thông tin + đổi mật khẩu + logout) |
| Sidebar | Menu admin mới; chuông gộp toàn chuỗi cho admin |

## 9. Xoá / dọn code

- Xoá `RestaurantSwitcher.tsx`, route `/select-restaurant`.
- Xoá `requiresTenant` ép chọn cho admin trong `ProtectedRoute`/`App.tsx`.
- Xoá 3 mục mock dropdown Header (Profile/Billing/Settings).
- Xoá các route admin vận hành (products, orders) — dùng chung component với manager nhưng bỏ khỏi nhóm admin.

## 10. Audit log events (dùng cho `/admin/logs`)

Tận dụng sẵn có: `user.register`, `restaurant.create`, `restaurant.update`, `restaurant.delete`, `subscription.*`, `transaction.create`, `user.*`, `setting.update`, `pricing.update`... — lọc theo `restaurantIds` của chủ + thêm nguồn `Transaction`.

## 11. Out of scope (làm sau)

- Nối cổng thanh toán thật (giữ mock).
- Landing page bán dịch vụ.
- Email nhắc nhở thuê bao.
- Tin nhắn thật (MailBoxPopover đang mock).
- Customer portal (vai trò `customer` giữ nguyên).

## 12. Seam (nơi test)

1. **Backend integration test** (`server/src/test/`, vitest + supertest + MongoDB Memory Server): quyền/ownership `verifyTenant` (admin bypass + `assertOwnerOfRestaurant`), analytic `$in` + intersect 403, audit theo `restaurantIds`. — seam ưu tiên cao nhất (đã có hạ tầng).
2. **Backend đơn vị**: `deriveRestaurantIds` (manager/staff ưu tiên id đầu) nếu tách hàm thuần.
3. **Frontend Playwright E2E** (`e2e/`): flow admin (dashboard tổng hợp, reports so sánh, customers, logs, billing), manager/staff vào thẳng nhà hàng đầu, admin bị chặn trang vận hành.
