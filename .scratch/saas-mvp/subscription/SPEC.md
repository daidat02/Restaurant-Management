# SPEC — Refactor Subscription: Super Admin tách biệt vận hành, thu phí theo nhà hàng

> Giai đoạn tiếp theo sau SaaS MVP (tickets 01–11). Mô hình được chốt qua phiên grill.
> Giao diện mô tả chi tiết ở `PROMPT.md`.

---

## 1. Problem Statement

Nền tảng đang hoạt động như "app quản lý nội bộ", chưa như một **SaaS cho thuê**:

1. **Super Admin nhìn quá sâu vào vận hành** nhà hàng người thuê (danh sách restaurant chi tiết, đổi gói từng nhà hàng, khoá/mở theo nhà hàng) — không tách biệt vai trò "nền tảng" và "người thuê".
2. **`plan: free|pro` gắn trên từng Restaurant**, trong khi mô hình kinh doanh thật là **thu phí theo từng nhà hàng** (mở bao nhiêu trả bấy nhiêu).
3. **Chưa có tự đăng ký cho chủ nhà hàng** — admin hiện được seed/migrate, không có luồng self-serve.
4. **Chưa có vòng đời thanh toán**: trial, hết hạn, khoá, gia hạn, lịch sử giao dịch.

## 2. Mục tiêu

- **Tách bạch Super Admin khỏi vận hành**: nền tảng chỉ quản lý người thuê, nhà hàng (trạng thái thanh toán), gói & giá, giao dịch, audit.
- **Mô hình thu phí theo nhà hàng**: trial 30 ngày cho nhà hàng đầu; 299.000đ/nhà hàng/tháng, chu kỳ 1/3/6/12 tháng.
- **Vòng đời tự động**: trial → nhắc (7 ngày) → khoá (hết hạn) → thanh toán → active.
- **Tự đăng ký chủ**: chủ đăng ký → role `admin` → wizard tạo nhà hàng đầu.
- **Thanh toán mock** (chưa nối cổng thật), có bảng giao dịch + audit log.
- **Landing page bán dịch vụ** — làm sau cùng (ngoài phạm vi).

## 3. Mô hình kinh doanh (đã chốt)

| Hạng mục | Giá trị |
|---|---|
| Giá 1 nhà hàng | 299.000đ/tháng |
| Chu kỳ | 1 tháng: 299k · 3 tháng: 849k · 6 tháng: 1.590k · 1 năm: 2.990k |
| Trial | Nhà hàng **đầu tiên** của chủ: **30 ngày** miễn phí |
| Bắt đầu tính trial | Từ lúc tạo nhà hàng đầu tiên (không tính từ đăng ký) |
| Nhà hàng 2+ | Trả **trước** ngay khi mở (mặc định 1 tháng) |
| Giới hạn staff/đơn | **Bỏ hẳn** (mỗi nhà hàng dùng thoải mái) |
| Nhắc nhở | Trong app: banner + notification bell, **không email** |

## 4. State machine nhà hàng

```
                    tạo nhà hàng đầu (wizard)
                ┌──────────────────────────────┐
                ▼                              │
   [Không có nhà hàng] ── mở nhà hàng 2+ ──► [TRIAL]  (chỉ nhà hàng đầu tiên)
                                              │  trialEndsAt = now + 30d
                        còn 7 ngày ──────────► nhắc (subscription.expiring)
                        quá trialEndsAt ──────► [LOCKED]  (tự động)
                                              │  chặn: tạo đơn/món/nhà hàng mới
                        thanh toán ───────────► [ACTIVE]
                                              │  paidUntil = now + chu kỳ
                        thanh toán ───────────► [ACTIVE]  (gia hạn tiếp)
                        quá paidUntil ────────► [LOCKED]
```

- Nhà hàng **2+** khi mở: `ACTIVE` ngay (đã trả trước), không có trial.
- **Khoá do hết hạn** (trial hoặc paidUntil): chặn tạo đơn/món/nhà hàng mới; đăng nhập vẫn được; dữ liệu giữ nguyên.
- **Khoá tài khoản chủ** (super-admin thao tác): khoá **toàn bộ** nhà hàng + mọi user (admin/manager/staff) của chủ — không đăng nhập/vận hành được.

## 5. Data model

### 5.1. Restaurant (sửa) — thay field `plan`
```ts
// Xoá: plan?: 'free' | 'pro'
{
  ownerId: ObjectId,            // tham chiếu chủ (admin) — MỚI
  subscription: 'trial' | 'active' | 'locked',  // default 'trial' cho nhà hàng đầu, 'active' cho 2+
  trialEndsAt?: Date,           // chỉ nhà hàng đầu
  paidUntil?: Date,             // hết hạn thanh toán hiện tại
}
```
> Backfill: chuyển dữ liệu cũ — mọi nhà hàng hiện có đặt `subscription='active'`, `paidUntil=now+30d` (chủ hiện hữu không bị gián đoạn); gán `ownerId` từ admin sở hữu.

### 5.2. Transaction (model mới)
```ts
{
  restaurant: ObjectId,
  ownerId: ObjectId,            // chủ
  amount: Number,               // 299000 | 849000 | ...
  cycleMonths: 1 | 3 | 6 | 12,
  type: 'restaurant-fee' | 'trial-expire',
  status: 'paid',
  paidUntil: Date,
  createdAt: Date,
}
```

### 5.3. PricingConfig (model mới, singleton)
```ts
{
  key: 'default',               // 1 bản duy nhất
  cycles: { 1: 299000, 3: 849000, 6: 1590000, 12: 2990000 },
  currency: 'VND',
}
```

### 5.4. User — không đổi field plan (chưa từng có), thêm ghi chú
- `role: 'admin'` = chủ nhà hàng. `restaurantIds` = các nhà hàng sở hữu.
- Super-admin dùng `isActive=false` để khoá chủ (cơ chế sẵn có).

## 6. Luồng nghiệp vụ

### 6.1. Đăng ký chủ
`POST /api/auth/register-owner` (tách khỏi `register` khách):
- Validate email chưa tồn tại.
- Tạo `User { role: 'admin', restaurantIds: [], isActive: true }`.
- Audit: `user.register`. → client chuyển vào wizard tạo nhà hàng đầu.

### 6.2. Tạo nhà hàng đầu tiên (wizard, không tính phí)
- Tạo `Restaurant { ownerId, subscription: 'trial', trialEndsAt: now+30d }`.
- Audit: `restaurant.create` + `subscription.trial.started`.

### 6.3. Mở nhà hàng 2+ (trả trước, mock)
`POST /api/restaurants` (chủ):
- Nếu `restaurantIds.length === 0` → điều hướng tạo nhà hàng đầu (trial).
- Nếu đã có nhà hàng → yêu cầu `cycleMonths` (mặc định 1) → tạo Transaction (paid, amount theo PricingConfig) → tạo Restaurant `{ subscription:'active', paidUntil: now + cycle }`.
- Audit: `restaurant.create` + `transaction.create`.

### 6.4. Vòng đời tự động (server)
- Hàm cron/check **theo ngày** (chạy khi có request hoặc interval):
  - `trial` & còn ≥ 7 ngày → chuyển `subscription.expiring` khi còn đúng 7 ngày (nhắc 1 lần + tạo notification).
  - `trial` & quá `trialEndsAt` → `subscription='locked'` + notification. Audit: `subscription.locked`.
  - `active` & quá `paidUntil` → `subscription='locked'` + notification. Audit: `subscription.locked`.

### 6.5. Thanh toán / gia hạn (mock)
`POST /api/subscriptions/pay` (chủ, body: `{ restaurantId, cycleMonths }`):
- Lấy giá từ PricingConfig → tạo Transaction (paid) → `subscription='active'`, `paidUntil = max(paidUntil, now) + cycle`.
- Audit: `transaction.create` + `subscription.unlocked` (nếu trước đó locked).

### 6.6. Khoá / mở chủ (super-admin)
`PATCH /api/admin/users/:id/block` (body `{ blocked: boolean }`):
- `blocked=true` → `isActive=false` (toàn bộ user chủ này không đăng nhập/vận hành).
- Audit: `user.block` / `user.unblock`.

### 6.7. Các chặn khi `locked`
- Tạo đơn (`POST /api/orders`), tạo món, mở nhà hàng mới → trả `403` kèm `{ code:'RESTAURANT_LOCKED', message:'Nhà hàng bị khoá do hết hạn thanh toán' }` → client hiện modal upsell.

## 7. Backend endpoints (mới/sửa)

| Method | Route | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/auth/register-owner` | public | Đăng ký chủ (role admin) |
| GET | `/api/pricing` | auth (chủ) | Lấy cấu hình giá chu kỳ |
| PUT | `/api/admin/pricing` | super-admin | Sửa giá 4 chu kỳ (PricingConfig) |
| POST | `/api/subscriptions/pay` | chủ | Thanh toán/gia hạn mock |
| GET | `/api/subscriptions/me` | chủ | Trạng thái các nhà hàng của chủ |
| GET | `/api/admin/transactions` | super-admin | Lịch sử giao dịch + filter |
| GET | `/api/admin/dashboard` | super-admin | KPI nền tảng + biểu đồ doanh thu + sắp hết hạn |
| GET | `/api/admin/tenants` | super-admin | Danh sách chủ + chi tiết |
| PATCH | `/api/admin/users/:id/block` | super-admin | Khoá/mở chủ |
| GET | `/api/admin/audit` | super-admin | Audit log (đã có, bổ sung filter) |
| POST | `/api/restaurants` | chủ | Mở nhà hàng (2+ có trả phí) — sửa logic hiện tại |

## 8. Frontend pages (mới/sửa)

| Route | Thay đổi |
|---|---|
| `/auth` + form "Đăng ký chủ" | Thêm form đăng ký owner (tách khách) |
| `/admin` (dashboard) | Thêm banner trạng thái subscription |
| `/admin/restaurants` | Badge trạng thái từng nhà hàng + modal trả phí khi mở 2+ |
| `/admin/billing` | **Mới**: chọn nhà hàng + chu kỳ + thanh toán mock + lịch sử |
| `/super-admin` | **Đại tu**: dashboard KPI nền tảng |
| `/super-admin/tenants` | Danh sách chủ + chi tiết + khoá/mở |
| `/super-admin/pricing` | **Mới**: chỉnh giá chu kỳ |
| `/super-admin/transactions` | **Mới**: lịch sử giao dịch |
| `/super-admin/audit` | Audit log |
| `/super-admin/restaurants` | **Xoá** (hoặc đổi thành danh sách nhà hàng + trạng thái thanh toán, không vận hành) |

## 9. Xoá / dọn code

- Xoá `plan` khỏi RestaurantSchema + `PLAN_LIMITS` (free: 5 staff/500 đơn) + `checkOrderLimit`/hạn mức staff trong createStaffService.
- Xoá nút **Crown** đổi plan trong super-admin.
- Cập nhật test cũ `plans-limits.test.ts` → thay bằng test subscription.

## 10. Audit log events (bổ sung)

`user.register` (owner) · `restaurant.create` · `subscription.trial.started` · `subscription.expiring` · `subscription.locked` · `subscription.unlocked` · `transaction.create` · `user.block` · `user.unblock`

## 11. Out of scope (làm sau)

- Landing page bán dịch vụ.
- Thanh toán thật (PayOS/VNPay) — mock trước, giữ cấu trúc Transaction để sau nối.
- Email nhắc nhở.
