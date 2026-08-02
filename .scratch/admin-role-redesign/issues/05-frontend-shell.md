# 05 — Frontend shell: Sidebar menu admin mới, Header avatar → modal tài khoản, chuông gộp toàn chuỗi

**What to build:** Cập nhật khung giao diện admin. (1) Sidebar (Sidebar.tsx:78-92) đổi menu admin: Tổng Quan Hệ Thống, Quản Lý Nhà Hàng, Báo Cáo Kinh Doanh, Người Dùng Hệ Thống, Thanh Toán & Gói (general); Audit Logs, Cài Đặt Chung (modal tài khoản), Tin Nhắn (tools). (2) Header (Header.tsx:48-60): bỏ dropdown mock "My Account" (Profile/Billing/Settings); avatar → mở thẳng **modal tài khoản cá nhân** (thông tin + đổi mật khẩu + logout). (3) Chuông thông báo: admin gộp theo mọi `restaurantIds` (hiển thị kèm tên nhà hàng trong từng notification); manager/staff giữ nguyên 1 nhà hàng. (4) Cài Đặt Chung admin = modal tài khoản (KHÔNG phải SettingModal nhà hàng).

**Blocked by:** 01, 04 — Backend auth admin bypass + Frontend auth flow.

**Status:** ready-for-agent

- [ ] Sidebar admin hiển thị đúng menu mới; không còn mục vận hành (POS/menu/tables/orders...).
- [ ] "Cài Đặt Chung" admin mở modal tài khoản cá nhân (thông tin + đổi mật khẩu + logout); manager giữ "Cài Đặt Nhà Hàng" → SettingModal.
- [ ] Header: bỏ dropdown mock; avatar mở thẳng modal tài khoản.
- [ ] Chuông thông báo admin: lấy + hiển thị gộp toàn chuỗi kèm tên nhà hàng; manager/staff theo 1 nhà hàng như cũ.
- [ ] Modal tài khoản dùng API có sẵn: `updateMe`, `changePassword`, `logout` (use-user.ts:147-161).
- [ ] Build client + typecheck pass; E2E admin thấy menu mới, mở được modal tài khoản.

### Kết quả đạt được (điền sau khi hoàn thành)
