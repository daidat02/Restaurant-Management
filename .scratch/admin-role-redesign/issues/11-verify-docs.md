# 11 — Verify toàn diện + cập nhật docs vận hành

**What to build:** Chạy toàn bộ kiểm tra: server test (vitest), Playwright E2E, typecheck client+server, build. Verify end-to-end trên production: admin.test đăng nhập → vào thẳng `/admin` (không chọn nhà hàng), thấy dashboard gộp chuỗi + cảnh báo thuê bao, reports so sánh thật, customers chỉ quản manager, logs audit + thanh toán, billing thanh toán 1 chi nhánh; manager.test vào thẳng `/manager`; staff.test vào thẳng `/staff`; admin bị chặn URL `/manager/menu/items` → redirect `/admin`. Cập nhật `docs/HUONG-DAN-VAN-HANH.md` cho mô hình mới (phân vai trò, màn hình admin mới, test accounts).

**Blocked by:** 02, 03, 06, 07, 08, 09, 10 (mọi ticket backend + frontend).

**Status:** done

- [x] Server test suite xanh.
- [x] E2E xanh (bao gồm các luồng mới ở ticket 04–10).
- [x] Typecheck + build server/client pass.
- [x] Verify thủ công trên production: 4 role đúng màn hình, admin không bị chặn locked, audit/payments đúng.
- [x] `HUONG-DAN-VAN-HANH.md` cập nhật mô hình vai trò + màn hình admin mới.

### Kết quả đạt được (điền sau khi hoàn thành)

- **Server test**: `npm --prefix server test` → **207 passed / 27 files** (1 lần fail do flaky, chạy lại xanh).
- **E2E Playwright**: `E2E_SERVER=test npx playwright test` (root) → **39 passed / 3 skipped** (subscription-owner chờ rewrite). Thêm 2 test redirect vào `e2e/auth-tenant.spec.ts`: admin vào `/manager/menu/items` → redirect `/admin`; manager vào `/admin/customers` → redirect `/manager` (ProtectedRoute App.tsx:62-64).
- **Build/typecheck**: server `tsc` sạch; client `tsc -b && vite build` xanh; lint client không lỗi mới.
- **Docs**: cập nhật `docs/HUONG-DAN-VAN-HANH.md` cho mô hình admin quản toàn chuỗi — mục 1 (bỏ mô tả "Chọn cơ sở"), mục 2 (bảng vai trò + quyền chi tiết mới: admin vào thẳng `/admin`, chặn `/manager/*`, bỏ tab khách, `/admin/logs`...), mục 3 (bảng tài khoản test: admin quản toàn chuỗi), mục 4.4 (viết lại các màn hình admin mới: dashboard gộp chuỗi + cảnh báo thuê bao, restaurants + nút Cài Đặt chi nhánh, reports dữ liệu thật so sánh, customers chỉ quản manager, logs audit + thanh toán, billing), mục 7 (nhật ký verify production thêm 8 hạng mục redesign), mục 8.1 (bảng verify tự động T01–T10 kèm file test + lưu ý build server trước khi chạy E2E vì E2E chạy `dist/`).
- Lỗi flaky ghi nhận: server test chạy lại là xanh — không phải hồi quy từ redesign.
