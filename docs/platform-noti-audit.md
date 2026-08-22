# Spec — Thông báo nền tảng cho Super-Admin & Whitelist Audit Log

> Nhánh: `feat/platform-noti-audit` · Chuỗi ticket: **PA-1 → PA-7**
> Trạng thái: Đã chốt qua phiên grilling (2026-08-23) — chưa triển khai.

## 1. Bối cảnh & vấn đề

1. **Super-admin không nhận được bất kỳ thông báo nào**: chuông `NotificationPopover` hiển thị cho
   mọi role, nhưng backend `GET /api/notifications` yêu cầu `tenantId` (SA nhận 400), endpoint
   chain dựa `restaurantIds` (SA rỗng → `[]`).
2. **Audit log của SA đang nhiễu**: cơ chế hiện tại chỉ blacklist prefix `order.*`
   (`SUPER_ADMIN_RESTRICTED_PREFIXES`) nên SA thấy toàn bộ action vận hành tenant:
   `setting.kds-code.generate`, `user.create` (nhân viên), `reservation.*`, `table.update`,
   `menuItem.update`…
3. Thiếu action audit phân biệt **gia hạn** và **nâng cấp** gói (hiện chỉ ghi chung
   `transaction.create` + `subscription.unlocked`).

## 2. Quyết định đã chốt

| # | Quyết định |
|---|-----------|
| D1 | Kênh thông báo platform riêng: bản ghi Notification với `restaurant = null`; endpoint riêng cho SA; socket room `platform` đẩy realtime; tái dùng `NotificationPopover` |
| D2 | Trigger 4 sự kiện: đăng ký = verify-OTP thành công; gia hạn/nâng cấp phân loại bằng so `sortOrder(planKey)` vs gói hiện tại lúc thanh toán; sắp hết hạn = cùng thời điểm email cảnh báo (≤7 ngày, 1 lần/chu kỳ, bám cờ `expiringEmailSentAt`) |
| D3 | Audit log SA chuyển sang **whitelist** — chỉ thấy action nền tảng, action mới mặc định ẩn |
| D4 | Thêm 2 action mới: `subscription.renewed`, `subscription.upgraded` trong luồng thanh toán gói |
| D5 | Map type thông báo tái dùng type có sẵn: đăng ký → `system`; renewed/upgraded/expiring → `subscription`. Click: đăng ký → `/super-admin/tenants`; giao dịch gói → `/super-admin/transactions` |

## 3. Kiến trúc kỹ thuật

### 3.1. Kênh thông báo platform

```
Notification document (platform):
{
  restaurant: null,            // ← marker platform (tenant luôn có restaurant != null)
  user: null,
  type: 'system' | 'subscription',
  message: string,
  data: { ... },               // vd { email, restaurantName, planName, planKey }
  isRead: false,
}

GET /api/notifications/platform        // verifyRole(['super-admin']) — list + phân trang
PATCH /api/notifications/:id/read      // đã generic theo id — dùng lại được
Socket: authenticateToken join room 'platform' khi role === 'super-admin'
Server emit: io.to('platform').emit('platform_notification', doc)
```

Client (`use-notification` / `Header`): nhánh role super-admin gọi endpoint platform thay vì
endpoint tenant; lắng nghe `platform_notification` để prepend + tăng unread.

### 3.2. Whitelist audit log SA

Thay `SUPER_ADMIN_RESTRICTED_PREFIXES = ['order.']` bằng
`SUPER_ADMIN_ALLOWED_ACTIONS` (whitelist) trong `services/auditAction.ts`:

```
user.register · user.block · user.unblock
restaurant.create · restaurant.delete · restaurant.lock · restaurant.unlock
subscription.trial.started · subscription.locked · subscription.unlocked
subscription.expiring · subscription.downgrade
subscription.renewed (MỚI) · subscription.upgraded (MỚI)
transaction.create
pricing.create · pricing.update
setting.gateway.update
```

Controller `getAuditLogs`: nhánh super-admin truyền `allowedActions` (thay vì
`excludedActionPrefixes`); repository lọc `action: { $in: allowedActions }`.
Action ngoài danh sách → SA không bao giờ thấy.

## 4. Tickets

### PA-1 — Nền móng kênh platform (server)
- [ ] `notification.repository/service`: hàm `createPlatformNotification({type,message,data})`
      tạo doc `restaurant:null`.
- [ ] Route `GET /api/notifications/platform` — `verifyRole(['super-admin'])`, phân trang.
- [ ] Socket `authenticateToken`: role super-admin → `socket.join('platform')`.
- [ ] Server test: SA list được noti platform; manager/admin bị chặn endpoint platform;
      socket SA vào đúng room.
- **AC:** API trả docs platform cho SA; tenant không thấy docs `restaurant:null`.

### PA-2 — Chuông thông báo cho SA (client)
- [ ] `Header`/`use-notification`: role super-admin → fetch `/notifications/platform`,
      subscribe `platform_notification` (prepend + unread++).
- [ ] `NotificationPopover`: click type `system` (SA) → `/super-admin/tenants`;
      click type `subscription` (SA) → `/super-admin/transactions`; mark-read hoạt động.
- **AC:** SA bấm chuông thấy danh sách, badge unread đúng, realtime không cần refresh.

### PA-3 — Sự kiện "người mới đăng ký"
- [ ] Trong `auth.service.verifyOtpService` (sau khi set `emailVerified`): tạo platform noti
      `system` — "Người dùng {name} ({email}) vừa đăng ký sử dụng hệ thống".
- [ ] Emit socket room `platform`.
- **AC:** Owner hoàn tất OTP → bell SA hiện ngay noti mới.

### PA-4 — Gia hạn / nâng cấp gói (+ audit mới)
- [ ] `completeSubscription` (payos/vnpay/mock): so `sortOrder(planKey)` với gói hiện tại
      **trước khi** áp dụng → ghi audit `subscription.renewed` | `subscription.upgraded`
      (bổ sung vào `AuditAction`) + tạo platform noti type `subscription`.
- [ ] Thêm cả 2 action vào whitelist.
- **AC:** Thanh toán cùng gói → renewed; gói cao hơn → upgraded; bell + audit + trang
  Transactions nhất quán.

### PA-5 — Cảnh báo sắp hết hạn
- [ ] Trong nhánh expiring của `applySubscriptionState` (chỗ set `expiringEmailSentAt`):
      tạo platform noti `subscription` — "{restaurant} sắp hết hạn gói {plan} còn ~N ngày".
- **AC:** Chỉ phát sinh 1 lần/chu kỳ (không spam khi flag đã set).

### PA-6 — Whitelist audit log cho SA (server)
- [ ] `auditAction.ts`: thêm `SUPER_ADMIN_ALLOWED_ACTIONS` + 2 action mới; giữ
      `SUPER_ADMIN_RESTRICTED_PREFIXES` nếu nơi khác còn dùng (kiểm tra trước khi xoá).
- [ ] `auditLog.repository`: hỗ trợ filter `allowedActions` ($in).
- [ ] `auditLog.controller`: nhánh SA dùng whitelist.
- [ ] Cập nhật server test hiện có (rate-limit-audit / admin-bypass nếu đụng).
- **AC:** SA không còn thấy `setting.kds-code.generate`, `user.create`, `reservation.*`,
  `table.update`, `menuItem.update`, `order.*`…; vẫn thấy toàn bộ action trong whitelist.

### PA-7 — E2E kiểm chứng đầu-cuối
- [ ] Spec mới `e2e/super-admin-noti.spec.ts`: owner verify-OTP → bell SA có noti;
      mock-pay gia hạn → noti renewed + audit đúng action.
- [ ] Sửa/mở rộng `admin-logs.spec.ts` (nếu có case SA) hoặc server test khẳng định whitelist.
- [ ] Chạy full `npm run test:e2e` xanh 100%.

## 5. Ngoài phạm vi (làm sau nếu cần)

- Backfill thông báo cho sự kiện đã xảy ra trong quá khứ.
- Email riêng cho super-admin khi có sự kiện nền tảng.
- Trang trung tâm thông báo đầy đủ (full page) cho SA.
