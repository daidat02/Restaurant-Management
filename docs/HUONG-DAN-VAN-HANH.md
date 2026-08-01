# Hướng Dẫn Vận Hành — Hệ Thống Quản Lý Nhà Hàng NhamNhi

> Tài liệu này mô tả **cách hệ thống đang vận hành thật trên production** (đã chạy thử bằng trình duyệt ngày 2026-08-01, cập nhật mô hình thuê bao 2026-08-02), kèm các URL, vai trò, luồng chính và những lỗi đã biết.

---

## 1. Tổng quan & URL Production

| Thành phần | URL | Ghi chú |
|---|---|---|
| Website khách hàng + Panel quản trị | `https://nhamnhitidi.vercel.app` | Client (Vercel) |
| API Server | `https://nhamnhitidi-server.onrender.com` | Backend (Render) |
| Màn hình nhà bếp (KDS) | `https://nhamnhitidi.vercel.app/kds` | Vào bằng mã nhà bếp |
| Cơ sở dữ liệu | MongoDB Atlas (cloud) | Admin seed đã kiểm tra trên prod |

Kiến trúc: **React (Vite) + Node/Express + MongoDB + Socket.IO (real-time)**. Hệ thống **đa nhà hàng (multi-tenant)**: một tài khoản chủ có thể sở hữu nhiều chi nhánh (Cơ sở), chuyển đổi qua nút **"Chọn cơ sở"**.

---

## 2. Các Vai Trò & Quyền

| Vai trò | Vào được | Nhiệm vụ chính |
|---|---|---|
| **super-admin** (Nền tảng) | `/super-admin` | Giám sát nền tảng SaaS: dashboard KPI, quản lý chủ thuê (tenants) + khoá/mở, chỉnh giá gói, lịch sử giao dịch, audit log |
| **admin** (Chủ nhà hàng / người thuê) | `/admin` | Quản lý chi nhánh, thực đơn, đơn hàng, báo cáo, onboarding chi nhánh mới, tạo staff/manager, thanh toán/gia hạn gói (`/admin/billing`) |
| **manager** (Quản lý cấp cao) | `/manager` | Thực đơn, đặt bàn, nhân viên, sơ đồ bàn, POS, quản lý đơn |
| **staff** (Nhân viên) | `/staff` | POS, sơ đồ bàn, đơn hàng, đặt bàn — chủ yếu làm trên POS |
| **customer** (Khách) | `/` | Xem menu, đặt tại bàn qua QR, đặt bàn trước, xem lịch sử đơn |

Quyền chi tiết:
- `admin` không thấy quản lý thực đơn ở `/admin` (menu chi nhánh nằm ở `/manager`), nhưng có đầy đủ: tổng quan, quản lý nhà hàng (thêm chi nhánh), báo cáo kinh doanh, người dùng hệ thống.
- `manager` có toàn bộ khu vực vận hành của chi nhánh.
- `staff` vào thẳng **POS** làm việc (redirect `/staff` → `/staff/orders/pos`).
- KDS **không cần tài khoản** — bảo mật bằng **mã nhà bếp** (6 số, hiệu lực 8 giờ).

---

## 3. Luồng Hoạt Động Chính (đã chạy thử OK trên production)

### 3.1. Khách đặt món tại bàn (luồng chính — QR scan-to-order)

1. Khách quét mã QR tại bàn → mở `https://nhamnhitidi.vercel.app/scan-to-order?restaurantId=<id>&tableId=<id bàn>` → thấy **"Bàn số: XXX"**.
2. Chọn danh mục / món → bấm **"Add +"** để thêm vào giỏ.
3. Bấm **"Xem giỏ hàng"** → sheet giỏ: chỉnh số lượng, xem tạm tính.
4. Bấm **"Xác nhận gửi đơn Bàn XXX"** → tạo đơn **tại quán (dine-in)**, thành công `201`.
5. Đơn **real-time** hiện lên màn hình bếp (KDS), món chuyển thẳng quầy bếp phục vụ.

> ✅ Đã verify trọn vòng: quét QR → đặt 1 món Nem Rế (85.000đ) tại Bàn 102 → order 201 → KDS hiện "Bàn 102".

### 3.2. Màn hình nhà bếp (KDS)

1. Vào `https://nhamnhitidi.vercel.app/kds` → nhập **mã nhà bếp** (6 số).
2. Mã do **admin/manager cấp** tại Cài đặt nhà hàng (`/manager` → Cài Đặt) — nút tạo mã mới.
3. Bếp thấy danh sách đơn active theo tab: **Tất cả / Tại quán / Giao hàng / Mang về**, kèm số bàn, mã đơn, thời gian.
4. **Bấm 1 lần vào món** → "Chờ" → "Đang nấu"; **bấm lần 2** → hoàn thành. Đơn hết món active sẽ **tự ẩn** khỏi màn hình.
5. Nút "Thoát phiên" để đăng xuất bếp (mã 8 giờ hết hạn).

> ✅ Đã verify: mã `855393` vào OK → món "Đậu Hũ Khói Lửa" đổi Chờ → Đang nấu → Hoàn thành → đơn tự ẩn.

### 3.3. Quản lý / POS

- **POS** (`/manager/orders/pos` hoặc `/staff/orders/pos`): chọn món (lưới trái) + giỏ hàng (phải), toggle **"Đơn Hàng Mang Về"**, quản lý đơn tại quán.
- **Sơ đồ bàn** (`/manager/tables`): xem bàn trống/bận, gộp/tách bàn.
- **Quản lý đơn hàng** (`/manager/orders/management`): filter theo trạng thái, nút **Thanh toán / Chỉnh sửa đơn / In bếp & Hóa đơn**.
- **Thực đơn** (`/manager/menu/items`): danh sách món; **thêm/sửa món** (`/manager/menu/items/create`, `.../edit/:id`).
- **Đặt bàn trước** (`/manager/reservations`): xác nhận/hoàn tất lịch đặt.
- **Nhân viên** (`/manager/staff`): tạo tài khoản staff/manager cho chi nhánh.

### 3.4. Chủ nhà hàng (Admin / người thuê)

- **Đăng ký chủ** (`/auth/owner`): form riêng cho chủ nhà hàng (họ tên, email, SĐT, mật khẩu) — giải thích "miễn phí 30 ngày dùng thử cho nhà hàng đầu tiên, sau đó 299.000đ/nhà hàng/tháng". Sau đăng ký tự đăng nhập → vào wizard tạo nhà hàng đầu.
- **Tổng quan** (`/admin`): dashboard chi nhánh + **banner trạng thái thuê bao** (trial xanh / sắp hết ≤7 ngày cam / bị khoá đỏ + nút thanh toán).
- **Quản lý nhà hàng** (`/admin/restaurants`): tìm kiếm, badge trạng thái từng nhà hàng; **"Thêm nhà hàng"** → nhà hàng **đầu tiên** vào wizard (trial, không tính phí); nhà hàng **2+** mở **modal trả phí 299.000đ/tháng**.
- **Onboarding** (`/admin/onboarding`): wizard thiết lập chi nhánh mới (thông tin, cấu hình, nhân sự, bàn & QR).
- **Thanh toán & Gia hạn** (`/admin/billing`): chọn nhà hàng + chu kỳ (1/3/6/12 tháng, đọc giá từ PricingConfig), nút **"Thanh toán"** (mock) → chuyển nhà hàng sang `active`, màn thành công + **lịch sử giao dịch**.
- **Báo cáo kinh doanh** (`/admin/reports`): doanh thu, hiệu suất chi nhánh, hành vi gọi món (lọc theo ngày/tiêu chí).
- **Người dùng hệ thống** (`/admin/customers`): tài khoản nhân viên toàn hệ thống.

### 3.5. Nền tảng (Super-admin)

> ✅ Đã đặt lại mật khẩu + login OK (2026-08-01): `super.admin@nhamnhi.vn` / `Test@NhamNhi2026`.

- **Dashboard** (`/super-admin`): **4 KPI** (chủ đang trial, chủ hoạt động, số nhà hàng đang hoạt động, doanh thu tháng này), **biểu đồ doanh thu 6 tháng**, bảng người thuê gần đây + nhà hàng sắp hết hạn (≤7 ngày).
- **Người thuê** (`/super-admin/tenants`): danh sách chủ (tên, email, số nhà hàng, trạng thái trial/active/locked, tổng đã trả) → **chi tiết chủ** (nhà hàng + giao dịch) → **Khoá/Mở khoá** toàn bộ tài khoản của chủ.
- **Gói cước & giá** (`/super-admin/pricing`): chỉnh giá 4 chu kỳ (lưu PricingConfig, tự tính % tiết kiệm).
- **Giao dịch** (`/super-admin/transactions`): lịch sử thanh toán (nhà hàng, chủ, số tiền, chu kỳ, trạng thái, thời gian).
- **Audit log** (`/super-admin/audit`): nhật ký sự kiện subscription/thanh toán/khoá.
- Không còn màn hình vận hành nhà hàng (danh sách nhà hàng, đổi gói Free/Pro, nút Crown) — đã loại bỏ khi chuyển sang mô hình SaaS.

### 3.6. Khách hàng (Website)

- **Trang chủ** (`/`): hero, danh mục món, menu nổi bật, footer (địa chỉ, hotline, giờ mở cửa). Nút **"Chọn cơ sở"** để đổi chi nhánh.
- **Menu** (`/menu`): lọc theo danh mục, xem chi tiết món (`/product/:id`) với giá, mô tả, định lượng, gợi ý món cùng loại.
- **Đặt bàn trước** (`/reservation`): chọn nhà hàng, ngày/giờ, số người, điền tên + SĐT.
- **Đăng ký/Đăng nhập** (`/auth`): đăng ký khách, có Google Sign-in. Chủ nhà hàng đăng ký riêng tại `/auth/owner`.
- **Tài khoản** (`/account/profile`, `/account/orders`, `/account/settings`): hồ sơ, lịch sử đơn, cài đặt.

---

## 4. Thuê bao (Subscription) — trial / active / locked

- Mỗi nhà hàng có trạng thái `subscription: 'trial' | 'active' | 'locked'` + `trialEndsAt` / `paidUntil` (chi tiết `server/src/models/Schema/RestaurantSchema.ts`).
- **Nhà hàng đầu tiên** của chủ → **trial 30 ngày** miễn phí (`trialEndsAt = now + 30 ngày`).
- **Nhà hàng 2+** → bắt buộc trả trước theo chu kỳ → `active` + ghi Transaction.
- **State machine** (`server/src/services/subscription.service.ts`): khi đọc/ghi nhà hàng, tự tính trạng thái theo ngày —
  - `trial` còn **≤7 ngày** → ghi nhận `subscription.expiring` + thông báo bell (1 lần).
  - `trial` hết hạn / `active` quá `paidUntil` → chuyển **locked** + audit `subscription.locked` + thông báo.
- **Khi locked**: tạo đơn (`POST /api/orders`) & tạo món (`POST /api/menu/item`) bị chặn → `403 { code: 'RESTAURANT_LOCKED' }`.
- **Thanh toán / gia hạn (mock)**: `POST /api/subscriptions/pay` (`restaurantId`, `cycleMonths`) → tạo Transaction(paid), `subscription='active'`, `paidUntil = max(now, paidUntil) + chu kỳ`, audit `transaction.create` + `subscription.unlocked`. Chưa nối PayOS/VNPay.
- **Giá chu kỳ** (PricingConfig, super-admin chỉnh tại `/super-admin/pricing`): 1 tháng **299.000đ** / 3 tháng **849.000đ** (~5%) / 6 tháng **1.590.000đ** (~11%) / 12 tháng **2.990.000đ** (~17%).
- **Khoá tài khoản chủ** (super-admin): đặt `isActive=false` → toàn bộ user (admin/manager/staff) của chủ không đăng nhập được.

---

## 5. Lỗi Đã Biết & Lưu ý

1. **Đặt hàng giao tận nơi (delivery) lỗi 500** — phát hiện 2026-08-01:
   - Hiện tượng: khách chọn món → "Tiến hành đặt giao hàng" → điền thông tin → "Xác nhận đặt hàng" → `POST /api/orders` trả `500` với lỗi `restaurant: Cast to ObjectId failed for value ""`.
   - Nguyên nhân: `client/src/pages/Customer/payment.tsx:89-92` gửi `restaurant: activeRestaurantId || URL.restaurantId || ''`. `activeRestaurantId` đọc từ **auth slice** (khách thì rỗng), trong khi cơ sở khách chọn nằm ở **restaurant slice** (`restaurantSelected`). So sánh: `cart.tsx` đã fallback `restaurantId || restaurantSelected || ''` nhưng `payment.tsx` chưa.
   - **Khuyến nghị**: theo định hướng multi-tenant-refactor, **luồng delivery không phải mục tiêu** — ưu tiên "đặt tại bàn qua QR". Có thể: (a) bỏ/ẩn route giao hàng, hoặc (b) fix `payment.tsx` thêm fallback `restaurantSelected` nếu giữ luồng này.
2. **Super-admin đã được đặt lại mật khẩu + verify** (2026-08-01): login `/super-admin` OK qua UI, truy cập `Quản Lý Nhà Hàng` OK. Cách reset khi cần: `SUPER_ADMIN_PASSWORD='...' node server/scripts/reset-super-admin.mjs`.
3. **Seed không có tài khoản khách trên prod** — `customer.test@nhamnhi.vn` không tồn tại trên Atlas; đăng ký mới từ `/auth` (đã thử OK, `khach.demo@nhamnhi.vn`).

---

## 6. Tài Khoản Seed (dùng cho test trên production)

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Super-admin | `super.admin@nhamnhi.vn` | `Test@NhamNhi2026` |
| Admin | `admin.test@nhamnhi.vn` | `Test@NhamNhi2026` |
| Manager | `manager.test@nhamnhi.vn` | `Test@NhamNhi2026` |

> Chủ nhà hàng mới không có sẵn trên prod — đăng ký trực tiếp tại `/auth/owner` (nhà hàng đầu tiên tự bắt đầu trial 30 ngày).

---

## 7. Nhật ký verify Production (2026-08-01)

| # | Hạng mục | Kết quả |
|---|---|---|
| 1 | Login admin → chọn cơ sở → vào `/admin` | ✅ |
| 2 | Reload trang giữ session (refresh cookie cross-site `Secure; SameSite=None`) | ✅ |
| 3 | `/admin/products`, `/admin/orders`, `/admin/reports`, `/admin/restaurants` | ✅ hiển thị dữ liệu thật |
| 4 | Login manager → `/manager` (tự vào, 1 cơ sở) | ✅ |
| 5 | POS `/manager/orders/pos` (menu + giỏ + toggle mang về) | ✅ |
| 6 | KDS mã `855393` → xác thực → live-monitor 2 đơn | ✅ |
| 7 | KDS: Chờ → Đang nấu → Hoàn thành → đơn tự ẩn | ✅ |
| 8 | Scan-to-order Bàn 102 → đặt món → order `201` | ✅ |
| 9 | KDS nhận đơn "Bàn 102" real-time (socket) | ✅ |
| 10 | Trang chủ `/`, menu `/menu`, chi tiết món, giỏ hàng, đăng ký khách | ✅ |
| 11 | Đặt hàng delivery | ❌ 500 (xem mục 5) |

## 8. Verify Thuê bao / Subscription (tự động — test suite)

> Verify toàn diện (T11) bằng **vitest + Playwright** (`E2E_SERVER=test npm run test:e2e` ở root). Chạy local hoặc CI `.github/workflows/ci.yml`.

| # | Hạng mục | Test |
|---|---|---|
| 1 | Schema Restaurant có `ownerId`/`subscription`/`trialEndsAt`/`paidUntil` | `subscription-schema.test.ts` |
| 2 | Đăng ký chủ (`POST /auth/register-owner`) → role admin | `register-owner.test.ts` |
| 3 | Nhà hàng đầu → trial 30 ngày + audit `subscription.trial.started` | `register-owner.test.ts` |
| 4 | Nhà hàng 2+ → trả phí (Transaction) + active; chu kỳ sai → 400 | `register-owner.test.ts` |
| 5 | State machine: trial 20 ngày giữ nguyên / ≤7 ngày → expiring / quá hạn → locked | `subscription-state.test.ts` |
| 6 | Thanh toán: gia hạn active / mở lại locked → active + audit; chủ khác → 403 | `subscription-pay.test.ts` |
| 7 | Tạo đơn & món khi locked → `403 RESTAURANT_LOCKED` | `subscription-pay.test.ts` |
| 8 | Super-admin: dashboard 4 KPI, tenants, transactions, block/unblock chủ | `super-admin-billing.test.ts`, `super-admin.test.ts` |
| 9 | **Vòng đời chống production**: đăng ký → nhà hàng đầu trial → tạo đơn OK → hết hạn → locked + chặn đơn → thanh toán → active + tạo đơn lại → super-admin thấy KPI/giao dịch → block/unblock | `subscription-lifecycle.test.ts` |
| 10 | E2E UI: banner 3 trạng thái, badge + modal trả phí 2+, billing mock 299.000đ → màn thành công | `e2e/subscription-owner.spec.ts` |
| 11 | E2E UI: đăng ký chủ `/auth/owner` → wizard nhà hàng đầu → banner trial trên `/admin` | `e2e/owner-register.spec.ts` |
| 12 | E2E UI: super-admin dashboard/tenants/pricing/transactions/audit + khoá chủ | `e2e/super-admin.spec.ts` |
