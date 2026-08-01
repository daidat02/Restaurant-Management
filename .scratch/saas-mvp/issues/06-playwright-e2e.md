# 06 — Playwright E2E: test lỗ hổng + regression toàn bộ flow client

**What to build:** Hoàn thiện E2E bằng Playwright phủ toàn bộ flow client (T12 ~20 case) sau khi lỗ hổng tenant đã được đóng (Pha 4). Bao gồm test các flow từng bị lỗ hổng để xác nhận chặn đúng ở tầng UI/API.

**Blocked by:** 04 — Đóng lỗ hổng tenant; 01 — setup Playwright.

**Status:** ready-for-agent

Chi tiết kỹ thuật — `e2e/*.spec.ts`:

### T12 — Client E2E (~20 case)
- **Auth & tenant switcher**: login admin → `/select-restaurant` hiện 2 cơ sở; chọn Y → vào `/admin`, header hiển thị Y; reload → vẫn giữ Y (redux-persist).
- **Manager chỉ X**: `manager.test` login → không thấy cơ sở Y ở switcher; không truy cập được data Y.
- **Admin/manager flows**: đơn (POS tạo order, thêm món, đổi status), bàn (xem QR), menu (thêm/sửa item), reservation (tạo, đổi status).
- **Staff POS**: staff login → POS, tạo order tại bàn X.
- **KDS**: mở `/kds`, nhập mã bếp X → dashboard X hiển thị đơn X; nhập mã Y (khi đang cần X) không vào được.
- **Khách tại bàn**: mở `/scan-to-order?restaurantId=X&tableId=<id>` → hiển thị "Bàn số" + menu X; thêm món → cart → tạo order → vào payment.
- **Khách delivery**: chọn cơ sở X ở modal → menu X.
- **Super-admin**: login SA → `/super-admin` dashboard gộp; danh sách nhà hàng; khoá Y → admin Y bị chặn khi gọi API (UI hiện lỗi).
- **Cross-tenant (sau fix)**: admin X cố truy cập UI quản lý dữ liệu Y (nếu route cho phép) → bị chặn.

### T13 — Regression nghiệp vụ (~15 case)
- Reservation slots, menu CRUD, order add-item, item status pending→preparing→served, notification read-all, customer đặt bàn, thanh toán (mock PayOS hoặc dùng test mode).

### Kỹ thuật
- `playwright.config.ts`: `webServer` chạy server test (env test, Memory Server + seed) + Vite dev trên port riêng.
- Test data seed qua API test seed (dùng chung `server/src/test/seed.ts`) hoặc qua UI.
- **Rate limit**: các test E2E chạy với `RATE_LIMIT_ENABLED=false` (tránh bị chặn).
- Playwright artifacts (video/trace) khi fail — upload trong CI.

- [ ] Toàn bộ ~20 case T12 pass.
- [ ] ~15 case T13 pass.
- [ ] Các flow từng bị lỗ hổng giờ bị chặn đúng (không vỡ UI hợp lệ).
- [ ] Chạy được local + (optional) trong CI job e2e.
