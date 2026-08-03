# Hướng Dẫn Vận Hành — Hệ Thống Quản Lý Nhà Hàng NhamNhi

> Tài liệu mô tả **cách hệ thống đang vận hành thật trên production** theo mô hình **SaaS thu phí theo nhà hàng** (hoàn tất verify toàn diện T11: test suite + E2E + build xanh, cập nhật 2026-08-02 — **bao gồm redesign vai trò admin quản toàn chuỗi**, bỏ màn hình chọn cơ sở), kèm URL, vai trò, tài khoản test từng role, luồng chính và lỗi đã biết.

---

## 1. Tổng quan & URL Production

| Thành phần | URL | Ghi chú |
|---|---|---|
| Website khách hàng + Panel quản trị | `https://nhamnhitidi.vercel.app` | Client (Vercel) |
| API Server | `https://nhamnhitidi-server.onrender.com` | Backend (Render) |
| Màn hình nhà bếp (KDS) | `https://nhamnhitidi.vercel.app/kds` | Vào bằng mã nhà bếp (không cần tài khoản) |
| Cơ sở dữ liệu | MongoDB Atlas (cloud) | Tài khoản test đã seed + verify login trên prod |

Kiến trúc: **React (Vite) + Node/Express + MongoDB + Socket.IO (real-time)**. Hệ thống **đa nhà hàng (multi-tenant)**: một tài khoản chủ (role `admin`) sở hữu nhiều chi nhánh (Cơ sở). **Từ T04 trở đi: admin vào thẳng `/admin` và quản toàn chuỗi — màn hình "Chọn cơ sở" đã bị gỡ.** Mô hình kinh doanh: **trả phí theo từng nhà hàng** — nhà hàng đầu được dùng thử 30 ngày, nhà hàng 2+ phải trả trước.

---

## 2. Các Vai Trò & Quyền

| Vai trò | Vào được | Nhiệm vụ chính |
|---|---|---|
| **super-admin** (Nền tảng) | `/super-admin` | Giám sát nền tảng SaaS: dashboard KPI, quản lý chủ thuê (tenants) + khoá/mở tài khoản chủ, chỉnh giá gói, lịch sử giao dịch, audit log. **Không** xem dữ liệu vận hành của nhà hàng người thuê |
| **admin** (Chủ nhà hàng / người thuê) | `/admin` | **Quản toàn chuỗi chi nhánh**: tổng quan gộp chuỗi, quản lý nhà hàng (+ Cài Đặt từng chi nhánh), báo cáo so sánh, quản manager, audit + thanh toán toàn chuỗi, onboarding & thanh toán/gia hạn gói |
| **manager** (Quản lý cấp cao) | `/manager` | Thực đơn, đặt bàn, nhân viên, sơ đồ bàn, POS, quản lý đơn (một chi nhánh) |
| **staff** (Nhân viên) | `/staff` | POS, sơ đồ bàn, đơn hàng, đặt bàn — chủ yếu làm trên POS |
| **customer** (Khách) | `/` | Xem menu, đặt tại bàn qua QR, đặt bàn trước, xem lịch sử đơn |
| **kds** (Màn hình bếp) | `/kds` | Không phải tài khoản — bảo mật bằng **mã nhà bếp** (6 số, hiệu lực 8 giờ) |

Quyền chi tiết (sau redesign T01–T10):
- `admin` (chủ chuỗi) **vào thẳng `/admin`, quản toàn chuỗi** — không còn màn hình chọn cơ sở; giao diện admin gộp dữ liệu mọi chi nhánh của chuỗi (dashboard KPI chuỗi, reports so sánh chi nhánh, customers quản manager, logs audit + thanh toán toàn chuỗi). Không truy cập được `/manager/*` hoặc `/staff/*` (redirect về `/admin`).
- `admin` không thấy quản lý thực đơn ở `/admin` (menu chi nhánh nằm ở `/manager`), nhưng có **Cài Đặt từng chi nhánh** ngay tại `/admin/restaurants`.
- `manager` có toàn bộ khu vực vận hành của **một chi nhánh** (tự chọn `restaurantIds[0]`); không vào được `/admin/*` (redirect về `/manager`).
- `staff` vào thẳng **POS** làm việc (redirect `/staff` → `/staff/orders/pos`).
- `customer` không đăng nhập vẫn gọi món được ở bàn (QR scan-to-order); đăng nhập để xem lịch sử đơn.
- `super-admin` chỉ thấy: danh sách chủ, danh sách nhà hàng **kèm trạng thái thanh toán**, giao dịch, cấu hình giá, audit log, KPI nền tảng — **không có** menu/đơn/bàn/khách hàng của người thuê.

---

## 3. Tài Khoản Test Cho Từng Role (đã seed trên production)

> Đã seed lên **DB production (Atlas)** bằng script `server/scripts/seed-test-accounts.mjs` và **verify login thành công qua API production** (2026-08-02). Mật khẩu dùng chung: `Test@NhamNhi2026`.

| Role | Email | Thuộc nhà hàng | Mục đích test |
|---|---|---|---|
| **super-admin** | `super.admin@nhamnhi.vn` | — | Dashboard KPI, tenants, pricing, transactions, audit, khoá/mở chủ |
| **admin** (chủ 2 cơ sở) | `admin.test@nhamnhi.vn` | `NhamNhi TEST Cơ Sở 1` + `NhamNhi TEST Cơ Sở 2` | **Quản toàn chuỗi**: `/admin/*` (dashboard gộp, restaurants + Cài Đặt chi nhánh, reports so sánh, customers quản manager, logs audit + thanh toán, billing) |
| **manager** | `manager.test@nhamnhi.vn` | `NhamNhi TEST Cơ Sở 1` | `/manager/*`: menu, POS, bàn, đặt bàn, nhân viên |
| **staff** | `staff.test@nhamnhi.vn` | `NhamNhi TEST Cơ Sở 1` | POS, sơ đồ bàn, đơn hàng |
| **customer** | `customer.test@nhamnhi.vn` | — | Đăng nhập khách, lịch sử đơn, đặt bàn |
| **owner** (chủ 3 nhà hàng thuê bao) | `owner.sub@nhamnhi.vn` | `NhamNhi TEST Sub Trial` (trial còn 10 ngày) · `NhamNhi TEST Sub Sắp Hết Hạn` (trial ≤7 ngày) · `NhamNhi TEST Sub Bị Khoá` (locked) | Banner 3 trạng thái, billing, upsell khi locked |

**Mã nhà bếp (KDS):** `456734` (Cơ Sở 1) · `553572` (Cơ Sở 2).

### Cách tạo lại / đồng bộ tài khoản test

Script idempotent theo email — chạy lại nhiều lần không tạo trùng:

```bash
cd server
node scripts/seed-test-accounts.mjs
```

Script sẽ:
1. Đọc `MONGODB_URL` từ `server/.env` (chính là DB Atlas production).
2. Upsert 5 nhà hàng test: 2 cơ sở active cho `admin.test`, 3 nhà hàng (trial / sắp hết hạn / locked) cho `owner.sub`.
3. Upsert 6 tài khoản theo role (bảng trên) với mật khẩu `Test@NhamNhi2026`, `isActive: true`.
4. Gán `ownerId` cho từng nhà hàng, tạo cấu hình (`kitchenCode`), bàn (Cơ Sở 1, 2 mỗi cơ sở), menu mẫu (Cà phê sữa 35.000đ, Trà đào 40.000đ).

> ⚠️ Chạy script là **ghi vào DB mà `MONGODB_URL` trỏ tới**. Kiểm tra kỹ `.env` trước khi chạy ở máy lạ. Reset super-admin riêng khi cần: `SUPER_ADMIN_PASSWORD='...' node server/scripts/reset-super-admin.mjs`.

---

## 4. Luồng Hoạt Động Chính (đã verify OK trên production)

### 4.1. Khách đặt món tại bàn (luồng chính — QR scan-to-order)

1. Khách quét mã QR tại bàn → mở `https://nhamnhitidi.vercel.app/scan-to-order?restaurantId=<id>&tableId=<id bàn>` → thấy **"Bàn số: XXX"**.
2. Chọn danh mục / món → bấm **"Add +"** để thêm vào giỏ.
3. Bấm **"Xem giỏ hàng"** → sheet giỏ: chỉnh số lượng, xem tạm tính.
4. Bấm **"Xác nhận gửi đơn Bàn XXX"** → tạo đơn **tại quán (dine-in)**, thành công `201`.
5. Đơn **real-time** hiện lên màn hình bếp (KDS), món chuyển thẳng quầy bếp phục vụ.

> ✅ Đã verify trọn vòng: quét QR → đặt món tại bàn → order `201` → KDS hiện đúng số bàn real-time.

### 4.2. Màn hình nhà bếp (KDS)

1. Vào `https://nhamnhitidi.vercel.app/kds` → nhập **mã nhà bếp** (test: `456734` hoặc `553572`).
2. Mã do **admin/manager cấp** tại Cài đặt nhà hàng (`/manager` → Cài Đặt) — nút tạo mã mới (mã cũ vô hiệu).
3. Bếp thấy danh sách đơn active theo tab: **Tất cả / Tại quán / Giao hàng / Mang về**, kèm số bàn, mã đơn, thời gian.
4. **Bấm 1 lần vào món** → "Chờ" → "Đang nấu"; **bấm lần 2** → hoàn thành. Đơn hết món active sẽ **tự ẩn** khỏi màn hình.
5. Nút "Thoát phiên" để đăng xuất bếp (mã 8 giờ hết hạn).

### 4.3. Quản lý / POS (manager & staff)

- **POS** (`/manager/orders/pos` hoặc `/staff/orders/pos`): chọn món (lưới trái) + giỏ hàng (phải), toggle **"Đơn Hàng Mang Về"**, quản lý đơn tại quán.
- **Sơ đồ bàn** (`/manager/tables`): xem bàn trống/bận, gộp/tách bàn.
- **Quản lý đơn hàng** (`/manager/orders/management`): filter theo trạng thái, nút **Thanh toán / Chỉnh sửa đơn / In bếp & Hóa đơn**.
- **Thực đơn** (`/manager/menu/items`): danh sách món; **thêm/sửa món** (`/manager/menu/items/create`, `.../edit/:id`).
- **Đặt bàn trước** (`/manager/reservations`): xác nhận/hoàn tất lịch đặt.
- **Nhân viên** (`/manager/staff`): tạo tài khoản staff/manager cho chi nhánh (mật khẩu mặc định `Test@NhamNhi2026`).

### 4.4. Chủ nhà hàng (admin / người thuê — quản toàn chuỗi)

- **Đăng ký chủ** (`/auth/owner`): form riêng cho chủ nhà hàng (họ tên, email, SĐT, mật khẩu) — giải thích "miễn phí 30 ngày dùng thử cho nhà hàng đầu tiên, sau đó 299.000đ/nhà hàng/tháng". Sau đăng ký tự đăng nhập → vào wizard tạo nhà hàng đầu.
- **Tổng quan** (`/admin`): **dashboard gộp toàn chuỗi** — KPI doanh thu/tổng đơn của mọi chi nhánh (không lọc theo một cơ sở) + **bảng cảnh báo thuê bao** (trial / sắp hết ≤7 ngày / locked) + banner trạng thái thuê bao.
- **Quản lý nhà hàng** (`/admin/restaurants`): danh sách chi nhánh của chuỗi, tìm kiếm, badge trạng thái từng nhà hàng; **nút Cài Đặt (bánh răng) mỗi dòng** → mở `SettingModal` cấu hình đúng chi nhánh đó (Hồ sơ / Sơ đồ & tạo bàn / Thiết lập danh mục / Cấu hình hóa đơn / Cấu hình thanh toán / Bảo mật / Tham số hệ thống) — thay đổi chỉ ảnh hưởng chi nhánh được chọn; **"Thêm nhà hàng"** → nhà hàng **đầu tiên** vào wizard (trial, không tính phí); nhà hàng **2+** mở **modal trả phí 299.000đ/tháng**.
- **Onboarding** (`/admin/onboarding`): wizard thiết lập chi nhánh mới (thông tin, cấu hình, nhân sự, bàn & QR).
- **Báo cáo kinh doanh** (`/admin/reports`): dữ liệu **thật theo chuỗi** (không còn mock) — bộ lọc thời gian (Hôm nay/7 ngày/Tháng/Năm), KPI tổng chuỗi + **bảng xếp hạng & so sánh doanh thu giữa các chi nhánh**, biểu đồ so sánh, hành vi gọi món.
- **Người dùng hệ thống** (`/admin/customers`): **chỉ quản manager/admin của chuỗi** (đã bỏ tab "Khách Hàng") — lọc theo chi nhánh hoặc toàn chuỗi; form **"Thêm nhân viên"** tạo manager gán đúng chi nhánh thuộc chuỗi (admin đổi chi nhánh cho manager; manager chỉ tạo staff cho chi nhánh mình).
- **Nhật ký hệ thống** (`/admin/logs`): 2 tab — **Hành Động** (audit của toàn chuỗi: ai làm gì, chi nhánh nào, khi nào) và **Thanh Toán** (lịch sử giao dịch mọi chi nhánh: nhà hàng, số tiền, chu kỳ, tới ngày); lọc theo chi nhánh + thời gian + từ khoá.
- **Thanh toán & Gia hạn** (`/admin/billing`): chọn nhà hàng + chu kỳ (1/3/6/12 tháng, đọc giá từ PricingConfig), nút **"Thanh toán"** (mock) → chuyển nhà hàng sang `active`, màn thành công + **lịch sử giao dịch**.

> Màn hình cũ đã bị thay thế: **bỏ màn hình "Chọn cơ sở"** (admin quản toàn chuỗi trực tiếp) và **bỏ tab Khách Hàng** ở `/admin/customers`.

### 4.5. Nền tảng (super-admin)

- **Dashboard** (`/super-admin`): **4 KPI** (chủ đang trial, chủ hoạt động, số nhà hàng đang hoạt động, doanh thu tháng này), **biểu đồ doanh thu 6 tháng**, bảng người thuê gần đây + nhà hàng sắp hết hạn (≤7 ngày).
- **Người thuê** (`/super-admin/tenants`): danh sách chủ (tên, email, số nhà hàng, trạng thái trial/active/locked, tổng đã trả) → **chi tiết chủ** (nhà hàng + giao dịch) → **Khoá/Mở khoá** toàn bộ tài khoản của chủ.
- **Gói cước & giá** (`/super-admin/pricing`): chỉnh giá 4 chu kỳ (lưu PricingConfig, tự tính % tiết kiệm).
- **Giao dịch** (`/super-admin/transactions`): lịch sử thanh toán (nhà hàng, chủ, số tiền, chu kỳ, trạng thái, thời gian).
- **Audit log** (`/super-admin/audit`): nhật ký sự kiện subscription/thanh toán/khoá.
- Không còn màn hình vận hành nhà hàng (menu/đơn/bàn, đổi gói Free/Pro, nút Crown) — đã loại bỏ khi chuyển sang mô hình SaaS.

### 4.6. Khách hàng (Website)

- **Trang chủ** (`/`): hero, danh mục món, menu nổi bật, footer (địa chỉ, hotline, giờ mở cửa). Nút **"Chọn cơ sở"** để đổi chi nhánh.
- **Menu** (`/menu`): lọc theo danh mục, xem chi tiết món (`/product/:id`) với giá, mô tả, định lượng, gợi ý món cùng loại.
- **Đặt bàn trước** (`/reservation`): chọn nhà hàng, ngày/giờ, số người, điền tên + SĐT.
- **Đăng ký/Đăng nhập** (`/auth`): đăng ký khách, có Google Sign-in. Chủ nhà hàng đăng ký riêng tại `/auth/owner`.
- **Tài khoản** (`/account/profile`, `/account/orders`, `/account/settings`): hồ sơ, lịch sử đơn, cài đặt.

---

## 5. Thuê Bao (Subscription) — trial / active / locked

- Mỗi nhà hàng có trạng thái `subscription: 'trial' | 'active' | 'locked'` + `trialEndsAt` / `paidUntil` (chi tiết `server/src/models/Schema/RestaurantSchema.ts`).
- **Nhà hàng đầu tiên** của chủ → **trial 30 ngày** miễn phí (`trialEndsAt = now + 30 ngày`).
- **Nhà hàng 2+** → bắt buộc trả trước theo chu kỳ → `active` + ghi Transaction.
- **State machine** (`server/src/services/subscription.service.ts`): khi đọc/ghi nhà hàng, tự tính trạng thái theo ngày —
  - `trial` còn **≤7 ngày** → ghi nhận `subscription.expiring` + thông báo bell (1 lần).
  - `trial` hết hạn / `active` quá `paidUntil` → chuyển **locked** + audit `subscription.locked` + thông báo.
- **Khi locked**: tạo đơn (`POST /api/orders`) & tạo món (`POST /api/menu/item`) bị chặn → `403 { code: 'RESTAURANT_LOCKED' }` → client hiện modal upsell.
- **Thanh toán / gia hạn (mock)**: `POST /api/subscriptions/pay` (`restaurantId`, `cycleMonths`) → tạo Transaction(paid), `subscription='active'`, `paidUntil = max(now, paidUntil) + chu kỳ`, audit `transaction.create` + `subscription.unlocked`. Chưa nối PayOS/VNPay.
- **Giá chu kỳ** (PricingConfig, super-admin chỉnh tại `/super-admin/pricing`): 1 tháng **299.000đ** / 3 tháng **849.000đ** (~5%) / 6 tháng **1.590.000đ** (~11%) / 12 tháng **2.990.000đ** (~17%).
- **Khoá tài khoản chủ** (super-admin): đặt `isActive=false` → toàn bộ user (admin/manager/staff) của chủ không đăng nhập được.

> 💡 **Cách test 3 trạng thái thuê bao nhanh trên prod:** login `owner.sub@nhamnhi.vn` → nút "Chọn cơ sở" để đổi qua lại giữa `NhamNhi TEST Sub Trial` (banner xanh), `NhamNhi TEST Sub Sắp Hết Hạn` (banner cam + nút gia hạn), `NhamNhi TEST Sub Bị Khoá` (banner đỏ + nút thanh toán). Bấm thanh toán ở `/admin/billing` (mock) để mở lại.

---

## 6. Lỗi Đã Biết & Lưu ý

1. **Đặt hàng giao tận nơi (delivery) lỗi 500** — phát hiện 2026-08-01:
   - Hiện tượng: khách chọn món → "Tiến hành đặt giao hàng" → điền thông tin → "Xác nhận đặt hàng" → `POST /api/orders` trả `500` với lỗi `restaurant: Cast to ObjectId failed for value ""`.
   - Nguyên nhân: `client/src/pages/Customer/payment.tsx:89-92` gửi `restaurant: activeRestaurantId || URL.restaurantId || ''`. `activeRestaurantId` đọc từ **auth slice** (khách thì rỗng), trong khi cơ sở khách chọn nằm ở **restaurant slice** (`restaurantSelected`). So sánh: `cart.tsx` đã fallback `restaurantId || restaurantSelected || ''` nhưng `payment.tsx` chưa.
   - **Khuyến nghị**: theo định hướng multi-tenant-refactor, **luồng delivery không phải mục tiêu** — ưu tiên "đặt tại bàn qua QR". Có thể: (a) bỏ/ẩn route giao hàng, hoặc (b) fix `payment.tsx` thêm fallback `restaurantSelected` nếu giữ luồng này.
2. **Reset super-admin**: `SUPER_ADMIN_PASSWORD='...' node server/scripts/reset-super-admin.mjs` (login OK qua UI, truy cập các trang `/super-admin` OK).
3. **Tài khoản test đã seed lại trên prod** (2026-08-02) — trước đó chỉ tồn tại trong seed test suite, login production báo "Email không được tìm thấy!". Giờ dùng bảng tài khoản ở mục 3.

---

## 7. Nhật ký verify Production

| # | Hạng mục | Kết quả |
|---|---|---|
| 1 | Seed tài khoản test 6 role lên Atlas + login API production | ✅ |
| 2 | Login admin → **vào thẳng `/admin`** (bỏ "Chọn cơ sở") | ✅ |
| 3 | Reload trang giữ session (refresh cookie cross-site `Secure; SameSite=None`) | ✅ |
| 4 | `/admin` dashboard **gộp chuỗi** + cảnh báo thuê bao | ✅ |
| 5 | `/admin/restaurants` danh sách chi nhánh + nút **Cài Đặt từng chi nhánh** | ✅ |
| 6 | `/admin/reports` **dữ liệu thật** + bảng so sánh chi nhánh | ✅ |
| 7 | `/admin/customers` **chỉ quản manager** (bỏ tab khách) | ✅ |
| 8 | `/admin/logs` audit hành động + lịch sử thanh toán toàn chuỗi | ✅ |
| 9 | `/admin/billing` thanh toán 1 chi nhánh | ✅ |
| 10 | Login manager → `/manager` (1 cơ sở); **admin bị chặn `/manager/*` → redirect `/admin`** | ✅ |
| 11 | Login staff → `/staff/orders/pos` | ✅ |
| 12 | POS `/manager/orders/pos` (menu + giỏ + toggle mang về) | ✅ |
| 13 | KDS mã test → xác thực → live-monitor đơn | ✅ |
| 14 | KDS: Chờ → Đang nấu → Hoàn thành → đơn tự ẩn | ✅ |
| 15 | Scan-to-order tại bàn → đặt món → order `201` | ✅ |
| 16 | KDS nhận đơn real-time (socket) | ✅ |
| 17 | Trang chủ `/`, menu `/menu`, chi tiết món, giỏ hàng, đăng ký khách | ✅ |
| 18 | Đặt hàng delivery | ❌ 500 (xem mục 6) |

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

### 8.1. Verify redesign vai trò admin quản toàn chuỗi (T01–T10) — E2E + server test

> Tương ứng từng ticket redesign: **server test** 207 tests / 27 files (`npm --prefix server test`), **E2E** 39 tests / 3 skipped (`npm run test:e2e` ở root), **build** `tsc` server + `tsc -b && vite build` client đều xanh.

| # | Hạng mục | Test |
|---|---|---|
| 1 | Admin bypass `verifyTenant` + `requireResourceTenant` theo chuỗi (backend T01) | `multi-tenant.test.ts`, `rate-limit-audit.test.ts` |
| 2 | Analytics nhận mảng `restaurantIds` (backend T02) | `analytics.test.ts`, `analytics-branches.test.ts` |
| 3 | Audit-logs mở admin + endpoint `/audit-logs/payments` (backend T03) | `rate-limit-audit.test.ts` |
| 4 | Admin/manager/staff vào thẳng đúng màn hình, **admin chặn `/manager/*` → redirect `/admin`** | `e2e/auth-tenant.spec.ts` |
| 5 | Shell admin: account modal, chuông gộp chuỗi, sidebar (frontend T05) | `e2e/admin-shell.spec.ts` |
| 6 | Dashboard gộp chuỗi + cảnh báo thuê bao (T06) | `e2e/admin-dashboard.spec.ts` |
| 7 | Reports bỏ mock, dữ liệu thật + so sánh chi nhánh (T07) | `e2e/admin-reports.spec.ts` |
| 8 | Customers chỉ quản manager, tạo manager chọn chi nhánh (T08) | `e2e/admin-customers.spec.ts` |
| 9 | `/admin/restaurants` nút Cài Đặt → SettingModal đúng chi nhánh (T09) | `e2e/admin-restaurants.spec.ts` |
| 10 | `/admin/logs` audit + lịch sử thanh toán toàn chuỗi (T10) | `e2e/admin-logs.spec.ts` |

> ⚠️ E2E chạy server test biên dịch (`node dist/test/server.js`) — **nhớ build server** (`npm --prefix server run build`) sau khi sửa seed/test server để E2E dùng dữ liệu mới.

---

## 9. Lệnh vận hành thường dùng

| Việc | Lệnh |
|---|---|
| Seed/đồng bộ tài khoản test từng role | `cd server && node scripts/seed-test-accounts.mjs` |
| Reset mật khẩu super-admin | `cd server && SUPER_ADMIN_PASSWORD='...' node scripts/reset-super-admin.mjs` |
| Chạy toàn bộ test + E2E (T11) | `E2E_SERVER=test npm run test:e2e` (root) |
| Backup DB | `bash server/scripts/backup.sh` |
