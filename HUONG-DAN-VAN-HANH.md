# Hướng Dẫn Vận Hành — Hệ Thống Quản Lý Nhà Hàng NhamNhi

> Tài liệu mô tả **cách hệ thống đang vận hành thật trên production** theo mô hình **SaaS thu phí theo nhà hàng — 4 gói (Miễn Phí / Cơ Bản / Pro / Doanh Nghiệp)** (cập nhật 2026-08-17 — vòng đời thuê bao mới: hết hạn → tự hạ Miễn Phí, nâng/hạ gói giữa chu kỳ, plan gating bàn/món/nhân viên/tính năng), kèm URL, vai trò, tài khoản test từng role, luồng chính và lỗi đã biết.

---

## 1. Tổng quan & URL Production

| Thành phần | URL | Ghi chú |
|---|---|---|
| Website khách hàng + Panel quản trị | `https://www.nhahangos.me` | Client (Vercel) |
| API Server | `https://api.nhahangos.me` | Backend (Render) |
| Màn hình nhà bếp (KDS) | `https://www.nhahangos.me/kds` | Vào bằng mã nhà bếp (không cần tài khoản) |
| Cơ sở dữ liệu | MongoDB Atlas (cloud) | Tài khoản test đã seed + verify login trên prod |

Kiến trúc: **React (Vite) + Node/Express + MongoDB + Socket.IO (real-time)**. Hệ thống **đa nhà hàng (multi-tenant)**: một tài khoản chủ (role `admin`) sở hữu nhiều chi nhánh (Cơ sở). **Từ T04 trở đi: admin vào thẳng `/admin` và quản toàn chuỗi — màn hình "Chọn cơ sở" đã bị gỡ.** Mô hình kinh doanh: **4 gói dịch vụ** — **Miễn Phí** (nhà hàng đầu của chủ), **Cơ Bản / Pro / Doanh Nghiệp** (trả phí theo chu kỳ 1/3/6/12 tháng).

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

## 3. Tài Khoản Test Cho Từng Role (đã seed trên DB dev)

> Seed bằng script `server/scripts/seed-restaurant-demo.mjs` (xoá toàn bộ DB rồi tạo lại **4 nhà hàng demo, mỗi nhà hàng ứng với 1 gói**). Mật khẩu dùng chung: `Test@NhamNhi2026`.

| Role | Email | Nhà hàng (gói) | Mục đích test |
|---|---|---|---|
| **super-admin** | `super.admin@nhahangos.me` | — | Dashboard KPI, tenants, pricing, transactions, audit, khoá/mở chủ |
| **admin — Gói Pro** | `admin.test@nhahangos.me` | `NhamNhi — Cơ Sở Chính` (Pro) | Full tính năng: 16 bàn · 7 danh mục · 50 món · KDS · báo cáo nâng cao |
| **admin — Gói Cơ Bản** | `admin.basic@nhahangos.me` | `NhamNhi — Gói Cơ Bản` (Basic) | 12 bàn · 5 danh mục · 22 món; **không** KDS/báo cáo nâng cao |
| **admin — Gói Miễn Phí** | `admin.free@nhahangos.me` | `NhamNhi — Gói Miễn Phí` (Free) | 5 bàn · 3 danh mục · 12 món · 1 NV — **test plan gate** (bàn 6/món 31/NV 3 bị chặn) |
| **admin — Gói Doanh Nghiệp** | `admin.enterprise@nhahangos.me` | `NhamNhi — Gói Doanh Nghiệp` (Enterprise) | 20 bàn · 7 danh mục · 50 món · không giới hạn |
| **manager** | `manager.test@nhahangos.me` | `NhamNhi — Cơ Sở Chính` | `/manager/*`: menu, POS, bàn, đặt bàn, nhân viên |
| **manager 2** | `manager2.test@nhahangos.me` | `NhamNhi — Cơ Sở Chính` | Thu ngân |
| **staff** | `staff.test@nhahangos.me` | `NhamNhi — Cơ Sở Chính` | POS, sơ đồ bàn, đơn hàng |
| **customer** | `customer.test@nhahangos.me` | — | Đăng nhập khách, lịch sử đơn, đặt bàn |

**Mã nhà bếp (KDS):** Pro `456734` · Cơ Bản `553572` · Miễn Phí `653780` · Doanh Nghiệp `772915`.

### Cách tạo lại dữ liệu demo (xoá sạch + seed mới)

```bash
cd server
node scripts/seed-restaurant-demo.mjs
```

Script sẽ:
1. Đọc `MONGODB_URL` từ `server/.env` và **xoá toàn bộ database** (`dropDatabase`).
2. Tạo **4 chủ nhà hàng** (admin), mỗi chủ 1 chi nhánh ở **1 gói**: Miễn Phí / Cơ Bản / Pro / Doanh Nghiệp.
3. Mỗi nhà hàng: setting (mã bếp), bàn, danh mục + món ăn (số lượng đúng trần gói), nhân viên; nhà hàng Pro thêm bộ đơn + thanh toán để có data báo cáo.
4. Tạo các tài khoản dùng chung (super-admin, manager, staff, customer).

> ⚠️ Chạy script là **ghi vào DB mà `MONGODB_URL` trỏ tới** — kiểm tra kỹ `.env` trước khi chạy ở máy lạ. Reset super-admin riêng khi cần: `SUPER_ADMIN_PASSWORD='...' node server/scripts/reset-super-admin.mjs`.

---

## 4. Luồng Hoạt Động Chính (đã verify OK trên production)

### 4.1. Khách đặt món tại bàn (luồng chính — QR scan-to-order)

1. Khách quét mã QR tại bàn → mở `https://www.nhahangos.me/scan-to-order?restaurantId=<id>&tableId=<id bàn>` → thấy **"Bàn số: XXX"**.
2. Chọn danh mục / món → bấm **"Add +"** để thêm vào giỏ.
3. Bấm **"Xem giỏ hàng"** → sheet giỏ: chỉnh số lượng, xem tạm tính.
4. Bấm **"Xác nhận gửi đơn Bàn XXX"** → tạo đơn **tại quán (dine-in)**, thành công `201`.
5. Đơn **real-time** hiện lên màn hình bếp (KDS), món chuyển thẳng quầy bếp phục vụ.

> ✅ Đã verify trọn vòng: quét QR → đặt món tại bàn → order `201` → KDS hiện đúng số bàn real-time.

### 4.2. Màn hình nhà bếp (KDS)

1. Vào `https://www.nhahangos.me/kds` → nhập **mã nhà bếp** (xem mục 3 — mỗi gói demo có mã riêng).
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

- **Đăng ký chủ** (`/auth/owner`): form riêng cho chủ nhà hàng (họ tên, email, SĐT, mật khẩu). Sau đăng ký tự đăng nhập → vào wizard tạo nhà hàng đầu (được cấp **gói Miễn Phí**).
- **Tổng quan** (`/admin`): **dashboard gộp toàn chuỗi** — KPI doanh thu/tổng đơn của mọi chi nhánh (không lọc theo một cơ sở) + **bảng cảnh báo thuê bao** (gói trả phí sắp hết hạn ≤7 ngày / bị khoá) + banner trạng thái thuê bao (Miễn Phí / sắp hết hạn / đã lên lịch hạ gói).
- **Quản lý nhà hàng** (`/admin/restaurants`): danh sách chi nhánh của chuỗi, tìm kiếm, badge gói từng nhà hàng; **bấm card chi nhánh** → trang quản lý chi nhánh `/admin/restaurants/:id` (tab Cửa hàng & Hệ thống / Sơ đồ bàn / Danh mục món ăn / Thanh toán — thay đổi chỉ ảnh hưởng chi nhánh được chọn); **"Thêm nhà hàng"** → nhà hàng **đầu tiên** vào wizard (gói Miễn Phí); nhà hàng **2+** phải chọn gói trả phí + chu kỳ.
- **Onboarding** (`/admin/onboarding`): wizard thiết lập chi nhánh mới (thông tin, cấu hình + mã bếp, nhân sự, bàn & QR).
- **Báo cáo kinh doanh** (`/admin/reports`): dữ liệu **thật theo chuỗi** — bộ lọc thời gian, KPI tổng chuỗi + bảng xếp hạng & so sánh doanh thu giữa các chi nhánh. (Yêu cầu gói có tính năng `advanced_report`.)
- **Người dùng hệ thống** (`/admin/customers`): **chỉ quản manager/admin của chuỗi** (đã bỏ tab "Khách Hàng") — lọc theo chi nhánh hoặc toàn chuỗi; form **"Thêm nhân viên"** tạo manager gán đúng chi nhánh thuộc chuỗi (admin đổi chi nhánh cho manager; manager chỉ tạo staff cho chi nhánh mình).
- **Nhật ký hệ thống** (`/admin/logs`): 2 tab — **Hành Động** (audit của toàn chuỗi: ai làm gì, chi nhánh nào, khi nào) và **Thanh Toán** (lịch sử giao dịch mọi chi nhánh: nhà hàng, số tiền, chu kỳ, tới ngày); lọc theo chi nhánh + thời gian + từ khoá.
- **Thanh toán & Gói** (`/admin/billing`): hiển thị **gói đang dùng + "Đang dùng X/Y"** (bàn/món/nhân viên) + badge **"đã lên lịch hạ gói"**; chọn gói + chu kỳ (1/3/6/12 tháng):
  - **Upgrade** giữa chu kỳ → trả phần chênh lệch (pro-rate) → gói đổi ngay.
  - **Downgrade** giữa chu kỳ → không trừ tiền, lưu `pendingPlanKey`, áp dụng cuối chu kỳ.
  - **Gia hạn** cùng gói → như cũ; thanh toán qua **PayOS QR / VNPay** (`PaymentDialog`), theo dõi realtime `listenPaymentResult`, kèm **lịch sử giao dịch** (transactionId, nhà hàng, gói+chu kỳ, ngày giờ, hạn, số tiền, trạng thái).

> Màn hình cũ đã bị thay thế: **bỏ màn hình "Chọn cơ sở"** (admin quản toàn chuỗi trực tiếp) và **bỏ tab Khách Hàng** ở `/admin/customers`.

### 4.5. Nền tảng (super-admin)

- **Dashboard** (`/super-admin`): **4 KPI** (chủ đang trial, chủ hoạt động, số nhà hàng đang hoạt động, doanh thu tháng này), **biểu đồ doanh thu 6 tháng**, bảng người thuê gần đây + nhà hàng sắp hết hạn (≤7 ngày).
- **Người thuê** (`/super-admin/tenants`): danh sách chủ (tên, email, số nhà hàng, trạng thái trial/active/locked, tổng đã trả) → **chi tiết chủ** (nhà hàng + giao dịch) → **Khoá/Mở khoá** toàn bộ tài khoản của chủ.
- **Gói cước & giá** (`/super-admin/pricing`): chỉnh 4 gói (tên, giá 4 chu kỳ, **giới hạn bàn/món/nhân viên**, **tính năng được cấp `featureKeys`** theo `FEATURE_CATALOG`, giá niêm yết/tháng, badge, "Liên hệ bán hàng").
- **Giao dịch** (`/super-admin/transactions`): lịch sử thanh toán (nhà hàng, chủ, số tiền, chu kỳ, trạng thái, thời gian).
- **Audit log** (`/super-admin/audit`): nhật ký sự kiện subscription/thanh toán/khoá.
- Không còn màn hình vận hành nhà hàng (menu/đơn/bàn) — đã loại bỏ khi chuyển sang mô hình SaaS.

### 4.7. Plan gating theo gói (bàn / món / nhân viên / đơn mỗi ngày / nhóm chat / tính năng)

Hệ thống gate ở **2 tầng**: server (`plan-gate.service.ts` — `assertLimit`/`assertFeature`, lưới cuối) + client (`hooks/use-plan.ts` — ẩn menu, chặn nút, upsell). Giới hạn & tính năng theo gói (super-admin chỉnh tại `/super-admin/pricing`; nguồn thật là `PricingConfig` trong DB, `DEFAULT_PLANS` chỉ là fallback khi chưa cấu hình).

**Giới hạn số lượng** (theo `IPlanLimits` — `0` = không giới hạn):

| Gói | Bàn | Món | Nhân viên | Đơn / ngày | Nhóm chat |
|---|---|---|---|---|---|
| **Miễn Phí** | 5 | 30 | 2 | 30 | 0 (không giới hạn) |
| **Cơ Bản** | 20 | 100 | 5 | 100 | 2 |
| **Pro** | 100 | 500 | 20 | 0 (không giới hạn) | 5 |
| **Doanh Nghiệp** | 0 | 0 | 0 | 0 | 0 |

> Lưu ý: `daily_orders` đếm số đơn tạo từ 00:00 giờ Việt Nam (tính cả đơn đã huỷ); `group_chats` đếm hội thoại loại `group`. Với Free/Basic, giới hạn `group_chats = 0` (không giới hạn) chỉ có nghĩa khi gói có tính năng `messaging_group` — do 2 gói này không được cấp `messaging_group` nên **không tạo được nhóm chat** dù limit là 0.

**Tính năng cốt lõi (có ở mọi gói, không bị gate):** POS, sơ đồ bàn, đơn hàng, đặt bàn, menu khách hàng.

**Tính năng nâng cao được cấp** (theo `featureKeys` của gói — super-admin tick tại `/super-admin/pricing`):

| Gói | `featureKeys` được cấp |
|---|---|
| **Miễn Phí** | — (rỗng) |
| **Cơ Bản** | — (rỗng) |
| **Pro** | `kds`, `cart`, `scan_to_order`, `reservation`, `advanced_report`, `messaging_group`, `white_label` |
| **Doanh Nghiệp** | toàn bộ Pro + `api`, `payos`, `qr_manual` |

> ⚠️ **Phân biệt "được cấp" và "được kiểm tra":** mới chỉ có **5 tính năng thực sự bị gate ở server** qua `assertFeature`/`assertAnyFeature`: **`kds`** (route đơn `/kds`), **`advanced_report`** (route analytics), **`messaging_group`** (tạo chat nhóm + giới hạn `group_chats`), **`payos`** + **`qr_manual`** (thanh toán, dùng `assertAnyFeature(['qr_manual','payos'])`). Các key `reservation`, `scan_to_order`, `cart`, `white_label`, `api` hiện **được cấp trong `featureKeys` nhưng chưa có `assertFeature` tương ứng ở đâu** — tức chưa bị phân biệt bằng gate, mọi gói về lý thuyết đều dùng được. Khi bổ sung gate, dev chèn `assertFeature(...)` vào route tương ứng (tham chiếu `FEATURE_CATALOG` cố định trong code).

- Vượt trần → server trả `403 { errorCode: 'PLAN_LIMIT_REACHED', meta: { resource, limit, used, planKey, feature } }` → client bật modal upsell "Nâng cấp gói". `resource` có thể là `tables` / `items` / `staff` / `daily_orders` / `group_chats`.
- Thiếu tính năng → ẩn mục menu (Sidebar), route hiển thị màn hình upsell (`RequireFeature`), nút action bị disable.
- Demo: login `admin.free@nhahangos.me` → tạo bàn thứ 6 / món thứ 31 / nhân viên thứ 3 → bị chặn; login `admin.test@nhahangos.me` (Pro) → không bị chặn.

### 4.6b. Chat nội bộ (Messaging — staff/manager/admin)

- **Hộp thư:** icon thư trên Header (mọi layout admin/manager/staff) mở `MailBoxPopover` — danh sách hội thoại, badge tin chưa đọc, trạng thái online của member.
- **Hội thoại:** chat **1-1** (giữa staff/manager/admin cùng chuỗi) và **nhóm** (chỉ manager/admin tạo; manager/admin thêm/gỡ thành viên — nút "Thêm thành viên" ở header group).
- **Realtime:** tin nhắn gửi qua socket (`send_message`) hiện ngay lập tức (optimistic + ack thay tin thật), kèm typing indicator; thay đổi hội thoại (tên, lastMessage, memberCount, đã đọc) tự đồng bộ qua `conversation_updated`.
- **Phân quyền dữ liệu:** user chỉ thấy hội thoại thuộc chuỗi nhà hàng mình thuộc (`restaurantIds`); chat group gắn đúng `restaurantId`.
- Test: `server/src/test/message.test.ts` (27 tests) + `e2e/messaging.spec.ts`.

### 4.6. Khách hàng (Website)

- **Trang chủ** (`/`): hero, danh mục món, menu nổi bật, footer (địa chỉ, hotline, giờ mở cửa). Nút **"Chọn cơ sở"** để đổi chi nhánh.
- **Menu** (`/menu`): lọc theo danh mục, xem chi tiết món (`/product/:id`) với giá, mô tả, định lượng, gợi ý món cùng loại.
- **Đặt bàn trước** (`/reservation`): chọn nhà hàng, ngày/giờ, số người, điền tên + SĐT.
- **Đăng ký/Đăng nhập** (`/auth`): đăng ký khách, có Google Sign-in. Chủ nhà hàng đăng ký riêng tại `/auth/owner`.
- **Tài khoản** (`/account/profile`, `/account/orders`, `/account/settings`): hồ sơ, lịch sử đơn, cài đặt.

---

## 5. Thuê Bao (Subscription) — 4 gói + vòng đời mới

- Mỗi nhà hàng có `subscription: 'trial' | 'active' | 'locked' | 'pending'` + `currentPlanKey` (`free|basic|pro|enterprise`) + `paidUntil` / `pendingPlanKey` (chi tiết `server/src/models/Schema/RestaurantSchema.ts`). **`trial` giữ trong enum nhưng không còn dùng** trong luồng mới (migration chuyển hết về free).
- **Nhà hàng đầu tiên** của chủ → **`active` + gói Miễn Phí** (không `paidUntil`), không còn dùng thử 30 ngày.
- **Nhà hàng 2+** → bắt buộc trả trước theo chu kỳ → `active` + gói trả phí + ghi Transaction.
- **State machine** (`server/src/services/subscription.service.ts` — `applySubscriptionState`, chạy khi đọc/ghi qua `assertRestaurantActive`):
  - `active` hết `paidUntil` **+ có `pendingPlanKey`** → tự áp dụng gói đã lên lịch hạ cấp (tính `paidUntil` theo chu kỳ đã chọn), audit `subscription.downgrade` + thông báo.
  - `active` hết `paidUntil` **gói trả phí** → **tự hạ về Miễn Phí** (`currentPlanKey='free'`, `paidUntil=null`), audit `subscription.downgrade` + thông báo — **KHÔNG khoá**.
  - Đã là Miễn Phí (không `paidUntil`) → không làm gì. `locked`/`pending` → giữ nguyên.
- **Đổi gói giữa chu kỳ** (`prepareSubscription` so `sortOrder`):
  - **Upgrade** (gói cao hơn, còn hạn) → hiệu lực ngay, chỉ trả **chênh lệch pro-rate** `(giá mới − giá cũ) × ngày còn lại / 30`, `paidUntil` giữ nguyên, `currentPlanKey` đổi ngay.
  - **Downgrade** (gói thấp hơn, còn hạn) → **không chặn**, không trừ tiền, lưu `pendingPlanKey` (+ `pendingCycleMonths`), trả message "áp dụng khi hết hạn chu kỳ"; áp dụng tự động cuối chu kỳ.
  - **Gia hạn** cùng gói → `paidUntil = max(now, paidUntil) + chu kỳ`.
- **Thanh toán / gia hạn**: 2 cổng nền tảng do super-admin cấu hình (`GET/PUT /api/settings/gateway`, scope=`platform`):
  - **PayOS**: `POST /api/subscriptions/payos/create-url` → `{checkoutUrl, transactionId}`; webhook `POST /api/subscriptions/webhook` xác nhận → `completeSubscription()`.
  - **VNPay**: `POST /api/subscriptions/vnpay/create-url` → `{paymentUrl, transactionId}`; return `GET /api/subscriptions/vnpay/return` (verify `vnp_SecureHash`).
  - Kết quả: Transaction(paid) có `transactionId` (`yyyyMMdd`+6 số tăng dần), `subscription='active'`, audit `transaction.create`; đẩy realtime room `subscription_payment_<transactionId>` (event `subscription_payment_event`) + room `restaurant_<id>` (event `subscription_event`).
  - `POST /api/subscriptions/pay` (`restaurantId`, `cycleMonths`, `planId`) dùng làm **mock pay** cho E2E/verify nhanh (hỗ trợ upgrade/downgrade).
- **Khoá tài khoản chủ** (super-admin): đặt `isActive=false` → toàn bộ user (admin/manager/staff) của chủ không đăng nhập được.

> 💡 **Cách test 4 gói nhanh:** login lần lượt `admin.free@nhahangos.me` (Miễn Phí — tạo bàn thứ 6 bị chặn), `admin.basic@nhahangos.me` (Cơ Bản — không KDS), `admin.test@nhahangos.me` (Pro — đầy đủ), `admin.enterprise@nhahangos.me` (Doanh Nghiệp). Tại `/admin/billing`, thử **nâng cấp** (trả chênh lệch pro-rate) và **hạ gói** (badge "đã lên lịch hạ gói" — áp dụng cuối kỳ).

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
| 10 | PayOS / VNPay gói cước: create-url + webhook/return → Transaction `transactionId` + subscription active | ✅ (`subscription-payos.test.ts`, `subscription-vnpay.test.ts`) |
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
| 3 | Nhà hàng đầu → active + gói Miễn Phí + audit `subscription.free.assigned` | `register-owner.test.ts` |
| 4 | Nhà hàng 2+ → trả phí (Transaction) + active; chu kỳ sai → 400 | `register-owner.test.ts` |
| 5 | State machine: Miễn Phí không hết hạn / gói trả phí hết hạn → **hạ Miễn Phí (KHÔNG khoá)** / `pendingPlanKey` áp dụng cuối chu kỳ | `subscription-state.test.ts` |
| 6 | Thanh toán: gia hạn / mở lại locked → active + audit; chủ khác → 403; **PayOS/VNPay gói cước: create-url + webhook/return verify + `transactionId` sequence** | `subscription-pay.test.ts`, `subscription-payos.test.ts`, `subscription-vnpay.test.ts` |
| 7 | Tạo đơn & món khi locked → `403 RESTAURANT_LOCKED` | `subscription-pay.test.ts` |
| 8 | Super-admin: dashboard 4 KPI, tenants, transactions, block/unblock chủ | `super-admin-billing.test.ts`, `super-admin.test.ts` |
| 9 | **Vòng đời chống production**: đăng ký → nhà hàng đầu free → tạo đơn OK → nâng gói Basic → hết hạn → **tự hạ Miễn Phí** (không locked, vẫn phục vụ) → super-admin thấy KPI/giao dịch → block/unblock | `subscription-lifecycle.test.ts` |
| 10 | **Plan gate**: giới hạn bàn/món/NV theo gói (`PLAN_LIMIT_REACHED`) + gate tính năng (KDS, báo cáo nâng cao, chat nhóm) | `plan-gate.test.ts` |
| 11 | **Migration data**: trial → free, grandfather gói trả phí, locked → active+free, idempotent | `migration-subscription-plans.test.ts` |
| 12 | E2E: 8 kịch bản subscription (pricing config, gate số lượng/tính năng, upsell, upgrade, downgrade pending, hết hạn → free, chi nhánh pending) | `e2e/subscription-plans.spec.ts` |

### 8.1. Verify redesign vai trò admin quản toàn chuỗi (T01–T10) — E2E + server test

> Tương ứng từng ticket redesign: **server test** 398 tests / 46 files (`npm --prefix server test`), **E2E** 63 tests, không skip/only (`npm run test:e2e` ở root), **build** `tsc` server + `tsc -b && vite build` client đều xanh.

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
| 9 | `/admin/restaurants` → trang quản lý chi nhánh đúng cơ sở (T09) | `e2e/admin-restaurants.spec.ts` |
| 10 | `/admin/logs` audit + lịch sử thanh toán toàn chuỗi (T10) | `e2e/admin-logs.spec.ts` |

> ⚠️ E2E chạy server test biên dịch (`node dist/test/server.js`) — **nhớ build server** (`npm --prefix server run build`) sau khi sửa seed/test server để E2E dùng dữ liệu mới.

---

## 9. Lệnh vận hành thường dùng

| Việc | Lệnh |
|---|---|
| Seed lại toàn bộ data demo (4 gói) | `cd server && node scripts/seed-restaurant-demo.mjs` |
| Reset mật khẩu super-admin | `cd server && SUPER_ADMIN_PASSWORD='...' node scripts/reset-super-admin.mjs` |
| Chạy toàn bộ test + E2E (T11) | `E2E_SERVER=test npm run test:e2e` (root) |
| Backup DB | `bash server/scripts/backup.sh` |
