# TICKETS — Refactor Subscription (kế hoạch chi tiết)

> Thứ tự thực hiện theo phụ thuộc: làm backend trước, frontend sau, dọn dẹp cuối cùng.
> Mỗi ticket: commit riêng, có test, CI xanh. Tham chiếu `SPEC.md`.

---

## T1 — Data model + migration

- **Mô tả**:
  - Restaurant: bỏ `plan`, thêm `ownerId`, `subscription ('trial'|'active'|'locked')`, `trialEndsAt`, `paidUntil`.
  - Tạo model `Transaction` + `PricingConfig`.
  - Migration: mọi nhà hàng hiện có → `ownerId` từ admin sở hữu, `subscription='active'`, `paidUntil=now+30d`. Seed PricingConfig (1/3/6/12 = 299k/849k/1.590k/2.990k).
- **File**: `server/src/models/Schema/RestaurantSchema.ts`, `.../TransactionSchema.ts`, `.../PricingConfigSchema.ts`, `DB_Connection.ts`, script migrate.
- **Test**: schema + migration upsert (vitest).
- **Phụ thuộc**: —
- **Ra**: các T2→T11 dựa vào.

## T2 — PricingConfig API (super-admin)

- **Mô tả**: `GET /api/pricing` (chủ, đọc), `PUT /api/admin/pricing` (super-admin sửa 4 chu kỳ). Audit `pricing.update`.
- **File**: module mới `SubscriptionModule` hoặc thêm `RestaurantModule`.
- **Test**: supertest — quyền, CRUD, validate giá > 0.
- **Phụ thuộc**: T1.

## T3 — State machine subscription (backend)

- **Mô tả**: hàm `applySubscriptionState(restaurant)` — tự tính trạng thái theo ngày (trial → expiring@7 ngày → locked; active → locked khi quá paidUntil). Check khi đọc/ghi. Audit: `subscription.expiring` / `subscription.locked`. Tạo notification (bell) khi chuyển trạng thái.
- **File**: `server/src/services/subscription.service.ts`, gắn vào middleware/route restaurant.
- **Test**: đơn vị với ngày giả (mock clock) — trial còn 10/7/6/0 ngày, active hết hạn.
- **Phụ thuộc**: T1.

## T4 — Đăng ký chủ + tạo nhà hàng

- **Mô tả**: `POST /api/auth/register-owner` (role admin, restaurantIds=[]). `POST /api/restaurants` mở nhà hàng: nhà hàng đầu → trial (trialEndsAt=now+30d); nhà hàng 2+ → bắt buộc cycleMonths → tạo Transaction(paid) + active. Chặn khi chủ bị locked. Audit `user.register`, `restaurant.create`, `subscription.trial.started`, `transaction.create`.
- **File**: `auth.service.ts`, `restaurant.service.ts`.
- **Test**: đăng ký owner, mở nhà hàng đầu (trial), mở 2+ (có transaction), mở khi locked → 403.
- **Phụ thuộc**: T1, T2.

## T5 — Thanh toán / gia hạn mock + khoá đơn/món khi locked

- **Mô tả**: `POST /api/subscriptions/pay` (`restaurantId`, `cycleMonths`) → tạo Transaction(paid), `subscription='active'`, `paidUntil = max(now,paidUntil)+cycle`. Audit `transaction.create`, `subscription.unlocked`. Chặn tạo đơn (`POST /api/orders`) & tạo món khi `locked` → `403 { code:'RESTAURANT_LOCKED' }`. `GET /api/subscriptions/me` trả trạng thái các nhà hàng của chủ.
- **File**: subscription.service, order.service (guard), menu.service (guard).
- **Test**: pay gia hạn từ trial/locked/active; đơn & món bị chặn khi locked; mở lại sau pay.
- **Phụ thuộc**: T3, T4.

## T6 — Super-admin backend: dashboard, tenants, transactions, block

- **Mô tả**: `GET /api/admin/dashboard` (4 KPI + doanh thu 6 tháng + sắp hết hạn ≤7 ngày), `GET /api/admin/tenants` (+ chi tiết chủ: nhà hàng + giao dịch), `GET /api/admin/transactions` (filter), `PATCH /api/admin/users/:id/block` (khoá/mở chủ → isActive=false + audit `user.block/unblock`).
- **File**: module super-admin backend.
- **Test**: quyền super-admin, KPI đúng số liệu, block ảnh hưởng toàn bộ user của chủ.
- **Phụ thuộc**: T1, T3.

## T7 — Frontend: giao diện chủ (banner, badge, modal upsell, billing)

- **Mô tả**:
  - `/admin` banner trạng thái (trial xanh / ≤7 ngày cam / locked đỏ + nút thanh toán).
  - `/admin/restaurants` badge trạng thái + modal "Trả phí 299k" khi mở nhà hàng 2+.
  - `/admin/billing` **mới**: chọn nhà hàng + chu kỳ (đọc PricingConfig) + nút "Thanh toán" (mock) + lịch sử giao dịch + màn thành công.
  - Modal upsell khi API trả `RESTAURANT_LOCKED`.
  - Notification bell tự nhận event expiring/locked.
- **File**: `client/src/pages/Admin/...` + api/hooks mới.
- **Test**: Playwright — banner 3 trạng thái, modal mở nhà hàng, flow billing mock.
- **Phụ thuộc**: T2, T5.

## T8 — Frontend: Super-admin UI mới

- **Mô tả**: Đại tu `/super-admin`: dashboard (4 KPI + biểu đồ 6 tháng + người thuê gần đây + sắp hết hạn), tenants (danh sách + chi tiết + khoá/mở), pricing (chỉnh giá), transactions (lịch sử + filter), audit. **Xoá** trang quản lý vận hành nhà hàng / nút Crown.
- **File**: `client/src/pages/SuperAdmin/*`.
- **Test**: Playwright — mỗi màn hình đúng quyền, không còn vận hành.
- **Phụ thuộc**: T6.

## T9 — Frontend: đăng ký chủ + wizard nhà hàng đầu

- **Mô tả**: Form "Đăng ký chủ" (`/auth`, tách khách) → gọi `register-owner` → vào wizard tạo nhà hàng đầu (không tính phí, bắt đầu trial).
- **File**: `client/src/pages/Auth/*`, `Onboarding/*`.
- **Test**: Playwright — đăng ký owner, wizard tạo nhà hàng đầu, trạng thái trial hiện đúng.
- **Phụ thuộc**: T4, T7.

## T10 — Dọn code cũ

- **Mô tả**: Xoá `plan` khỏi RestaurantSchema + `PLAN_LIMITS` + `checkOrderLimit` + giới hạn staff trong `createStaffService`. Xoá nút Crown + UI plan cũ. Thay `plans-limits.test.ts` bằng test subscription.
- **File**: nhiều.
- **Test**: toàn bộ suite xanh, không còn reference `plan`/`PLAN_LIMITS`.
- **Phụ thuộc**: T3–T8 (sau khi thay thế xong).

## T11 — Verify toàn diện + CI

- **Mô tả**: Chạy toàn bộ test (vitest + Playwright), typecheck, build. Verify E2E chống production: đăng ký chủ mới → wizard → trial → (mock) hết hạn → locked → thanh toán → active; super-admin thấy KPI/giao dịch, không thấy vận hành. Cập nhật docs `HUONG-DAN-VAN-HANH.md`.
- **Phụ thuộc**: T7–T10.

## T12 — Landing page bán dịch vụ (SAU khi xong tất cả)

- **Mô tả**: Trang riêng hoàn toàn (đăng ký chủ, giới thiệu gói, giá) — kết nối luồng `register-owner`.
- **Phụ thuộc**: T9, T11.

---

## Sơ đồ phụ thuộc

```
T1 (data model)
├─► T2 (pricing API)
│    └─► T4 (đăng ký chủ + mở nhà hàng)
├─► T3 (state machine)
│    ├─► T5 (thanh toán + khoá đơn/món)
│    └─► T6 (super-admin backend)
├─► T7 (frontend chủ) ← T2, T5
├─► T8 (frontend super-admin) ← T6
└─► T9 (frontend đăng ký chủ) ← T4, T7
T10 (dọn code) ← T3–T8
T11 (verify + CI) ← T7–T10
T12 (landing) ← T9, T11
```
