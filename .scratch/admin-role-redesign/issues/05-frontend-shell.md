# 05 — Frontend shell: Sidebar menu admin mới, Header avatar → modal tài khoản, chuông gộp toàn chuỗi

**What to build:** Cập nhật khung giao diện admin. (1) Sidebar (Sidebar.tsx:78-92) đổi menu admin: Tổng Quan Hệ Thống, Quản Lý Nhà Hàng, Báo Cáo Kinh Doanh, Người Dùng Hệ Thống, Thanh Toán & Gói (general); Audit Logs, Cài Đặt Chung (modal tài khoản), Tin Nhắn (tools). (2) Header (Header.tsx:48-60): bỏ dropdown mock "My Account" (Profile/Billing/Settings); avatar → mở thẳng **modal tài khoản cá nhân** (thông tin + đổi mật khẩu + logout). (3) Chuông thông báo: admin gộp theo mọi `restaurantIds` (hiển thị kèm tên nhà hàng trong từng notification); manager/staff giữ nguyên 1 nhà hàng. (4) Cài Đặt Chung admin = modal tài khoản (KHÔNG phải SettingModal nhà hàng).

**Blocked by:** 01, 04 — Backend auth admin bypass + Frontend auth flow.

**Status:** done

- [ ] Sidebar admin hiển thị đúng menu mới; không còn mục vận hành (POS/menu/tables/orders...).
- [ ] "Cài Đặt Chung" admin mở modal tài khoản cá nhân (thông tin + đổi mật khẩu + logout); manager giữ "Cài Đặt Nhà Hàng" → SettingModal.
- [ ] Header: bỏ dropdown mock; avatar mở thẳng modal tài khoản.
- [ ] Chuông thông báo admin: lấy + hiển thị gộp toàn chuỗi kèm tên nhà hàng; manager/staff theo 1 nhà hàng như cũ.
- [ ] Modal tài khoản dùng API có sẵn: `updateMe`, `changePassword`, `logout` (use-user.ts:147-161).
- [ ] Build client + typecheck pass; E2E admin thấy menu mới, mở được modal tài khoản.

### Kết quả đạt được (điền sau khi hoàn thành)

Hoàn thành, chưa commit.

**Frontend:**
- `AccountModal.tsx` (mới): modal tài khoản cá nhân gồm menu trái 2 tab (Thông Tin Cá Nhân + Đổi Mật Khẩu) + footer Đăng xuất. Dùng `useAuth` (user, logout) + `useUser` (editProfile = `updateMe`, changePassword). Header hiển thị avatar + role + email + SĐT.
- `LayoutAdmin.tsx`: thêm state `isOpenAccount`; `handleOpenSetting` phân vai — admin mở `AccountModal`, manager mở `SettingModal`. Truyền `onOpenAccount` cho `Header`.
- `Sidebar.tsx`: menu admin đã đúng (general: Tổng Quan Hệ Thống, Quản Lý Nhà Hàng, Báo Cáo Kinh Doanh, Người Dùng Hệ Thống, Thanh Toán & Gói; tools: Audit Logs, Cài Đặt Chung, Tin Nhắn) — không cần đổi. "Cài Đặt Chung" admin → `onOpenSetting` → `handleOpenSetting` mở AccountModal.
- `Header.tsx`: bỏ dropdown mock "My Account" (Profile/Billing/Settings) + `SelectDropdown`; avatar → nút mở thẳng `onOpenAccount` (AccountModal). Chuông admin gộp toàn chuỗi: `notificationScope` dùng `useMemo` — admin = mọi `restaurantIds` (qua `extractId`), manager/staff = 1 `activeRestaurantId`.
- `use-notification.ts`: `restaurantIds` state dạng mảng; `startLiseningNotification(ids: string | string[])`. Fetch: mảng >1 id → `getChainNotifications` (admin); 1 id → `getMyNotifications` như cũ. `markReadAllNoti` nhận mảng, gọi mark-all từng nhà hàng.
- `notification.api.ts` + `constants/index.ts`: thêm `GET_CHAIN()` + `getChainNotifications(page, limit)`.
- `types/noti.type.ts`: thêm field `restaurant?: { _id; name? } | string` (populate tên nhà hàng cho admin).
- `NotificationPopover.tsx`: hiển thị badge tên nhà hàng khi `role === 'admin'` và notification có `restaurant.name`.

**Backend (chuông admin gộp chuỗi — Q18):**
- `notification.routes.ts`: thêm `GET /` (verifyToken + intersectRestaurantIds) → trả toàn chuỗi theo `req.user.restaurantIds`; không đổi hành vi `GET /:restaurantId` / `PATCH /:id/read` / `POST /read-all/:restaurantId` cũ.
- `notification.controller.ts`: thêm `getChainNotifications` (dùng `req.user.restaurantIds`, page/limit query).
- `notification.service.ts` + `notification.repository.ts`: `getChainNotifications(restaurantIds)` query `$in` + `.populate('restaurant', 'name')`.
- Test mới `notification-chain.test.ts`: admin sở hữu X+Y → 200 gộp cả 2 kèm tên nhà hàng; manager X → 200 chỉ X.

**Validation:**
- Server: `npm run build` (tsc) xanh; `npm test` → 199 tests pass.
- Client: `npm run build` xanh; lint không phát sinh lỗi mới (AccountModal/LayoutAdmin/Header sạch; `any` trong notification.api là convention sẵn có của file).
- E2E: thêm `e2e/admin-shell.spec.ts` (4 test: menu mới + không menu vận hành, Cài Đặt Chung → modal tài khoản, avatar → modal tài khoản, manager Cài Đặt Nhà Hàng → SettingModal). Full suite: 27 passed / 3 skipped (subscription-owner chờ T07).

Lưu ý: chuông admin hiển thị tên nhà hàng chỉ khi backend populate — socket push (`new_notification`) trả doc chưa populate nên item vừa đẩy chưa có tên cho tới khi fetch lại.

