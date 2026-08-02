# 10 — /admin/logs: trang audit hành động + log thanh toán mọi chi nhánh

**What to build:** Trang mới `/admin/logs` (menu Sidebar đã trỏ sẵn — Sidebar.tsx:88). Nguồn dữ liệu từ ticket 03: (1) `GET /api/audit-logs` theo `restaurantIds` của chủ — hiển thị audit hành động (ai làm gì, ở chi nhánh nào, khi nào); (2) `GET /api/audit-logs/payments` — lịch sử thanh toán mọi chi nhánh (nhà hàng, số tiền, chu kỳ, ngày). UI: 2 tab (Hành Động / Thanh Toán) hoặc bảng ghép; filter theo chi nhánh + thời gian + từ khoá.

**Blocked by:** 03 — Backend audit cho admin; 04 — Frontend auth flow; 05 — Frontend shell.

**Status:** ready-for-agent

- [ ] Route `/admin/logs` được đăng ký (App.tsx) cho admin; menu sidebar mở đúng.
- [ ] Tab/khối "Hành Động": danh sách audit của chuỗi (kèm tên chi nhánh), filter nhà hàng + thời gian.
- [ ] Tab/khối "Thanh Toán": lịch sử transaction của chủ (nhà hàng, số tiền, chu kỳ, ngày), filter + phân trang.
- [ ] Chỉ admin thấy logs chuỗi của mình (không thấy người khác).
- [ ] E2E: admin.test thấy audit + giao dịch thật (vd Sub Sắp Hết Hạn đã thanh toán), super-admin vẫn dùng `/super-admin/audit`.

### Kết quả đạt được (điền sau khi hoàn thành)
