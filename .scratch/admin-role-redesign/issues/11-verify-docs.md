# 11 — Verify toàn diện + cập nhật docs vận hành

**What to build:** Chạy toàn bộ kiểm tra: server test (vitest), Playwright E2E, typecheck client+server, build. Verify end-to-end trên production: admin.test đăng nhập → vào thẳng `/admin` (không chọn nhà hàng), thấy dashboard gộp chuỗi + cảnh báo thuê bao, reports so sánh thật, customers chỉ quản manager, logs audit + thanh toán, billing thanh toán 1 chi nhánh; manager.test vào thẳng `/manager`; staff.test vào thẳng `/staff`; admin bị chặn URL `/manager/menu/items` → redirect `/admin`. Cập nhật `docs/HUONG-DAN-VAN-HANH.md` cho mô hình mới (phân vai trò, màn hình admin mới, test accounts).

**Blocked by:** 02, 03, 06, 07, 08, 09, 10 (mọi ticket backend + frontend).

**Status:** ready-for-agent

- [ ] Server test suite xanh.
- [ ] E2E xanh (bao gồm các luồng mới ở ticket 04–10).
- [ ] Typecheck + build server/client pass.
- [ ] Verify thủ công trên production: 4 role đúng màn hình, admin không bị chặn locked, audit/payments đúng.
- [ ] `HUONG-DAN-VAN-HANH.md` cập nhật mô hình vai trò + màn hình admin mới.

### Kết quả đạt được (điền sau khi hoàn thành)
