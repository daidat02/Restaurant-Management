# 10 — /admin/logs: trang audit hành động + log thanh toán mọi chi nhánh

**What to build:** Trang mới `/admin/logs` (menu Sidebar đã trỏ sẵn — Sidebar.tsx:88). Nguồn dữ liệu từ ticket 03: (1) `GET /api/audit-logs` theo `restaurantIds` của chủ — hiển thị audit hành động (ai làm gì, ở chi nhánh nào, khi nào); (2) `GET /api/audit-logs/payments` — lịch sử thanh toán mọi chi nhánh (nhà hàng, số tiền, chu kỳ, ngày). UI: 2 tab (Hành Động / Thanh Toán) hoặc bảng ghép; filter theo chi nhánh + thời gian + từ khoá.

**Blocked by:** 03 — Backend audit cho admin; 04 — Frontend auth flow; 05 — Frontend shell.

**Status:** done

- [x] Route `/admin/logs` được đăng ký (App.tsx) cho admin; menu sidebar mở đúng.
- [x] Tab/khối "Hành Động": danh sách audit của chuỗi (kèm tên chi nhánh), filter nhà hàng + thời gian.
- [x] Tab/khối "Thanh Toán": lịch sử transaction của chủ (nhà hàng, số tiền, chu kỳ, ngày), filter + phân trang.
- [x] Chỉ admin thấy logs chuỗi của mình (không thấy người khác).
- [x] E2E: admin.test thấy audit + giao dịch thật (vd Sub Sắp Hết Hạn đã thanh toán), super-admin vẫn dùng `/super-admin/audit`.

### Kết quả đạt được (điền sau khi hoàn thành)

- `LogsPage/logs.tsx` (mới): trang `/admin/logs`, 2 tab **Hành Động / Thanh Toán** (button bên trái, active xanh cerulean); filter chi nhánh (select từ `ownerRestaurants` = useRestaurant ∩ subscription), thời gian (Mọi thời gian/Hôm nay/7 ngày/30 ngày, client-side), từ khoá; DataTable phân trang 20/dòng; hiển thị tên chi nhánh qua map id→name (audit `restaurant` chỉ là ObjectId string). Cột Hành Động: Thời gian, Chi nhánh, Hành động (badge + ACTION_LABELS mở rộng order.*), Người thực hiện, Nội dung. Cột Thanh Toán: Thời gian, Chi nhánh (populated), Số tiền (`formatVND`), Chu kỳ (`cycleMonths` tháng), Loại (Phí chuỗi/Hết hạn), Tới ngày (`paidUntil`). Effect fetch dạng async + cleanup `cancelled` (tránh setState sync trong effect — lint sạch).
- `api/auditLogs.api.ts` (mới): `getAdminAuditLogs` + `getAdminPaymentLogs`; `API_ENDPOINTS.AUDIT_LOG.PAYMENTS` thêm `GET /api/audit-logs/payments`. Generic axios type cụ thể (bỏ `any`).
- `App.tsx`: import + đăng ký `<Route path="logs" element={<LogsPage />} />` dưới `/admin`.
- `server/src/test/seed.ts`: thêm `transactionX/transactionY` (299.000đ, 1 tháng, `restaurant-fee`, ownerId adminX) cho NhamNhi Cơ Sở 1 & 2 → tab Thanh Toán có dữ liệu thật; test server không đếm transaction nên an toàn (207 tests pass).
- E2E `admin-logs.spec.ts` (2 tests): tab Hành Động thấy audit "Tạo đơn ORD-X-001" kèm "NhamNhi Cơ Sở 1" + "Admin Test"; tab Thanh Toán thấy 2 transaction 299.000 ₫ / 1 tháng cả 2 chi nhánh, lọc chi nhánh "NhamNhi Cơ Sở 2" → cơ sở 1 biến mất. Lưu ý: nút tab dùng `exact: true` (tránh trùng "Thanh Toán & Gói" sidebar).
- Kiểm chứng: server vitest 207 pass; `tsc` build server sạch (E2E chạy `dist/` nên nhớ rebuild server sau khi sửa seed); client build xanh; eslint 2 file mới sạch; Full E2E 37 passed / 3 skipped.
