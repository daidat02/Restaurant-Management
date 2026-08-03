# 03 — Backend audit: mở /api/audit-logs cho admin + endpoint log thanh toán

**What to build:** Trang `/admin/logs` cần 2 nguồn dữ liệu. (1) Mở `GET /api/audit-logs` (AuditLogModule/auditLog.routes.ts:7-12) cho admin: hiện chỉ super-admin, filter theo `restaurantIds` của chủ (intersect như ticket 02). (2) Thêm endpoint **`GET /api/audit-logs/payments`** (admin) đọc collection `Transaction` theo `ownerId` (transaction đã có `ownerId` + `restaurant` + `amount` + `cycleMonths` + `paidUntil`, xem subscription-pay.service.ts:48) → trả lịch sử thanh toán mọi chi nhánh của chủ.

**Blocked by:** 01 — Backend auth: admin bypass tenant + ownership theo ownerId.

**Status:** done

- [x] `GET /api/audit-logs` chấp nhận role admin; filter theo `restaurantIds` của chủ (intersect).
- [x] `GET /api/audit-logs/payments` (admin): trả transactions của `ownerId`, populate tên nhà hàng, sắp xếp mới nhất, phân trang.
- [x] Cả hai đều kiểm tra ownership (admin chỉ thấy dữ liệu của chuỗi mình).
- [x] Backend integration test: super-admin + admin gọi được; admin không thấy audit của người khác; payments đúng `ownerId`.
- [x] Suite server test xanh.

### Kết quả đạt được (điền sau khi hoàn thành)
- `auditLog.routes.ts`: `GET /api/audit-logs` mở thêm role `admin` + middleware `intersectRestaurantIds`; thêm `GET /api/audit-logs/payments` (chỉ admin).
- `auditLog.controller.ts`: `getAuditLogs` — super-admin giữ filter `restaurantId` tùy ý; admin dùng `req.user.restaurantIds` (đã intersect, mặc định toàn chuỗi). `getPaymentLogs` — lấy `ownerId = req.user.userId`.
- `auditLog.repository.ts`: `listAuditLogs` nhận `restaurantIds: string[]` (`$in`); thêm `listPaymentLogs` (Transaction theo `ownerId`, populate `restaurant` name, sort `createdAt` desc, phân trang).
- `auditLog.service.ts`: thêm `getPaymentLogs(ownerId, page, limit)`.
- Test: `rate-limit-audit.test.ts` — admin X gọi `/audit-logs` → 200 chỉ thấy log thuộc chuỗi X/Y; admin gửi id ngoài chuỗi → 403; thêm describe `GET /audit-logs/payments` (admin 200 + ownerId đúng, manager 403).
- Kết quả: toàn bộ 197 tests / 24 files xanh, `npm run build` sạch.
