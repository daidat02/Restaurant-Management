# 03 — TDD: viết test đỏ toàn bộ matrix T1–T13 (trừ rate-limit & E2E lỗ hổng)

**What to build:** Viết test tự động phủ toàn bộ các trường hợp hiện có (matrix T1–T13). Các test thuộc nhóm lỗ hổng (T2 cross-tenant, T9 payment public, T4 revenue-channels) sẽ **FAIL** ngay bây giờ — đây là mồi cho ticket 04 fix làm test xanh. Các nhóm khác phải pass ngay (không hồi quy).

**Blocked by:** 01 — Hạ tầng test.

**Status:** done

**Kết quả:** `npm test` = **26 failed (đỏ, đúng lỗ hổng dự kiến) | 99 passed (125 total, 13 files)**. Chạy lặp 4× ổn định.

## Cấu trúc test (server/src/test/)

| File | Nhóm | Pass | Đỏ (lỗ hổng cần ticket 04) |
|---|---|---|---|
| `auth.test.ts` | T1 — Auth & token | 13 | — |
| `tenant-isolation.test.ts` | T2 — verifyRole-only routes | — | **22** (tables, menu, orders, settings, reservations, auth admin, restaurants × PUT/DELETE/status đều trả 200 thay vì 403) |
| `tenant-scoping.test.ts` | T3 — verifyTenant cô lập | 11 | — |
| `super-admin.test.ts` | T4 — quyền nền tảng | 4 | **1** (`GET /orders/:id` admin X đọc đơn Y) |
| `kds.test.ts` | T5 — KDS | 6 | **1** (`POST /settings/:id/kds-code` không chặn id Y) |
| `socket.test.ts` | T6 — Socket isolation | 8 | — |
| `upload.test.ts` | T7 — Upload | 7 | — (1 case ghi nhận 500: multer sai định dạng chưa bắt) |
| `qr-table.test.ts` | T8 — QR bàn / tạo đơn public | 8 | — |
| `payment.test.ts` | T9 — Payment | 10 | **1** (`GET /payments/:paymentId` staff X đọc payment Y) |
| `analytics.test.ts` | T10 — Analytics | 7 | **1** (`revenue-channels` admin X thấy gộp toàn hệ thống) |
| `settings.test.ts` | T11 — Settings | 8 | — |
| `regression.test.ts` | T13 — Regression nghiệp vụ | 13 | — |
| `smoke.test.ts` | (có sẵn) | 4 | — |

## Thay đổi hạ tầng trong ticket này

- `globalSetup.ts`: đổi sang **`MongoMemoryReplSet`** (`replSet: { count: 1 }`) vì `OrderService`/`PaymentService` dùng MongoDB transaction (`startTransaction`) — standalone trả `Transaction numbers are only allowed on a replica set`. Thêm `--setParameter maxTransactionLockRequestTimeoutMillis=5000` để khử lock flaky.
- `utils.ts`: thêm `initSocket(createServer(app))` để `getIO()` không throw khi controller emit qua socket trong test.

## Checklist

- [x] T1, T3, T4 (trừ revenue-channels), T5–T8, T10, T11, T13 **pass** (99 passed).
- [x] T2 (22) + T4-revenue-channels + T9-payment + T5-kds-code + T4-orders/:id = **26 đỏ** — danh sách fail đúng lỗ hổng đã biết (mọi lỗi đều là `expected 403 to be 200`).
- [x] Không test nào đụng DB thật (mongodb-memory-server).

## Ghi chú lỗ hổng cụ thể cho ticket 04

Danh sách 26 route hiện **thiếu verifyTenant / tenant check** (token X truy cập resource Y trả 200):
- `PUT/DELETE /tables/:id`, `PATCH /tables/:id/status`
- `PUT /menu/category/:id`, `PUT /menu/item/:id`, `PUT /menu/item/:id/availability`
- `PUT /orders/:id`, `PUT /orders/:id/status`, `GET /orders/:id`
- `PUT /settings/:id`, `PATCH /settings/:id/payment-method`, `DELETE /settings/:id`, `POST /settings/:id/kds-code`
- `GET /reservations/:id`, `PUT /reservations/update/:id`, `PUT /reservations/update-status/:id`, `PUT /reservations/cancel/:id`
- `GET /auth/profile/:id`, `PUT /auth/admin/update/:id`, `DELETE /auth/admin/delete/:id`
- `PUT /restaurants/update/:id`, `DELETE /restaurants/:id`
- `GET /payments/:paymentId` (thiếu tenant check)
- `GET /analytics/revenue-channels` (thiếu verifyTenant, admin X thấy gộp Y)

Bug ghi nhận ngoài phạm vi tenant (để ticket khác): multer sai định dạng → 500 (chưa bắt); `PaymentRepository.updatePayment` gọi `.save()` khi `findByIdAndUpdate` trả null → 500 thay vì 404; `POST /payments/check-connect` destructure payload undefined → 500 thay vì 400.
