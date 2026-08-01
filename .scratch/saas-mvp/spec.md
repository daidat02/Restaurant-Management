# SPEC — SaaS MVP: Hạ tầng test, đóng lỗ hổng tenant, CI, vận hành & tính năng SaaS

## Problem Statement

Refactor multi-tenant đã xong (9 tickets, commit `1e7fb34`): đã có `verifyTenant`, tenant switcher, KDS token, socket isolation, upload phân vùng, QR bàn, super-admin UI. Tuy nhiên nền tảng chưa sẵn sàng để **cho thuê thật (SaaS)** vì:

1. **Không có test tự động nào** — 85 endpoint API + 22 route client chỉ được verify thủ công bằng curl + Playwright (ghi trong ticket). Bất kỳ thay đổi nào cũng có thể gây hồi quy ngầm.
2. **~26 route chỉ `verifyRole` (thiếu `verifyTenant`)** — token staff/admin nhà hàng X có thể thao tác `:id` của nhà hàng Y nếu biết id (tables, menu items, orders, settings, reservations, auth users). Đây là **tenant-leak thật**.
3. **2 endpoint public lộ dữ liệu**: `GET /api/tables/:id`, `GET /api/orders/table/:tableId`.
4. **Endpoint public không có rate limit** (login/register/refresh/webhook/kds-verify/menu public) → dễ bị spam/abuse.
5. **Không có CI/CD** — không có gì tự động chạy typecheck/test/build khi push.
6. **Chưa có tính năng SaaS**: wizard onboarding tenant, gói + hạn mức.
7. **Vận hành chưa hoàn chỉnh**: deploy Render free tier (sleep → cold start), chưa cấu hình CORS/domain thật, chưa có monitoring/backup.

## Solution

Mục tiêu: **MVP production** — nền tảng ổn định, an toàn, có test bền vững, CI tự động, sẵn sàng chạy thật với nhiều nhà hàng trên Render (free tier) + Vercel + MongoDB Atlas.

### Các trụ cột

1. **Hạ tầng test (từ con số 0)**: Vitest + supertest + MongoDB Memory Server (API integration test) + Playwright (E2E). Chạy được local và trong CI.
2. **CI/CD**: GitHub Actions — typecheck + chạy toàn bộ test + build trên mỗi PR/push.
3. **Đóng lỗ hổng tenant theo TDD**: viết test đỏ trước, rồi dùng **ownership middleware chung** để chặn cross-tenant cho 26 route + đóng 2 endpoint public.
4. **Rate limit + audit log**: chống spam endpoint public (có cơ chế bypass khi test) + ghi log hành động admin.
5. **Tính năng SaaS**: wizard onboarding 4 bước + gói/hạn mức (chưa thu phí tự động).
6. **Vận hành**: ping giữ tỉnh (free tier), CORS/env domain thật, Sentry, backup Atlas.
7. **Xác minh cuối**: deploy thật Render + Vercel, E2E chống production.

## User Stories

1. Là một **developer**, tôi muốn chạy `npm test` để chạy toàn bộ test tự động (API + E2E) để đảm bảo không hồi quy.
2. Là một **developer**, tôi muốn mỗi PR được CI tự chạy typecheck + test + build để phát hiện lỗi sớm.
3. Là một **admin/staff nhà hàng X**, tôi muốn bị chặn (403) khi cố thao tác `:id` thuộc nhà hàng Y (tables/menu/orders/settings/reservations/user) để đảm bảo bảo mật tenant.
4. Là một **admin/manager**, tôi muốn tạo nhà hàng mới theo wizard 4 bước (thông tin → cấu hình → tạo user → tạo bàn + QR) để tenant sẵn sàng hoạt động ngay.
5. Là một **quản trị nền tảng**, tôi muốn mỗi tenant có gói (`plan`) + hạn mức (số user, số order/tháng) để quản lý thuê bao.
6. Là một **admin**, tôi muốn hành động quan trọng của tôi (tạo/xoá user, đổi quyền, khoá tenant) được ghi vào audit log để truy vết.
7. Là một **khách**, tôi muốn endpoint công khai (menu, webhook) được rate-limit để không bị spam làm chậm hệ thống.
8. Là một **khách tại bàn**, sau 15 phút server Render ngủ, tôi muốn app tự phục hồi nhanh (ping giữ tỉnh) để việc quét QR không quá chậm.

## Implementation Decisions

### 1. Hạ tầng test API (server)
- Thêm `vitest`, `supertest`, `mongodb-memory-server` vào `server` (devDependencies).
- `server/vitest.config.ts`: chạy môi trường node, glob `src/**/*.test.ts`, mỗi test file độc lập.
- `server/src/test/setup.ts` (global setup/teardown): khởi tạo 1 Mongo Memory Server instance, connect mongoose, seed dữ liệu chuẩn, disconnect + stop sau khi xong.
- Seed factory tạo dữ liệu chuẩn:
  - **Tenant X** = `69fccba996a14809070b9ef2` (NhamNhi Cơ Sở 1, PayOS đã cấu hình, setting `6a314d4142a2baf0dcd935f8`)
  - **Tenant Y** = `69fb58d6ca9d7bade016e912` (Cơ Sở 2, chưa PayOS)
  - Users: `admin.test@nhamnhi.vn` ([X,Y]), `manager.test@nhamnhi.vn` ([X]), `staff.test@nhamnhi.vn` ([X]), `staffY.test@nhamnhi.vn` ([Y]), `customer.test@nhamnhi.vn`, `super.admin@nhamnhi.vn` — mật khẩu `Test@NhamNhi2026`.
  - Bàn, menu item, order, reservation, notification, payment mẫu thuộc X và Y.
- Helper `server/src/test/utils.ts`:
  - `signToken(user, restaurantId)` — tạo access token.
  - `loginAs(email)` / `tokenFor(role, tenant)` — helper đăng nhập.
  - `request = supertest(app)` — app server instance.
- **App phải export được** để supertest dùng (không listen port) — tách `createApp()` khỏi `index.ts` nếu cần.

### 2. Hạ tầng test E2E (client)
- Thêm `@playwright/test` (root hoặc client devDependency).
- `playwright.config.ts`: `webServer` chạy server test (env test, Memory Server) + Vite dev; project chromium.
- Thư mục `e2e/` chứa các test.
- **Lưu ý rate limit**: các test E2E phải chạy với rate limit bypass (xem mục 4).

### 3. CI/CD — GitHub Actions
- `.github/workflows/ci.yml`:
  - Trigger: push + PR (branch `feature/*`, `main`).
  - Jobs: `server` (typecheck `tsc --noEmit` + `vitest run`) và `client` (typecheck + `eslint` + build).
  - E2E Playwright: job riêng (có thể chạy song song) hoặc bỏ khỏi CI ban đầu nếu chậm — quyết định trong ticket.

### 4. Rate limit + audit log
- `express-rate-limit` cho endpoint public: login, register, refresh, reset-password, webhook PayOS/VNPAY, `POST /settings/kds/verify`, menu public GET, `POST /orders` public.
- **Bypass trong test**: đọc env `NODE_ENV==='test'` hoặc `RATE_LIMIT_ENABLED==='false'` → bỏ qua limiter.
- **Audit log**: model `AuditLog` (đã tồn tại) + middleware/service ghi khi: tạo/xoá user, đổi role, `switch-tenant`, khoá/mở tenant (`PATCH /restaurants/status/:id`), tạo/xoá nhà hàng, generate kitchen code. Kèm `restaurant`, `actor`, `action`, `target`, `meta`.

### 5. Ownership middleware chung
- Middleware mới (vd `requireResourceOwnership` / `requireResourceTenant`) trong `auth.middleware.ts`:
  - Nhận hàm `getResourceTenant(req)` trả `restaurantId` của tài nguyên (hoặc trực tiếp `resource`).
  - So với `req.user.restaurantId`; khác → 403 "Bạn không có quyền truy cập tài nguyên này!".
  - `super-admin` bypass (quyền nền tảng).
- Áp cho 26 route verifyRole-only:
  - Auth: `GET /profile/:id`, `DELETE /admin/delete/:id`, `PUT /admin/update/:id`
  - Restaurant: `POST /`, `PUT /update/:id`, `DELETE /:id` (create/update/delete nhà hàng — xác minh chủ sở hữu)
  - Table: `POST /create`, `PUT /:id`, `DELETE /:id`, `PATCH /:id/status`
  - Reservation: `POST /create-by-staff`, `GET /:id`, `PUT /update/:id`, `PUT /update-status/:id`, `PUT /cancel/:id`
  - Menu: `PUT /category/:id`, `PUT /item/:id`, `PUT /item/:id/availability`
  - Order: `PUT /:id`, `PUT /:id/status`
  - Setting: `POST /create`, `PUT /:id`, `PATCH /:id/payment-method`, `DELETE /:id`
- **2 endpoint public lộ dữ liệu**:
  - `GET /api/tables/:id` — xem xét yêu cầu `verifyToken` hoặc chỉ trả field an toàn.
  - `GET /api/orders/table/:tableId` — cần cho khách tại bàn (QR), giữ public nhưng **che field nhạy cảm** (customer info, payment) khi gọi không có token tenant.
  - Quyết định chi tiết trong ticket.

### 6. Wizard onboarding 4 bước
- **B1**: tạo thông tin nhà hàng (`POST /restaurants`) → auto thêm vào `admin.restaurantIds` + seed Setting mặc định.
- **B2**: cấu hình (giờ mở cửa, maintenanceMode, PayOS keys).
- **B3**: tạo user admin/manager/staff cho tenant mới.
- **B4**: tạo bàn + hiển thị QR bàn.
- UI: `/admin/onboarding` hoặc modal sau khi tạo nhà hàng. Server có thể làm endpoint `POST /restaurants/onboarding` (transaction) hoặc giữ client gọi tuần tự — quyết định trong ticket.

### 7. Gói + hạn mức
- Model `Restaurant` thêm: `plan: 'free' | 'pro'`, `usage` counters hoặc tính on-demand.
- Hạn mức: số user (vd free=5, pro=∞), số order/tháng (vd free=500), số nhà hàng/admin (free=1, pro=n).
- Enforce khi tạo user, tạo order, tạo restaurant.
- **Chưa thu phí tự động** (PayOS recurring để giai đoạn sau); PayOS hiện tại chỉ thu tiền đơn.
- Super-admin UI: xem gói + hạn mức + nâng cấp thủ công.

### 8. Vận hành
- **Ping giữ tỉnh**: uptime robot/cron gọi `GET /api/restaurants` (public) mỗi ~5 phút để Render không sleep (free tier ~15 phút). Hoặc dùng Render health-check nếu có.
- **CORS/domain thật**: set `ALLOWED_ORIGINS=https://<client>.vercel.app` trên Render; set `VITE_SERVER_BASE_URL=https://<server>.onrender.com` trên Vercel (build-time). Socket cors `origin:'*'` giữ hoặc thu hẹp.
- **Sentry**: `@sentry/node` (server) + `@sentry/react` (client), init khi có `SENTRY_DSN`.
- **Backup Atlas**: kích hoạt cloud backup Atlas hoặc script `mongodump` chạy cron ngoài Render (Render disk ephemeral — không backup trên Render).

### 9. Deploy
- Render (server): build `npm run build`, start `npm start`; env: `NODE_ENV=production`, `ALLOWED_ORIGINS`, `MONGODB_URL`, JWT secrets, Cloudinary, PayOS, `SENTRY_DSN`.
- Vercel (client): build command `npm run build`, output `dist`; env `VITE_SERVER_BASE_URL`.
- Nhận biết cold start free tier: chấp nhận, giảm thiểu bằng ping.

## Testing Decisions

- **TDD**: viết test đỏ trước (Pha 3) cho matrix T1–T13, trong đó T2/T9/T4-fail sẽ đỏ; fix (Pha 4) làm test xanh.
- Test matrix đầy đủ T1–T13 (xem ticket 03):
  - **T1** Auth & token (~12)
  - **T2** Tenant isolation — verifyRole-only routes (~26) ⚠️ đỏ hiện tại
  - **T3** verifyTenant routes (~17)
  - **T4** Super-admin lock/unlock (~6) — `revenue-channels` chưa scoped
  - **T5** KDS (~8)
  - **T6** Socket isolation (~8)
  - **T7** Upload (~6)
  - **T8** QR bàn (~8)
  - **T9** Payment public (~10) ⚠️ đỏ hiện tại
  - **T10** Analytics (~5)
  - **T11** Settings (~8)
  - **T12** Client E2E (~20) — Playwright
  - **T13** Regression nghiệp vụ (~15)
- Rate limit test riêng (bypass trong các test khác).
- E2E các flow dính lỗ hổng viết sau khi fix (Pha 6).

## Out of Scope (full platform — để sau)

- Thu phí tự động (PayOS recurring / subscription).
- Email invitation (mời thành viên qua email).
- Landing page + marketing.
- Subdomain per-tenant.
- Redis adapter / multi-instance scale (Render hiện 1 instance free tier).
- 2FA, SSO.

## Further Notes

- Deploy hiện tại: **Render free tier** (có sleep) + **Vercel** (static) + **MongoDB Atlas**.
- `express-rate-limit` khi multi-instance (sau này) phải chuyển Redis store.
- Playwright E2E chạy local/CI; có thể đưa vào CI sau khi ổn định.
- Chi tiết ticket trong `.scratch/saas-mvp/issues/`.

## Kế hoạch pha (thứ tự thực thi)

1. **Pha 1** — Hạ tầng test: Vitest + supertest + Memory Server + setup Playwright.
2. **Pha 2** — CI/CD GitHub Actions (typecheck + test + build).
3. **Pha 3** — TDD test đỏ T1–T13 (trừ rate-limit & E2E lỗ hổng).
4. **Pha 4** — Đóng lỗ hổng: ownership middleware (26 route) + đóng 2 endpoint public → làm test xanh.
5. **Pha 5** — Rate limit (bypass khi test) + test rate-limit + audit log.
6. **Pha 6** — E2E lỗ hổng + E2E còn lại qua Playwright.
7. **Pha 7** — Tính năng SaaS: wizard onboarding 4 bước → gói + hạn mức.
8. **Pha 8** — Vận hành: ping giữ tỉnh + CORS/env domain thật + Sentry + backup.
9. **Pha 9** — Xác minh cuối: deploy thật + E2E chống production.
