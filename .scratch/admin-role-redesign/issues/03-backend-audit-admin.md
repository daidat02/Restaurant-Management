# 03 — Backend audit: mở /api/audit-logs cho admin + endpoint log thanh toán

**What to build:** Trang `/admin/logs` cần 2 nguồn dữ liệu. (1) Mở `GET /api/audit-logs` (AuditLogModule/auditLog.routes.ts:7-12) cho admin: hiện chỉ super-admin, filter theo `restaurantIds` của chủ (intersect như ticket 02). (2) Thêm endpoint **`GET /api/audit-logs/payments`** (admin) đọc collection `Transaction` theo `ownerId` (transaction đã có `ownerId` + `restaurant` + `amount` + `cycleMonths` + `paidUntil`, xem subscription-pay.service.ts:48) → trả lịch sử thanh toán mọi chi nhánh của chủ.

**Blocked by:** 01 — Backend auth: admin bypass tenant + ownership theo ownerId.

**Status:** ready-for-agent

- [ ] `GET /api/audit-logs` chấp nhận role admin; filter theo `restaurantIds` của chủ (intersect).
- [ ] `GET /api/audit-logs/payments` (admin): trả transactions của `ownerId`, populate tên nhà hàng, sắp xếp mới nhất, phân trang.
- [ ] Cả hai đều kiểm tra ownership (admin chỉ thấy dữ liệu của chuỗi mình).
- [ ] Backend integration test: super-admin + admin gọi được; admin không thấy audit của người khác; payments đúng `ownerId`.
- [ ] Suite server test xanh.

### Kết quả đạt được (điền sau khi hoàn thành)
