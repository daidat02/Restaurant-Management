# 01 — Hạ tầng test: Vitest + supertest + MongoDB Memory Server + setup Playwright

**What to build:** Thiết lập nền tảng test tự động cho toàn bộ dự án — hiện repo có **0 test**. Cài đặt tooling, cấu hình, seed data chuẩn cho API integration test (T1–T11) và chuẩn bị Playwright cho E2E (T12–T13).

**Blocked by:** (không — khởi điểm)

**Status:** done (ticket 01 — commit `TBD`)

Chi tiết kỹ thuật:
- **Server**:
  - Cài devDependencies: `vitest`, `supertest`, `@types/supertest`, `mongodb-memory-server`.
  - `server/vitest.config.ts`: môi trường node, include `src/**/*.test.ts`, mỗi test file độc lập (fresh DB).
  - `server/src/test/setup.ts`: khởi tạo **1 instance Mongo Memory Server** dùng chung; connect mongoose; seed dữ liệu chuẩn (2 tenant X/Y + users + bàn + menu + order + reservation + payment + notification + setting); teardown disconnect + stop.
  - `server/src/test/seed.ts`: seed factory (chi tiết ở dưới).
  - `server/src/test/utils.ts`: `signToken`, `loginAs(email)`, `tokenFor(role, tenantId)`, `request = supertest(app)`.
  - **Refactor nhỏ**: tách `createApp()` (không listen) để supertest dùng mà không chiếm port. `index.ts` gọi `createApp()` + `listen`.
  - Script `"test": "vitest run"` trong `server/package.json`.
- **Client**:
  - Cài `@playwright/test` (root hoặc client).
  - `playwright.config.ts`: project chromium; `webServer` chạy server test (env test) + Vite dev; bỏ qua khi chạy `--project api-only` nếu cần.
  - Tạo `e2e/smoke.spec.ts` đơn giản (login thành công) để verify pipeline.

**Seed factory (dữ liệu chuẩn):**
- Tenant X = `69fccba996a14809070b9ef2` (NhamNhi Cơ Sở 1, PayOS cấu hình, setting `6a314d4142a2baf0dcd935f8`).
- Tenant Y = `69fb58d6ca9d7bade016e912` (Cơ Sở 2, chưa PayOS).
- Users (password `Test@NhamNhi2026`): `admin.test@nhamnhi.vn` [X,Y]; `manager.test@nhamnhi.vn` [X]; `staff.test@nhamnhi.vn` [X]; `staffY.test@nhamnhi.vn` [Y]; `customer.test@nhamnhi.vn` []; `super.admin@nhamnhi.vn` [].
- Mỗi tenant: ít nhất 1 setting (scope restaurant, targetId), 2 bàn, 2 menu item, 1 order active + 1 order paid, 1 reservation, 1 notification, 1 payment.
- Dùng ObjectId cố định cho seed (như multi-tenant spec) để test ổn định.

- [x] `npm test` (server) chạy được, ít nhất 1 test smoke pass.
- [x] supertest gọi được `createApp()` với Memory Server, không đụng DB thật.
- [x] Playwright smoke test pass.
- [x] Typecheck server + client không lỗi.
